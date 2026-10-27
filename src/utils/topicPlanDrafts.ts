/**
 * 第 2、3 阶段草稿的本机存储（F 侧临时实现）。
 *
 * 为什么单独一份而不是塞进 P 的 LocalResearchTask：
 *   P 的 cleanTask 对任务字段做白名单校验，任何未登记字段在保存时会被丢弃，
 *   而修改 cleanTask 一旦写错会让已有草稿整份加载失败。所以在 P 正式把
 *   topic / plan 并入 LocalResearchTask 之前，这里用独立 key 存，
 *   按 localTaskId 隔离，互不串任务。
 *
 * 接入正式接口时的迁移路径：
 *   把 TopicPlanRecord 的两个字段搬到 LocalResearchTask，删掉这个文件的读写，
 *   宿主组件的 onUpdateDraft 改成 emit 给 store —— 组件契约本身不用动。
 */

import { emptyTopicDraft, normalizeTopicDraft, type TopicDraft } from '../components/research/topic-contract'
import { emptyPlanDraft, normalizePlanDraft, type ResearchPlanDraft } from '../components/research/plan-contract'

const storageKey = (localTaskId: string): string => `scdc-f-topic-plan-v1:${localTaskId}`

export interface TopicPlanRecord {
  schemaVersion: 1
  /** 修订号：每次接受一次组件变更 +1，用于复刻外壳的陈旧事件拒绝 */
  revision: number
  updatedAt: number
  topic: TopicDraft
  plan: ResearchPlanDraft
}

export function emptyTopicPlanRecord(): TopicPlanRecord {
  return {
    schemaVersion: 1,
    revision: 1,
    updatedAt: Date.now(),
    topic: emptyTopicDraft(),
    plan: emptyPlanDraft(),
  }
}

/**
 * 读取某任务的本机草稿。任何异常都退化成空记录，不抛错——
 * 半份坏数据不该让整个阶段打不开。
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
    }
    const topic = normalizeTopicDraft(value?.topic)
    const plan = normalizePlanDraft(value?.plan)
    if (!topic || !plan) return emptyTopicPlanRecord()
    const revision = typeof value?.revision === 'number' && Number.isInteger(value.revision) && value.revision > 0
      ? value.revision
      : 1
    return {
      schemaVersion: 1,
      revision,
      updatedAt: typeof value?.updatedAt === 'number' && Number.isFinite(value.updatedAt) ? value.updatedAt : Date.now(),
      topic,
      plan,
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

/** 只清第 2 阶段，第 3 阶段保留（第 3 阶段的上游会随之变空，检查会如实报出来）。 */
export function resetTopic(record: TopicPlanRecord): TopicPlanRecord {
  return { ...record, topic: emptyTopicDraft(), revision: record.revision + 1, updatedAt: Date.now() }
}

/** 只清第 3 阶段。 */
export function resetPlan(record: TopicPlanRecord): TopicPlanRecord {
  return { ...record, plan: emptyPlanDraft(), revision: record.revision + 1, updatedAt: Date.now() }
}

export function formatClock(at: number): string {
  const date = new Date(at)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
