/**
 * 第六阶段 · 数据分析 的公共契约（F 交付，未并入 P 的 research-contracts.ts）。
 *
 * 为什么不直接改 src/types/research-contracts.ts：该文件由 P 维护，F 只新增、不修改。
 *
 * 验收标准（docs/mvp-scope-and-status.md）：
 *   「原件/字段/质检/处理口径/统计结果可追溯；采用输入与运行分开；
 *     计算完成与保存分开；确认后固定用于报告的结果」
 *
 * 拆成四条可判定的条件（详 docs/f-proposal-6-analysis.md）：
 *   C1 输入可追溯 —— 数据集指纹 + 一题一列的字段映射 + 编码/有效值/缺失口径齐全。
 *   C2 质检闭环   —— 每处问题都要有处理动作，「剔除/插补/重编码」必须写清为什么。
 *   C3 运行与输入分开 —— 运行记录带 inputSignature；输入一变结果自动作废，不靠布尔值。
 *   C4 采用是联合指纹 —— 采用记录 (inputSignature, runId) 这一对，不是一个「已确认」开关。
 *
 * 三处与提案不同（都是收紧，不是放宽），见 docs/f-component-handoff-6-analysis.md §8：
 *   1. dataset / run / result 是 **props**，不在 draft 里 —— 落盘草稿里根本不存在结果表，
 *      也就没有把编造的表写进 localStorage 再声称是运行产物的路径。
 *   2. AnalysisResult 用 rowSources: string[][]（与结果行等长）而不是扁平 sourceRowIds，
 *      否则「下钻原始行」只能给出全表一个大列表，等于没有下钻。
 *   3. 输入指纹除提案列的字段外还包含 field.measureId —— 换个变量就是换个统计口径。
 */
import type { ContestUnknown, DraftContext } from '../../types/research-contracts'
import { createUuid } from '../../utils/uuid'
import type { MeasureLevel, PlanMeasure, ResearchPlanDraft } from './plan-contract'
import type { QuestionnaireDraft } from './questionnaire-contract'

// ── 枚举 ───────────────────────────────────────────────────────────────────

export type ColumnGuess = 'text' | 'number' | 'date' | 'empty'

/** 用途：进分析 / 只做识别 / 不进分析。 */
export type FieldRole = 'measure' | 'identifier' | 'ignore'

export type QualityKind = 'missing' | 'outlier' | 'duplicate' | 'ineligible' | 'mismatch'

export type QualityAction = 'keep' | 'exclude' | 'impute' | 'recode' | 'undecided'

export type ImpactSeverity = 'hint' | 'warning' | 'critical'

export type RunStatus = 'succeeded' | 'failed' | 'running'

/** 结果可用性：由运行记录与当前输入指纹推导，不落盘。 */
export type ResultState = 'no-dataset' | 'not-run' | 'running' | 'failed' | 'stale' | 'no-result' | 'ready'

/** 能否用于报告：由采用记录与「当前输入 + 当前运行」推导，不落盘。 */
export type ReportState = 'blocked' | 'none' | 'ready' | 'drifted'

// ── 数据集（BB 提供，F 只读）───────────────────────────────────────────────

export interface DatasetColumn {
  name: string
  /** 解析器推断的类型；只是建议，最终以字段核对为准 */
  guess: ColumnGuess
}

export interface AnalysisDataset {
  /** 数据集指纹：文件哈希 + 解析器版本，任一变了就不能复用旧结果 */
  signature: string
  /** 原始文件名，只用于显示 */
  fileName: string
  rowCount: number
  /** 列名清单；顺序即原始列顺序 */
  columns: DatasetColumn[]
  /** 前若干行样例，供映射时对照（只读，可空） */
  sampleRows: Record<string, string | number | null>[]
}

// ── 草稿（F 负责编辑与落盘）────────────────────────────────────────────────

export interface FieldMapping {
  id: string
  /** 阶段 4 的题目 id；'' = 该列不对应任何题（如受访者编号） */
  questionId: string
  /** 阶段 3 的变量 id；'' = 该列不进分析 */
  measureId: string
  /** 数据集里的列名 */
  column: string
  role: FieldRole
  /** 编码：选项/取值 → 数字代码；空表示原件已是编码值 */
  coding: string
  /** 有效值范围（如「1-5 的整数」），留空视为未核 */
  validRange: string
  /** 缺失值口径：空单元格 / 99 / 拒答编码 */
  missingRule: string
}

