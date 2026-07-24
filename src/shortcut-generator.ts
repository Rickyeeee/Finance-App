// 動態生成 iOS 捷徑 binary plist（在 Worker 內執行）
// @ts-ignore
import bplistCreator from 'bplist-creator'

const BASE = 'https://ricky-finance.ke877857.workers.dev'

function simpleText(str: string) {
  return {
    WFSerializationType: 'WFTextTokenString',
    Value: { string: str, attachmentsByRange: {} }
  }
}

function textWithVars(parts: (string | { v: string })[]) {
  let str = ''
  const attachments: Record<string, { Type: string; VariableName: string }> = {}
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

function varRef(name: string) {
  return {
    WFSerializationType: 'WFTextTokenAttachment',
    Value: { Type: 'Variable', VariableName: name }
  }
}

function headerDict(pairs: [string, string | object][]) {
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

const a = {
  text: (content: string | object) => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.gettext',
    WFWorkflowActionParameters: {
      WFTextActionText: typeof content === 'string' ? simpleText(content) : content
    }
  }),
  setVar: (name: string) => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.setvariable',
    WFWorkflowActionParameters: { WFVariableName: name }
  }),
  getVar: (name: string) => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.getvariable',
    WFWorkflowActionParameters: { WFVariableName: name }
  }),
  askNumber: (prompt: string) => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.ask',
    WFWorkflowActionParameters: { WFAskActionPrompt: prompt, WFInputType: 'Number', WFAskActionDefaultAnswerNumber: 0 }
  }),
  askText: (prompt: string) => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.ask',
    WFWorkflowActionParameters: { WFAskActionPrompt: prompt, WFInputType: 'Text' }
  }),
  list: (items: string[]) => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.list',
    WFWorkflowActionParameters: {
      WFListItems: items.map(item => ({ WFItemType: 0, WFValue: simpleText(item) }))
    }
  }),
  chooseFromList: (prompt: string) => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.choosefromlist',
    WFWorkflowActionParameters: {
      WFChooseFromListActionPrompt: prompt,
      WFChooseFromListActionSelectMultiple: false,
      WFChooseFromListActionSelectAll: false
    }
  }),
  getContentGET: (url: string, headers: [string, string | object][]) => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl',
    WFWorkflowActionParameters: { WFHTTPMethod: 'GET', WFURL: simpleText(url), WFHTTPHeaders: headerDict(headers), ShowHeaders: false }
  }),
  getContentPOST: (url: string, headers: [string, string | object][], bodyVarName: string) => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl',
    WFWorkflowActionParameters: {
      WFHTTPMethod: 'POST', WFURL: simpleText(url),
      WFHTTPHeaders: headerDict(headers),
      WFHTTPBodyType: 'File', WFRequestVariable: varRef(bodyVarName), ShowHeaders: false
    }
  }),
  getDictFromInput: () => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.getdictionaryfrominput',
    WFWorkflowActionParameters: {}
  }),
  getDictValue: (key: string) => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.getdictionaryvalue',
    WFWorkflowActionParameters: { WFDictionaryKey: key, WFGetDictionaryValueType: 'Value' }
  }),
  currentDate: () => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.date',
    WFWorkflowActionParameters: { WFDateActionMode: 'Current Date' }
  }),
  formatDate: (fmt: string) => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.format.date',
    WFWorkflowActionParameters: { WFDateFormat: 'Custom', WFDateFormatCustom: fmt }
  }),
  notify: (title: string | object, body: string | object) => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.notification',
    WFWorkflowActionParameters: {
      WFNotificationActionTitle: typeof title === 'string' ? simpleText(title) : title,
      WFNotificationActionBody: typeof body === 'string' ? simpleText(body) : body,
      WFNotificationActionSound: true
    }
  })
}

export function generateShortcut(token: string): Uint8Array {
  const authHeader = simpleText(`Bearer ${token}`)

  const actions = [
    // Token（直接內嵌，不需要 import question）
    a.text(token),
    a.setVar('apiToken'),

    a.askNumber('💰 金額'),
    a.setVar('amount'),

    a.askText('📝 這筆叫什麼？'),
    a.setVar('txnName'),

    a.list(['支出', '收入']),
    a.chooseFromList('💳 收支類型'),
    a.setVar('txnType'),

    a.list(['飲食', '交通', '購物', '娛樂', '訂閱', '醫療', '住家', '其他']),
    a.chooseFromList('🏷 選分類'),
    a.setVar('category'),

    // 從 API 取帳戶清單
    a.getContentGET(`${BASE}/api/shortcut/data`, [['Authorization', authHeader]]),
    a.getDictFromInput(),
    a.setVar('metaDict'),
    a.getVar('metaDict'),
    a.getDictValue('accounts'),
    a.setVar('accountList'),
    a.getVar('accountList'),
    a.chooseFromList('🏦 選帳戶'),
    a.setVar('account'),

    a.currentDate(),
    a.formatDate('yyyy-MM-dd'),
    a.setVar('dateStr'),

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

    a.getContentPOST(`${BASE}/api/transactions`, [
      ['Authorization', authHeader],
      ['Content-Type', 'application/json']
    ], 'jsonBody'),

    a.notify('✅ 記帳完成', textWithVars([{ v: 'txnName' }, ' $', { v: 'amount' }]))
  ]

  const shortcut = {
    WFWorkflowActions: actions,
    WFWorkflowClientVersion: '1446',
    WFWorkflowHasOutputFallback: false,
    WFWorkflowIcon: { WFWorkflowIconGlyphNumber: 59512, WFWorkflowIconStartColor: 946986751 },
    WFWorkflowImportQuestions: [],
    WFWorkflowInputContentItemClasses: [],
    WFWorkflowMinimumClientVersion: 900,
    WFWorkflowName: '記帳',
    WFWorkflowTypes: []
  }

  return bplistCreator(shortcut) as Uint8Array
}
