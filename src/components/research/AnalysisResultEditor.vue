<!--
  第六阶段 · 数据分析 · 区块 4「结果与采用」（F 交付）

  - props：context / draft / upstream / dataset / run / result / readOnly / issues
  - emits：update-draft
  - 本组件只改 draft.resultNote / draft.adoption / draft.otherNote / draft.unknowns。
  - 不跑统计、不生成结果：run 与 result 是只读 props，由统计侧（BB）提供。
    落盘草稿里根本没有结果表，所以不存在「手改结果再声称是跑出来的」这条路径。
-->
<template>
  <section class="are" :class="{ 'are--readonly': isReadOnly }">
    <header class="are-head">
      <div class="are-head__text">
        <h3 class="are-title"><span class="are-no">4</span>结果与采用</h3>
        <p class="are-sub">
          运行记录带着它当时的输入指纹。「结果可用」与「已可用于报告」都是算出来的：
          输入一改，结果自动作废；换了运行，采用自动失效。
        </p>
      </div>
      <div class="are-head__status">
        <span v-if="isReadOnly" class="pill pill--lock">只读</span>
        <span class="pill" :class="resultPillClass">{{ resultLabel }}</span>
        <span class="pill" :class="reportPillClass">{{ reportLabel }}</span>
      </div>
    </header>

    <!-- 运行记录 -->
    <section class="are-run">
      <div class="are-run__bar">
        <h4 class="are-h4">运行记录</h4>
        <span class="are-run__src">由统计侧产生（只读）</span>
      </div>

      <p v-if="!dataset" class="are-run__empty">还没有数据集，运行与结果都无从谈起。</p>
      <p v-else-if="!run" class="are-run__empty">
        还没有运行记录。本页不执行统计——需要先在统计工具里跑出结果，再把「运行 + 结果」登记进来
        （BB 接口到位后由执行记录自动填入）。
      </p>
      <template v-else>
        <p class="are-run__facts">
          <span class="are-run__status" :class="`are-run__status--${run.status}`">{{ runStatusLabel(run.status) }}</span>
          <span class="are-run__id">{{ run.runId }}</span>
          <span>{{ run.startedAt || '未记录时间' }}</span>
        </p>
        <p class="are-run__sig">
          运行输入指纹 <code>{{ run.inputSignature }}</code>
          <span class="are-run__arrow">→</span>
          当前输入指纹 <code>{{ currentSignature }}</code>
          <span v-if="run.inputSignature === currentSignature" class="are-run__match">一致</span>
          <span v-else class="are-run__diff">不一致</span>
        </p>
        <p v-if="run.status === 'failed'" class="are-run__fail">
          失败原因：{{ run.failureReason.trim() || '（运行记录里没有写）' }}
        </p>
        <p v-if="isStale" class="are-run__stale">
          这份结果是旧输入跑出来的：页面上仍然显示，但不能再被引用。要恢复成可用，
          要么把输入改回原来的样子，要么重新跑一次并登记新的运行记录。
        </p>
      </template>
    </section>

    <!-- 结果表 -->
    <div class="are-bar">
      <h4 class="are-h4">结果表</h4>
      <span v-if="result" class="are-bar__meta">
        {{ result.table.rows.length }} 行 × {{ result.table.headers.length }} 列 · 只读
      </span>
    </div>

    <p v-if="!result" class="are-empty">还没有结果表。</p>
    <template v-else>
      <p v-if="!result.table.headers.length" class="are-empty">结果表没有表头，无法展示。</p>
      <div v-else class="are-tablewrap">
        <table class="are-table">
          <thead>
            <tr>
              <th class="are-table__idx">#</th>
              <th v-for="(header, headerIndex) in result.table.headers" :key="headerIndex">{{ header }}</th>
              <th class="are-table__drill">下钻</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIndex) in result.table.rows" :key="rowIndex" :class="{ 'are-table__row--open': expandedRow === rowIndex }">
              <td class="are-table__idx">{{ rowIndex + 1 }}</td>
              <td v-for="(cell, cellIndex) in row" :key="cellIndex" :class="{ 'are-table__num': typeof cell === 'number' }">
                {{ cell === null ? '—' : cell }}
              </td>
              <td class="are-table__drill">
                <button
                  type="button"
                  class="are-table__btn"
                  :aria-expanded="expandedRow === rowIndex"
                  @click="toggleRow(rowIndex)"
                >
                  {{ sourceCountOf(rowIndex) }} 条原始行
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="expandedRow !== null" class="are-drill">
        <p class="are-drill__title">
          第 {{ expandedRow + 1 }} 行结果对应的原始记录
          <button type="button" class="are-drill__close" @click="expandedRow = null">收起</button>
        </p>
        <p v-if="!sourceList.length" class="are-drill__empty">
          这一行没有记录原始行 id：下钻不到原件，报告里也就无法让人核对。
        </p>
        <ul v-else class="are-drill__list">
          <li v-for="sourceId in sourceList" :key="sourceId" class="are-drill__item">{{ sourceId }}</li>
        </ul>
      </div>
    </template>

    <label class="are-field">
      <span class="are-label">结论一句话</span>
      <textarea
        class="are-input are-textarea"
        rows="2"
        :value="draft.resultNote"
        :readonly="isReadOnly"
        aria-label="结论一句话"
        placeholder="例如：工作日晚 18:00-20:00 的座位缺口最大，均值 42 个座位，是白天的 2.3 倍"
        @input="onResultNoteInput($event)"
      />
      <span class="are-hint">这句会被直接引用进报告，所以要用数字和时段说话，不要写「情况比较严重」。</span>
    </label>

    <!-- 采用 -->
    <section class="are-adopt">
      <div class="are-adopt__bar">
        <h4 class="are-h4">采用为报告结果</h4>
        <span class="are-adopt__state" :class="`are-adopt__state--${reportInfo.state}`">{{ reportLabel }}</span>
      </div>

      <p class="are-adopt__why">
        采用记的不是「这张表我点了确定」，而是「用这份输入跑的这一次运行」。
        现在采用会记下 <code>{{ currentSignature }}</code> 与运行 id
        <code>{{ run ? run.runId : '（还没有运行）' }}</code>。
      </p>

      <label class="are-field">
        <span class="are-label">采用理由</span>
        <input
          class="are-input"
          type="text"
          :value="draft.adoption.note"
          :readonly="isReadOnly"
          aria-label="采用理由"
          placeholder="例如：样本 312 行，主要指标置信区间可接受，结果与试填方向一致"
          @input="onAdoptionNoteInput($event)"
        />
      </label>

      <p v-if="adoptBlockedReason" class="are-adopt__blocked">{{ adoptBlockedReason }}</p>

      <div class="are-adopt__actions">
        <button
          type="button"
          class="btn primary"
          :disabled="isReadOnly || !!adoptBlockedReason || reportInfo.state === 'ready'"
          @click="adopt"
        >
          {{ reportInfo.state === 'ready' ? '当前输入与运行已采用' : '采用当前结果' }}
        </button>
        <button
          v-if="draft.adoption.signature"
          type="button"
          class="btn"
          :disabled="isReadOnly"
          @click="cancelAdoption"
        >
          取消采用
        </button>
        <span v-if="draft.adoption.signature" class="are-adopt__sig">
          已采用指纹 <code>{{ draft.adoption.signature }}</code> · 运行 <code>{{ draft.adoption.runId }}</code>
        </span>
      </div>
    </section>

    <!-- 其他说明与未知项 -->
    <label class="are-field">
      <span class="are-label">其他说明（不进输入指纹，只作记录）</span>
      <textarea
        class="are-input are-textarea"
        rows="2"
        :value="draft.otherNote"
        :readonly="isReadOnly"
        aria-label="其他说明"
        placeholder="例如：本阶段统计在 Excel / SPSS 里完成，结果表由导出后粘贴登记"
        @input="onOtherNoteInput($event)"
      />
    </label>

    <div class="are-bar">
      <h4 class="are-h4">未知项</h4>
      <button type="button" class="btn" :disabled="isReadOnly" @click="addUnknown">+ 记录一个未知项</button>
    </div>

    <p v-if="!draft.unknowns.length" class="are-empty are-empty--soft">没有登记未知项。</p>
    <ul v-else class="are-unknowns">
      <li v-for="(unknown, index) in draft.unknowns" :key="unknown.id" class="are-unknown">
        <span class="are-unknown__no">{{ index + 1 }}</span>
        <input
          class="are-input"
          type="text"
          :value="unknown.text"
          :readonly="isReadOnly"
          :aria-label="`未知项 ${index + 1}`"
          placeholder="例如：平台是否记录答题设备，会影响重复作答的判断"
          @input="onUnknownText(unknown.id, $event)"
        />
        <label class="are-unknown__flag">
          <input
            type="checkbox"
            :checked="unknown.blocksDecision"
            :disabled="isReadOnly"
            :aria-label="`未知项 ${index + 1} 阻碍当前决定`"
            @change="toggleUnknownBlocks(unknown.id)"
          />
          阻碍结论
        </label>
        <button
          type="button"
          class="are-unknown__del"
          :disabled="isReadOnly"
          :aria-label="`删除未知项 ${index + 1}`"
          @click="removeUnknown(unknown.id)"
        >
          删除
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ContestUnknown } from '../../types/research-contracts'
import { createUuid } from '../../utils/uuid'
import {
  analysisInputSignature,
  reportState as resolveReportState,
  reportStateLabel,
  resultState as resolveResultState,
  resultStateLabel,
  runStatusLabel,
  type AnalysisDraft,
  type AnalysisDraftUpdate,
  type AnalysisEditorProps,
} from './f-analysis-contract'

