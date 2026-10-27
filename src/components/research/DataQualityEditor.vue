<!--
  第六阶段 · 数据分析 · 区块 2「质检与处理口径」（F 交付）

  - props：context / draft / upstream / dataset / run / result / readOnly / issues
  - emits：update-draft
  - 本组件只改 draft.quality（处理口径 + 问题清单）。
  - 「受影响行数」由用户填真实值，组件不统计、不估猜。
-->
<template>
  <section class="dqe" :class="{ 'dqe--readonly': isReadOnly }">
    <header class="dqe-head">
      <div class="dqe-head__text">
        <h3 class="dqe-title"><span class="dqe-no">2</span>质检与处理口径</h3>
        <p class="dqe-sub">
          每一处问题都要给处理动作。「保留」和「剔除」是两件事，布尔值分不清，
          所以剔除、插补、重编码都必须写清判断依据，否则复核的人无法复现。
        </p>
      </div>
      <div class="dqe-head__status">
        <span v-if="isReadOnly" class="pill pill--lock">只读</span>
        <span class="pill" :class="qualityPillClass">{{ qualityPillText }}</span>
      </div>
    </header>

    <label class="dqe-field">
      <span class="dqe-label">质检与处理口径</span>
      <textarea
        class="dqe-input dqe-textarea"
        rows="3"
        :value="draft.quality.rule"
        :readonly="isReadOnly"
        aria-label="质检与处理口径"
        placeholder="例如：逐列查空；量表取值越界（&lt;1 或 &gt;5）记为异常；同一学号出现两次保留首次作答，其余剔除并在影响说明里注明。"
        @input="onRuleInput($event)"
      />
      <span class="dqe-hint">这段是「怎么判定、怎么处理」的规则，不是问题清单；写清规则，别人才知道 99 算不算缺失。</span>
    </label>

    <div class="dqe-bar">
      <h4 class="dqe-h4">发现的问题</h4>
      <button type="button" class="btn" :disabled="isReadOnly" @click="addIssue">+ 记录一处问题</button>
    </div>

    <p v-if="!draft.quality.issues.length" class="dqe-empty">
      还没有记录任何数据问题。数据确实干净时也要在处理口径里写明核对方式，
      否则「没发现问题」和「没检查」看起来一样。
    </p>

    <div v-else class="dqe-list">
      <article v-for="(issue, index) in draft.quality.issues" :key="issue.id" class="dqe-item">
        <header class="dqe-item__head">
          <span class="dqe-item__no">{{ index + 1 }}</span>
          <span class="dqe-item__kind">{{ qualityKindLabel(issue.kind) }}</span>
          <span class="dqe-item__col" :class="{ 'dqe-item__col--empty': !issue.column }">
            {{ issue.column || '整行层面' }}
          </span>
          <span class="dqe-item__action">{{ qualityActionLabel(issue.action) }}</span>
          <button
            type="button"
            class="dqe-item__del"
            :disabled="isReadOnly"
            :aria-label="`删除第 ${index + 1} 处问题`"
            @click="removeIssue(issue.id)"
          >
            删除
          </button>
        </header>

        <div class="dqe-grid3">
          <label class="dqe-field">
            <span class="dqe-label">问题类型</span>
            <select
              class="dqe-input"
              :value="issue.kind"
              :disabled="isReadOnly"
              :aria-label="`第 ${index + 1} 处问题的类型`"
              @change="patchIssue(issue.id, { kind: textOf($event) as QualityKind })"
            >
              <option v-for="option in kindOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>

          <label class="dqe-field">
            <span class="dqe-label">涉及字段</span>
            <input
              class="dqe-input"
              type="text"
              list="dqe-column-list"
              :value="issue.column"
              :readonly="isReadOnly"
              :aria-label="`第 ${index + 1} 处问题的涉及字段`"
              placeholder="留空 = 整行层面"
              @input="patchIssue(issue.id, { column: textOf($event) })"
            />
          </label>

          <label class="dqe-field">
            <span class="dqe-label">受影响行数</span>
            <input
              class="dqe-input"
              type="number"
              min="0"
              :value="issue.affectedRows === null ? '' : String(issue.affectedRows)"
              :readonly="isReadOnly"
              :aria-label="`第 ${index + 1} 处问题的受影响行数`"
              placeholder="按实际情况填"
              @input="onRowsInput(issue.id, $event)"
            />
          </label>
        </div>

        <label class="dqe-field">
          <span class="dqe-label">具体表现</span>
          <textarea
            class="dqe-input dqe-textarea"
            rows="2"
            :value="issue.detail"
            :readonly="isReadOnly"
            :aria-label="`第 ${index + 1} 处问题的具体表现`"
            placeholder="例如：Q3 有 7 行取值为 9（问卷里 9 = 拒答），另有 3 行空白"
            @input="patchIssue(issue.id, { detail: textOf($event) })"
          />
        </label>

        <div class="dqe-grid2">
          <label class="dqe-field">
            <span class="dqe-label">处理动作</span>
            <select
              class="dqe-input"
              :value="issue.action"
              :disabled="isReadOnly"
              :aria-label="`第 ${index + 1} 处问题的处理动作`"
              @change="patchIssue(issue.id, { action: textOf($event) as QualityAction })"
            >
              <option v-for="option in actionOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <span class="dqe-hint">{{ actionHintOf(issue.action) }}</span>
          </label>

          <label class="dqe-field">
            <span class="dqe-label">判断依据／处理说明</span>
            <input
              class="dqe-input"
              type="text"
              :value="issue.actionNote"
              :readonly="isReadOnly || issue.action === 'keep'"
              :aria-label="`第 ${index + 1} 处问题的判断依据`"
              :placeholder="issue.action === 'keep' ? '保留不需要写理由' : '例如：9 是问卷的拒答编码，按缺失处理，不按数值 9 计算'"
              @input="patchIssue(issue.id, { actionNote: textOf($event) })"
            />
          </label>
        </div>

        <label class="dqe-check">
          <input
            type="checkbox"
            :checked="issue.reviewed"
            :disabled="isReadOnly"
            :aria-label="`第 ${index + 1} 处问题标记已复核`"
            @change="patchIssue(issue.id, { reviewed: !issue.reviewed })"
          />
          <span>已复核处理结果</span>
        </label>

        <ul v-if="hintsOf(issue, index).length" class="dqe-item__hints">
          <li v-for="(hint, hintIndex) in hintsOf(issue, index)" :key="hintIndex" :class="`dqe-item__hints--${hint.level}`">
            {{ hint.text }}
          </li>
        </ul>
      </article>
    </div>

    <datalist id="dqe-column-list">
      <option v-for="column in columns" :key="column.name" :value="column.name" />
    </datalist>

    <p v-if="!dataset" class="dqe-note">
      还没有数据集概览，涉及字段只能手填；列名接进来后这里会出现可选项。
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  QUALITY_ACTION_OPTIONS,
  QUALITY_KIND_OPTIONS,
  emptyQualityIssue,
  qualityActionLabel,
  qualityIssueHints,
  qualityKindLabel,
  qualityState,
  type AnalysisDraft,
  type AnalysisDraftUpdate,
  type AnalysisEditorProps,
  type QualityAction,
  type QualityIssue,
  type QualityKind,
} from './f-analysis-contract'

