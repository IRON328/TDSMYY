<!--
  第 6 阶段 · 数据分析 的宿主外壳（F 侧临时接入）。

  四个区块同页串行改同一份草稿（字段核对 → 质检 → 处理影响 → 结果与采用），
  与阶段 3 十个区块同构：拆成四个页面会让「影响说明」失去对象。

  页面级承担三件事（组件内不做）：
    1. 数据集 / 运行记录 / 结果表三个只读载荷的登记入口；
    2. 硬规则「计算完成 ≠ 保存完成」：运行状态与保存状态分两行显示；
    3. 陈旧事件判定与落盘（复刻真实外壳的 localTaskId + revision 语义）。

  这里的分档登记是临时方案：BB 接口到位后由解析结果与执行记录自动填入，
  宿主改成接收 props 即可，四个组件的契约不用动。
-->
<template>
  <section class="dah">
    <div class="dah-up">
      <div class="dah-up__label">上游 · 已确认信息（只读）</div>
      <p class="dah-up__facts">
        <span :class="{ warn: !measureCount }">研究方案变量：{{ measureCount || '未读到' }}</span>
        <span :class="{ warn: !questionCount }">问卷题目：{{ questionCount || '未读到' }}</span>
        <span :class="{ warn: !payload.dataset }">数据集：{{ payload.dataset ? payload.dataset.fileName : '未登记' }}</span>
        <span :class="{ warn: !payload.run }">运行记录：{{ payload.run ? runStatusLabel(payload.run.status) : '未登记' }}</span>
      </p>
      <p v-if="!measureCount" class="dah-up__hint">
        第 3 阶段还没有变量，字段核对没有可挂的对象。建议先回第 3 阶段把变量建好。
      </p>
      <p v-else-if="!questionCount" class="dah-up__hint">
        第 4 阶段还没有题目，字段映射只能手动新增，无法按题生成。
      </p>
      <div class="dah-up__links">
        <button type="button" class="dah-link" @click="emit('view-phase', 2)">查看第 3 阶段</button>
        <button type="button" class="dah-link" @click="emit('view-phase', 3)">查看第 4 阶段</button>
      </div>
    </div>

    <!-- 缺项总览：四个区块各自只报自己的状态，这里给一条完整清单 -->
    <details v-if="issues.length" class="dah-issues" open>
      <summary class="dah-issues__summary">
        待补充 {{ issues.length }} 项
        <span class="dah-issues__hint">四项都满足才会显示「本机完整」</span>
      </summary>
      <ul class="dah-issues__list">
        <li v-for="(issue, index) in issues" :key="index">{{ issue }}</li>
      </ul>
    </details>
    <p v-else class="dah-complete">本机完整：字段可追溯、质检已闭环、处理影响已说明、结果已采用。</p>

    <!-- 载荷登记（临时） -->
    <details class="dah-panel" :open="!payload.dataset">
      <summary class="dah-panel__summary">
        数据源与分析产物登记
        <span class="dah-panel__badge">临时 · BB 接口到位后自动填入</span>
      </summary>

      <div class="dah-panel__body">
        <p class="dah-panel__note">
          本页不执行统计、不解析文件。这里登记的内容应当来自真实产物：
          数据集概览来自数据侧解析结果，运行记录与结果表来自统计工具的实际输出。
          不要为了「让页面完整」而编造数字——编造的结果会被当成证据引用进报告。
        </p>

        <!-- 数据集 -->
        <fieldset class="dah-form">
          <legend>数据集概览</legend>
          <div class="dah-form__row">
            <label class="dah-field">
              <span class="dah-label">原始文件名</span>
              <input v-model="dsFileName" class="dah-input" type="text" placeholder="例如：platform-export-20261021.xlsx" aria-label="数据集文件名" />
            </label>
            <label class="dah-field dah-field--sm">
              <span class="dah-label">行数</span>
              <input v-model="dsRowCount" class="dah-input" type="number" min="0" placeholder="312" aria-label="数据集行数" />
            </label>
            <label class="dah-field dah-field--sm">
              <span class="dah-label">指纹（可留空自动生成）</span>
              <input v-model="dsSignature" class="dah-input" type="text" placeholder="a1b2c3d4" aria-label="数据集指纹" />
            </label>
          </div>
          <label class="dah-field">
            <span class="dah-label">列名（每行一个，可写「列名:类型」，类型取 text / number / date）</span>
            <textarea
              v-model="dsColumns"
              class="dah-input dah-textarea"
              rows="4"
              aria-label="数据集列名"
              placeholder="respondent_id:text&#10;submit_time:date&#10;q1:text&#10;q2:number"
            />
          </label>
          <div class="dah-form__actions">
            <button type="button" class="btn primary" :disabled="isReadOnly" @click="registerDataset">登记数据集</button>
            <button type="button" class="btn" :disabled="isReadOnly || !payload.dataset" @click="clearPayload">清空数据集与产物</button>
          </div>
          <p v-if="panelNote" class="dah-form__note">{{ panelNote }}</p>
        </fieldset>

        <!-- 运行记录 -->
        <fieldset class="dah-form" :disabled="!payload.dataset">
          <legend>运行记录（对当前输入）</legend>
          <div class="dah-form__row">
            <label class="dah-field">
              <span class="dah-label">运行状态</span>
              <select v-model="runStatus" class="dah-input" aria-label="运行状态">
                <option value="succeeded">成功</option>
                <option value="failed">失败</option>
                <option value="running">进行中</option>
              </select>
            </label>
            <label class="dah-field">
              <span class="dah-label">开始时间（ISO，可留空用当前时间）</span>
              <input v-model="runStartedAt" class="dah-input" type="text" placeholder="2026-10-27T02:10:00+08:00" aria-label="运行开始时间" />
            </label>
          </div>
          <label v-if="runStatus === 'failed'" class="dah-field">
            <span class="dah-label">失败原因</span>
            <input v-model="runFailure" class="dah-input" type="text" placeholder="例如：Q3 存在非数值编码，无法计算均值" aria-label="运行失败原因" />
          </label>
          <div class="dah-form__actions">
            <button type="button" class="btn primary" :disabled="isReadOnly || !payload.dataset" @click="registerRun">
              按当前输入指纹登记一次运行
            </button>
            <span v-if="payload.run" class="dah-form__cur">
              当前：<code>{{ payload.run.runId }}</code> · 指纹 <code>{{ payload.run.inputSignature }}</code>
            </span>
          </div>
        </fieldset>

        <!-- 结果表 -->
        <fieldset class="dah-form" :disabled="!payload.dataset">
          <legend>结果表（从统计工具复制粘贴，制表符分隔，首行为表头）</legend>
          <label class="dah-field">
            <span class="dah-label">结果表内容</span>
            <textarea
              v-model="resultText"
              class="dah-input dah-textarea dah-textarea--mono"
              rows="4"
              aria-label="结果表内容"
              placeholder="时段	座位缺口均值	样本量&#10;上午	18	96&#10;晚高峰	42	88"
            />
          </label>
          <label class="dah-field">
            <span class="dah-label">每行结果对应的原始记录 id（每行一条，逗号分隔；可留空）</span>
            <textarea
              v-model="resultSources"
              class="dah-input dah-textarea dah-textarea--mono"
              rows="3"
              aria-label="结果行对应的原始记录 id"
              placeholder="r-001,r-004,r-019&#10;r-032,r-040"
            />
          </label>
          <div class="dah-form__actions">
            <button type="button" class="btn primary" :disabled="isReadOnly || !payload.dataset" @click="registerResult">登记结果表</button>
            <span v-if="payload.result" class="dah-form__cur">
              当前：{{ payload.result.table.rows.length }} 行 × {{ payload.result.table.headers.length }} 列
            </span>
          </div>
        </fieldset>
      </div>
    </details>

    <FieldCheckEditor
      :context="context"
      :draft="record.analysis"
      :upstream="upstream"
      :dataset="payload.dataset"
      :run="payload.run"
      :result="payload.result"
      :read-only="isReadOnly"
      :issues="issues"
      @update-draft="onUpdateDraft"
    />

    <DataQualityEditor
      :context="context"
      :draft="record.analysis"
      :upstream="upstream"
      :dataset="payload.dataset"
      :run="payload.run"
      :result="payload.result"
      :read-only="isReadOnly"
      :issues="issues"
      @update-draft="onUpdateDraft"
    />

    <ChangeImpactEditor
      :context="context"
      :draft="record.analysis"
      :upstream="upstream"
      :dataset="payload.dataset"
      :run="payload.run"
      :result="payload.result"
      :read-only="isReadOnly"
      :issues="issues"
      @update-draft="onUpdateDraft"
    />

    <AnalysisResultEditor
      :context="context"
      :draft="record.analysis"
      :upstream="upstream"
      :dataset="payload.dataset"
      :run="payload.run"
      :result="payload.result"
      :read-only="isReadOnly"
      :issues="issues"
      @update-draft="onUpdateDraft"
    />

    <ul v-if="check.hints.length" class="dah-hints">
      <li v-for="(hint, index) in check.hints" :key="index">{{ hint }}</li>
    </ul>

    <footer class="dah-foot">
      <div class="dah-foot__lines">
        <p class="dah-foot__line" :class="{ warn: runLineWarn }">运行状态：{{ runLine }}</p>
        <p class="dah-foot__line" :class="{ fail: !savedOk }">
          保存状态：{{ savedOk ? `已存本机 · ${formatClock(record.updatedAt)}` : '本机保存失败，编辑只在当前页' }}
        </p>
      </div>
      <span class="dah-foot__rev">修订 {{ record.revision }}</span>
      <button type="button" class="dah-foot__reset" :disabled="isReadOnly" @click="reset">清空本阶段草稿</button>
    </footer>

    <p v-if="feedback" class="dah-feedback" role="status">{{ feedback }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import FieldCheckEditor from '../../components/research/FieldCheckEditor.vue'
import DataQualityEditor from '../../components/research/DataQualityEditor.vue'
import ChangeImpactEditor from '../../components/research/ChangeImpactEditor.vue'
import AnalysisResultEditor from '../../components/research/AnalysisResultEditor.vue'
import { createUuid } from '../../utils/uuid'
import {
  analysisInputSignature,
  checkAnalysis,
  dataMeasures,
  deriveDatasetSignature,
  normalizeAnalysisDraft,
  normalizeDataset,
  normalizeResult,
  runStatusLabel,
  type AnalysisDataset,
  type AnalysisDraftUpdate,
  type AnalysisPayload,
  type AnalysisUpstream,
  type ColumnGuess,
  type DatasetColumn,
  type RunStatus,
} from '../../components/research/f-analysis-contract'
import {
  emptyTopicPlanRecord,
  formatClock,
  loadTopicPlanRecord,
  resetAnalysis,
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

const context = computed<DraftContext>(() => ({ localTaskId: props.localTaskId, revision: record.value.revision }))
const upstream = computed<AnalysisUpstream>(() => ({
  plan: record.value.plan,
  questionnaire: record.value.questionnaire,
}))
const payload = computed<AnalysisPayload>(() => record.value.analysisPayload)
const check = computed(() =>
  checkAnalysis(record.value.analysis, upstream.value, payload.value.dataset, payload.value.run, payload.value.result),
)
const issues = computed(() => check.value.all)

const measureCount = computed(() => dataMeasures(record.value.plan).length)
const questionCount = computed(() => record.value.questionnaire.questions.length)

// ── 载荷登记表单 ────────────────────────────────────────────────────────
const dsFileName = ref(payload.value.dataset?.fileName ?? '')
const dsRowCount = ref(payload.value.dataset ? String(payload.value.dataset.rowCount) : '')
const dsSignature = ref(payload.value.dataset?.signature ?? '')
const dsColumns = ref(
  payload.value.dataset
    ? payload.value.dataset.columns.map((column) => `${column.name}:${column.guess}`).join('\n')
    : '',
)
const runStatus = ref<RunStatus>('succeeded')
const runStartedAt = ref('')
const runFailure = ref('')
const resultText = ref('')
const resultSources = ref('')
const panelNote = ref('')

function persist(next: TopicPlanRecord): void {
  record.value = next
  savedOk.value = saveTopicPlanRecord(props.localTaskId, next)
}

/**
 * 载荷登记不是草稿编辑，所以 **不动 revision**。
 * revision 只随编辑递增，这样组件发来的陈旧判定语义才和真实外壳一致。
 */
function setPayload(patch: Partial<AnalysisPayload>): void {
  persist({
    ...record.value,
    analysisPayload: { ...record.value.analysisPayload, ...patch },
    updatedAt: Date.now(),
  })
}

const GUESSES: ColumnGuess[] = ['text', 'number', 'date', 'empty']

function parseColumns(text: string): DatasetColumn[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [namePart, guessPart] = line.split(':')
      const name = namePart.trim()
      const guess = (guessPart ?? '').trim().toLowerCase()
      return { name, guess: GUESSES.includes(guess as ColumnGuess) ? (guess as ColumnGuess) : 'text' }
    })
    .filter((column) => column.name)
}