const props = defineProps<AnalysisEditorProps>()

const emit = defineEmits<{
  'update-draft': [value: AnalysisDraftUpdate]
}>()

const isReadOnly = computed(() => props.readOnly === true)
const expandedRow = ref<number | null>(null)

// ── 写出口 ──────────────────────────────────────────────────────────────
let pendingDraft: AnalysisDraft | null = null
let flushScheduled = false

function commit(patch: Partial<AnalysisDraft>) {
  if (isReadOnly.value) return
  pendingDraft = { ...(pendingDraft ?? props.draft), ...patch }
  if (flushScheduled) return
  flushScheduled = true
  queueMicrotask(flushDraft)
}

function flushDraft() {
  flushScheduled = false
  const draft = pendingDraft
  pendingDraft = null
  if (!draft) return
  emit('update-draft', { context: { ...props.context }, draft })
}

function currentDraft(): AnalysisDraft {
  return pendingDraft ?? props.draft
}

function textOf(event: Event): string {
  return (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value
}

// ── 派生状态 ────────────────────────────────────────────────────────────
const currentSignature = computed(() => analysisInputSignature(props.draft, props.dataset))
const resultInfo = computed(() => resolveResultState(props.draft, props.dataset, props.run, props.result))
const reportInfo = computed(() => resolveReportState(props.draft, props.dataset, props.run, props.result))
const isStale = computed(() => resultInfo.value.state === 'stale')

const resultLabel = computed(() => resultStateLabel(resultInfo.value.state))
const reportLabel = computed(() => reportStateLabel(reportInfo.value.state))
const resultPillClass = computed(() => (resultInfo.value.state === 'ready' ? 'pill--ok' : 'pill--warn'))
const reportPillClass = computed(() => (reportInfo.value.state === 'ready' ? 'pill--ok' : 'pill--warn'))

/** 按钮为什么不能点——必须说清，否则用户只会反复点。 */
const adoptBlockedReason = computed(() => {
  if (reportInfo.value.state === 'ready') return ''
  if (resultInfo.value.state !== 'ready') return `当前结果不可用，不能采用：${resultInfo.value.reasons[0] ?? ''}`
  if (!props.draft.resultNote.trim()) return '先写结论一句话，再采用——报告引用的是那句结论，不是这张表。'
  return ''
})

// ── 结果表下钻 ──────────────────────────────────────────────────────────
function sourceCountOf(rowIndex: number): number {
  if (!props.result || !props.result.rowSources[rowIndex]) return 0
  return props.result.rowSources[rowIndex].length
}

const sourceList = computed(() => {
  if (expandedRow.value === null || !props.result) return []
  return props.result.rowSources[expandedRow.value] ?? []
})

function toggleRow(rowIndex: number) {
  expandedRow.value = expandedRow.value === rowIndex ? null : rowIndex
}

// ── 编辑 ────────────────────────────────────────────────────────────────
function onResultNoteInput(event: Event) {
  commit({ resultNote: textOf(event) })
}

function onAdoptionNoteInput(event: Event) {
  commit({ adoption: { ...currentDraft().adoption, note: textOf(event) } })
}

function onOtherNoteInput(event: Event) {
  commit({ otherNote: textOf(event) })
}

function adopt() {
  if (isReadOnly.value || !props.run) return
  const draft = currentDraft()
  commit({
    adoption: { signature: analysisInputSignature(draft, props.dataset), runId: props.run.runId, note: draft.adoption.note },
  })
}

function cancelAdoption() {
  commit({ adoption: { signature: '', runId: '', note: currentDraft().adoption.note } })
}

// ── 未知项 ──────────────────────────────────────────────────────────────
function addUnknown() {
  const unknown: ContestUnknown = { id: `u-${createUuid()}`, text: '', blocksDecision: false }
  commit({ unknowns: [...currentDraft().unknowns, unknown] })
}

function onUnknownText(id: string, event: Event) {
  const text = textOf(event)
  commit({ unknowns: currentDraft().unknowns.map((item) => (item.id === id ? { ...item, text } : item)) })
}

function toggleUnknownBlocks(id: string) {
  commit({
    unknowns: currentDraft().unknowns.map((item) =>
      item.id === id ? { ...item, blocksDecision: !item.blocksDecision } : item,
    ),
  })
}

function removeUnknown(id: string) {
  commit({ unknowns: currentDraft().unknowns.filter((item) => item.id !== id) })
}
</script>

<style scoped>
.are {
  margin: 18px 0 0;
  padding: 20px 22px 16px;
  background: var(--c-surface);
  border: 1px solid var(--c-line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  font-size: 13px;
  color: var(--c-ink);
}

.are--readonly {
  background: #fbfdfd;
}

.are-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--c-line);
}

