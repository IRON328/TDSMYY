<!--
  第六阶段 · 数据分析 · 区块 3「处理影响说明」（F 交付）

  - props：context / draft / upstream / dataset / run / result / readOnly / issues
  - emits：update-draft
  - 本组件只改 draft.impacts。

  为什么不做成独立文档：影响说明的对象是「刚刚那次剔除/插补/重编码」。
  一旦与质检分开存，改了口径而影响说明不动，读的人会以为没事。
-->
<template>
  <section class="cie" :class="{ 'cie--readonly': isReadOnly }">
    <header class="cie-head">
      <div class="cie-head__text">
        <h3 class="cie-title"><span class="cie-no">3</span>处理影响说明</h3>
        <p class="cie-sub">
          剔除、插补、重编码都会改变数字。每条影响写清「改了什么 → 哪张表/哪个结论会变」，
          标为「影响结论」的没处理完，这一段就不算完成。
        </p>
      </div>
      <div class="cie-head__status">
        <span v-if="isReadOnly" class="pill pill--lock">只读</span>
        <span class="pill" :class="openCritical ? 'pill--warn' : 'pill--ok'">
          {{ openCritical ? `关键影响待处理 ${openCritical}` : `已记录 ${draft.impacts.length} 条` }}
        </span>
      </div>
    </header>

    <p v-if="dataActions.length && !draft.impacts.length" class="cie-notice">
      质检里已经有 {{ dataActions.length }} 处「剔除／插补／重编码」，但还没有一条影响说明。
      这些处理会改数字，需要逐条说清它影响哪张表。
    </p>
    <ul v-else-if="dataActions.length" class="cie-actions">
      <li v-for="action in dataActions" :key="action.id" class="cie-actions__item">
        已{{ qualityActionLabel(action.action) }}{{ action.column ? `（${action.column}）` : '（整行层面）' }}
      </li>
    </ul>

    <div class="cie-bar">
      <h4 class="cie-h4">影响清单</h4>
      <button type="button" class="btn" :disabled="isReadOnly" @click="addItem">+ 记录一条影响</button>
    </div>

    <p v-if="!draft.impacts.length" class="cie-empty">
      还没有影响说明。如果这次分析只是描述现状、没有任何剔除或口径调整，也应该记一条
      「未做数据调整」来说明为什么结论不受处理影响。
    </p>

    <div v-else class="cie-list">
      <article v-for="(item, index) in draft.impacts" :key="item.id" class="cie-item">
        <header class="cie-item__head">
          <span class="cie-item__no">{{ index + 1 }}</span>
          <span class="cie-item__sev" :class="`cie-item__sev--${item.severity}`">{{ impactSeverityLabel(item.severity) }}</span>
          <span class="cie-item__target" :class="{ 'cie-item__target--empty': !item.target }">
            {{ item.target || '未写影响对象' }}
          </span>
          <span class="cie-item__flag" :class="{ 'cie-item__flag--done': item.resolved }">
            {{ item.resolved ? '已处理' : '待处理' }}
          </span>
          <button
            type="button"
            class="cie-item__del"
            :disabled="isReadOnly"
            :aria-label="`删除第 ${index + 1} 条影响`"
            @click="removeItem(item.id)"
          >
            删除
          </button>
        </header>

        <div class="cie-grid2">
          <label class="cie-field">
            <span class="cie-label">影响对象（表／结论）</span>
            <input
              class="cie-input"
              type="text"
              :value="item.target"
              :readonly="isReadOnly"
              :aria-label="`第 ${index + 1} 条影响的影响对象`"
              placeholder="例如：表 3-2 各时段座位缺口均值"
              @input="patchItem(item.id, { target: textOf($event) })"
            />
          </label>

          <label class="cie-field">
            <span class="cie-label">严重程度</span>
            <select
              class="cie-input"
              :value="item.severity"
              :disabled="isReadOnly"
              :aria-label="`第 ${index + 1} 条影响的严重程度`"
              @change="patchItem(item.id, { severity: textOf($event) as ImpactSeverity })"
            >
              <option v-for="option in severityOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
        </div>

        <label class="cie-field">
          <span class="cie-label">改了什么</span>
          <input
            class="cie-input"
            type="text"
            :value="item.change"
            :readonly="isReadOnly"
            :aria-label="`第 ${index + 1} 条影响的变更内容`"
            placeholder="例如：剔除 12 行拒答（Q3=9），占有效样本 3.8%"
            @input="patchItem(item.id, { change: textOf($event) })"
          />
        </label>

        <label class="cie-field">
          <span class="cie-label">影响判断</span>
          <textarea
            class="cie-input cie-textarea"
            rows="2"
            :value="item.effect"
            :readonly="isReadOnly"
            :aria-label="`第 ${index + 1} 条影响的影响判断`"
            placeholder="例如：缺口均值上升约 0.2 个座位，方向不变，结论「晚高峰最缺」不受影响"
            @input="patchItem(item.id, { effect: textOf($event) })"
          />
        </label>

        <label class="cie-check">
          <input
            type="checkbox"
            :checked="item.resolved"
            :disabled="isReadOnly"
            :aria-label="`第 ${index + 1} 条影响标记已处理`"
            @change="patchItem(item.id, { resolved: !item.resolved })"
          />
          <span>这条影响已处理完并写进报告说明</span>
        </label>

        <ul v-if="hintsOf(item, index).length" class="cie-item__hints">
          <li v-for="(hint, hintIndex) in hintsOf(item, index)" :key="hintIndex" :class="`cie-item__hints--${hint.level}`">
            {{ hint.text }}
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  IMPACT_SEVERITY_OPTIONS,
  emptyImpactItem,
  impactHints,
  impactSeverityLabel,
  qualityActionLabel,
  type AnalysisDraft,
  type AnalysisDraftUpdate,
  type AnalysisEditorProps,
  type ImpactItem,
  type ImpactSeverity,
} from './f-analysis-contract'

