<!--
  决策卡 —— 工作台里最关键的一件。

  对齐数模演易原型的设计取向：人工确认点不长在右栏面板上，而是作为对话流里的
  一张卡，和智能体的话排在一起。理由是「商量」这个动作要求上下文相邻 ——
  用户在读完整段分析后紧接着就能点，不必把视线移到另一块面板再移回来。

  三条纪律（都是前几个阶段踩过的）：
  1. 已确认的卡不消失、不折叠成一行灰字，保留标题与正文，只在下方追加结论。
     复核者回头看对话时必须能读懂当时在确认什么。
  2. 已确认时仍给「改一下」，并且是从这句原话回到未答状态，不是新开一张卡。
  3. 只读态按钮 disabled 但结论照常显示 —— 只读不该抹掉状态信息。

  组件本身不判断业务，点完只 emit，推不推进流程由上层决定。
-->
<template>
  <article class="dcard" :class="{ 'is-answered': isAnswered, 'is-note': noteOpen }">
    <header class="dcard__head">
      <span class="dcard__mark" aria-hidden="true">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
          <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
          <path d="M12 18v4" />
        </svg>
      </span>
      <h4 class="dcard__title">{{ card.title }}</h4>
      <span v-if="isAnswered" class="dcard__flag">已确认</span>
    </header>

    <p class="dcard__body">{{ card.body }}</p>

    <!-- 已答：结论 + 改一下 -->
    <div v-if="isAnswered" class="dcard__result">
      <span class="dcard__pick">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        {{ answerLabel }}
      </span>
      <button v-if="!readOnly" type="button" class="dcard__redo" @click="emit('reopen', card.id)">
        改一下
      </button>
    </div>

    <!-- 未答：选项组 -->
    <template v-else>
      <div class="dcard__opts">
        <button
          v-for="opt in card.options"
          :key="opt.key"
          type="button"
          class="dcard__opt"
          :class="`is-${opt.kind}`"
          :disabled="readOnly"
          @click="pick(opt)"
        >
          <span class="dcard__ico" aria-hidden="true">
            <svg v-if="opt.kind === 'primary'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <svg v-else-if="opt.kind === 'secondary'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
            <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
          {{ opt.label }}
        </button>
      </div>

      <!-- 选了要写字的选项才展开 -->
      <div v-if="noteOpen" class="dcard__note">
        <label class="dcard__note-label" :for="`dcard-note-${card.id}`">{{ pendingOption?.label }}</label>
        <textarea
          :id="`dcard-note-${card.id}`"
          v-model="noteText"
          class="dcard__note-input"
          rows="2"
          :placeholder="notePlaceholder"
          :disabled="readOnly"
        ></textarea>
        <div class="dcard__note-act">
          <span class="dcard__note-tip">写清你的依据，智能体会按这句调整后续</span>
          <button type="button" class="dcard__note-btn" :disabled="readOnly || !noteText.trim()" @click="submitNote">
            确认
          </button>
          <button type="button" class="dcard__note-cancel" :disabled="readOnly" @click="cancelNote">取消</button>
        </div>
      </div>

      <p v-if="card.footer" class="dcard__footer">{{ card.footer }}</p>
    </template>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import {
  decisionAnswerLabel,
  optionNeedsNote,
  type DecisionMessage,
  type DecisionOption,
} from './workbench-contract'

const props = defineProps<{
  card: DecisionMessage
  readOnly?: boolean
}>()

const emit = defineEmits<{
  (e: 'decide', payload: { cardId: string; optionKey: string; note: string }): void
  (e: 'reopen', cardId: string): void
}>()

const isAnswered = computed(() => Boolean(props.card.answered))
const answerLabel = computed(() => decisionAnswerLabel(props.card))

const pendingOption = ref<DecisionOption | null>(null)
const noteText = ref('')
const noteOpen = computed(() => Boolean(pendingOption.value))

const notePlaceholder = computed(() =>
  pendingOption.value?.key === 'note:self' ? '直接写你希望怎么改，越具体越好' : '补充你的判断依据或额外约束',
)

// 卡片被上层重置（改一下之后又重答）时，收掉没提交的输入
watch(
  () => props.card.answered,
  () => {
    pendingOption.value = null
    noteText.value = ''
  },
)

function pick(opt: DecisionOption) {
  if (props.readOnly) return
  if (optionNeedsNote(opt.key)) {
    pendingOption.value = opt
    return
  }
  emit('decide', { cardId: props.card.id, optionKey: opt.key, note: '' })
}

function submitNote() {
  const opt = pendingOption.value
  const note = noteText.value.trim()
  if (!opt || !note) return
  emit('decide', { cardId: props.card.id, optionKey: opt.key, note })
}