function registerDataset(): void {
  if (isReadOnly.value) return
  const columns = parseColumns(dsColumns.value)
  const rowCount = Number(dsRowCount.value)
  if (!dsFileName.value.trim()) {
    panelNote.value = '文件名不能为空。'
    return
  }
  if (!Number.isFinite(rowCount) || rowCount < 0) {
    panelNote.value = '行数必须是不小于 0 的数字。'
    return
  }
  if (!columns.length) {
    panelNote.value = '至少需要一列列名。'
    return
  }
  const signature = dsSignature.value.trim() || deriveDatasetSignature(dsFileName.value.trim(), rowCount, columns)
  const dataset: AnalysisDataset = {
    signature,
    fileName: dsFileName.value.trim(),
    rowCount,
    columns,
    sampleRows: [],
  }
  const clean = normalizeDataset(dataset)
  if (!clean) {
    panelNote.value = '数据集结构不完整，未登记。'
    return
  }
  setPayload({ dataset: clean })
  panelNote.value = `已登记「${clean.fileName}」，指纹 ${clean.signature}。改列名或改行数都会让指纹变化，旧结果会自动作废。`
}

function clearPayload(): void {
  if (isReadOnly.value) return
  setPayload({ dataset: null, run: null, result: null })
  dsFileName.value = ''
  dsRowCount.value = ''
  dsSignature.value = ''
  dsColumns.value = ''
  resultText.value = ''
  resultSources.value = ''
  panelNote.value = '已清空数据集与产物。'
}