const props = defineProps<AnalysisEditorProps>()

const emit = defineEmits<{
  'update-draft': [value: AnalysisDraftUpdate]
}>()

const isReadOnly = computed(() => props.readOnly === true)
const kindOptions = QUALITY_KIND_OPTIONS
const actionOptions = QUALITY_ACTION_OPTIONS
const columns = computed(() => (props.dataset ? props.dataset.columns : []))

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

function patchQuality(patch: Partial<AnalysisDraft['quality']>) {
  commit({ quality: { ...currentDraft().quality, ...patch } })
}

function patchIssue(id: string, patch: Partial<QualityIssue>) {
  const quality = currentDraft().quality
  patchQuality({ issues: quality.issues.map((item) => (item.id === id ? { ...item, ...patch } : item)) })
}

function onRuleInput(event: Event) {
  patchQuality({ rule: textOf(event) })
}

function onRowsInput(id: string, event: Event) {
  const raw = textOf(event).trim()
  const parsed = raw === '' ? null : Number(raw)
  patchIssue(id, { affectedRows: parsed !== null && Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null })
}

function addIssue() {
  const quality = currentDraft().quality
  patchQuality({ issues: [...quality.issues, emptyQualityIssue()] })
}

function removeIssue(id: string) {
  const quality = currentDraft().quality
  patchQuality({ issues: quality.issues.filter((item) => item.id !== id) })
}

// ── 状态与提示 ──────────────────────────────────────────────────────────
const state = computed(() => qualityState(props.draft))
const qualityPillClass = computed(() => {
  if (state.value.state === 'closed') return 'pill--ok'
  return 'pill--warn'
})
const qualityPillText = computed(() => {
  if (state.value.state === 'closed') return `质检闭环 · ${props.draft.quality.issues.length} 处`
  if (state.value.state === 'empty') return '未记录问题'
  return `待处理 ${state.value.undecided + state.value.missingNote} 处`
})