export interface QualityIssue {
  id: string
  kind: QualityKind
  /** 涉及字段（列名）；'' = 整行层面 */
  column: string
  /** 受影响行数（用户填真实值，不自动统计） */
  affectedRows: number | null
  /** 具体表现 */
  detail: string
  action: QualityAction
  /** action 为 exclude / impute / recode 时必填：为什么这么处理 */
  actionNote: string
  /** 处理后是否已复核 */
  reviewed: boolean
}

export interface ImpactItem {
  id: string
  /** 影响的结论/表格 */
  target: string
  severity: ImpactSeverity
  /** 变更内容 */
  change: string
  /** 影响判断 */
  effect: string
  resolved: boolean
}

export interface AnalysisAdoption {
  /** 采用时的输入指纹；'' = 尚未采用 */
  signature: string
  /** 采用时用的运行 id —— 与 signature 一起构成联合指纹 */
  runId: string
  note: string
}

export interface AnalysisDraft {
  /** 数据集为什么是这一份 */
  datasetNote: string
  fields: FieldMapping[]
  quality: { issues: QualityIssue[]; rule: string }
  impacts: ImpactItem[]
  /** 结果的一句话结论（用户写，不由组件生成） */
  resultNote: string
  adoption: AnalysisAdoption
  otherNote: string
  unknowns: ContestUnknown[]
}

// ── 运行与结果（BB 提供，本阶段只读 props）─────────────────────────────────

export interface AnalysisRun {
  runId: string
  /** 什么时候跑的（ISO 8601 带时区） */
  startedAt: string
  status: RunStatus
  /** 失败原因；status === 'failed' 时必填 */
  failureReason: string
  /** 运行时用的输入指纹，必须与当前输入指纹一致才算这个结果有效 */
  inputSignature: string
}

export interface AnalysisResult {
  /** 表头 + 行；数值单独一列，避免字符串排序 */
  table: { headers: string[]; rows: (string | number | null)[][] }
  /** 与 rows 等长：每行结果对应的原始记录 id，用于逐行下钻 */
  rowSources: string[][]
}

/** 宿主侧的一份可落盘载荷：数据集/运行/结果都不进草稿。 */
export interface AnalysisPayload {
  dataset: AnalysisDataset | null
  run: AnalysisRun | null
  result: AnalysisResult | null
}

// ── 组件契约 ───────────────────────────────────────────────────────────────

export interface AnalysisUpstream {
  /** 第三阶段研究方案：变量清单与尺度 */
  plan: ResearchPlanDraft | null
  /** 第四阶段问卷：题目清单，用于「这一列是哪一题」 */
  questionnaire: QuestionnaireDraft | null
}

export interface AnalysisEditorProps {
  context: DraftContext
  draft: AnalysisDraft
  upstream: AnalysisUpstream
  dataset: AnalysisDataset | null
  run: AnalysisRun | null
  result: AnalysisResult | null
  readOnly: boolean
  issues: string[]
}

export interface AnalysisDraftUpdate {
  context: DraftContext
  draft: AnalysisDraft
}

// ── 选项表 ─────────────────────────────────────────────────────────────────

export const FIELD_ROLE_OPTIONS: { value: FieldRole; label: string; hint: string }[] = [
  { value: 'measure', label: '分析变量', hint: '进入统计，必须有变量、编码与缺失口径' },
  { value: 'identifier', label: '仅识别', hint: '受访者编号、时间戳等，用于下钻定位，不进统计' },
  { value: 'ignore', label: '不进分析', hint: '原始文件里的多余列，明确排除比默默留着好' },
]

export const QUALITY_KIND_OPTIONS: { value: QualityKind; label: string }[] = [
  { value: 'missing', label: '缺失值' },
  { value: 'outlier', label: '异常值' },
  { value: 'duplicate', label: '重复作答' },
  { value: 'ineligible', label: '不符条件' },
  { value: 'mismatch', label: '逻辑不一致' },
]

export const QUALITY_ACTION_OPTIONS: { value: QualityAction; label: string; hint: string }[] = [
  { value: 'keep', label: '保留', hint: '核实后确认是真实值，原样进入分析' },
  { value: 'exclude', label: '剔除', hint: '整行或该值不进入分析，必须写清判断依据' },
  { value: 'impute', label: '插补', hint: '用均值/中位数/前值补上，必须写清方法与影响' },
  { value: 'recode', label: '重编码', hint: '把取值改成可分析的形式，必须写清映射规则' },
  { value: 'undecided', label: '待定', hint: '还没决定——只要留着一条，质检就不算闭环' },
]

export const IMPACT_SEVERITY_OPTIONS: { value: ImpactSeverity; label: string }[] = [
  { value: 'hint', label: '轻微' },
  { value: 'warning', label: '需说明' },
  { value: 'critical', label: '影响结论' },
]

