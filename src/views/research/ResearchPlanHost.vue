<!--
  第 3 阶段 · 研究方案 的宿主外壳（F 侧临时接入）。

  与 TopicAnalysisHost 同一套做法：draft 存在 utils/topicPlanDrafts，
  上游一次读两个阶段（赛事理解 + 已采用方向），组件契约与陈旧事件判定复刻真实外壳。
-->
<template>
  <section class="rpe-host">
    <div class="rpe-host__upstream">
      <div class="rpe-host__label">上游 · 已确认信息（只读）</div>
      <p class="rpe-host__facts">
        <span :class="{ warn: !competition }">
          赛事理解：{{ competition ? `${competition.requirements.length} 条要求 / ${competition.sources.length} 条来源` : '未读到' }}
        </span>
        <span :class="{ warn: !selectedTopic }">采用方向：{{ selectedTopic ? selectedTopic.title : '尚未采用任何方向' }}</span>
        <span>候选方向 {{ record.topic.directions.length }} 个</span>
      </p>
      <p v-if="!selectedTopic" class="rpe-host__hint">
        第 2 阶段还没采用方向，方案的「基于哪个方向」会留空并计入缺项。可以先回第 2 阶段选定。
      </p>
      <button type="button" class="rpe-host__link" @click="emit('view-phase', 1)">查看第 2 阶段</button>
    </div>

    <ResearchPlanEditor
      :context="context"
      :draft="record.plan"
      :upstream="upstream"
      :read-only="isReadOnly"
      :issues="issues"
      @update-draft="onUpdateDraft"
      @save-request="onSaveRequest"
    />

    <footer class="rpe-host__foot">
      <span class="rpe-host__state" :class="{ fail: !savedOk }">
        {{ savedOk ? `已存本机 · ${formatClock(record.updatedAt)}` : '本机保存失败，编辑只在当前页' }}
      </span>
      <span class="rpe-host__rev">修订 {{ record.revision }}</span>
      <button type="button" class="rpe-host__reset" :disabled="isReadOnly" @click="reset">清空本阶段草稿</button>
    </footer>

    <p v-if="feedback" class="rpe-host__feedback" role="status">{{ feedback }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import ResearchPlanEditor from '../../components/research/ResearchPlanEditor.vue'
import { checkPlanDraft, normalizePlanDraft } from '../../components/research/plan-contract'
import type { PlanActionRequest, PlanDraftUpdate, PlanUpstream } from '../../components/research/plan-contract'
import type { TopicDirection } from '../../components/research/topic-contract'
import { BUSINESS_API_STATUS } from '../../api/research'
import {
  emptyTopicPlanRecord,
  formatClock,
  loadTopicPlanRecord,
  resetPlan,
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

const upstream = computed<PlanUpstream>(() => ({
  competition: props.competition,
  topic: record.value.topic,
}))

const issues = computed(() => checkPlanDraft(record.value.plan, upstream.value).all)

const selectedTopic = computed<TopicDirection | null>(
  () => record.value.topic.directions.find((item) => item.id === record.value.topic.selectedDirectionId) ?? null,
)

function isStale(eventContext: DraftContext): boolean {
  return eventContext.localTaskId !== props.localTaskId || eventContext.revision !== record.value.revision
}

function persist(next: TopicPlanRecord): void {
  record.value = next
  savedOk.value = saveTopicPlanRecord(props.localTaskId, next)
}

function onUpdateDraft(event: PlanDraftUpdate): void {
  if (isReadOnly.value) {
    feedback.value = '当前为只读，编辑请求未应用。'
    return
  }
  if (isStale(event.context)) {
    feedback.value = '忽略了其他任务或旧修订的编辑事件。'
    return
  }
  const clean = normalizePlanDraft(event.draft)
  if (!clean) {
    feedback.value = '组件草稿格式不完整，当前内容未替换。'
    return
  }
  persist({ ...record.value, plan: clean, revision: record.value.revision + 1, updatedAt: Date.now() })
  feedback.value = savedOk.value ? '' : '本机保存失败，编辑仍保留在当前页，请不要关闭页面。'
}

function onSaveRequest(event: PlanActionRequest): void {
  if (isStale(event.context)) {
    feedback.value = '忽略了其他任务或旧修订的保存请求。'
    return
  }
  feedback.value = BUSINESS_API_STATUS.message
}

function reset(): void {
  if (isReadOnly.value) return
  if (!window.confirm('清空第 3 阶段的研究方案草稿？选题分析不受影响。')) return
  persist(resetPlan(record.value))
  feedback.value = '已清空研究方案草稿。'
}

if (!props.localTaskId) record.value = emptyTopicPlanRecord()
</script>

<style scoped>
.rpe-host {
  padding: 26px 28px 22px;
}
.rpe-host__upstream {
  display: grid;
  gap: 8px;
  margin-bottom: 20px;
  padding: 14px 16px;
  border: 1px solid #e1ebe5;
  border-left: 3px solid #7fb39c;
  border-radius: 9px;
  background: #f7faf8;
}
.rpe-host__label {
  font-size: 11px;
  letter-spacing: 0.04em;
  color: #4b806b;
}
.rpe-host__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin: 0;
  font-size: 12.5px;
  color: #45645a;
}
.rpe-host__facts .warn {
  color: #9b542b;
}
.rpe-host__hint {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.8;
  color: #876d36;
}
.rpe-host__link {
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
.rpe-host__foot {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid #e8eee9;
}
.rpe-host__state {
  font-size: 12px;
  color: #6f8277;
}
.rpe-host__state.fail {
  color: #a14332;
}
.rpe-host__rev {
  font-size: 11px;
  color: #8b9a91;
}
.rpe-host__reset {
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
.rpe-host__reset:disabled {
  color: #98a69d;
  border-color: #e6ece8;
  cursor: default;
}
.rpe-host__feedback:not(:empty) {
  margin: 10px 0 0;
  font-size: 12.5px;
  line-height: 1.8;
  color: #8a6a2f;
}
.rpe-host__feedback:not(:empty)::before {
  content: '提示：';
}
button:focus-visible {
  outline: 3px solid #8bbba5;
  outline-offset: 3px;
}
</style>