const props = defineProps<AnalysisEditorProps>()

const emit = defineEmits<{
  'update-draft': [value: AnalysisDraftUpdate]
}>()

const isReadOnly = computed(() => props.readOnly === true)
const severityOptions = IMPACT_SEVERITY_OPTIONS

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

function patchItem(id: string, patch: Partial<ImpactItem>) {
  commit({ impacts: currentDraft().impacts.map((item) => (item.id === id ? { ...item, ...patch } : item)) })
}

function addItem() {
  commit({ impacts: [...currentDraft().impacts, emptyImpactItem()] })
}

function removeItem(id: string) {
  commit({ impacts: currentDraft().impacts.filter((item) => item.id !== id) })
}

// ── 派生 ────────────────────────────────────────────────────────────────
/** 真正会改变数字的处理动作，用来提醒「你改过数据但没写影响」。 */
const dataActions = computed(() =>
  props.draft.quality.issues.filter((issue) => issue.action === 'exclude' || issue.action === 'impute' || issue.action === 'recode'),
)

const openCritical = computed(
  () => props.draft.impacts.filter((item) => item.severity === 'critical' && !item.resolved).length,
)

function hintsOf(item: ImpactItem, index: number) {
  return impactHints(item, index, props.draft)
}
</script>

<style scoped>
.cie {
  margin: 18px 0 0;
  padding: 20px 22px 16px;
  background: var(--c-surface);
  border: 1px solid var(--c-line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  font-size: 13px;
  color: var(--c-ink);
}

.cie--readonly {
  background: #fbfdfd;
}

.cie-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--c-line);
}

.cie-head__text {
  min-width: 0;
}

.cie-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--c-ink);
}

.cie-no {
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

.cie-sub {
  margin: 0;
  max-width: 62em;
  font-size: 12px;
  line-height: 1.75;
  color: var(--c-muted);
}

.cie-head__status {
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

.cie-notice {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--c-warn-soft);
  border: 1px solid var(--c-warn-line);
  font-size: 11.5px;
  line-height: 1.75;
  color: var(--c-warn-ink);
}

.cie-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.cie-actions__item {
  padding: 3px 9px;
  border: 1px solid var(--c-line);
  border-radius: 999px;
  background: #f7fbfa;
  font-size: 11px;
  color: var(--c-ink-2);
}

.cie-h4 {
  margin: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--c-ink-2);
}

.cie-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin: 16px 0 10px;
}

.cie-bar .btn {
  font-size: 11.5px;
  padding: 5px 11px;
}

.cie-empty {
  margin: 0;
  padding: 12px 14px;
  border: 1px dashed var(--c-line-strong);
  border-radius: var(--radius-sm);
  font-size: 12px;
  line-height: 1.75;
  color: var(--c-muted);
}

.cie-list {
  display: grid;
  gap: 12px;
}

.cie-item {
  padding: 12px 14px 8px;
  border: 1px solid var(--c-line);
  border-radius: var(--radius-sm);
  background: #fdfefe;
}

.cie-item__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.cie-item__no {
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

.cie-item__sev {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  border: 1px solid var(--c-line);
  color: var(--c-muted);
}

.cie-item__sev--warning {
  background: var(--c-warn-soft);
  border-color: var(--c-warn-line);
  color: var(--c-warn-ink);
}

.cie-item__sev--critical {
  background: #fdeceb;
  border-color: #f3cfcb;
  color: #a14332;
}

.cie-item__target {
  font-size: 12px;
  color: var(--c-ink);
}

.cie-item__target--empty {
  color: var(--c-warn-ink);
}

.cie-item__flag {
  padding: 2px 7px;
  border-radius: 4px;
  background: #f2f5f5;
  font-size: 10.5px;
  color: var(--c-muted);
}

.cie-item__flag--done {
  background: var(--c-primary-soft);
  color: var(--c-primary-ink);
}

.cie-item__del {
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

.cie-item__del:hover:not(:disabled) {
  border-color: var(--c-warn);
  color: var(--c-warn-ink);
}

.cie-item__del:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.cie-grid2 {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 0 14px;
}

.cie-field {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
  align-content: start;
}

.cie-label {
  font-size: 11.5px;
  color: var(--c-muted);
}

.cie-input {
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

.cie-input:read-only,
.cie-input:disabled {
  background: #f4f7f7;
  color: var(--c-ink-2);
}

.cie-textarea {
  resize: vertical;
  line-height: 1.65;
}

.cie-input:focus-visible {
  outline: 2px solid var(--c-primary);
  outline-offset: 1px;
}

.cie-check {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 10px;
  font-size: 11.5px;
  color: var(--c-ink-2);
  cursor: pointer;
}

.cie-check input {
  width: 14px;
  height: 14px;
  accent-color: var(--c-primary);
}

.cie-item__hints {
  margin: 0 0 8px;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
}

.cie-item__hints li {
  font-size: 11px;
  line-height: 1.7;
  padding-left: 10px;
  position: relative;
}

.cie-item__hints li::before {
  content: '·';
  position: absolute;
  left: 2px;
  color: var(--c-muted);
}

.cie-item__hints--warn {
  color: var(--c-warn-ink);
}

.cie-item__hints--info {
  color: var(--c-muted);
}

@media (max-width: 900px) {
  .cie {
    padding: 16px 14px 12px;
  }

  .cie-head {
    flex-direction: column;
    gap: 10px;
  }

  .cie-head__status {
    justify-content: flex-start;
  }

  .cie-grid2 {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
