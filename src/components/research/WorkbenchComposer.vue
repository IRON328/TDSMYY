<!--
  对话框输入区。

  与数模演易原型一致的三件事：
  1. 大圆角白卡包住 textarea，聚焦时整卡描边变青绿，而不是只给 textarea 加边框。
  2. Enter 发送 / Shift+Enter 换行（长中文输入常见误触，所以提示文案必须写在旁边）。
  3. 快捷指令排在输入框下方，点「填充型」只把话填进去让用户改，点「发送型」才真的发。

  只负责收集文字，不判断当前阶段该说什么。
-->
<template>
  <div class="wc">
    <div class="wc__composer" :class="{ 'is-focus': focused, 'is-disabled': readOnly || disabled }">
      <textarea
        ref="taEl"
        v-model="text"
        class="wc__input"
        rows="1"
        :placeholder="placeholder"
        :disabled="readOnly || disabled"
        :aria-label="placeholder"
        @focus="focused = true"
        @blur="focused = false"
        @input="autoGrow"
        @keydown.enter.exact.prevent="submit"
        @keydown.enter.shift.stop
      ></textarea>

      <div class="wc__bar">
        <button type="button" class="wc__ghost" :disabled="readOnly || disabled" @click="emit('upload')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M17 8l-5-5-5 5" />
            <path d="M12 3v12" />
          </svg>
          上传文件
        </button>
        <span class="wc__hint">{{ hint }}</span>
        <div class="wc__grow"></div>
        <button type="button" class="wc__send" :disabled="readOnly || disabled || !text.trim()" @click="submit">
          <template v-if="busy">
            <span class="wc__spin" aria-hidden="true"></span>
            处理中
          </template>
          <template v-else>
            发送
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </template>
        </button>
      </div>
    </div>

    <div v-if="chips.length" class="wc__chips">
      <button
        v-for="chip in chips"
        :key="chip.key"
        type="button"
        class="wc__chip"
        :disabled="readOnly || disabled"
        @click="onChip(chip)"
      >
        {{ chip.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'

import type { QuickChip } from './workbench-contract'

const props = withDefaults(
  defineProps<{
    chips?: QuickChip[]
    readOnly?: boolean
    disabled?: boolean
    busy?: boolean
    placeholder?: string
    hint?: string
  }>(),
  {
    chips: () => [],
    placeholder: '和智能体对话：问它下一步、提出修改意见——你说一句，它才走一步',
    hint: 'Enter 发送，Shift + Enter 换行',
  },
)

const emit = defineEmits<{
  (e: 'send', text: string): void
  (e: 'upload'): void
}>()

const text = ref('')
const focused = ref(false)
const taEl = ref<HTMLTextAreaElement | null>(null)

function autoGrow() {
  const el = taEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 132)}px`
}

function submit() {
  const v = text.value.trim()
  if (!v || props.readOnly || props.disabled || props.busy) return
  emit('send', v)
  text.value = ''
  nextTick(autoGrow)
}

function onChip(chip: QuickChip) {
  if (props.readOnly || props.disabled) return
  if (chip.mode === 'fill') {
    text.value = chip.label
    nextTick(() => {
      autoGrow()
      taEl.value?.focus()
    })
    return
  }
  emit('send', chip.label)
}
</script>

<style scoped>
.wc {
  flex: 0 0 auto;
  padding: 10px 24px 14px;
  border-top: 1px solid var(--c-line);
  background: var(--c-surface);
}

.wc__composer {
  max-width: 760px;
  margin: 0 auto;
  padding: 10px 12px 9px;
  border: 1px solid var(--c-line-strong);
  border-radius: 12px;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.wc__composer.is-focus {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 3px var(--c-primary-soft);
}
.wc__composer.is-disabled {
  background: #fafcfc;
}

.wc__input {
  display: block;
  width: 100%;
  min-height: 24px;
  max-height: 132px;
  padding: 2px 2px 6px;
  border: 0;
  background: transparent;
  font-family: inherit;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--c-ink);
  resize: none;
  outline: none;
  box-sizing: border-box;
}
.wc__input::placeholder {
  color: var(--c-muted);
}
.wc__input:disabled {
  cursor: not-allowed;
}

.wc__bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.wc__ghost {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border: 1px solid var(--c-line);
  border-radius: 7px;
  background: #fff;
  font-family: inherit;
  font-size: 12px;
  color: var(--c-ink-2);
  cursor: pointer;
}
.wc__ghost:hover:not(:disabled) {
  border-color: var(--c-primary);
  color: var(--c-primary-ink);
}
.wc__ghost:disabled {
  opacity: 0.5;
  cursor: default;
}

.wc__hint {
  font-size: 11.5px;
  color: var(--c-muted);
}

.wc__grow {
  flex: 1;
}

.wc__send {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 15px;
  border: 0;
  border-radius: 8px;
  background: var(--c-primary);
  color: #fff;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.14s ease;
}
.wc__send:hover:not(:disabled) {
  background: var(--c-primary-ink);
}
.wc__send:disabled {
  background: #c5d9d6;
  cursor: default;
}

.wc__spin {
  width: 11px;
  height: 11px;
  border: 1.6px solid rgba(255, 255, 255, 0.45);
  border-top-color: #fff;
  border-radius: 50%;
  animation: wc-spin 0.7s linear infinite;
}

@keyframes wc-spin {
  to {
    transform: rotate(360deg);
  }
}

.wc__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  max-width: 760px;
  margin: 9px auto 0;
}

.wc__chip {
  padding: 5px 11px;
  border: 1px solid var(--c-line);
  border-radius: 999px;
  background: #fff;
  font-family: inherit;
  font-size: 12px;
  color: var(--c-ink-2);
  cursor: pointer;
  transition: border-color 0.14s ease, color 0.14s ease, background 0.14s ease;
}
.wc__chip:hover:not(:disabled) {
  border-color: var(--c-primary);
  color: var(--c-primary-ink);
  background: var(--c-primary-soft);
}
.wc__chip:disabled {
  opacity: 0.5;
  cursor: default;
}

@media (max-width: 900px) {
  .wc {
    padding: 8px 12px 12px;
  }
  .wc__hint {
    display: none;
  }
}
</style>
