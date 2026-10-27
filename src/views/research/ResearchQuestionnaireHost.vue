<!--
  第 4 阶段 · 问卷设计与预测试 的宿主外壳（F 侧临时接入）。

  与前两个宿主同一套做法：draft 存在 utils/topicPlanDrafts，
  上游只读第三阶段的研究方案（变量清单），用来做「每题对应哪个变量」的映射；
  组件契约与陈旧事件判定复刻真实外壳。

  与前两阶段唯一的差别：问卷的「预测试通过」是算出来的（pretestState），
  宿主只负责透传 draft，不提供任何把状态改写的入口。
-->
<template>
  <section class="rqe-host">
    <div class="rqe-host__upstream">
      <div class="rqe-host__label">上游 · 已确认信息（只读）</div>
      <p class="rqe-host__facts">
        <span :class="{ warn: !hasPlan }">
          研究方案：{{ hasPlan ? `变量 ${measureCount} 个 / 分析计划 ${record.plan.analyses.length} 条` : '未读到' }}
        </span>
        <span :class="{ warn: !planAdopted }">方案固定：{{ planAdopted ? '已固定' : '尚未固定' }}</span>
        <span>本卷题目 {{ record.questionnaire.questions.length }} 题</span>
        <span :class="{ warn: unmappedCount > 0 }">已挂变量 {{ mappedCount }} / {{ measureCount }}</span>
      </p>
      <p v-if="!hasPlan" class="rqe-host__hint">
        第 3 阶段还没有研究方案，问卷的「每道题对应哪个变量」会全部留空，映射检查也无法通过。建议先回第 3 阶段把变量建好。
      </p>
      <p v-else-if="planDrifted" class="rqe-host__hint">
        第 3 阶段的方案内容已改动，本页的变量映射可能对不上新方案。请核对「对应变量」下拉里的选项。
      </p>
      <button type="button" class="rqe-host__link" @click="emit('view-phase', 2)">查看第 3 阶段</button>
    </div>

    <ResearchQuestionnaireEditor
      :context="context"
      :draft="record.questionnaire"
      :upstream="upstream"
      :read-only="isReadOnly"
      :issues="issues"
      @update-draft="onUpdateDraft"
      @save-request="onSaveRequest"
    />

    <footer class="rqe-host__foot">
      <span class="rqe-host__state" :class="{ fail: !savedOk }">
        {{ savedOk ? `已存本机 · ${formatClock(record.updatedAt)}` : '本机保存失败，编辑只在当前页' }}
      </span>
      <span class="rqe-host__rev">修订 {{ record.revision }}</span>
      <button type="button" class="rqe-host__reset" :disabled="isReadOnly" @click="reset">清空本阶段草稿</button>
    </footer>

    <p v-if="feedback" class="rqe-host__feedback" role="status">{{ feedback }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import ResearchQuestionnaireEditor from '../../components/research/ResearchQuestionnaireEditor.vue'
import {
  checkQuestionnaire,
  normalizeQuestionnaireDraft,
  questionnaireMeasures,
} from '../../components/research/questionnaire-contract'
import type {
  QuestionnaireActionRequest,
  QuestionnaireDraftUpdate,
  QuestionnaireUpstream,
} from '../../components/research/questionnaire-contract'
import { adoptionState } from '../../components/research/plan-contract'
import { BUSINESS_API_STATUS } from '../../api/research'
import {
  emptyTopicPlanRecord,
  formatClock,
  loadTopicPlanRecord,
  resetQuestionnaire,
  saveTopicPlanRecord,
  type TopicPlanRecord,
} from '../../utils/topicPlanDrafts'
import type { DraftContext } from '../../types/research-contracts'

const props = defineProps<{
  localTaskId: string
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

const upstream = computed<QuestionnaireUpstream>(() => ({ plan: record.value.plan }))

const issues = computed(() => checkQuestionnaire(record.value.questionnaire, upstream.value).all)

const hasPlan = computed(() => questionnaireMeasures(record.value.plan).length > 0)
const measureCount = computed(() => questionnaireMeasures(record.value.plan).length)
/** 方案固定了版本才允许问卷说「按方案建的」；没固定就退化成提示，不阻塞 */
const planAdopted = computed(() => record.value.plan.adoption.signature !== '')
const planDrifted = computed(() => adoptionState(record.value.plan) === 'drifted')

const mappedCount = computed(() => {
  const used = new Set(
    record.value.questionnaire.questions.map((item) => item.measureId).filter((id): id is string => !!id),
  )
  const total = questionnaireMeasures(record.value.plan).filter((item) => used.has(item.id)).length
  return total
})
const unmappedCount = computed(() =>
  questionnaireMeasures(record.value.plan).filter(
    (item) => item.questionIds.length === 0 && !record.value.questionnaire.questions.some((q) => q.measureId === item.id),
  ).length,
)

function isStale(eventContext: DraftContext): boolean {
  return eventContext.localTaskId !== props.localTaskId || eventContext.revision !== record.value.revision
}

function persist(next: TopicPlanRecord): void {
  record.value = next
  savedOk.value = saveTopicPlanRecord(props.localTaskId, next)
}

function onUpdateDraft(event: QuestionnaireDraftUpdate): void {
  if (isReadOnly.value) {
    feedback.value = '当前为只读，编辑请求未应用。'
    return
  }
  if (isStale(event.context)) {
    feedback.value = '忽略了其他任务或旧修订的编辑事件。'
    return
  }
  const clean = normalizeQuestionnaireDraft(event.draft)
  if (!clean) {
    feedback.value = '组件草稿格式不完整，当前内容未替换。'
    return
  }
  persist({
    ...record.value,
    questionnaire: clean,
    revision: record.value.revision + 1,
    updatedAt: Date.now(),
  })
  feedback.value = savedOk.value ? '' : '本机保存失败，编辑仍保留在当前页，请不要关闭页面。'
}

function onSaveRequest(event: QuestionnaireActionRequest): void {
  if (isStale(event.context)) {
    feedback.value = '忽略了其他任务或旧修订的保存请求。'
    return
  }
  feedback.value = BUSINESS_API_STATUS.message
}

function reset(): void {
  if (isReadOnly.value) return
  if (!window.confirm('清空第 4 阶段的问卷草稿？题目、试填轮次和固定版本都会清掉，前三个阶段不受影响。')) return
  persist(resetQuestionnaire(record.value))
  feedback.value = '已清空问卷草稿。'
}

if (!props.localTaskId) record.value = emptyTopicPlanRecord()
</script>

<style scoped>
.rqe-host {
  padding: 26px 28px 22px;
}
.rqe-host__upstream {
  display: grid;
  gap: 8px;
  margin-bottom: 20px;
  padding: 14px 16px;
  border: 1px solid #e1ebe5;
  border-left: 3px solid #7fb39c;
  border-radius: 9px;
  background: #f7faf8;
}
.rqe-host__label {
  font-size: 11px;
  letter-spacing: 0.04em;
  color: #4b806b;
}
.rqe-host__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin: 0;
  font-size: 12.5px;
  color: #45645a;
}
.rqe-host__facts .warn {
  color: #9b542b;
}
.rqe-host__hint {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.8;
  color: #876d36;
}
.rqe-host__link {
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
.rqe-host__foot {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid #e8eee9;
}
.rqe-host__state {
  font-size: 12px;
  color: #6f8277;
}
.rqe-host__state.fail {
  color: #a14332;
}
.rqe-host__rev {
  font-size: 11px;
  color: #8b9a91;
}
.rqe-host__reset {
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
.rqe-host__reset:disabled {
  color: #98a69d;
  border-color: #e6ece8;
  cursor: default;
}
.rqe-host__feedback:not(:empty) {
  margin: 10px 0 0;
  font-size: 12.5px;
  line-height: 1.8;
  color: #8a6a2f;
}
.rqe-host__feedback:not(:empty)::before {
  content: '提示：';
}
button:focus-visible {
  outline: 3px solid #8bbba5;
  outline-offset: 3px;
}
</style>