function registerRun(): void {
  if (isReadOnly.value || !payload.value.dataset) return
  const startedAt = runStartedAt.value.trim() || new Date().toISOString()
  const run = {
    runId: `run-${createUuid()}`,
    startedAt,
    status: runStatus.value,
    failureReason: runStatus.value === 'failed' ? runFailure.value.trim() : '',
    // 指纹由 F 侧算：口径只应有一处定义，BB 原样回写
    inputSignature: analysisInputSignature(record.value.analysis, payload.value.dataset),
  }
  setPayload({ run })
  panelNote.value =
    run.status === 'failed'
      ? '已登记一次失败的运行。失败原因会显示在「结果与采用」里，输入不受影响。'
      : `已登记一次运行（指纹 ${run.inputSignature}）。之后改动字段或处理口径，这份结果会自动变成「需要重跑」。`
}

/** 制表符分隔 → 表；纯数字单元格转成 number，避免按字符串排序。 */
function parseResultTable(text: string): { headers: string[]; rows: (string | number | null)[][] } | null {
  const lines = text.replace(/\r/g, '').split('\n').filter((line) => line.trim() !== '')
  if (lines.length < 2) return null
  const headers = lines[0].split('\t').map((cell) => cell.trim())
  if (headers.some((header) => !header)) return null
  const rows = lines.slice(1).map((line) =>
    line.split('\t').map((cell) => {
      const raw = cell.trim()
      if (raw === '' || raw === '—' || raw === '-') return null
      return /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw
    }),
  )
  return { headers, rows }
}

