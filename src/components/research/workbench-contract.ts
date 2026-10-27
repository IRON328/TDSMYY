/**
 * 工作台（智能体对话）组件契约 —— 第六阶段之外的独立组件组
 *
 * 设计基准：数模演易原型 v2 的工作台（顶栏步骤条 + 单栏对话流 + 右侧产物抽屉）。
 * 与市调现版原型的差别在于「人工决策」的位置：数模把决策做成对话流里的卡片，
 * 边聊边点；市调现版把它放到右栏独立面板，对话和决策被拆开。
 * 本契约按前者建模 —— 决策卡是对话流的一种消息项，不是独立面板。
 *
 * 本文件只放类型与纯函数，不做任何 I/O：
 *   - 组件不 fetch、不读写 localStorage、不碰 Pinia store
 *   - 所有状态由上游传入，所有动作经 emit 上报
 */

/** 市调六阶段。顺序即步骤条顺序，与登录页左侧的六步一致。 */
export type WorkbenchStepKey =
  | 'problem' // 明确问题
  | 'material' // 整理材料
  | 'questionnaire' // 核对问卷
  | 'analysis' // 分析数据
  | 'review' // 审阅发现
  | 'report' // 整理成果

export interface WorkbenchStepDef {
  key: WorkbenchStepKey
  index: number
  label: string
  /** 窄屏下的短标签（步骤条超过 900px 会切到这个） */
  short: string
}

export const WORKBENCH_STEPS: WorkbenchStepDef[] = [
  { key: 'problem', index: 1, label: '明确问题', short: '问题' },
  { key: 'material', index: 2, label: '整理材料', short: '材料' },
  { key: 'questionnaire', index: 3, label: '核对问卷', short: '问卷' },
  { key: 'analysis', index: 4, label: '分析数据', short: '分析' },
  { key: 'review', index: 5, label: '审阅发现', short: '审阅' },
  { key: 'report', index: 6, label: '整理成果', short: '成果' },
]

export type StepState = 'done' | 'active' | 'todo'

export interface WorkbenchStep extends WorkbenchStepDef {
  state: StepState
}

/**
 * 由「当前阶段 + 已确认阶段集合」推导整条步骤条。
 *
 * 刻意不落盘 done 布尔：阶段是否完成由上游的确认记录决定，
 * 传进来的是已确认集合，没传的一律算 todo。这样「回到上一步」重选后
 * 状态自动回退，不需要额外写清空逻辑。
 */
export function resolveSteps(
  activeKey: WorkbenchStepKey,
  confirmedKeys: WorkbenchStepKey[] = [],
): WorkbenchStep[] {
  const activeIndex = WORKBENCH_STEPS.findIndex((s) => s.key === activeKey)
  return WORKBENCH_STEPS.map((def, i) => {
    let state: StepState = 'todo'
    if (confirmedKeys.includes(def.key)) state = 'done'
    if (i === activeIndex) state = 'active'
    // 当前阶段之前但没确认过的，仍算 todo —— 不假装做过
    return { ...def, state }
  })
}

/** 步骤条进度文案，例如「第 3 / 6 步 · 核对问卷」 */
export function stepProgressText(steps: WorkbenchStep[]): string {
  const active = steps.find((s) => s.state === 'active')
  if (!active) return `已完成 ${steps.filter((s) => s.state === 'done').length} / ${steps.length} 步`
  return `第 ${active.index} / ${steps.length} 步 · ${active.label}`
}

/* ------------------------------------------------------------------ */
/* 对话项                                                              */
/* ------------------------------------------------------------------ */

export type ArtifactKind = 'dataset' | 'questionnaire' | 'analysis' | 'report' | 'demo'

export interface ArtifactRef {
  id: string
  title: string
  subtitle: string
  kind: ArtifactKind
  state: 'generated' | 'pending'
  /** 抽屉里展示的正文行；没有就只显示标题卡 */
  lines?: string[]
}

/** 智能体消息：段落数组而不是一段 HTML —— 组件里不 dangerouslySetInnerHTML */
export interface AgentMessage {
  kind: 'agent'
  id: string
  paragraphs: string[]
  /** 「下一步」提示条：青色左边框那种 */
  next?: string | null
  /** 附着在消息下方的产物卡 */
  artifacts?: ArtifactRef[]
  at?: string
}

