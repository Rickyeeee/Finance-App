import { Hono } from 'hono'
import type { Bindings, InvestmentTrade } from '../types'
import { getInvestments, upsertInvestment, deleteInvestment, getInvestmentTrades, createInvestmentTrade, deleteInvestmentTrade, createTransfer, deleteTransferPair } from '../db/queries'
import { parseHoldaryCSV } from '../services/csv-parser'

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', async (c) => {
  const investments = await getInvestments(c.env.DB)
  const totalValue = investments.reduce((s, i) => s + i.market_value, 0)
  const totalCost = investments.reduce((s, i) => s + i.avg_cost * i.shares, 0)
  const totalProfitLoss = investments.reduce((s, i) => s + i.profit_loss, 0)
  const overallReturn = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0

  const totalDailyPnl = investments.reduce((s, i) => {
    if (!i.previous_close || !i.current_price) return s
    return s + (i.current_price - i.previous_close) * i.shares
  }, 0)

  const totalRealizedPnl = investments.reduce((s, i) => s + (i.realized_pnl ?? 0), 0)

  return c.json({
    ok: true,
    data: investments,
    summary: {
      total_value: totalValue,
      total_cost: totalCost,
      total_profit_loss: totalProfitLoss,
      total_realized_pnl: Math.round(totalRealizedPnl),
      overall_return: Math.round(overallReturn * 100) / 100,
      total_daily_pnl: Math.round(totalDailyPnl),
    },
  })
})

// 查詢股票名稱（TWSE → Yahoo Finance fallback）
app.get('/lookup/:symbol', async (c) => {
  const symbol = c.req.param('symbol').toUpperCase()

  // TWSE 上市
  for (const ex of ['tse', 'otc']) {
    try {
      const res = await fetch(
        `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${ex}_${symbol.toLowerCase()}.tw&json=1&delay=0`,
        { headers: { 'Referer': 'https://mis.twse.com.tw/', 'User-Agent': 'Mozilla/5.0' } }
      )
      if (!res.ok) continue
      const data = await res.json() as { msgArray?: Array<{ n: string; c: string }> }
      const stock = data?.msgArray?.[0]
      if (stock?.n?.trim()) {
        return c.json({ ok: true, symbol, name: stock.n.trim(), exchange: ex })
      }
    } catch { continue }
  }

  // Yahoo Finance fallback
  for (const suffix of ['.TW', '.TWO']) {
    try {
      const res = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${symbol}${suffix}`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
      })
      if (!res.ok) continue
      const data = await res.json() as { chart: { result?: Array<{ meta: { shortName?: string; longName?: string } }> } }
      const meta = data?.chart?.result?.[0]?.meta
      if (!meta) continue
      return c.json({ ok: true, symbol, name: meta.shortName ?? meta.longName ?? symbol })
    } catch { continue }
  }

  return c.json({ ok: false, error: `找不到股票代號 ${symbol}` }, 404)
})

// 台北時區的 YYYY-MM-DD，用來比對「這個報價到底是不是今天的」
function taipeiDateStr(d: Date) {
  const t = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

// 批量更新所有持股市價
app.post('/refresh-all', async (c) => {
  const investments = await getInvestments(c.env.DB)
  if (!investments.length) return c.json({ ok: true, updated: 0, total: 0 })

  const today = new Date().toISOString().slice(0, 10)
  const todayTaipei = taipeiDateStr(new Date())

  // 並行抓取所有股價
  const priceResults = await Promise.all(
    investments.map(async inv => {
      for (const suffix of ['.TW', '.TWO']) {
        try {
          const res = await fetch(
            `https://query2.finance.yahoo.com/v8/finance/chart/${inv.symbol}${suffix}?interval=1d&range=1d`,
            { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
          )
          if (!res.ok) continue
          const data = await res.json() as {
            chart: { result?: Array<{ meta: { regularMarketPrice: number; previousClose?: number; chartPreviousClose?: number; regularMarketTime?: number } }> }
          }
          const meta = data?.chart?.result?.[0]?.meta
          if (!meta?.regularMarketPrice) continue
          const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? inv.previous_close
          return { inv, price: meta.regularMarketPrice, previousClose: prevClose, marketTime: meta.regularMarketTime, ok: true as const }
        } catch { continue }
      }
      return { inv, ok: false as const }
    })
  )

  // Yahoo 的 regularMarketTime 是「最近一次成交」的時間戳，休市（週末/國定假日）時
  // 抓到的其實是上一個交易日的資料——只要有任何一檔的報價時間對得上今天，就代表
  // 今天真的有開盤，這樣才不會把休市日的舊資料誤算成「今日損益」
  const marketOpenToday = priceResults.some(r => r.ok && r.marketTime && taipeiDateStr(new Date(r.marketTime * 1000)) === todayTaipei)

  // 依序寫入 DB（避免 SQLite 並發衝突）
  let updated = 0
  for (const r of priceResults) {
    if (!r.ok) continue
    const { inv, price, previousClose } = r
    const newMarketValue = Math.round(inv.shares * price)
    const newProfitLoss = newMarketValue - Math.round(inv.shares * inv.avg_cost)
    const newReturnRate = inv.avg_cost > 0
      ? Math.round(((price - inv.avg_cost) / inv.avg_cost) * 10000) / 100
      : 0
    await upsertInvestment(c.env.DB, {
      ...inv,
      market_value: newMarketValue,
      profit_loss: newProfitLoss,
      return_rate: newReturnRate,
      current_price: price,
      previous_close: previousClose,
      updated_at: today,
    })
    updated++
  }

  // 回傳更新後的完整資料，省掉前端再打一次 GET
  const updatedInvestments = await getInvestments(c.env.DB)
  const totalValue = updatedInvestments.reduce((s, i) => s + i.market_value, 0)
  const totalCost = updatedInvestments.reduce((s, i) => s + i.avg_cost * i.shares, 0)
  const totalProfitLoss = updatedInvestments.reduce((s, i) => s + i.profit_loss, 0)
  const overallReturn = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0
  const totalDailyPnl = marketOpenToday
    ? updatedInvestments.reduce((s, i) => {
        if (!i.previous_close || !i.current_price) return s
        return s + (i.current_price - i.previous_close) * i.shares
      }, 0)
    : 0
  const totalRealizedPnl = updatedInvestments.reduce((s, i) => s + (i.realized_pnl ?? 0), 0)

  return c.json({
    ok: true,
    updated,
    total: investments.length,
    data: updatedInvestments,
    summary: {
      total_value: totalValue,
      total_cost: totalCost,
      total_profit_loss: totalProfitLoss,
      total_realized_pnl: Math.round(totalRealizedPnl),
      overall_return: Math.round(overallReturn * 100) / 100,
      total_daily_pnl: Math.round(totalDailyPnl),
      market_open_today: marketOpenToday,
    },
  })
})