export const RUN_STATUS_OPTIONS: { value: RunStatus; label: string }[] = [
  { value: 'succeeded', label: '成功' },
  { value: 'failed', label: '失败' },
  { value: 'running', label: '进行中' },
]

const ROLES: FieldRole[] = FIELD_ROLE_OPTIONS.map((item) => item.value)
const KINDS: QualityKind[] = QUALITY_KIND_OPTIONS.map((item) => item.value)
const ACTIONS: QualityAction[] = QUALITY_ACTION_OPTIONS.map((item) => item.value)
const SEVERITIES: ImpactSeverity[] = IMPACT_SEVERITY_OPTIONS.map((item) => item.value)
const STATUSES: RunStatus[] = RUN_STATUS_OPTIONS.map((item) => item.value)
const GUESSES: ColumnGuess[] = ['text', 'number', 'date', 'empty']

/** 需要落到数据列里的变量：问卷新采与已有资料，访谈/观察不一定有表格。 */
const DATA_MEASURES_INSTRUMENTS = ['questionnaire', 'existing']

// ── 构造 ───────────────────────────────────────────────────────────────────

export function emptyFieldMapping(): FieldMapping {
  return {
    id: `f-${createUuid()}`,
    questionId: '',
    measureId: '',
    column: '',
    role: 'measure',
    coding: '',
    validRange: '',
    missingRule: '',
  }
}

export function emptyQualityIssue(): QualityIssue {
  return {
    id: `q-${createUuid()}`,
    kind: 'missing',
    column: '',
    affectedRows: null,
    detail: '',
    action: 'undecided',
    actionNote: '',
    reviewed: false,
  }
}

export function emptyImpactItem(): ImpactItem {
  return { id: `i-${createUuid()}`, target: '', severity: 'hint', change: '', effect: '', resolved: false }
}

export function emptyAnalysisDraft(): AnalysisDraft {
  return {
    datasetNote: '',
    fields: [],
    quality: { issues: [], rule: '' },
    impacts: [],
    resultNote: '',
    adoption: { signature: '', runId: '', note: '' },
    otherNote: '',
    unknowns: [],
  }
}

export function emptyAnalysisPayload(): AnalysisPayload {
  return { dataset: null, run: null, result: null }
}

// ── 清洗 ───────────────────────────────────────────────────────────────────

const isStr = (value: unknown): value is string => typeof value === 'string'
const isBool = (value: unknown): value is boolean => typeof value === 'boolean'
const isNumOrNull = (value: unknown): value is number | null => value === null || typeof value === 'number'

/**
 * 清洗落盘值。与 P 的 normalizeCompetitionDraft 同口径：结构不符返回 null，
 * 让外壳拒绝覆盖而不是悄悄存进半成品。
 */
export function normalizeAnalysisDraft(value: any): AnalysisDraft | null {
  if (!value || typeof value !== 'object') return null
  if (!Array.isArray(value.fields) || !Array.isArray(value.impacts) || !Array.isArray(value.unknowns)) return null
  if (!isStr(value.datasetNote) || !isStr(value.resultNote) || !isStr(value.otherNote)) return null

  const quality = value.quality
  if (!quality || !isStr(quality.rule) || !Array.isArray(quality.issues)) return null

  const adoption = value.adoption
  if (!adoption || !isStr(adoption.signature) || !isStr(adoption.runId) || !isStr(adoption.note)) return null

  if (
    value.fields.some(
      (item: any) =>
        !item ||
        !isStr(item.id) ||
        !isStr(item.questionId) ||
        !isStr(item.measureId) ||
        !isStr(item.column) ||
        !ROLES.includes(item.role) ||
        !isStr(item.coding) ||
        !isStr(item.validRange) ||
        !isStr(item.missingRule),
    )
  )
    return null

  if (
    quality.issues.some(
      (item: any) =>
        !item ||
        !isStr(item.id) ||
        !KINDS.includes(item.kind) ||
        !isStr(item.column) ||
        !isNumOrNull(item.affectedRows) ||
        !isStr(item.detail) ||
        !ACTIONS.includes(item.action) ||
        !isStr(item.actionNote) ||
        !isBool(item.reviewed),
    )
  )
    return null

  if (
    value.impacts.some(
      (item: any) =>
        !item ||
        !isStr(item.id) ||
        !isStr(item.target) ||
        !SEVERITIES.includes(item.severity) ||
        !isStr(item.change) ||
        !isStr(item.effect) ||
        !isBool(item.resolved),
    )
  )
    return null

  if (
    value.unknowns.some(
      (item: any) => !item || !isStr(item.id) || !isStr(item.text) || !isBool(item.blocksDecision),
    )
  )
    return null

  return {
    datasetNote: value.datasetNote,
    fields: value.fields.map((item: FieldMapping) => ({
      id: item.id,
      questionId: item.questionId,
      measureId: item.measureId,
      column: item.column,
      role: item.role,
      coding: item.coding,
      validRange: item.validRange,
      missingRule: item.missingRule,
    })),
    quality: {
      rule: quality.rule,
      issues: quality.issues.map((item: QualityIssue) => ({
        id: item.id,
        kind: item.kind,
        column: item.column,
        affectedRows: item.affectedRows,
        detail: item.detail,
        action: item.action,
        actionNote: item.actionNote,
        reviewed: item.reviewed,
      })),
    },
    impacts: value.impacts.map((item: ImpactItem) => ({
      id: item.id,
      target: item.target,
      severity: item.severity,
      change: item.change,
      effect: item.effect,
      resolved: item.resolved,
    })),
    resultNote: value.resultNote,
    adoption: { signature: adoption.signature, runId: adoption.runId, note: adoption.note },
    otherNote: value.otherNote,
    unknowns: value.unknowns.map((item: ContestUnknown) => ({
      id: item.id,
      text: item.text,
      blocksDecision: item.blocksDecision,
    })),
  }
}