function registerResult(): void {
  if (isReadOnly.value || !payload.value.dataset) return
  const table = parseResultTable(resultText.value)
  if (!table) {
    panelNote.value = '结果表至少要有一行表头和一行数据，且用制表符分隔。'
    return
  }
  const sourceLines = resultSources.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const rowSources = table.rows.map((_, index) =>
    (sourceLines[index] ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  )
  const clean = normalizeResult({ table, rowSources })
  if (!clean) {
    panelNote.value = '结果表结构不完整，未登记。'
    return
  }
  setPayload({ result: clean })
  panelNote.value = `已登记结果：${clean.table.rows.length} 行 × ${clean.table.headers.length} 列。`
}

// ── 编辑 ────────────────────────────────────────────────────────────────
function isStale(eventContext: DraftContext): boolean {
  return eventContext.localTaskId !== props.localTaskId || eventContext.revision !== record.value.revision
}

function onUpdateDraft(event: AnalysisDraftUpdate): void {
  if (isReadOnly.value) {
    feedback.value = '当前为只读，编辑请求未应用。'
    return
  }
  if (isStale(event.context)) {
    feedback.value = '忽略了其他任务或旧修订的编辑事件。'
    return
  }
  const clean = normalizeAnalysisDraft(event.draft)
  if (!clean) {
    feedback.value = '组件草稿格式不完整，当前内容未替换。'
    return
  }
  persist({
    ...record.value,
    analysis: clean,
    revision: record.value.revision + 1,
    updatedAt: Date.now(),
  })
  feedback.value = savedOk.value ? '' : '本机保存失败，编辑仍保留在当前页面，请不要关闭页面。'
}

function reset(): void {
  if (isReadOnly.value) return
  if (!window.confirm('清空第 6 阶段的草稿？字段映射、质检、影响说明、采用记录和登记的数据集都会清掉，前四个阶段不受影响。')) return
  persist(resetAnalysis(record.value))
  feedback.value = '已清空数据分析草稿。'
}

// ── 页脚两行状态 ────────────────────────────────────────────────────────
const runLine = computed(() => {
  const run = payload.value.run
  if (!run) return '未登记运行记录（本页不执行统计）'
  const current = analysisInputSignature(record.value.analysis, payload.value.dataset)
  const match = run.inputSignature === current ? '与当前输入一致' : '与当前输入不一致'
  return `${runStatusLabel(run.status)} · 指纹 ${run.inputSignature} · ${match}`
})

const runLineWarn = computed(() => {
  const run = payload.value.run
  if (!run) return true
  return run.status !== 'succeeded' || run.inputSignature !== analysisInputSignature(record.value.analysis, payload.value.dataset)
})

if (!props.localTaskId) record.value = emptyTopicPlanRecord()
</script>

<style scoped>
.dah {
  padding: 26px 28px 22px;
}

.dah-up {
  display: grid;
  gap: 8px;
  margin-bottom: 18px;
  padding: 14px 16px;
  border: 1px solid #e1ebe5;
  border-left: 3px solid #7fb39c;
  border-radius: 9px;
  background: #f7faf8;
}

.dah-up__label {
  font-size: 11px;
  letter-spacing: 0.04em;
  color: #4b806b;
}

.dah-up__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin: 0;
  font-size: 12.5px;
  color: #45645a;
}