// 即時股價（Yahoo Finance）
app.get('/price/:symbol', async (c) => {
  const symbol = c.req.param('symbol').toUpperCase()

  // Try TWSE listed (.TW) then OTC (.TWO)
  const suffixes = ['.TW', '.TWO']
  for (const suffix of suffixes) {
    try {
      const res = await fetch(
        `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}${suffix}?interval=1d&range=1d`,
        { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
      )
      if (!res.ok) continue
      const data = await res.json() as {
        chart: { result?: Array<{ meta: { regularMarketPrice: number; previousClose: number; marketState: string; shortName?: string } }> }
      }
      const meta = data?.chart?.result?.[0]?.meta
      if (!meta?.regularMarketPrice) continue
      return c.json({
        ok: true,
        symbol,
        price: meta.regularMarketPrice,
        previousClose: meta.previousClose,
        marketState: meta.marketState,
        name: meta.shortName ?? symbol,
      })
    } catch { continue }
  }
  return c.json({ ok: false, error: `找不到股票 ${symbol}，請確認代號正確` }, 404)
})

// 更新市價（fetch price + 更新 DB）
app.post('/price/:symbol/refresh', async (c) => {
  const symbol = c.req.param('symbol').toUpperCase()
  const investments = await getInvestments(c.env.DB)
  const inv = investments.find(i => i.symbol === symbol)
  if (!inv) return c.json({ ok: false, error: '找不到此持股' }, 404)

  const suffixes = ['.TW', '.TWO']
  for (const suffix of suffixes) {
    try {
      const res = await fetch(
        `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}${suffix}?interval=1d&range=1d`,
        { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
      )
      if (!res.ok) continue
      const data = await res.json() as {
        chart: { result?: Array<{ meta: { regularMarketPrice: number; previousClose: number; marketState: string } }> }
      }
      const meta = data?.chart?.result?.[0]?.meta
      if (!meta?.regularMarketPrice) continue

      const price = meta.regularMarketPrice
      const previousClose = meta.previousClose
      const newMarketValue = Math.round(inv.shares * price)
      const newProfitLoss = newMarketValue - Math.round(inv.shares * inv.avg_cost)
      const newReturnRate = inv.avg_cost > 0
        ? Math.round(((price - inv.avg_cost) / inv.avg_cost) * 10000) / 100
        : 0

      await upsertInvestment(c.env.DB, {
        ...inv,
        market_value: newMarketValue,
        profit_loss: newProfitLoss,
        return_rate: newReturnRate,
        current_price: price,
        previous_close: previousClose,
        updated_at: new Date().toISOString().slice(0, 10),
      })
      return c.json({ ok: true, price, previousClose, marketState: meta.marketState, market_value: newMarketValue })
    } catch { continue }
  }
  return c.json({ ok: false, error: '股價更新失敗' }, 500)
})

// 投資資產成長歷史（週/月/年）
app.get('/history', async (c) => {
  const range = c.req.query('range') ?? 'month'

  // 台北時間（UTC+8）
  const taipeiNow = new Date(Date.now() + 8 * 60 * 60 * 1000)
  const today = taipeiNow.toISOString().slice(0, 10)

  if (range === 'week') {
    // 過去 7 天（含今天）
    const start = new Date(taipeiNow)
    start.setUTCDate(start.getUTCDate() - 6)
    const startDate = start.toISOString().slice(0, 10)
    const { results } = await c.env.DB.prepare(`
      SELECT snapshot_date, total_investments FROM asset_history
      WHERE snapshot_date >= ? AND snapshot_date <= ?
      ORDER BY snapshot_date ASC
    `).bind(startDate, today).all<{ snapshot_date: string; total_investments: number }>()
    return c.json({ ok: true, data: results, start: startDate, end: today })
  }

  if (range === 'month') {
    // 過去 30 天（含今天）
    const start = new Date(taipeiNow)
    start.setUTCDate(start.getUTCDate() - 29)
    const startDate = start.toISOString().slice(0, 10)
    const { results } = await c.env.DB.prepare(`
      SELECT snapshot_date, total_investments FROM asset_history
      WHERE snapshot_date >= ? AND snapshot_date <= ?
      ORDER BY snapshot_date ASC
    `).bind(startDate, today).all<{ snapshot_date: string; total_investments: number }>()
    return c.json({ ok: true, data: results, start: startDate, end: today })
  }

  // year：過去 365 天，每月取最後一筆
  const start = new Date(taipeiNow)
  start.setUTCDate(start.getUTCDate() - 364)
  const startDate = start.toISOString().slice(0, 10)
  const { results } = await c.env.DB.prepare(`
    SELECT snapshot_date, total_investments
    FROM asset_history
    WHERE snapshot_date IN (
      SELECT MAX(snapshot_date) FROM asset_history
      WHERE snapshot_date >= ? AND snapshot_date <= ?
      GROUP BY substr(snapshot_date, 1, 7)
    )
    ORDER BY snapshot_date ASC
  `).bind(startDate, today).all<{ snapshot_date: string; total_investments: number }>()
  return c.json({ ok: true, data: results, start: startDate, end: today })
})

// 取得交易記錄
app.get('/trades', async (c) => {
  const symbol = c.req.query('symbol')
  const trades = await getInvestmentTrades(c.env.DB, symbol)
  return c.json({ ok: true, data: trades })
})

// 已實現損益記錄（所有賣出交易）
app.get('/pnl', async (c) => {
  const { results } = await c.env.DB
    .prepare(`SELECT * FROM investment_trades WHERE type = '賣出' ORDER BY date DESC, created_at DESC`)
    .all<InvestmentTrade>()
  const total = results.reduce((s, t) => s + (t.realized_pnl ?? 0), 0)
  return c.json({ ok: true, data: results, total_realized_pnl: total })
})

// 重新依日期序（同日以建立時間為序）重播某 (symbol, account) 的完整交易紀錄，
// 算出目前的股數／均成本，並同步修正每一筆賣出交易「自己」的已實現損益。
// 為什麼需要這個：賣出當下的已實現損益，取決於「賣出當時」的均成本；
// 若之後又編輯／刪除／新增了其他（尤其是更早日期的）交易，均成本會跟著改變，
// 但先前存進 investment_trades.realized_pnl 的數字不會自動更新，兩邊就會兜不起來。
// 所有會動到交易紀錄的路由都呼叫這裡，確保「明細列表」跟「編輯視窗」看到的數字永遠一致。
async function recalcPosition(db: D1Database, symbol: string, account: string) {
  const trades = await getInvestmentTrades(db, symbol, account)
  const sorted = [...trades].sort((a, b) =>
    a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at))

  let shares = 0, avgCost = 0, totalRealizedPnl = 0
  for (const t of sorted) {
    if (t.type === '買入') {
      const ns = shares + t.shares
      avgCost = ns > 0 ? (shares * avgCost + t.shares * t.price) / ns : t.price
      shares = ns
    } else {
      const pnl = Math.round((t.price - avgCost) * t.shares)
      if (pnl !== (t.realized_pnl ?? 0)) {
        await db.prepare('UPDATE investment_trades SET realized_pnl = ? WHERE id = ?').bind(pnl, t.id).run()
      }
      totalRealizedPnl += pnl
      shares = Math.max(0, shares - t.shares)
    }
  }
  return { shares, avgCost, totalRealizedPnl }
}

// 新增交易
app.post('/trades', async (c) => {
  const body = await c.req.json<{
    symbol: string; name: string; type: string;
    shares: number; price: number; date: string;
    account?: string; to_account?: string; to_account_id?: string; fee?: number; note?: string;
  }>()

  if (!body.symbol || !body.type || !body.shares || !body.price || !body.date) {
    return c.json({ ok: false, error: '缺少必填欄位' }, 400)
  }
  if (body.type !== '買入' && body.type !== '賣出') {
    return c.json({ ok: false, error: 'type 必須是 買入 或 賣出' }, 400)
  }

  const amount = Math.round(body.shares * body.price)
  const fee = body.fee ?? 0
  const account = body.account ?? ''
  const today = body.date

  const investments = await getInvestments(c.env.DB)
  const inv = investments.find(i => i.symbol === body.symbol && i.account === account)

  // 賣出且有指定入帳帳戶 → 先建立轉帳，再存 transfer_id 到 trade
  let tradeTransferId: string | null = null
  if (body.type === '賣出' && body.to_account && body.account) {
    const proceeds = amount - fee
    tradeTransferId = await createTransfer(c.env.DB, {
      from_account: body.account,
      to_account: body.to_account,
      to_account_id: body.to_account_id ?? null,
      amount: proceeds,
      date: body.date,
      note: `賣出 ${body.symbol} ${body.name} ×${body.shares}`,
      outName: `賣出 ${body.symbol} ${body.name}`,
      inName: `賣出 ${body.symbol} ${body.name}`,
    })
  }

  const id = await createInvestmentTrade(c.env.DB, {
    symbol: body.symbol,
    name: body.name,
    type: body.type,
    shares: body.shares,
    price: body.price,
    amount,
    date: body.date,
    account,
    to_account: body.type === '賣出' ? (body.to_account ?? null) : null,
    realized_pnl: 0,
    transfer_id: tradeTransferId,
    note: body.note ?? null,
  })

  // 只有「已有持倉」或「這是買入（建立新持倉）」才需要重算並更新 investments；
  // 賣出但完全沒有對應持倉是異常輸入，維持原本行為：不建立/更新任何持股紀錄
  if (inv || body.type === '買入') {
    const { shares, avgCost, totalRealizedPnl } = await recalcPosition(c.env.DB, body.symbol, account)
    const currentPerShare = inv
      ? (inv.shares > 0 ? (inv.current_price || inv.market_value / inv.shares) : body.price)
      : body.price
    const newMarketValue = Math.round(shares * currentPerShare)
    const newTotalCost = Math.round(shares * avgCost)
    const newProfitLoss = newMarketValue - newTotalCost
    const newReturnRate = newTotalCost > 0 ? Math.round((newProfitLoss / newTotalCost) * 10000) / 100 : 0

    if (shares === 0 && inv) {
      await deleteInvestment(c.env.DB, inv.id)
    } else {
      await upsertInvestment(c.env.DB, {
        ...(inv ?? { current_price: body.price, previous_close: 0 }),
        name: body.name,
        symbol: body.symbol,
        account,
        shares,
        avg_cost: Math.round(avgCost * 100) / 100,
        market_value: newMarketValue,
        profit_loss: newProfitLoss,
        return_rate: newReturnRate,
        realized_pnl: Math.round(totalRealizedPnl),
        updated_at: today,
      })
    }
  }

  return c.json({ ok: true, id })
})

// 編輯交易記錄（並重算持倉）
app.patch('/trades/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{
    type?: string; shares?: number; price?: number; date?: string; account?: string; note?: string | null
  }>()

  const trade = await c.env.DB
    .prepare('SELECT * FROM investment_trades WHERE id = ?')
    .bind(id).first<InvestmentTrade>()
  if (!trade) return c.json({ ok: false, error: '找不到此記錄' }, 404)

  const newType    = body.type    ?? trade.type
  const newShares  = body.shares  ?? trade.shares
  const newPrice   = body.price   ?? trade.price
  const newDate    = body.date    ?? trade.date
  const newAccount = body.account ?? trade.account
  const newNote    = 'note' in body ? body.note : trade.note
  const newAmount  = Math.round(newShares * newPrice)

  await c.env.DB.prepare(
    'UPDATE investment_trades SET type=?, shares=?, price=?, amount=?, date=?, account=?, note=? WHERE id=?'
  ).bind(newType, newShares, newPrice, newAmount, newDate, newAccount, newNote ?? null, id).run()

  // 重算持倉：按 (symbol, account) 分開
  const effectiveAccount = newAccount || trade.account
  const allInv = await getInvestments(c.env.DB)
  const inv = allInv.find(i => i.symbol === trade.symbol && i.account === effectiveAccount)
  if (!inv) return c.json({ ok: true })

  const { shares, avgCost, totalRealizedPnl } = await recalcPosition(c.env.DB, trade.symbol, effectiveAccount)

  const currentPerShare = inv.current_price || (inv.shares > 0 ? inv.market_value / inv.shares : 0)
  const newMarketValue = Math.round(shares * currentPerShare)
  const newTotalCost = Math.round(shares * avgCost)
  const newProfitLoss = newMarketValue - newTotalCost
  const newReturnRate = newTotalCost > 0 ? Math.round((newProfitLoss / newTotalCost) * 10000) / 100 : 0

  await upsertInvestment(c.env.DB, {
    ...inv,
    shares,
    avg_cost: Math.round(avgCost * 100) / 100,
    market_value: newMarketValue,
    profit_loss: newProfitLoss,
    return_rate: newReturnRate,
    realized_pnl: Math.round(totalRealizedPnl),
    updated_at: new Date().toISOString().slice(0, 10),
  })

  return c.json({ ok: true })
})

