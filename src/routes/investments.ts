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

// 批量更新所有持股市價
app.post('/refresh-all', async (c) => {
  const investments = await getInvestments(c.env.DB)
  if (!investments.length) return c.json({ ok: true, updated: 0, total: 0 })

  const today = new Date().toISOString().slice(0, 10)

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
            chart: { result?: Array<{ meta: { regularMarketPrice: number; previousClose?: number; chartPreviousClose?: number } }> }
          }
          const meta = data?.chart?.result?.[0]?.meta
          if (!meta?.regularMarketPrice) continue
          const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? inv.previous_close
          return { inv, price: meta.regularMarketPrice, previousClose: prevClose, ok: true as const }
        } catch { continue }
      }
      return { inv, ok: false as const }
    })
  )

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
  const totalDailyPnl = updatedInvestments.reduce((s, i) => {
    if (!i.previous_close || !i.current_price) return s
    return s + (i.current_price - i.previous_close) * i.shares
  }, 0)
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

// 已實現損益記錄（所有賣出交易）
app.get('/pnl', async (c) => {
  const { results } = await c.env.DB
    .prepare(`SELECT * FROM investment_trades WHERE type = '賣出' ORDER BY date DESC, created_at DESC`)
    .all<InvestmentTrade>()
  const total = results.reduce((s, t) => s + (t.realized_pnl ?? 0), 0)
  return c.json({ ok: true, data: results, total_realized_pnl: total })
})