.dah-up__facts .warn {
  color: #9b542b;
}

.dah-up__hint {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.8;
  color: #876d36;
}

.dah-up__links {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.dah-link {
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

/* 缺项总览 */
.dah-issues {
  margin: 0 0 16px;
  padding: 10px 14px;
  border: 1px solid #f0dcc0;
  border-radius: 7px;
  background: #fdf6e9;
}

.dah-issues__summary {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 600;
  color: #8a6313;
  cursor: pointer;
  list-style: none;
}

.dah-issues__summary::-webkit-details-marker {
  display: none;
}

.dah-issues__hint {
  font-size: 10.5px;
  font-weight: 400;
  color: #a98a4a;
}

.dah-issues__list {
  margin: 8px 0 0;
  padding-left: 20px;
  display: grid;
  gap: 3px;
  font-size: 11.5px;
  line-height: 1.75;
  color: #8a6313;
}

.dah-complete {
  margin: 0 0 16px;
  padding: 9px 14px;
  border: 1px solid #cfe6df;
  border-radius: 7px;
  background: #e6f6f3;
  font-size: 12px;
  color: #0b6e68;
}

/* 载荷登记面板 */
.dah-panel {
  border: 1px solid #dde8e3;
  border-radius: 9px;
  background: #fcfdfd;
}

.dah-panel__summary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 16px;
  font-size: 12.5px;
  font-weight: 600;
  color: #28624f;
  cursor: pointer;
  list-style: none;
}

.dah-panel__summary::-webkit-details-marker {
  display: none;
}

.dah-panel__badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: #f2f5f4;
  font-size: 10.5px;
  font-weight: 500;
  color: #6f8277;
}

