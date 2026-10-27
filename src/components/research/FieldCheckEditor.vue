<!--
  第六阶段 · 数据分析 · 区块 1「字段核对」（F 交付）

  契约来源：docs/mvp-scope-and-status.md 第 3 节「6 数据分析」验收标准
  —— 原件/字段/质检/处理口径/统计结果可追溯。

  - props：context / draft / upstream{plan,questionnaire} / dataset / run / result / readOnly / issues
  - emits：update-draft（完整 draft 覆盖语义）
  - 本组件只改 draft.fields 与 draft.datasetNote，不碰其余区块。
  - 不解析文件、不推断类型：列名与行数来自 dataset prop（数据侧提供）。
-->
<template>
  <section class="afe" :class="{ 'afe--readonly': isReadOnly }">
    <header class="afe-head">
      <div class="afe-head__text">
        <h3 class="afe-title"><span class="afe-no">1</span>字段核对</h3>
        <p class="afe-sub">
          问卷的每一题要落到数据里的哪一列。编码、有效值范围、缺失值口径三者缺一，
          后面「99 是拒答还是真的 99」就再也说不清。
        </p>
      </div>
      <div class="afe-head__status">
        <span v-if="isReadOnly" class="pill pill--lock">只读</span>
        <span class="pill" :class="readyCount === needCount && needCount > 0 ? 'pill--ok' : 'pill--warn'">
          变量已映射 {{ readyCount }} / {{ needCount }}
        </span>
      </div>
    </header>

    <!-- 数据集 -->
    <section class="afe-data">
      <div class="afe-data__bar">
        <h4 class="afe-h4">数据源</h4>
        <span class="afe-data__src">由数据侧提供（只读）</span>
      </div>

      <p v-if="!dataset" class="afe-data__empty">
        还没有数据集概览。字段核对必须对着真实的列名做，所以这里留空而不是给一份样例列——
        在数据侧把文件解析结果接进来之前，这一块无法完成。
      </p>
      <template v-else>
        <p class="afe-data__facts">
          <span class="afe-data__file">{{ dataset.fileName }}</span>
          <span>{{ dataset.rowCount }} 行</span>
          <span>{{ dataset.columns.length }} 列</span>
          <span class="afe-data__sig">指纹 {{ dataset.signature }}</span>
        </p>
        <ul class="afe-data__cols">
          <li v-for="column in dataset.columns" :key="column.name" class="afe-data__col">
            <span class="afe-data__colname">{{ column.name }}</span>
            <span class="afe-data__guess">{{ columnGuessLabel(column.guess) }}</span>
          </li>
        </ul>
        <p v-if="dataset.sampleRows.length" class="afe-data__sample">
          样例 {{ dataset.sampleRows.length }} 行 · 首行：{{ samplePreview }}
        </p>
        <p v-else class="afe-data__sample afe-data__sample--miss">
          数据侧没有提供样例行：只能按列名判断，无法核对取值形态。
        </p>
      </template>
    </section>

    <label class="afe-field">
      <span class="afe-label">为什么用这一份数据集</span>
      <textarea
        class="afe-input afe-textarea"
        rows="2"
        :value="draft.datasetNote"
        :readonly="isReadOnly"
        aria-label="为什么用这一份数据集"
        placeholder="例如：2026-10-21 导出的平台答卷，剔除测试账号后共 312 行"
        @input="onDatasetNoteInput($event)"
      />
    </label>

    <!-- 字段映射 -->
    <div class="afe-bar">
      <h4 class="afe-h4">字段映射</h4>
      <div class="afe-bar__actions">
        <button v-if="unmappedQuestions.length" type="button" class="btn" :disabled="isReadOnly" @click="addFromQuestions">
          按问卷题目补 {{ unmappedQuestions.length }} 行
        </button>
        <button type="button" class="btn" :disabled="isReadOnly" @click="addField">+ 手动新增一条</button>
      </div>
    </div>

    <p v-if="!draft.fields.length" class="afe-empty">
      还没有字段映射。可以用上面的「按问卷题目补」把每道题先列成一行，再逐行选数据列。
    </p>

    <div v-else class="afe-list">
      <article v-for="(field, index) in draft.fields" :key="field.id" class="afe-item">
        <header class="afe-item__head">
          <span class="afe-item__no">{{ index + 1 }}</span>
          <span class="afe-item__col" :class="{ 'afe-item__col--empty': !field.column }">
            {{ field.column || '未选数据列' }}
          </span>
          <span class="afe-item__role">{{ fieldRoleLabel(field.role) }}</span>
          <button
            type="button"
            class="afe-item__del"
            :disabled="isReadOnly"
            :aria-label="`删除第 ${index + 1} 条字段映射`"
            @click="removeField(field.id)"
          >
            删除
          </button>
        </header>

        <div class="afe-grid3">
          <label class="afe-field">
            <span class="afe-label">对应题目</span>
            <select
              class="afe-input"
              :value="field.questionId"
              :disabled="isReadOnly"
              :aria-label="`第 ${index + 1} 条映射的对应题目`"
              @change="patchField(field.id, { questionId: textOf($event) })"
            >
              <option value="">不对应题目</option>
              <option v-for="(question, qIndex) in questions" :key="question.id" :value="question.id">
                第 {{ qIndex + 1 }} 题 · {{ question.text.trim().slice(0, 18) || '未写题干' }}
              </option>
            </select>
          </label>

          <label class="afe-field">
            <span class="afe-label">分析变量</span>
            <select
              class="afe-input"
              :value="field.measureId"
              :disabled="isReadOnly"
              :aria-label="`第 ${index + 1} 条映射的分析变量`"
              @change="patchField(field.id, { measureId: textOf($event) })"
            >
              <option value="">不挂变量</option>
              <option v-for="measure in measures" :key="measure.id" :value="measure.id">
                {{ measure.name.trim() || '未命名' }}（{{ measureLevelLabel(measure.level) }}）
              </option>
            </select>
          </label>

          <label class="afe-field">
            <span class="afe-label">数据列</span>
            <select
              class="afe-input"
              :value="field.column"
              :disabled="isReadOnly"
              :aria-label="`第 ${index + 1} 条映射的数据列`"
              @change="patchField(field.id, { column: textOf($event) })"
            >
              <option value="">未选</option>
              <option v-for="column in columns" :key="column.name" :value="column.name">{{ column.name }}</option>
              <option v-if="field.column && !columns.some((item) => item.name === field.column)" :value="field.column">
                {{ field.column }}（不在当前数据集）
              </option>
            </select>
          </label>

          <label class="afe-field">
            <span class="afe-label">用途</span>
            <select
              class="afe-input"
              :value="field.role"
              :disabled="isReadOnly"
              :aria-label="`第 ${index + 1} 条映射的用途`"
              @change="onRoleChange(field.id, $event)"
            >
              <option v-for="option in roleOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>

          <label class="afe-field">
            <span class="afe-label">有效值范围</span>
            <input
              class="afe-input"
              type="text"
              :value="field.validRange"
              :readonly="isReadOnly"
              :aria-label="`第 ${index + 1} 条映射的有效值范围`"
              placeholder="例如：1-5 的整数"
              @input="patchField(field.id, { validRange: textOf($event) })"
            />
          </label>

          <label class="afe-field">
            <span class="afe-label">缺失值口径</span>
            <input
              class="afe-input"
              type="text"
              :value="field.missingRule"
              :readonly="isReadOnly"
              :aria-label="`第 ${index + 1} 条映射的缺失值口径`"
              placeholder="例如：空单元格=缺失，99=拒答"
              @input="patchField(field.id, { missingRule: textOf($event) })"
            />
          </label>
        </div>

        <label class="afe-field">
          <span class="afe-label">编码口径</span>
          <input
            class="afe-input"
            type="text"
            :value="field.coding"
            :readonly="isReadOnly"
            :aria-label="`第 ${index + 1} 条映射的编码口径`"
            placeholder="例如：非常不同意=1 … 非常同意=5；多选按 1/0 拆成多个二分变量"
            @input="patchField(field.id, { coding: textOf($event) })"
          />
        </label>

        <p v-if="!isReadOnly && roleHintOf(field)" class="afe-item__note">{{ roleHintOf(field) }}</p>

        <ul v-if="hintsOf(field, index).length" class="afe-item__hints">
          <li v-for="(hint, hintIndex) in hintsOf(field, index)" :key="hintIndex" :class="`afe-item__hints--${hint.level}`">
            {{ hint.text }}
          </li>
        </ul>
      </article>
    </div>

    <!-- 变量覆盖情况 -->
    <div v-if="measures.length" class="afe-cover">
      <h4 class="afe-h4">第三阶段变量的落列情况</h4>
      <ul class="afe-cover__list">
        <li v-for="measure in measures" :key="measure.id" class="afe-cover__item">
          <span class="afe-cover__name">{{ measure.name.trim() || '未命名变量' }}</span>
          <span class="afe-cover__level">{{ measureLevelLabel(measure.level) }}</span>
          <span class="afe-cover__state" :class="{ 'afe-cover__state--done': columnOfMeasure(measure.id) }">
            {{ columnOfMeasure(measure.id) || '未落列' }}
          </span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  FIELD_ROLE_OPTIONS,
  columnGuessLabel,
  dataMeasures,
  emptyFieldMapping,
  fieldHints,
  fieldRoleLabel,
  measureLevelLabel,
  questionnaireQuestions,
  type AnalysisDraft,
  type AnalysisDraftUpdate,
  type AnalysisEditorProps,
  type FieldMapping,
  type FieldRole,
} from './f-analysis-contract'