function normalizeColumn(value: any): DatasetColumn | null {
  if (!value || !isStr(value.name)) return null
  return { name: value.name, guess: GUESSES.includes(value.guess) ? value.guess : 'text' }
}

export function normalizeDataset(value: any): AnalysisDataset | null {
  if (!value || typeof value !== 'object') return null
  if (!isStr(value.signature) || !isStr(value.fileName)) return null
  if (typeof value.rowCount !== 'number' || !Number.isFinite(value.rowCount) || value.rowCount < 0) return null
  if (!Array.isArray(value.columns)) return null
  const columns: DatasetColumn[] = []
  for (const item of value.columns) {
    const column = normalizeColumn(item)
    if (!column) return null
    columns.push(column)
  }
  const sampleRows = Array.isArray(value.sampleRows)
    ? value.sampleRows.filter((row: any) => row && typeof row === 'object').slice(0, 10)
    : []
  return { signature: value.signature, fileName: value.fileName, rowCount: value.rowCount, columns, sampleRows }
}

export function normalizeRun(value: any): AnalysisRun | null {
  if (!value || typeof value !== 'object') return null
  if (!isStr(value.runId) || !isStr(value.startedAt) || !STATUSES.includes(value.status)) return null
  if (!isStr(value.failureReason) || !isStr(value.inputSignature)) return null
  return {
    runId: value.runId,
    startedAt: value.startedAt,
    status: value.status,
    failureReason: value.failureReason,
    inputSignature: value.inputSignature,
  }
}

export function normalizeResult(value: any): AnalysisResult | null {
  if (!value || typeof value !== 'object') return null
  const table = value.table
  if (!table || !Array.isArray(table.headers) || !Array.isArray(table.rows)) return null
  if (table.headers.some((header: any) => !isStr(header))) return null
  if (table.rows.some((row: any) => !Array.isArray(row) || row.some((cell: any) => !(cell === null || isStr(cell) || typeof cell === 'number'))))
    return null
  const rowSources: string[][] = Array.isArray(value.rowSources)
    ? value.rowSources.map((list: any) => (Array.isArray(list) ? list.filter(isStr) : []))
    : []
  return { table: { headers: [...table.headers], rows: table.rows.map((row: any[]) => [...row]) }, rowSources }
}

/** 载荷缺失一律补空，不抛错：新加的阶段不能把旧任务整份打不开。 */
export function normalizeAnalysisPayload(value: any): AnalysisPayload {
  if (!value || typeof value !== 'object') return emptyAnalysisPayload()
  return {
    dataset: value.dataset == null ? null : normalizeDataset(value.dataset),
    run: value.run == null ? null : normalizeRun(value.run),
    result: value.result == null ? null : normalizeResult(value.result),
  }
}

// ── 指纹 ───────────────────────────────────────────────────────────────────