function hintsOf(issue: QualityIssue, index: number) {
  return qualityIssueHints(issue, index, props.dataset)
}

function actionHintOf(action: QualityAction): string {
  return QUALITY_ACTION_OPTIONS.find((option) => option.value === action)?.hint ?? ''
}
</script>

<style scoped>
.dqe {
  margin: 18px 0 0;
  padding: 20px 22px 16px;
  background: var(--c-surface);
  border: 1px solid var(--c-line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  font-size: 13px;
  color: var(--c-ink);
}

.dqe--readonly {
  background: #fbfdfd;
}

.dqe-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--c-line);
}

.dqe-head__text {
  min-width: 0;
}

.dqe-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--c-ink);
}

.dqe-no {
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

.dqe-sub {
  margin: 0;
  max-width: 62em;
  font-size: 12px;
  line-height: 1.75;
  color: var(--c-muted);
}

.dqe-head__status {
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

.dqe-h4 {
  margin: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--c-ink-2);
}

.dqe-field {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
  align-content: start;
}

.dqe-label {
  font-size: 11.5px;
  color: var(--c-muted);
}

.dqe-hint {
  font-size: 11px;
  line-height: 1.65;
  color: var(--c-muted);
}

.dqe-input {
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

.dqe-input:read-only,
.dqe-input:disabled {
  background: #f4f7f7;
  color: var(--c-ink-2);
}

.dqe-textarea {
  resize: vertical;
  line-height: 1.65;
}

.dqe-input:focus-visible {
  outline: 2px solid var(--c-primary);
  outline-offset: 1px;
}

.dqe-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin: 16px 0 10px;
}

.dqe-bar .btn {
  font-size: 11.5px;
  padding: 5px 11px;
}

.dqe-empty {
  margin: 0;
  padding: 12px 14px;
  border: 1px dashed var(--c-line-strong);
  border-radius: var(--radius-sm);
  font-size: 12px;
  line-height: 1.75;
  color: var(--c-muted);
}

.dqe-list {
  display: grid;
  gap: 12px;
}

.dqe-item {
  padding: 12px 14px 8px;
  border: 1px solid var(--c-line);
  border-radius: var(--radius-sm);
  background: #fdfefe;
}

.dqe-item__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.dqe-item__no {
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

.dqe-item__kind {
  font-size: 12px;
  font-weight: 600;
  color: var(--c-ink);
}

.dqe-item__col {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--c-ink-2);
}

.dqe-item__col--empty {
  font-family: inherit;
  color: var(--c-muted);
}

.dqe-item__action {
  padding: 2px 7px;
  border: 1px solid var(--c-line);
  border-radius: 999px;
  font-size: 10.5px;
  color: var(--c-muted);
}

.dqe-item__del {
  margin-left: auto;
  padding: 2px 8px;
  border: 1px solid var(--c-line);
  border-radius: 4px;
  background: var(--c-surface);
  color: var(--c-muted);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.dqe-item__del:hover:not(:disabled) {
  border-color: var(--c-warn);
  color: var(--c-warn-ink);
}

.dqe-item__del:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.dqe-grid3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0 14px;
}

.dqe-grid2 {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr);
  gap: 0 14px;
}

.dqe-check {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 10px;
  font-size: 11.5px;
  color: var(--c-ink-2);
  cursor: pointer;
}

.dqe-check input {
  width: 14px;
  height: 14px;
  accent-color: var(--c-primary);
}

.dqe-item__hints {
  margin: 0 0 8px;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
}

.dqe-item__hints li {
  font-size: 11px;
  line-height: 1.7;
  padding-left: 10px;
  position: relative;
}

.dqe-item__hints li::before {
  content: '·';
  position: absolute;
  left: 2px;
  color: var(--c-muted);
}

.dqe-item__hints--warn {
  color: var(--c-warn-ink);
}

.dqe-item__hints--info {
  color: var(--c-muted);
}

.dqe-note {
  margin: 12px 0 0;
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--c-warn-ink);
}

@media (max-width: 900px) {
  .dqe {
    padding: 16px 14px 12px;
  }

  .dqe-head {
    flex-direction: column;
    gap: 10px;
  }

  .dqe-head__status {
    justify-content: flex-start;
  }

  .dqe-grid3,
  .dqe-grid2 {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