// 刪除交易記錄（並重算持倉）
app.delete('/trades/:id', async (c) => {
  const id = c.req.param('id')

  // 先取得交易資料（含 symbol），確認存在
  const trade = await c.env.DB
    .prepare('SELECT * FROM investment_trades WHERE id = ?')
    .bind(id)
    .first<InvestmentTrade>()
  if (!trade) return c.json({ ok: false, error: '找不到此記錄' }, 404)

  const allInv = await getInvestments(c.env.DB)
  const inv = allInv.find(i => i.symbol === trade.symbol && i.account === trade.account)

  // 執行刪除（若有關聯轉帳，一併刪除）
  await deleteInvestmentTrade(c.env.DB, id)
  if (trade.transfer_id) {
    await deleteTransferPair(c.env.DB, trade.transfer_id)
  }

  const today = new Date().toISOString().slice(0, 10)

  // 從剩餘交易重算均成、股數、已實現損益（並修正剩餘每筆賣出交易自己的 realized_pnl）
  const { shares, avgCost, totalRealizedPnl } = await recalcPosition(c.env.DB, trade.symbol, trade.account)

  if (shares === 0) {
    // 無剩餘持股：如果持倉存在則刪除
    if (inv) await deleteInvestment(c.env.DB, inv.id)
    return c.json({ ok: true })
  }

  // 重算後股數 > 0，需要 upsert 持倉（可能是從已刪除狀態恢復）
  const currentPerShare = inv
    ? (inv.current_price || (inv.shares > 0 ? inv.market_value / inv.shares : avgCost))
    : avgCost
  const newMarketValue = Math.round(shares * currentPerShare)
  const newTotalCost = Math.round(shares * avgCost)
  const newProfitLoss = newMarketValue - newTotalCost
  const newReturnRate = newTotalCost > 0 ? Math.round((newProfitLoss / newTotalCost) * 10000) / 100 : 0

  await upsertInvestment(c.env.DB, {
    ...(inv ?? {
      id: undefined,
      name: trade.name,
      symbol: trade.symbol,
      account: trade.account,
      current_price: avgCost,
      previous_close: 0,
    }),
    shares,
    avg_cost: Math.round(avgCost * 100) / 100,
    market_value: newMarketValue,
    profit_loss: newProfitLoss,
    return_rate: newReturnRate,
    realized_pnl: Math.round(totalRealizedPnl),
    updated_at: today,
  })

  return c.json({ ok: true })
})