function cancelNote() {
  pendingOption.value = null
  noteText.value = ''
}
</script>

<style scoped>
.dcard {
  padding: 16px 18px 14px;
  background: var(--c-surface);
  border: 1px solid var(--c-line);
  border-left: 3px solid var(--c-primary);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
}
.dcard.is-answered {
  border-left-color: var(--c-line-strong);
  background: #fbfefd;
}

.dcard__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.dcard__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--c-primary-soft);
  color: var(--c-primary-ink);
  flex: 0 0 auto;
}
.is-answered .dcard__mark {
  background: #eef3f2;
  color: var(--c-muted);
}

.dcard__title {
  margin: 0;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--c-ink);
  letter-spacing: 0.01em;
}

.dcard__flag {
  margin-left: auto;
  padding: 2px 7px;
  border-radius: 4px;
  background: var(--c-primary-soft);
  color: var(--c-primary-ink);
  font-size: 11px;
  letter-spacing: 0.02em;
}

.dcard__body {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.78;
  color: var(--c-ink-2);
}

/* ── 选项 ── */
.dcard__opts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dcard__opt {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-family: inherit;
  font-size: 12.5px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease, transform 0.14s ease;
}
.dcard__opt:hover:not(:disabled) {
  transform: translateY(-1px);
}
.dcard__opt:disabled {
  opacity: 0.55;
  cursor: default;
}
.dcard__opt:focus-visible {
  outline: 2px solid var(--c-primary);
  outline-offset: 2px;
}

.dcard__opt.is-primary {
  background: var(--c-primary);
  border-color: var(--c-primary);
  color: #fff;
  font-weight: 500;
}
.dcard__opt.is-primary:hover:not(:disabled) {
  background: var(--c-primary-ink);
  border-color: var(--c-primary-ink);
}

.dcard__opt.is-secondary {
  background: #fff;
  border-color: var(--c-primary);
  color: var(--c-primary-ink);
}
.dcard__opt.is-secondary:hover:not(:disabled) {
  background: var(--c-primary-soft);
}

.dcard__opt.is-ghost {
  background: transparent;
  border-color: var(--c-line);
  color: var(--c-muted);
}
.dcard__opt.is-ghost:hover:not(:disabled) {
  border-color: var(--c-line-strong);
  color: var(--c-ink-2);
}

.dcard__ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
}

/* ── 已答结论 ── */
.dcard__result {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--c-line);
}

.dcard__pick {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 6px;
  background: var(--c-primary-soft);
  color: var(--c-primary-ink);
  font-size: 12.5px;
  line-height: 1.5;
}

.dcard__redo {
  margin-left: auto;
  padding: 4px 9px;
  border: 1px solid var(--c-line);
  border-radius: 6px;
  background: #fff;
  font-family: inherit;
  font-size: 12px;
  color: var(--c-muted);
  cursor: pointer;
}
.dcard__redo:hover {
  border-color: var(--c-primary);
  color: var(--c-primary-ink);
}

/* ── 补充说明 ── */
.dcard__note {
  margin-top: 12px;
  padding: 12px;
  background: var(--c-bg);
  border: 1px solid var(--c-line);
  border-radius: 8px;
}

.dcard__note-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--c-ink-2);
}

.dcard__note-input {
  width: 100%;
  padding: 9px 10px;
  border: 1px solid var(--c-line-strong);
  border-radius: 6px;
  background: #fff;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.65;
  color: var(--c-ink);
  resize: vertical;
  box-sizing: border-box;
}
.dcard__note-input:focus {
  outline: none;
  border-color: var(--c-primary);
  box-shadow: 0 0 0 3px var(--c-primary-soft);
}

.dcard__note-act {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.dcard__note-tip {
  flex: 1;
  min-width: 0;
  font-size: 11.5px;
  color: var(--c-muted);
}

.dcard__note-btn {
  padding: 6px 14px;
  border: 1px solid var(--c-primary);
  border-radius: 6px;
  background: var(--c-primary);
  color: #fff;
  font-family: inherit;
  font-size: 12.5px;
  cursor: pointer;
}
.dcard__note-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.dcard__note-cancel {
  padding: 6px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--c-muted);
  font-family: inherit;
  font-size: 12.5px;
  cursor: pointer;
}
.dcard__note-cancel:hover {
  color: var(--c-ink-2);
}

.dcard__footer {
  margin: 10px 0 0;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--c-muted);
}

@media (max-width: 720px) {
  .dcard {
    padding: 14px 14px 12px;
  }
  .dcard__opts {
    flex-direction: column;
  }
  .dcard__opt {
    justify-content: flex-start;
    width: 100%;
  }
}
</style>