.are-head__text {
  min-width: 0;
}

.are-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--c-ink);
}

.are-no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--c-primary-soft);
  color: var(--c-primary-ink);
  font-size: 11px;
  font-weight: 700;
}

.are-sub {
  margin: 0;
  max-width: 62em;
  font-size: 12px;
  line-height: 1.75;
  color: var(--c-muted);
}

.are-head__status {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
  padding-top: 2px;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.pill--ok {
  background: var(--c-primary-soft);
  color: var(--c-primary-ink);
}

.pill--warn {
  background: var(--c-warn-soft);
  color: var(--c-warn-ink);
  border: 1px solid var(--c-warn-line);
}

.pill--lock {
  background: #eef1f4;
  color: var(--c-muted);
  border: 1px solid var(--c-line-strong);
}

/* 运行记录 */
.are-run {
  margin: 14px 0 4px;
  padding: 12px 14px;
  background: #f7fbfa;
  border: 1px solid var(--c-line);
  border-radius: var(--radius-sm);
}

.are-run__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.are-run__src {
  font-size: 11px;
  color: var(--c-muted);
}

.are-h4 {
  margin: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--c-ink-2);
}

.are-run__empty {
  margin: 4px 0 0;
  font-size: 11.5px;
  line-height: 1.8;
  color: var(--c-warn-ink);
}

