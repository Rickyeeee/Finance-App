// 生成 iOS 捷徑 binary plist
const bplistCreator = require('bplist-creator')
const fs = require('fs')
const path = require('path')

const BASE = 'https://ricky-finance.ke877857.workers.dev'

// ── 格式 helpers ──

function simpleText(str) {
  return {
    WFSerializationType: 'WFTextTokenString',
    Value: { string: str, attachmentsByRange: {} }
  }
}

// 組合有變數插值的文字
// parts: 字串或 { v: 'varName' }
function textWithVars(parts) {
  let str = ''
  const attachments = {}
  for (const part of parts) {
    if (typeof part === 'string') {
      str += part
    } else {
      attachments[`{${str.length}, 1}`] = { Type: 'Variable', VariableName: part.v }
      str += '￼'
    }
  }
  return {
    WFSerializationType: 'WFTextTokenString',
    Value: { string: str, attachmentsByRange: attachments }
  }
}

// 變數引用（作為 action 的輸入參數）
function varRef(name) {
  return {
    WFSerializationType: 'WFTextTokenAttachment',
    Value: { Type: 'Variable', VariableName: name }
  }
}

// HTTP headers dict
function headerDict(pairs) {
  return {
    WFSerializationType: 'WFDictionaryFieldValue',
    Value: {
      WFDictionaryFieldValueItems: pairs.map(([k, v]) => ({
        WFItemType: 0,
        WFKey: simpleText(k),
        WFValue: typeof v === 'string' ? simpleText(v) : v
      }))
    }
  }
}

// ── Action factories ──
const a = {
  text: (content) => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.gettext',
    WFWorkflowActionParameters: {
      WFTextActionText: typeof content === 'string' ? simpleText(content) : content
    }
  }),

  setVar: (name) => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.setvariable',
    WFWorkflowActionParameters: { WFVariableName: name }
  }),

  getVar: (name) => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.getvariable',
    WFWorkflowActionParameters: { WFVariableName: name }
  }),

  askNumber: (prompt) => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.ask',
    WFWorkflowActionParameters: {
      WFAskActionPrompt: prompt,
      WFInputType: 'Number',
      WFAskActionDefaultAnswerNumber: 0
    }
  }),

  askText: (prompt) => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.ask',
    WFWorkflowActionParameters: {
      WFAskActionPrompt: prompt,
      WFInputType: 'Text'
    }
  }),

  list: (items) => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.list',
    WFWorkflowActionParameters: {
      WFListItems: items.map(item => ({
        WFItemType: 0,
        WFValue: simpleText(item)
      }))
    }
  }),

  chooseFromList: (prompt) => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.choosefromlist',
    WFWorkflowActionParameters: {
      WFChooseFromListActionPrompt: prompt,
      WFChooseFromListActionSelectMultiple: false,
      WFChooseFromListActionSelectAll: false
    }
  }),

  getContentGET: (url, headers) => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl',
    WFWorkflowActionParameters: {
      WFHTTPMethod: 'GET',
      WFURL: simpleText(url),
      WFHTTPHeaders: headerDict(headers),
      ShowHeaders: false
    }
  }),

  getContentPOST: (url, headers, bodyVarName) => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl',
    WFWorkflowActionParameters: {
      WFHTTPMethod: 'POST',
      WFURL: simpleText(url),
      WFHTTPHeaders: headerDict(headers),
      WFHTTPBodyType: 'File',
      WFRequestVariable: varRef(bodyVarName),
      ShowHeaders: false
    }
  }),

  getDictFromInput: () => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.getdictionaryfrominput',
    WFWorkflowActionParameters: {}
  }),

  getDictValue: (key) => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.getdictionaryvalue',
    WFWorkflowActionParameters: {
      WFDictionaryKey: key,
      WFGetDictionaryValueType: 'Value'
    }
  }),

  currentDate: () => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.date',
    WFWorkflowActionParameters: { WFDateActionMode: 'Current Date' }
  }),

  formatDate: (fmt) => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.format.date',
    WFWorkflowActionParameters: {
      WFDateFormat: 'Custom',
      WFDateFormatCustom: fmt
    }
  }),

  notify: (title, body) => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.notification',
    WFWorkflowActionParameters: {
      WFNotificationActionTitle: typeof title === 'string' ? simpleText(title) : title,
      WFNotificationActionBody: typeof body === 'string' ? simpleText(body) : body,
      WFNotificationActionSound: true
    }
  })
}

const authHeader = textWithVars(['Bearer ', { v: 'apiToken' }])

// ── 捷徑動作序列 ──
const actions = [
  // [0] Token — WFWorkflowImportQuestions 會讓使用者在安裝時填入
  a.text(''),
  a.setVar('apiToken'),

  // 金額
  a.askNumber('💰 金額'),
  a.setVar('amount'),

  // 名稱
  a.askText('📝 這筆叫什麼？'),
  a.setVar('txnName'),

  // 收支類型
  a.list(['支出', '收入']),
  a.chooseFromList('💳 收支類型'),
  a.setVar('txnType'),

  // 分類（固定清單）
  a.list(['飲食', '交通', '購物', '娛樂', '訂閱', '醫療', '住家', '其他']),
  a.chooseFromList('🏷 選分類'),
  a.setVar('category'),

  // 從 API 取帳戶清單
  a.getContentGET(`${BASE}/api/shortcut/data`, [
    ['Authorization', authHeader]
  ]),
  a.getDictFromInput(),
  a.setVar('metaDict'),
  a.getVar('metaDict'),
  a.getDictValue('accounts'),
  a.setVar('accountList'),
  a.getVar('accountList'),
  a.chooseFromList('🏦 選帳戶'),
  a.setVar('account'),

  // 今天日期
  a.currentDate(),
  a.formatDate('yyyy-MM-dd'),
  a.setVar('dateStr'),

  // 組 JSON body
  a.text(textWithVars([
    '{"name":"', { v: 'txnName' },
    '","amount":', { v: 'amount' },
    ',"date":"', { v: 'dateStr' },
    '","type":"', { v: 'txnType' },
    '","category":"', { v: 'category' },
    '","card":"', { v: 'account' },
    '"}'
  ])),
  a.setVar('jsonBody'),

  // POST
  a.getContentPOST(`${BASE}/api/transactions`, [
    ['Authorization', authHeader],
    ['Content-Type', 'application/json']
  ], 'jsonBody'),

  // 通知
  a.notify(
    '✅ 記帳完成',
    textWithVars([{ v: 'txnName' }, ' NT$', { v: 'amount' }])
  )
]

const shortcut = {
  WFWorkflowActions: actions,
  WFWorkflowClientVersion: '1446',
  WFWorkflowHasOutputFallback: false,
  WFWorkflowIcon: {
    WFWorkflowIconGlyphNumber: 59512,
    WFWorkflowIconStartColor: 946986751
  },
  WFWorkflowImportQuestions: [
    {
      ActionIndex: 0,
      Category: 'Parameter',
      DefaultValue: '',
      ParameterKey: 'WFTextActionText',
      Text: '貼上你的 Auth Token（在記帳 App → 快捷設定頁面複製）'
    }
  ],
  WFWorkflowInputContentItemClasses: [],
  WFWorkflowMinimumClientVersion: 900,
  WFWorkflowName: '記帳',
  WFWorkflowTypes: []
}

const buf = bplistCreator(shortcut)
const out = path.join(__dirname, '../public/ricky-finance.shortcut')
fs.writeFileSync(out, buf)
console.log('✅ Shortcut generated:', out)
