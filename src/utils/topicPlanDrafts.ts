/**
 * 第 2、3、4、6 阶段草稿的本机存储（F 侧临时实现）。
 *
 * 为什么单独一份而不是塞进 P 的 LocalResearchTask：
 *   P 的 cleanTask 对任务字段做白名单校验，任何未登记字段在保存时会被丢弃，
 *   而修改 cleanTask 一旦写错会让已有草稿整份加载失败。所以在 P 正式把
 *   topic / plan / questionnaire / analysis 并入 LocalResearchTask 之前，这里用独立 key 存，
 *   按 localTaskId 隔离，互不串任务。
 *
 * 接入正式接口时的迁移路径：
 *   把 TopicPlanRecord 的四个草稿字段搬到 LocalResearchTask，删掉这个文件的读写，
 *   宿主组件的 onUpdateDraft 改成 emit 给 store —— 组件契约本身不用动。
 *
 * 注意第 6 阶段多一个 analysisPayload：数据集 / 运行记录 / 结果表都不在 draft 里，
 * 它们属于统计侧产物，放在这里只是「外壳的载荷」，不是编辑器可写的内容。
 */

import { emptyTopicDraft, normalizeTopicDraft, type TopicDraft } from '../components/research/topic-contract'
import { emptyPlanDraft, normalizePlanDraft, type ResearchPlanDraft } from '../components/research/plan-contract'
import {
  emptyQuestionnaireDraft,
  normalizeQuestionnaireDraft,
  type QuestionnaireDraft,
} from '../components/research/questionnaire-contract'
import {
  emptyAnalysisDraft,
  emptyAnalysisPayload,
  normalizeAnalysisDraft,
  normalizeAnalysisPayload,
  type AnalysisDraft,
  type AnalysisPayload,
} from '../components/research/f-analysis-contract'

const storageKey = (localTaskId: string): string => `scdc-f-topic-plan-v1:${localTaskId}`

export interface TopicPlanRecord {
  schemaVersion: 1
  /** 修订号：每次接受一次组件变更 +1，用于复刻外壳的陈旧事件拒绝 */
  revision: number
  updatedAt: number
  topic: TopicDraft
  plan: ResearchPlanDraft
  questionnaire: QuestionnaireDraft
  analysis: AnalysisDraft
  analysisPayload: AnalysisPayload
}

export function emptyTopicPlanRecord(): TopicPlanRecord {
  return {
    schemaVersion: 1,
    revision: 1,
    updatedAt: Date.now(),
    topic: emptyTopicDraft(),
    plan: emptyPlanDraft(),
    questionnaire: emptyQuestionnaireDraft(),
    analysis: emptyAnalysisDraft(),
    analysisPayload: emptyAnalysisPayload(),
  }
}

/**
 * 读取某任务的本机草稿。任何异常都退化成空记录，不抛错。
 *
 * **逐阶段降级，不整份作废**：四个阶段各读各的，谁读不出来谁退成空草稿，
 * 不许连坐。此前的写法是「任一阶段 normalize 返回 null 就 return 空记录」，
 * 那等于第 6 阶段草稿一旦结构漂移，第 2–4 阶段的内容也跟着消失——
 * 而这四个阶段分别属于四个人不同的工作，一次失败不该毁掉别人的成果。
 *
 * 顺带解决旧记录的兼容：`questionnaire` 是第 4 阶段才加的、
 * `analysis` / `analysisPayload` 是第 6 阶段才加的，旧记录里根本没有这些键，
 * normalize 收到 undefined 会返回 null，正好落到「退成空草稿」这一支。
 */
export function loadTopicPlanRecord(localTaskId: string): TopicPlanRecord {
  if (!localTaskId) return emptyTopicPlanRecord()
  try {
    const raw = localStorage.getItem(storageKey(localTaskId))
    if (!raw) return emptyTopicPlanRecord()
    const value = JSON.parse(raw) as {
      revision?: unknown
      updatedAt?: unknown
      topic?: unknown
      plan?: unknown
      questionnaire?: unknown
      analysis?: unknown
      analysisPayload?: unknown
    }
    const topic = normalizeTopicDraft(value?.topic) ?? emptyTopicDraft()
    const plan = normalizePlanDraft(value?.plan) ?? emptyPlanDraft()
    const questionnaire = normalizeQuestionnaireDraft(value?.questionnaire) ?? emptyQuestionnaireDraft()
    const analysis = normalizeAnalysisDraft(value?.analysis) ?? emptyAnalysisDraft()
    const analysisPayload = normalizeAnalysisPayload(value?.analysisPayload)
    const revision = typeof value?.revision === 'number' && Number.isInteger(value.revision) && value.revision > 0
      ? value.revision
      : 1
    return {
      schemaVersion: 1,
      revision,
      updatedAt: typeof value?.updatedAt === 'number' && Number.isFinite(value.updatedAt) ? value.updatedAt : Date.now(),
      topic,
      plan,
      questionnaire,
      analysis,
      analysisPayload,
    }
  } catch {
    return emptyTopicPlanRecord()
  }
}

export function saveTopicPlanRecord(localTaskId: string, record: TopicPlanRecord): boolean {
  if (!localTaskId) return false
  try {
    localStorage.setItem(storageKey(localTaskId), JSON.stringify(record))
    return true
  } catch {
    return false
  }
}

/**
 * 清掉某份任务的全部阶段草稿。
 *
 * 删除任务时调用：任务目录里那份记录没了，这些按 localTaskId 隔离的草稿
 * 就成了永远读不到的孤儿数据，留着既不占用户的信任、也占存储。
 * 键名只在这里定义，调用方不要自己拼字符串。
 */
export function clearTopicPlanRecord(localTaskId: string): boolean {
  if (!localTaskId) return false
  try {
    localStorage.removeItem(storageKey(localTaskId))
    return true
  } catch {
    return false
  }
}

/** 只清第 2 阶段，第 3 阶段保留（第 3 阶段的上游会随之变空，检查会如实报出来）。 */
export function resetTopic(record: TopicPlanRecord): TopicPlanRecord {
  return { ...record, topic: emptyTopicDraft(), revision: record.revision + 1, updatedAt: Date.now() }
}

/** 只清第 3 阶段。 */
export function resetPlan(record: TopicPlanRecord): TopicPlanRecord {
  return { ...record, plan: emptyPlanDraft(), revision: record.revision + 1, updatedAt: Date.now() }
}

/** 只清第 4 阶段。题目、试填轮次、固定版本一起清掉，前三个阶段保留。 */
export function resetQuestionnaire(record: TopicPlanRecord): TopicPlanRecord {
  return { ...record, questionnaire: emptyQuestionnaireDraft(), revision: record.revision + 1, updatedAt: Date.now() }
}

/** 只清第 6 阶段。数据集、运行、结果一并清掉——它们的签名对不上草稿就没有意义了。 */
export function resetAnalysis(record: TopicPlanRecord): TopicPlanRecord {
  return {
    ...record,
    analysis: emptyAnalysisDraft(),
    analysisPayload: emptyAnalysisPayload(),
    revision: record.revision + 1,
    updatedAt: Date.now(),
  }
}

export function formatClock(at: number): string {
  const date = new Date(at)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