.are-run__facts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--c-ink-2);
}

.are-run__status {
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: var(--c-primary-soft);
  color: var(--c-primary-ink);
}

.are-run__status--failed {
  background: #fdeceb;
  color: #a14332;
}

.are-run__status--running {
  background: var(--c-warn-soft);
  color: var(--c-warn-ink);
}

.are-run__id {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--c-muted);
}

.are-run__sig {
  margin: 0;
  font-size: 11.5px;
  line-height: 2;
  color: var(--c-ink-2);
}

.are-run__sig code {
  padding: 1px 5px;
  border-radius: 3px;
  background: #eef4f3;
  font-size: 11px;
}

.are-run__arrow {
  margin: 0 6px;
  color: var(--c-muted);
}

.are-run__match {
  margin-left: 8px;
  color: var(--c-primary-ink);
  font-weight: 600;
}

.are-run__diff {
  margin-left: 8px;
  color: var(--c-warn-ink);
  font-weight: 600;
}

.are-run__fail {
  margin: 6px 0 0;
  font-size: 11.5px;
  line-height: 1.75;
  color: #a14332;
}

.are-run__stale {
  margin: 6px 0 0;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--c-warn-soft);
  border: 1px solid var(--c-warn-line);
  font-size: 11.5px;
  line-height: 1.75;
  color: var(--c-warn-ink);
}

/* 结果表 */
.are-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin: 16px 0 10px;
}

.are-bar__meta {
  font-size: 11px;
  color: var(--c-muted);
}

.are-bar .btn {
  font-size: 11.5px;
  padding: 5px 11px;
}

.are-tablewrap {
  overflow-x: auto;
  border: 1px solid var(--c-line);
  border-radius: var(--radius-sm);
}

.are-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.are-table th,
.are-table td {
  padding: 7px 10px;
  border-bottom: 1px solid var(--c-line);
  text-align: left;
  white-space: nowrap;
}

/* 数值靠右便于比较，文本靠左便于读 */
.are-table td.are-table__num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.are-table th {
  background: #f4f8f7;
  font-weight: 600;
  color: var(--c-ink-2);
  font-size: 11.5px;
}

.are-table th:first-child,
.are-table td:first-child {
  text-align: left;
}

.are-table tbody tr:last-child td {
  border-bottom: 0;
}

.are-table__row--open td {
  background: var(--c-primary-soft);
}

.are-table__idx {
  width: 34px;
  color: var(--c-muted);
  font-size: 11px;
}

.are-table__drill {
  text-align: right;
}