/** FNV-1a 32 位，取 8 位十六进制。与阶段 3、4 同一算法，便于跨阶段核对。 */
export function fnv1a(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

/**
 * 输入指纹：只覆盖「会改变统计数字的东西」。
 *
 * 刻意排除：
 *   - quality.issues[].detail / actionNote / reviewed —— 补一句说明不该让已跑出的结果失效
 *   - action 为 keep / undecided 的质检项 —— 它们不改变进入分析的数据
 *   - affectedRows —— 那是用户登记的受影响行数（证据），不是处理口径本身
 *   - questionId / datasetNote / resultNote —— 只是溯源与叙述
 *
 * 包含 field.measureId：换个变量就是换个统计口径（提案只列了列名/用途/编码/范围/缺失口径）。
 */
export function analysisInputSignature(draft: AnalysisDraft, dataset: AnalysisDataset | null): string {
  const fields = draft.fields
    .map((field) => [
      field.column,
      field.role,
      field.measureId,
      field.coding.trim(),
      field.validRange.trim(),
      field.missingRule.trim(),
    ])
    .sort((a, b) => (a[0] === b[0] ? (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0) : a[0] < b[0] ? -1 : 1))

  const quality = draft.quality.issues
    .filter((issue) => issue.action !== 'keep' && issue.action !== 'undecided')
    .map((issue) => `${issue.column}|${issue.kind}|${issue.action}`)
    .sort()

  return fnv1a(JSON.stringify({ dataset: dataset ? dataset.signature : '', fields, quality }))
}

/** 数据集指纹：解析器没有给 hash 时，由宿主按内容派生一份（只用于本机演示口径）。 */
export function deriveDatasetSignature(fileName: string, rowCount: number, columns: DatasetColumn[]): string {
  return fnv1a(JSON.stringify({ fileName, rowCount, columns: columns.map((column) => `${column.name}:${column.guess}`) }))
}

// ── 三个推导状态（都不落盘）────────────────────────────────────────────────

export interface ResultStateInfo {
  state: ResultState
  reasons: string[]
}

/**
 * 结果可用性。顺序即优先级：
 *   no-dataset 还没有数据集；not-run 还没跑过；running 正在跑；failed 跑失败；
 *   stale 输入改过、结果是旧输入跑出来的；ready 可以引用。
 */
export function resultState(
  draft: AnalysisDraft,
  dataset: AnalysisDataset | null,
  run: AnalysisRun | null,
  result: AnalysisResult | null = null,
): ResultStateInfo {
  if (!dataset) return { state: 'no-dataset', reasons: ['还没有数据集概览，无法核对输入。'] }
  if (!run) return { state: 'not-run', reasons: ['还没有运行记录：本页不执行统计，需要由统计侧跑出结果后登记。'] }
  if (run.status === 'running') return { state: 'running', reasons: ['统计还在运行中。'] }
  if (run.status === 'failed')
    return {
      state: 'failed',
      reasons: [run.failureReason.trim() ? `上次运行失败：${run.failureReason}` : '上次运行失败，但没有记录失败原因。'],
    }
  const current = analysisInputSignature(draft, dataset)
  if (run.inputSignature !== current)
    return { state: 'stale', reasons: [`输入已改动（当前指纹 ${current}，运行指纹 ${run.inputSignature}），这份结果是旧输入跑出来的。`] }
  if (!result) return { state: 'no-result', reasons: ['运行记录是成功，但没有对应的结果表。'] }
  return { state: 'ready', reasons: [`运行指纹与当前输入一致（${current}）。`] }
}

export interface ReportStateInfo {
  state: ReportState
  reasons: string[]
}

/** 能否用于报告：采用时的 (输入指纹, 运行 id) 必须同时等于现在的这一对。 */
export function reportState(
  draft: AnalysisDraft,
  dataset: AnalysisDataset | null,
  run: AnalysisRun | null,
  result: AnalysisResult | null = null,
): ReportStateInfo {
  const resultInfo = resultState(draft, dataset, run, result)
  const adoption = draft.adoption
  if (!adoption.signature)
    return {
      state: 'blocked',
      reasons: ['结果还没有采用为报告依据。', ...(resultInfo.state === 'ready' ? [] : resultInfo.reasons)],
    }
  if (resultInfo.state !== 'ready')
    return { state: 'blocked', reasons: ['当前结果本身不可用，采用记录不能生效。', ...resultInfo.reasons] }
  const current = analysisInputSignature(draft, dataset)
  if (adoption.signature !== current) return { state: 'drifted', reasons: ['采用之后输入又改过，需要重新采用。'] }
  if (!run || adoption.runId !== run.runId) return { state: 'drifted', reasons: ['采用之后换了一次运行，需要重新采用。'] }
  return { state: 'ready', reasons: ['采用的输入与运行都还是现在这一份。'] }
}

export interface QualityStateInfo {
  state: 'empty' | 'open' | 'closed'
  undecided: number
  missingNote: number
  reasons: string[]
}

/** 质检是否闭环：不留「待定」，非保留的处理必须有理由。 */
export function qualityState(draft: AnalysisDraft): QualityStateInfo {
  const issues = draft.quality.issues
  if (!issues.length) return { state: 'empty', undecided: 0, missingNote: 0, reasons: ['还没有记录任何数据问题。'] }
  const undecided = issues.filter((issue) => issue.action === 'undecided').length
  const missingNote = issues.filter(
    (issue) => issue.action !== 'keep' && issue.action !== 'undecided' && !issue.actionNote.trim(),
  ).length
  const reasons: string[] = []
  if (undecided) reasons.push(`还有 ${undecided} 处问题的处理动作是「待定」。`)
  if (missingNote) reasons.push(`有 ${missingNote} 处剔除/插补/重编码没写判断依据。`)
  return { state: undecided || missingNote ? 'open' : 'closed', undecided, missingNote, reasons }
}

// ── 局部提示（软，不进缺项）────────────────────────────────────────────────

export interface FieldHint {
  level: 'warn' | 'info'
  text: string
}

export function fieldHints(
  field: FieldMapping,
  index: number,
  draft: AnalysisDraft,
  upstream: AnalysisUpstream,
  dataset: AnalysisDataset | null,
): FieldHint[] {
  const hints: FieldHint[] = []
  const label = `第 ${index + 1} 条映射`

  if (field.role === 'measure' && !field.measureId) hints.push({ level: 'warn', text: `${label}是分析变量，但没挂第三阶段的变量。` })
  if (field.role !== 'measure' && field.measureId) hints.push({ level: 'warn', text: `${label}的用途不是「分析变量」，却挂了变量，统计不会用到它。` })
  if (field.role === 'measure' && field.measureId) {
    const measure = upstream.plan?.measures.find((item) => item.id === field.measureId)
    if (measure && !DATA_MEASURES_INSTRUMENTS.includes(measure.instrument))
      hints.push({ level: 'info', text: `${label}挂的变量是「${measure.instrument === 'interview' ? '访谈' : '观察'}」采集，通常不是表格列，请确认。` })
  }

  if (field.column && dataset && !dataset.columns.some((column) => column.name === field.column))
    hints.push({ level: 'warn', text: `${label}选的数据列「${field.column}」不在当前数据集列名里（可能文件换过或列名改了）。` })

  if (field.column) {
    const same = draft.fields.filter((item) => item.column === field.column)
    if (same.length > 1 && same.some((item) => item.role === 'measure'))
      hints.push({ level: 'info', text: `数据列「${field.column}」被映射了 ${same.length} 次，确认这是有意的（如多选拆成多个二分变量）。` })
  }

  if (field.role === 'measure' && field.questionId && !field.coding.trim()) {
    const question = upstream.questionnaire?.questions.find((item) => item.id === field.questionId)
    if (question && (question.type === 'single' || question.type === 'multi'))
      hints.push({ level: 'info', text: `${label}是多选/单选题，但没写编码。若原件里存的是文字选项，统计无法直接算。` })
  }

  return hints
}

export function qualityIssueHints(issue: QualityIssue, index: number, dataset: AnalysisDataset | null): FieldHint[] {
  const hints: FieldHint[] = []
  const label = `第 ${index + 1} 处问题`

  if (issue.action !== 'keep' && issue.action !== 'undecided' && !issue.reviewed)
    hints.push({ level: 'info', text: `${label}已决定处理方式，但还没标「已复核」。` })
  if (issue.affectedRows !== null && dataset && issue.affectedRows > dataset.rowCount)
    hints.push({ level: 'warn', text: `${label}的受影响行数（${issue.affectedRows}）超过数据集总行数（${dataset.rowCount}）。` })
  if (issue.kind === 'duplicate' && !issue.column)
    hints.push({ level: 'info', text: `${label}是重复作答，通常按整行判断，列名可以留空。` })
  if (issue.action === 'impute')
    hints.push({ level: 'info', text: `${label}用插补：请在依据里写清方法（均值/中位数/前值）与对结论的影响。` })

  return hints
}

export function impactHints(item: ImpactItem, index: number, draft: AnalysisDraft): FieldHint[] {
  const hints: FieldHint[] = []
  const label = `第 ${index + 1} 条影响`

  if (item.resolved && !item.effect.trim()) hints.push({ level: 'warn', text: `${label}标为已处理，但没写影响判断。` })
  if (item.severity === 'critical' && !item.resolved) hints.push({ level: 'warn', text: `${label}会影响结论，还没处理。` })
  if (!item.target.trim() && draft.fields.length)
    hints.push({ level: 'info', text: `${label}没写影响哪张表/哪个结论；写具体才能被复核。` })

  return hints
}

// ── 完整性检查 ─────────────────────────────────────────────────────────────

export interface AnalysisCheckResult {
  /** A 数据集与字段核对 */
  fields: string[]
  /** B 质检与处理口径 */
  quality: string[]
  /** C 处理影响说明 */
  impacts: string[]
  /** D 运行、结果与采用 */
  result: string[]
  /** 软提示：不进 issues，只在页尾展示 */
  hints: string[]
  /** 平铺后的硬缺项，供 props.issues 与状态标签使用 */
  all: string[]
}

export function checkAnalysis(
  draft: AnalysisDraft,
  upstream: AnalysisUpstream,
  dataset: AnalysisDataset | null,
  run: AnalysisRun | null,
  result: AnalysisResult | null,
): AnalysisCheckResult {
  const fields: string[] = []
  const quality: string[] = []
  const impacts: string[] = []
  const resultIssues: string[] = []
  const hints: string[] = []

  // ── A 数据集与字段 ──
  if (!dataset) {
    fields.push('还没有数据集概览：需要先登记文件名、行数与列名（正式版由数据侧解析结果自动填入）。')
  } else {
    if (!dataset.columns.length) fields.push('数据集没有列名，无法核对字段。')
    if (dataset.rowCount <= 0) fields.push('数据集行数为 0，没有可分析的数据。')
    if (!draft.datasetNote.trim()) fields.push('没写为什么用这一份数据集（哪次采集、哪一版导出）。')
    if (dataset.sampleRows.length === 0) hints.push('没有样例行：字段映射只能按列名判断，建议让数据侧提供前几行。')
  }

  if (!draft.fields.length) fields.push('还没有任何字段映射：问卷的题要落到具体的数据列。')

  for (const [index, field] of draft.fields.entries()) {
    const label = `第 ${index + 1} 条映射`
    if (!field.column.trim()) fields.push(`${label}没选数据列。`)
    if (field.role === 'measure') {
      if (!field.measureId) fields.push(`${label}是分析变量，但没挂第三阶段的变量。`)
      if (!field.coding.trim()) fields.push(`${label}没写编码口径（原件里存的是数字还是选项文字？）`)
      if (!field.validRange.trim()) fields.push(`${label}没写有效值范围，异常值无从判断。`)
      if (!field.missingRule.trim()) fields.push(`${label}没写缺失值口径（空单元格 / 99 / 拒答编码）。`)
    }
  }

  // 阶段 3 里应该进表格的变量，必须有列
  if (upstream.plan) {
    const mapped = new Set(draft.fields.filter((field) => field.role === 'measure').map((field) => field.measureId))
    for (const measure of dataMeasures(upstream.plan)) {
      if (!mapped.has(measure.id))
        fields.push(`变量「${measure.name.trim() || '未命名'}」没有对应的数据列，分析时不会有它的数据。`)
    }
  } else {
    hints.push('没有读到第三阶段方案，无法核对「每个变量都有数据列」。')
  }

  // ── B 质检 ──
  if (!draft.quality.rule.trim()) quality.push('还没写质检与处理口径：缺失、异常、重复分别怎么判定、怎么处理。')
  for (const [index, issue] of draft.quality.issues.entries()) {
    const label = `第 ${index + 1} 处问题`
    if (!issue.detail.trim()) quality.push(`${label}没写具体表现（哪个值、多少行、怎么发现的）。`)
    if (issue.affectedRows === null) quality.push(`${label}没填受影响行数。`)
    if (issue.action === 'undecided') quality.push(`${label}还没决定怎么处理。`)
    if (issue.action !== 'keep' && issue.action !== 'undecided' && !issue.actionNote.trim())
      quality.push(`${label}决定「${qualityActionLabel(issue.action)}」，但没写判断依据。`)
  }
  if (!draft.quality.issues.length) hints.push('没有记录任何数据问题：若数据确实干净，建议在处理口径里写清核对方式（如逐列查空、查越界）。')

  // ── C 处理影响 ──
  for (const [index, item] of draft.impacts.entries()) {
    const label = `第 ${index + 1} 条影响`
    if (!item.target.trim()) impacts.push(`${label}没写影响哪张表或哪个结论。`)
    if (!item.change.trim()) impacts.push(`${label}没写改了什么。`)
    if (item.severity === 'critical' && !item.resolved) impacts.push(`${label}会影响结论，但还没处理完。`)
  }
  if (draft.quality.issues.some((issue) => issue.action === 'exclude' || issue.action === 'impute' || issue.action === 'recode') && !draft.impacts.length)
    hints.push('已经对数据做过剔除/插补/重编码，但还没写处理影响说明。')

  // ── D 运行、结果与采用 ──
  const runInfo = resultState(draft, dataset, run, result)
  if (runInfo.state !== 'no-dataset') {
    if (runInfo.state === 'not-run') resultIssues.push('还没有运行记录：本页不跑统计，需要由统计侧跑出结果后登记。')
    else if (runInfo.state === 'failed') resultIssues.push(...runInfo.reasons)
    else if (runInfo.state === 'running') resultIssues.push('统计还在运行，结果尚未产出。')
    else if (runInfo.state === 'stale') resultIssues.push('输入改过，当前结果是用旧输入跑出来的，需要重跑或退回原输入。')
    else if (runInfo.state === 'no-result') resultIssues.push('运行记录是成功，但没有对应的结果表。')
  }
  if (run && run.status === 'failed' && !run.failureReason.trim()) resultIssues.push('运行失败但没记录失败原因。')
  if (result) {
    if (!result.table.headers.length) resultIssues.push('结果表没有表头。')
    if (!result.rowSources.length) hints.push('结果没有记录对应的原始行 id，下钻将无法定位到原件。')
    else if (result.rowSources.length !== result.table.rows.length)
      hints.push('原始行对应关系与结果行数不一致，下钻可能错行。')
  }
  if (runInfo.state === 'ready' && !draft.resultNote.trim()) resultIssues.push('运行已成功，但还没写结论一句话。')

  const report = reportState(draft, dataset, run, result)
  // 运行层已经报过「结果不可用」时，不再用采用层复述同一个原因，否则一处改动会冒出三条一样的提示
  if (report.state === 'blocked' && draft.adoption.signature && runInfo.state === 'ready')
    resultIssues.push(...report.reasons)
  if (report.state === 'drifted') resultIssues.push(...report.reasons)
  if (!draft.adoption.signature && runInfo.state === 'ready') resultIssues.push('结果还没采用为报告依据。')
  if (draft.adoption.signature && !draft.adoption.note.trim()) resultIssues.push('已采用为报告结果，但没写采用理由。')

  // 未知项
  for (const unknown of draft.unknowns) {
    if (unknown.blocksDecision) fields.push('阻碍当前决定的未知项：' + unknown.text)
  }

  return {
    fields,
    quality,
    impacts,
    result: resultIssues,
    hints,
    all: [...fields, ...quality, ...impacts, ...resultIssues],
  }
}

// ── 上游辅助 ───────────────────────────────────────────────────────────────

/** 第三阶段里应当落到数据列上的变量。 */
export function dataMeasures(plan: ResearchPlanDraft | null): PlanMeasure[] {
  if (!plan) return []
  return plan.measures.filter((item) => DATA_MEASURES_INSTRUMENTS.includes(item.instrument))
}

/** 问卷题目按题号顺序，供「这一列是哪一题」下拉使用。 */
export function questionnaireQuestions(questionnaire: QuestionnaireDraft | null) {
  return questionnaire ? questionnaire.questions : []
}

// ── 展示用文案 ─────────────────────────────────────────────────────────────

export function fieldRoleLabel(value: FieldRole): string {
  return FIELD_ROLE_OPTIONS.find((item) => item.value === value)?.label ?? '未定'
}

export function qualityKindLabel(value: QualityKind): string {
  return QUALITY_KIND_OPTIONS.find((item) => item.value === value)?.label ?? '其他'
}

export function qualityActionLabel(value: QualityAction): string {
  return QUALITY_ACTION_OPTIONS.find((item) => item.value === value)?.label ?? '待定'
}

export function impactSeverityLabel(value: ImpactSeverity): string {
  return IMPACT_SEVERITY_OPTIONS.find((item) => item.value === value)?.label ?? '未定'
}

export function runStatusLabel(value: RunStatus): string {
  return RUN_STATUS_OPTIONS.find((item) => item.value === value)?.label ?? '未定'
}

export function columnGuessLabel(value: ColumnGuess): string {
  if (value === 'number') return '数值'
  if (value === 'date') return '日期'
  if (value === 'empty') return '空列'
  return '文本'
}

export function resultStateLabel(value: ResultState): string {
  if (value === 'ready') return '结果可用'
  if (value === 'stale') return '输入已改，需重跑'
  if (value === 'failed') return '运行失败'
  if (value === 'running') return '运行中'
  if (value === 'not-run') return '尚未运行'
  if (value === 'no-result') return '缺结果表'
  return '无数据集'
}

export function reportStateLabel(value: ReportState): string {
  if (value === 'ready') return '已可用于报告'
  if (value === 'drifted') return '采用已失效'
  if (value === 'none') return '尚未采用'
  return '不可用于报告'
}

export function measureLevelLabel(value: MeasureLevel): string {
  if (value === 'nominal') return '分类'
  if (value === 'ordinal') return '等级'
  if (value === 'interval') return '等距'
  return '等比'
}
