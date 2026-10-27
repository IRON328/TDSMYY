<!--
  第 2 阶段 · 选题分析 的宿主外壳（F 侧临时接入）。

  与 CompetitionUnderstandingHost 的差别只有一处：draft 不来自 P 的 LocalResearchTask
  （那个结构还没有 topic 字段），而是存在本文件配套的 utils/topicPlanDrafts 里，
  按 localTaskId 隔离。组件契约、陈旧事件判定、只读、save-request 反馈全部复刻真实外壳，
  等 P 把 topic 并入任务结构后，这个文件可以整体替换成薄壳。

  emits view-phase：让「去看看第 1 阶段」能真的跳过去（阶段切换由 P 的工作台持有）。
-->
<template>
  <section class="tae-host">
    <div class="tae-host__upstream">
      <div class="tae-host__label">上游 · 第 1 阶段赛事理解</div>
      <p v-if="!competition" class="tae-host__empty">
        没有读到第 1 阶段资料，方向无法挂回赛事要求。可以先回第 1 阶段填好再回来。
      </p>
      <p v-else class="tae-host__facts">
        <span>背景：{{ competition.background.trim() || '尚未填写' }}</span>
        <span>要求 {{ competition.requirements.length }} 条</span>
        <span>来源 {{ competition.sources.length }} 条</span>
        <span :class="{ warn: blockingUnknowns > 0 }">未知项 {{ competition.unknowns.length }} 条（影响决定 {{ blockingUnknowns }} 条）</span>
      </p>
      <button type="button" class="tae-host__link" @click="emit('view-phase', 0)">查看第 1 阶段</button>
    </div>

    <TopicAnalysisEditor
      :context="context"
      :draft="record.topic"
      :upstream="competition"
      :read-only="isReadOnly"
      :issues="issues"
      @update-draft="onUpdateDraft"
      @save-request="onSaveRequest"
    />

    <footer class="tae-host__foot">
      <span class="tae-host__state" :class="{ fail: !savedOk }">
        {{ savedOk ? `已存本机 · ${formatClock(record.updatedAt)}` : '本机保存失败，编辑只在当前页' }}
      </span>
      <span class="tae-host__rev">修订 {{ record.revision }}</span>
      <button type="button" class="tae-host__reset" :disabled="isReadOnly" @click="reset">清空本阶段草稿</button>
    </footer>

    <p v-if="feedback" class="tae-host__feedback" role="status">{{ feedback }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import TopicAnalysisEditor from '../../components/research/TopicAnalysisEditor.vue'
import { checkTopicDraft, normalizeTopicDraft } from '../../components/research/topic-contract'
import type { TopicActionRequest, TopicDraftUpdate } from '../../components/research/topic-contract'
import { BUSINESS_API_STATUS } from '../../api/research'
import {
  emptyTopicPlanRecord,
  formatClock,
  loadTopicPlanRecord,
  resetTopic,
  saveTopicPlanRecord,
  type TopicPlanRecord,
} from '../../utils/topicPlanDrafts'
import type { CompetitionDraft, DraftContext } from '../../types/research-contracts'

const props = defineProps<{
  localTaskId: string
  competition: CompetitionDraft | null
  readOnly?: boolean
}>()

const emit = defineEmits<{
  'view-phase': [phase: number]
}>()

const isReadOnly = computed(() => props.readOnly === true)
const record = shallowRef<TopicPlanRecord>(loadTopicPlanRecord(props.localTaskId))
const savedOk = ref(true)
const feedback = ref('')

const context = computed<DraftContext>(() => ({
  localTaskId: props.localTaskId,
  revision: record.value.revision,
}))

const issues = computed(() => checkTopicDraft(record.value.topic, props.competition))
const blockingUnknowns = computed(
  () => (props.competition?.unknowns ?? []).filter((item) => item.blocksDecision).length,
)

/** 外壳语义：任务与修订都要对上；对不上就是陈旧事件，丢掉不应用。 */
function isStale(eventContext: DraftContext): boolean {
  return eventContext.localTaskId !== props.localTaskId || eventContext.revision !== record.value.revision
}

function persist(next: TopicPlanRecord): void {
  record.value = next
  savedOk.value = saveTopicPlanRecord(props.localTaskId, next)
}

function onUpdateDraft(event: TopicDraftUpdate): void {
  if (isReadOnly.value) {
    feedback.value = '当前为只读，编辑请求未应用。'
    return
  }
  if (isStale(event.context)) {
    feedback.value = '忽略了其他任务或旧修订的编辑事件。'
    return
  }
  const clean = normalizeTopicDraft(event.draft)
  if (!clean) {
    feedback.value = '组件草稿格式不完整，当前内容未替换。'
    return
  }
  persist({ ...record.value, topic: clean, revision: record.value.revision + 1, updatedAt: Date.now() })
  feedback.value = savedOk.value ? '' : '本机保存失败，编辑仍保留在当前页，请不要关闭页面。'
}

function onSaveRequest(event: TopicActionRequest): void {
  if (isStale(event.context)) {
    feedback.value = '忽略了其他任务或旧修订的保存请求。'
    return
  }
  feedback.value = BUSINESS_API_STATUS.message
}

function reset(): void {
  if (isReadOnly.value) return
  if (!window.confirm('清空第 2 阶段的选题草稿？第 3 阶段的研究方案不会被清空，但它的上游会变空。')) return
  persist(resetTopic(record.value))
  feedback.value = '已清空选题草稿。'
}

// 切换任务时父层用 :key 重建组件，这里再兜一层：id 变了就重新读。
if (!props.localTaskId) record.value = emptyTopicPlanRecord()
</script>

<style scoped>
.tae-host {
  padding: 26px 28px 22px;
}
.tae-host__upstream {
  display: grid;
  gap: 8px;
  margin-bottom: 20px;
  padding: 14px 16px;
  border: 1px solid #e1ebe5;
  border-left: 3px solid #7fb39c;
  border-radius: 9px;
  background: #f7faf8;
}
.tae-host__label {
  font-size: 11px;
  letter-spacing: 0.04em;
  color: #4b806b;
}
.tae-host__empty {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.8;
  color: #876d36;
}
.tae-host__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin: 0;
  font-size: 12.5px;
  color: #45645a;
}
.tae-host__facts .warn {
  color: #9b542b;
}
.tae-host__link {
  justify-self: start;
  padding: 0;
  border: 0;
  background: none;
  color: #176f5b;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.tae-host__foot {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid #e8eee9;
}
.tae-host__state {
  font-size: 12px;
  color: #6f8277;
}
.tae-host__state.fail {
  color: #a14332;
}
.tae-host__rev {
  font-size: 11px;
  color: #8b9a91;
}
.tae-host__reset {
  margin-left: auto;
  padding: 8px 12px;
  border: 1px solid #d5e1db;
  border-radius: 7px;
  background: #fff;
  color: #28624f;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.tae-host__reset:disabled {
  color: #98a69d;
  border-color: #e6ece8;
  cursor: default;
}
.tae-host__feedback:not(:empty) {
  margin: 10px 0 0;
  font-size: 12.5px;
  line-height: 1.8;
  color: #8a6a2f;
}
.tae-host__feedback:not(:empty)::before {
  content: '提示：';
}
button:focus-visible {
  outline: 3px solid #8bbba5;
  outline-offset: 3px;
}
</style>