export interface UserMessage {
  kind: 'me'
  id: string
  text: string
  at?: string
}

export type DecisionOptionKind = 'primary' | 'secondary' | 'ghost'

export interface DecisionOption {
  key: string
  label: string
  kind: DecisionOptionKind
  /** 点它之后显示的确认文案，缺省用 label */
  doneLabel?: string
}

/** 决策卡：对话流里的人工确认点。这是与数模演易对齐的核心件。 */
export interface DecisionMessage {
  kind: 'decision'
  id: string
  title: string
  body: string
  options: DecisionOption[]
  footer?: string
  /** 已选项 key；null 表示还没决定 */
  answered?: string | null
  /** 选了「补充说明」这类选项时用户填的内容 */
  note?: string
  /** 该决策关联的阶段，点选后上层据此推进步骤条 */
  step?: WorkbenchStepKey
}

export type ChatItem = AgentMessage | UserMessage | DecisionMessage

/** 决策卡是否还需要用户动手 */
export function decisionOpen(item: DecisionMessage): boolean {
  return !item.answered
}

/** 决策卡的已选文案 */
export function decisionAnswerLabel(item: DecisionMessage): string {
  if (!item.answered) return ''
  const hit = item.options.find((o) => o.key === item.answered)
  return item.note ? `${hit?.doneLabel || hit?.label || item.answered}：${item.note}` : hit?.doneLabel || hit?.label || item.answered
}

/** 是否需要一个文本框让用户写补充说明（选中项 key 以 note: 结尾时） */
export function optionNeedsNote(optionKey: string): boolean {
  return optionKey.startsWith('note:')
}

/* ------------------------------------------------------------------ */
/* 顶栏状态                                                            */
/* ------------------------------------------------------------------ */

export type EnvState = 'none' | 'unknown' | 'ready' | 'failed'

export function envBadgeText(state: EnvState): string {
  switch (state) {
    case 'ready':
      return '环境已就绪'
    case 'failed':
      return '环境异常'
    case 'unknown':
      return '检测中'
    default:
      return '未创建环境'
  }
}

/**
 * 阶段徽标。刻意分成三档语气：
 *   waiting  —— 等用户决定（暖金，最需要注意力）
 *   running  —— 智能体在干活（青绿）
 *   blocked  —— 卡住了（红）
 */
export type StageTone = 'waiting' | 'running' | 'blocked' | 'idle'

export interface StageBadge {
  text: string
  tone: StageTone
}

/* ------------------------------------------------------------------ */
/* 快捷指令                                                            */
/* ------------------------------------------------------------------ */

export interface QuickChip {
  key: string
  label: string
  /** 点了是直接发送，还是填进输入框让用户改 */
  mode?: 'send' | 'fill'
}

/**
 * 快捷指令按当前阶段给。默认给通用三条，
 * 上游可以整体覆盖 —— 组件不自己判断业务规则。
 */
export function defaultChips(key: WorkbenchStepKey): QuickChip[] {
  const common: QuickChip[] = [
    { key: 'next', label: '下一步该做什么', mode: 'send' },
    { key: 'explain', label: '这一步为什么要做', mode: 'send' },
  ]
  const byStep: Record<WorkbenchStepKey, QuickChip> = {
    problem: { key: 'scope', label: '帮我收窄研究对象', mode: 'fill' },
    material: { key: 'gap', label: '看看还缺哪些材料', mode: 'send' },
    questionnaire: { key: 'check', label: '检查题目有没有引导性', mode: 'fill' },
    analysis: { key: 'method', label: '这个样本量够做卡方吗', mode: 'fill' },
    review: { key: 'risk', label: '结论有哪些站不住的地方', mode: 'send' },
    report: { key: 'outline', label: '按竞赛格式列个提纲', mode: 'fill' },
  }
  return [...common, byStep[key]]
}

/**
 * 首页真题不归本文件管：数据形状见 `src/components/home/home-cases.ts` 的 `HomeCase`。
 * 这里原本有一份 `CaseCard`，是「首页网格」那版实现留下的死代码（无引用者，
 * 注释还是数模赛事口径），已删除，免得以后有人误以为工作台要消费首页题库。
 */