const props = defineProps<AnalysisEditorProps>()

const emit = defineEmits<{
  'update-draft': [value: AnalysisDraftUpdate]
}>()

const isReadOnly = computed(() => props.readOnly === true)
const roleOptions = FIELD_ROLE_OPTIONS
const columns = computed(() => (props.dataset ? props.dataset.columns : []))
const measures = computed(() => dataMeasures(props.upstream.plan))
const questions = computed(() => questionnaireQuestions(props.upstream.questionnaire))

// ── 写出口（与前三阶段同一套合并提交）──────────────────────────────────────
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

/** 合并提交期间 pendingDraft 才是权威值；读 props.draft 会把同轮的前一次改动覆盖回去。 */
function currentDraft(): AnalysisDraft {
  return pendingDraft ?? props.draft
}

function textOf(event: Event): string {
  return (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value
}

function patchField(id: string, patch: Partial<FieldMapping>) {
  commit({ fields: currentDraft().fields.map((item) => (item.id === id ? { ...item, ...patch } : item)) })
}

function onRoleChange(id: string, event: Event) {
  const value = textOf(event) as FieldRole
  const allowed = FIELD_ROLE_OPTIONS.some((option) => option.value === value)
  patchField(id, { role: allowed ? value : 'measure' })
}

function onDatasetNoteInput(event: Event) {
  commit({ datasetNote: textOf(event) })
}

function addField() {
  commit({ fields: [...currentDraft().fields, emptyFieldMapping()] })
}

function removeField(id: string) {
  commit({ fields: currentDraft().fields.filter((item) => item.id !== id) })
}

/** 已有映射的题目，不再重复补行。 */
const unmappedQuestions = computed(() => {
  const used = new Set(props.draft.fields.map((field) => field.questionId).filter(Boolean))
  return questions.value.filter((question) => !used.has(question.id))
})

/**
 * 按问卷题目补映射行。只填「题目」和「变量」——
 * 列名、编码、缺失口径一律留空，那些必须对着真实数据写，不能猜。
 */
function addFromQuestions() {
  const draft = currentDraft()
  const used = new Set(draft.fields.map((field) => field.questionId).filter(Boolean))
  const additions = questions.value
    .filter((question) => !used.has(question.id))
    .map((question) => ({ ...emptyFieldMapping(), questionId: question.id, measureId: question.measureId }))
  if (!additions.length) return
  commit({ fields: [...draft.fields, ...additions] })
}

// ── 统计 ────────────────────────────────────────────────────────────────
const needCount = computed(() => measures.value.length)
const readyCount = computed(() => {
  const ready = new Set(
    props.draft.fields
      .filter(
        (field) =>
          field.role === 'measure' &&
          field.measureId &&
          field.column &&
          field.coding.trim() &&
          field.validRange.trim() &&
          field.missingRule.trim(),
      )
      .map((field) => field.measureId),
  )
  return measures.value.filter((measure) => ready.has(measure.id)).length
})

function columnOfMeasure(measureId: string): string {
  const field = props.draft.fields.find((item) => item.role === 'measure' && item.measureId === measureId && item.column)
  return field ? field.column : ''
}

function hintsOf(field: FieldMapping, index: number) {
  return fieldHints(field, index, props.draft, props.upstream, props.dataset)
}

function roleHintOf(field: FieldMapping): string {
  return FIELD_ROLE_OPTIONS.find((option) => option.value === field.role)?.hint ?? ''
}

const samplePreview = computed(() => {
  if (!props.dataset || !props.dataset.sampleRows.length) return ''
  const row = props.dataset.sampleRows[0]
  return Object.entries(row)
    .slice(0, 4)
    .map(([key, value]) => `${key}=${value === null ? '空' : String(value)}`)
    .join('，')
})
</script>

<style scoped>
.afe {
  margin: 18px 0 0;
  padding: 20px 22px 16px;
  background: var(--c-surface);
  border: 1px solid var(--c-line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  font-size: 13px;
  color: var(--c-ink);
}

.afe--readonly {
  background: #fbfdfd;
}

.afe-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--c-line);
}