.are-table__btn {
  padding: 2px 8px;
  border: 1px solid var(--c-line-strong);
  border-radius: 4px;
  background: var(--c-surface);
  color: var(--c-primary-ink);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.are-table__btn:hover {
  border-color: var(--c-primary);
}

.are-drill {
  margin-top: 8px;
  padding: 10px 12px;
  border: 1px dashed var(--c-line-strong);
  border-radius: var(--radius-sm);
  background: #f9fcfb;
}

.are-drill__title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--c-ink-2);
}

.are-drill__close {
  margin-left: auto;
  padding: 1px 7px;
  border: 1px solid var(--c-line);
  border-radius: 4px;
  background: var(--c-surface);
  color: var(--c-muted);
  font: inherit;
  font-size: 10.5px;
  cursor: pointer;
}

.are-drill__empty {
  margin: 0;
  font-size: 11px;
  line-height: 1.7;
  color: var(--c-warn-ink);
}

.are-drill__list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.are-drill__item {
  padding: 2px 8px;
  border: 1px solid var(--c-line);
  border-radius: 999px;
  background: var(--c-surface);
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--c-ink-2);
}

/* 通用字段 */
.are-field {
  display: grid;
  gap: 6px;
  margin: 14px 0 0;
  align-content: start;
}

.are-label {
  font-size: 11.5px;
  color: var(--c-muted);
}

.are-hint {
  font-size: 11px;
  line-height: 1.65;
  color: var(--c-muted);
}

.are-input {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 9px;
  border: 1px solid var(--c-line-strong);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-ink);
  font: inherit;
  font-size: 12.5px;
}

.are-input:read-only {
  background: #f4f7f7;
  color: var(--c-ink-2);
}

.are-textarea {
  resize: vertical;
  line-height: 1.65;
}

.are-input:focus-visible {
  outline: 2px solid var(--c-primary);
  outline-offset: 1px;
}

/* 采用 */
.are-adopt {
  margin: 16px 0 0;
  padding: 12px 14px;
  border: 1px solid var(--c-line);
  border-radius: var(--radius-sm);
  background: #fbfdfd;
}

.are-adopt__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.are-adopt__state {
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  background: #eef1f4;
  color: var(--c-muted);
}

.are-adopt__state--ready {
  background: var(--c-primary-soft);
  color: var(--c-primary-ink);
}

.are-adopt__state--drifted,
.are-adopt__state--blocked {
  background: var(--c-warn-soft);
  color: var(--c-warn-ink);
}

.are-adopt__why {
  margin: 0 0 10px;
  font-size: 11.5px;
  line-height: 1.85;
  color: var(--c-muted);
}

.are-adopt__why code {
  padding: 1px 5px;
  border-radius: 3px;
  background: #eef4f3;
  font-size: 10.5px;
}

.are-adopt__blocked {
  margin: 0 0 10px;
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--c-warn-ink);
}

.are-adopt__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.are-adopt__actions .btn {
  font-size: 12px;
  padding: 6px 12px;
}

.are-adopt__sig {
  font-size: 11px;
  color: var(--c-muted);
}

.are-adopt__sig code {
  font-size: 10.5px;
}

/* 未知项 */
.are-empty {
  margin: 0;
  padding: 12px 14px;
  border: 1px dashed var(--c-line-strong);
  border-radius: var(--radius-sm);
  font-size: 12px;
  line-height: 1.75;
  color: var(--c-muted);
}

.are-empty--soft {
  padding: 8px 12px;
  font-size: 11.5px;
}

.are-unknowns {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.are-unknown {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--c-line);
  border-radius: var(--radius-sm);
  background: #fdfefe;
}

.are-unknown__no {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  border-radius: 4px;
  background: var(--c-primary-soft);
  color: var(--c-primary-ink);
  font-size: 11px;
  font-weight: 600;
}

.are-unknown .are-input {
  flex: 1 1 220px;
  min-width: 0;
}

.are-unknown__flag {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--c-ink-2);
  cursor: pointer;
  white-space: nowrap;
}

.are-unknown__flag input {
  width: 13px;
  height: 13px;
  accent-color: var(--c-primary);
}

.are-unknown__del {
  flex: none;
  padding: 2px 8px;
  border: 1px solid var(--c-line);
  border-radius: 4px;
  background: var(--c-surface);
  color: var(--c-muted);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.are-unknown__del:hover:not(:disabled) {
  border-color: var(--c-warn);
  color: var(--c-warn-ink);
}

.are-unknown__del:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .are {
    padding: 16px 14px 12px;
  }

  .are-head {
    flex-direction: column;
    gap: 10px;
  }

  .are-head__status {
    justify-content: flex-start;
  }

  .are-unknown {
    flex-wrap: wrap;
  }
}
</style>