.dah-panel__body {
  display: grid;
  gap: 14px;
  padding: 0 16px 16px;
}

.dah-panel__note {
  margin: 0;
  padding: 10px 12px;
  border-radius: 7px;
  background: #fdf6e9;
  border: 1px solid #f0dcc0;
  font-size: 11.5px;
  line-height: 1.85;
  color: #8a6313;
}

.dah-form {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 12px 14px;
  border: 1px solid #e4ece8;
  border-radius: 7px;
  background: #fff;
}

.dah-form:disabled {
  opacity: 0.55;
}

.dah-form legend {
  padding: 0 6px;
  font-size: 12px;
  font-weight: 600;
  color: #3d6570;
}

.dah-form__row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.dah-field {
  display: grid;
  gap: 5px;
  flex: 1 1 240px;
  min-width: 0;
}

.dah-field--sm {
  flex: 0 1 160px;
}

.dah-label {
  font-size: 11px;
  color: #6f8277;
}

.dah-input {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 9px;
  border: 1px solid #cfdcd6;
  border-radius: 5px;
  background: #fff;
  color: #0b2e36;
  font: inherit;
  font-size: 12.5px;
}

.dah-textarea {
  resize: vertical;
  line-height: 1.7;
}

.dah-textarea--mono {
  font-family: var(--font-mono);
  font-size: 11.5px;
}

.dah-form__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.dah-form__actions .btn {
  font-size: 11.5px;
  padding: 5px 11px;
}

.dah-form__cur {
  font-size: 11px;
  color: #6f8277;
}

.dah-form__cur code {
  font-family: var(--font-mono);
  font-size: 10.5px;
}

.dah-form__note {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.75;
  color: #8a6a2f;
}

/* 页脚 */
.dah-hints {
  margin: 16px 0 0;
  padding: 12px 14px 12px 30px;
  border: 1px dashed #d5e1db;
  border-radius: 7px;
  background: #fbfdfc;
  font-size: 11.5px;
  line-height: 1.8;
  color: #6f8277;
}

.dah-foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid #e8eee9;
}

.dah-foot__lines {
  display: grid;
  gap: 3px;
}

.dah-foot__line {
  margin: 0;
  font-size: 12px;
  color: #6f8277;
}

.dah-foot__line.warn {
  color: #9b542b;
}

.dah-foot__line.fail {
  color: #a14332;
}

.dah-foot__rev {
  font-size: 11px;
  color: #8b9a91;
}

.dah-foot__reset {
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

.dah-foot__reset:disabled {
  color: #98a69d;
  border-color: #e6ece8;
  cursor: default;
}

.dah-feedback:not(:empty) {
  margin: 10px 0 0;
  font-size: 12.5px;
  line-height: 1.8;
  color: #8a6a2f;
}

.dah-feedback:not(:empty)::before {
  content: '提示：';
}

button:focus-visible,
summary:focus-visible {
  outline: 3px solid #8bbba5;
  outline-offset: 3px;
}

@media (max-width: 900px) {
  .dah {
    padding: 18px 14px 16px;
  }
}
</style>