.afe-head__text {
  min-width: 0;
}

.afe-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--c-ink);
}

.afe-no {
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

.afe-sub {
  margin: 0;
  max-width: 62em;
  font-size: 12px;
  line-height: 1.75;
  color: var(--c-muted);
}

.afe-head__status {
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

/* 数据集 */
.afe-data {
  margin: 14px 0 4px;
  padding: 12px 14px;
  background: #f7fbfa;
  border: 1px solid var(--c-line);
  border-radius: var(--radius-sm);
}

.afe-data__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.afe-data__src {
  font-size: 11px;
  color: var(--c-muted);
}

.afe-h4 {
  margin: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--c-ink-2);
}

.afe-data__empty {
  margin: 6px 0 0;
  font-size: 11.5px;
  line-height: 1.75;
  color: var(--c-warn-ink);
}

.afe-data__facts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 16px;
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--c-ink-2);
}

.afe-data__file {
  font-weight: 600;
}

.afe-data__sig {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--c-muted);
}

.afe-data__cols {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.afe-data__col {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  background: var(--c-surface);
  border: 1px solid var(--c-line);
  border-radius: 999px;
  font-size: 11px;
}

.afe-data__colname {
  font-family: var(--font-mono);
  color: var(--c-ink-2);
}

.afe-data__guess {
  color: var(--c-muted);
}

.afe-data__sample {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.7;
  color: var(--c-muted);
}

.afe-data__sample--miss {
  color: var(--c-warn-ink);
}

/* 通用字段 */
.afe-field {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
  align-content: start;
}

.afe-label {
  font-size: 11.5px;
  color: var(--c-muted);
}

.afe-input {
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

.afe-input:read-only,
.afe-input:disabled {
  background: #f4f7f7;
  color: var(--c-ink-2);
}

.afe-textarea {
  resize: vertical;
  line-height: 1.65;
}

.afe-input:focus-visible {
  outline: 2px solid var(--c-primary);
  outline-offset: 1px;
}

/* 映射列表 */
.afe-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin: 16px 0 10px;
}

.afe-bar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.afe-bar__actions .btn {
  font-size: 11.5px;
  padding: 5px 11px;
}

.afe-empty {
  margin: 0;
  padding: 12px 14px;
  border: 1px dashed var(--c-line-strong);
  border-radius: var(--radius-sm);
  font-size: 12px;
  line-height: 1.75;
  color: var(--c-muted);
}

.afe-list {
  display: grid;
  gap: 12px;
}

.afe-item {
  padding: 12px 14px 6px;
  border: 1px solid var(--c-line);
  border-radius: var(--radius-sm);
  background: #fdfefe;
}

.afe-item__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.afe-item__no {
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

.afe-item__col {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--c-ink);
}

.afe-item__col--empty {
  color: var(--c-warn-ink);
  font-family: inherit;
}

.afe-item__role {
  padding: 2px 7px;
  border: 1px solid var(--c-line);
  border-radius: 999px;
  font-size: 10.5px;
  color: var(--c-muted);
}

.afe-item__del {
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

.afe-item__del:hover:not(:disabled) {
  border-color: var(--c-warn);
  color: var(--c-warn-ink);
}

.afe-item__del:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.afe-grid3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0 14px;
}

.afe-item__note {
  margin: -4px 0 10px;
  font-size: 11px;
  line-height: 1.7;
  color: var(--c-muted);
}

.afe-item__hints {
  margin: 0 0 8px;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
}

.afe-item__hints li {
  font-size: 11px;
  line-height: 1.7;
  padding-left: 10px;
  position: relative;
}

.afe-item__hints li::before {
  content: '·';
  position: absolute;
  left: 2px;
  color: var(--c-muted);
}

.afe-item__hints--warn {
  color: var(--c-warn-ink);
}

.afe-item__hints--info {
  color: var(--c-muted);
}

/* 变量落列 */
.afe-cover {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--c-line);
}

.afe-cover__list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 5px;
}

.afe-cover__item {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 11.5px;
}

.afe-cover__name {
  font-weight: 600;
  color: var(--c-ink-2);
}

.afe-cover__level {
  color: var(--c-muted);
}

.afe-cover__state {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--c-warn-ink);
}

.afe-cover__state--done {
  color: var(--c-primary-ink);
}

@media (max-width: 900px) {
  .afe {
    padding: 16px 14px 12px;
  }

  .afe-head {
    flex-direction: column;
    gap: 10px;
  }

  .afe-head__status {
    justify-content: flex-start;
  }

  .afe-grid3 {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