// 新增交易
app.post('/trades', async (c) => {
  const body = await c.req.json<{
    symbol: string; name: string; type: string;
    shares: number; price: number; date: string;
    account?: string; to_account?: string; fee?: number; note?: string;
  }>()

  if (!body.symbol || !body.type || !body.shares || !body.price || !body.date) {
    return c.json({ ok: false, error: '缺少必填欄位' }, 400)
  }
  if (body.type !== '買入' && body.type !== '賣出') {
    return c.json({ ok: false, error: 'type 必須是 買入 或 賣出' }, 400)
  }

  const amount = Math.round(body.shares * body.price)
  const fee = body.fee ?? 0

  // 更新持倉（按 symbol + account 分開計算）—— 需先讀取以取得 avg_cost
  const investments = await getInvestments(c.env.DB)
  const account = body.account ?? ''
  const inv = investments.find(i => i.symbol === body.symbol && i.account === account)
  const today = body.date

  // 賣出時計算每筆已實現損益
  const tradeRealizedPnl = body.type === '賣出' && inv
    ? Math.round((body.price - inv.avg_cost) * body.shares) - fee
    : 0

  // 賣出且有指定入帳帳戶 → 先建立轉帳，再存 transfer_id 到 trade
  let tradeTransferId: string | null = null
  if (body.type === '賣出' && body.to_account && body.account) {
    const proceeds = amount - fee
    tradeTransferId = await createTransfer(c.env.DB, {
      from_account: body.account,
      to_account: body.to_account,
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
    account: body.account ?? '',
    to_account: body.type === '賣出' ? (body.to_account ?? null) : null,
    realized_pnl: tradeRealizedPnl,
    transfer_id: tradeTransferId,
    note: body.note ?? null,
  })

  if (inv) {
    let newShares: number
    let newAvgCost: number
    let newRealizedPnl = inv.realized_pnl ?? 0

    if (body.type === '買入') {
      newShares = inv.shares + body.shares
      newAvgCost = newShares > 0
        ? (inv.shares * inv.avg_cost + body.shares * body.price) / newShares
        : body.price
    } else {
      newShares = Math.max(0, inv.shares - body.shares)
      newAvgCost = inv.avg_cost
      newRealizedPnl += tradeRealizedPnl
    }

    const currentPerShare = inv.shares > 0 ? (inv.current_price || inv.market_value / inv.shares) : body.price
    const newMarketValue = Math.round(newShares * currentPerShare)
    const newTotalCost = Math.round(newShares * newAvgCost)
    const newProfitLoss = newMarketValue - newTotalCost
    const newReturnRate = newTotalCost > 0 ? Math.round((newProfitLoss / newTotalCost) * 10000) / 100 : 0

    if (newShares === 0 && body.type === '賣出') {
      await deleteInvestment(c.env.DB, inv.id)
    } else {
      await upsertInvestment(c.env.DB, {
        ...inv,
        shares: newShares,
        avg_cost: Math.round(newAvgCost * 100) / 100,
        market_value: newMarketValue,
        profit_loss: newProfitLoss,
        return_rate: newReturnRate,
        realized_pnl: Math.round(newRealizedPnl),
        updated_at: today,
      })
    }
  } else if (body.type === '買入') {
    // 全新持股：建立記錄
    await upsertInvestment(c.env.DB, {
      name: body.name,
      symbol: body.symbol,
      shares: body.shares,
      avg_cost: body.price,
      market_value: amount,
      profit_loss: 0,
      return_rate: 0,
      realized_pnl: 0,
      current_price: body.price,
      previous_close: 0,
      updated_at: today,
      account: body.account ?? '',
    })
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
  const allForPair = await getInvestmentTrades(c.env.DB, trade.symbol, effectiveAccount)
  const allInv = await getInvestments(c.env.DB)
  const inv = allInv.find(i => i.symbol === trade.symbol && i.account === effectiveAccount)
  if (!inv) return c.json({ ok: true })

  const remaining = allForPair.map(t =>
    t.id === id ? { ...t, type: newType, shares: newShares, price: newPrice, date: newDate } : t
  )

  const sorted = [...remaining].sort((a, b) => a.date.localeCompare(b.date))
  let shares = 0, avgCost = 0, realizedPnl = 0
  for (const t of sorted) {
    if (t.type === '買入') {
      const ns = shares + t.shares
      avgCost = ns > 0 ? (shares * avgCost + t.shares * t.price) / ns : t.price
      shares = ns
    } else {
      realizedPnl += (t.price - avgCost) * t.shares
      shares = Math.max(0, shares - t.shares)
    }
  }

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
    realized_pnl: Math.round(realizedPnl),
    updated_at: new Date().toISOString().slice(0, 10),
  })

  return c.json({ ok: true })
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
  const allForPair = await getInvestmentTrades(c.env.DB, trade.symbol, effectiveAccount)
  const allInv = await getInvestments(c.env.DB)
  const inv = allInv.find(i => i.symbol === trade.symbol && i.account === effectiveAccount)
  if (!inv) return c.json({ ok: true })

  const remaining = allForPair.map(t =>
    t.id === id ? { ...t, type: newType, shares: newShares, price: newPrice, date: newDate } : t
  )

  const sorted = [...remaining].sort((a, b) => a.date.localeCompare(b.date))
  let shares = 0, avgCost = 0, realizedPnl = 0
  for (const t of sorted) {
    if (t.type === '買入') {
      const ns = shares + t.shares
      avgCost = ns > 0 ? (shares * avgCost + t.shares * t.price) / ns : t.price
      shares = ns
    } else {
      realizedPnl += (t.price - avgCost) * t.shares
      shares = Math.max(0, shares - t.shares)
    }
  }

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
    realized_pnl: Math.round(realizedPnl),
    updated_at: new Date().toISOString().slice(0, 10),
  })

  return c.json({ ok: true })
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
  const allForPair = await getInvestmentTrades(c.env.DB, trade.symbol, effectiveAccount)
  const allInv = await getInvestments(c.env.DB)
  const inv = allInv.find(i => i.symbol === trade.symbol && i.account === effectiveAccount)
  if (!inv) return c.json({ ok: true })

  const remaining = allForPair.map(t =>
    t.id === id ? { ...t, type: newType, shares: newShares, price: newPrice, date: newDate } : t
  )

  const sorted = [...remaining].sort((a, b) => a.date.localeCompare(b.date))
  let shares = 0, avgCost = 0, realizedPnl = 0
  for (const t of sorted) {
    if (t.type === '買入') {
      const ns = shares + t.shares
      avgCost = ns > 0 ? (shares * avgCost + t.shares * t.price) / ns : t.price
      shares = ns
    } else {
      realizedPnl += (t.price - avgCost) * t.shares
      shares = Math.max(0, shares - t.shares)
    }
  }

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
    realized_pnl: Math.round(realizedPnl),
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

  // 刪除前先讀取該 (symbol, account) 的所有交易 + 持倉
  const allForPair = await getInvestmentTrades(c.env.DB, trade.symbol, trade.account)
  const allInv = await getInvestments(c.env.DB)

  // 執行刪除（若有關聯轉帳，一併刪除）
  await deleteInvestmentTrade(c.env.DB, id)
  if (trade.transfer_id) {
    await deleteTransferPair(c.env.DB, trade.transfer_id)
  }

  // 手動排除剛刪的那筆，不依賴 read-after-write
  const remaining = allForPair.filter(t => t.id !== id)

  const inv = allInv.find(i => i.symbol === trade.symbol && i.account === trade.account)

  const today = new Date().toISOString().slice(0, 10)

  if (remaining.length === 0) {
    // 無剩餘交易：如果持倉存在則刪除
    if (inv) await deleteInvestment(c.env.DB, inv.id)
    return c.json({ ok: true })
  }

  // 按日期升序，從剩餘交易重算均成、股數、已實現損益
  const sorted = [...remaining].sort((a, b) => a.date.localeCompare(b.date))
  let shares = 0
  let avgCost = 0
  let realizedPnl = 0
  for (const t of sorted) {
    if (t.type === '買入') {
      const newShares = shares + t.shares
      avgCost = newShares > 0 ? (shares * avgCost + t.shares * t.price) / newShares : t.price
      shares = newShares
    } else {
      realizedPnl += (t.price - avgCost) * t.shares
      shares = Math.max(0, shares - t.shares)
    }
  }

  if (shares === 0) {
    // 重算後股數為 0：如果持倉存在則刪除
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
    realized_pnl: Math.round(realizedPnl),
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