// 上傳 Holdary CSV
app.post('/upload', async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) return c.json({ ok: false, error: '請上傳 CSV 檔案' }, 400)

  const text = await file.text()
  const rows = parseHoldaryCSV(text)
  if (!rows.length) return c.json({ ok: false, error: '無法解析 CSV，請確認格式正確' }, 400)

  const today = new Date().toISOString().slice(0, 10)
  const updated: string[] = []
  const existing = await getInvestments(c.env.DB)

  for (const row of rows) {
    const inv = existing.find(i => i.symbol === row.symbol)
    const id = await upsertInvestment(c.env.DB, {
      id: inv?.id,
      name: row.name,
      symbol: row.symbol,
      shares: row.shares,
      avg_cost: row.avg_cost,
      market_value: row.market_value,
      profit_loss: row.profit_loss,
      return_rate: row.return_rate,
      realized_pnl: inv?.realized_pnl ?? 0,
      current_price: inv?.current_price ?? 0,
      previous_close: inv?.previous_close ?? 0,
      updated_at: today,
      account: inv?.account ?? '',
    })
    updated.push(id)
  }

  return c.json({ ok: true, updated: updated.length, rows })
})

// 手動更新單筆持股
app.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{
    shares?: number; avg_cost?: number; market_value?: number; current_price?: number; previous_close?: number
  }>()

  const today = new Date().toISOString().slice(0, 10)
  const investments = await getInvestments(c.env.DB)
  const inv = investments.find(i => i.id === id)
  if (!inv) return c.json({ ok: false, error: '找不到此持股' }, 404)

  const shares = body.shares ?? inv.shares
  const avgCost = body.avg_cost ?? inv.avg_cost
  const currentPrice = body.current_price ?? inv.current_price
  const previousClose = body.previous_close ?? inv.previous_close

  // 有現價就用現價重算市值，否則沿用舊值按比例調整
  const marketValue = currentPrice > 0
    ? Math.round(shares * currentPrice)
    : (body.market_value ?? Math.round(shares * (inv.shares > 0 ? inv.market_value / inv.shares : avgCost)))

  const totalCost = Math.round(shares * avgCost)
  const profitLoss = marketValue - totalCost
  const returnRate = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0

  await upsertInvestment(c.env.DB, {
    id,
    name: inv.name,
    symbol: inv.symbol,
    shares,
    avg_cost: Math.round(avgCost * 100) / 100,
    market_value: marketValue,
    profit_loss: Math.round(profitLoss),
    return_rate: Math.round(returnRate * 100) / 100,
    realized_pnl: inv.realized_pnl ?? 0,
    current_price: currentPrice,
    previous_close: previousClose,
    updated_at: today,
    account: inv.account,
  })

  return c.json({ ok: true })
})

export default app
