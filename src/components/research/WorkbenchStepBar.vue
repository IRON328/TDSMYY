<!--
  工作台顶栏的六步进度条。
  对齐数模演易原型：12px 字号、序号小圆、当前步青绿实心、已完成打勾。
  点击只上报，不自己跳步 —— 能不能回退由上层决定（回退要连带清掉下游确认）。
-->
<template>
  <nav class="wbs" :class="{ 'wbs--compact': compact }" aria-label="研究流程步骤">
    <button
      v-for="step in steps"
      :key="step.key"
      type="button"
      class="wbs__item"
      :class="[`is-${step.state}`, { 'is-current': step.state === 'active' }]"
      :disabled="readOnly || step.state === 'active'"
      :title="`第 ${step.index} 步 · ${step.label}`"
      :aria-current="step.state === 'active' ? 'step' : undefined"
      @click="emit('jump', step.key)"
    >
      <span class="wbs__num">
        <svg v-if="step.state === 'done'" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <template v-else>{{ step.index }}</template>
      </span>
      <span class="wbs__label">{{ compact ? step.short : step.label }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import type { WorkbenchStep, WorkbenchStepKey } from './workbench-contract'

defineProps<{
  steps: WorkbenchStep[]
  compact?: boolean
  readOnly?: boolean
}>()

const emit = defineEmits<{
  (e: 'jump', key: WorkbenchStepKey): void
}>()
</script>

<style scoped>
.wbs {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.wbs::-webkit-scrollbar {
  display: none;
}

.wbs__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  padding: 4px 7px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  line-height: 1;
  color: var(--c-muted);
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}
.wbs__item:hover:not(:disabled) {
  background: var(--c-primary-soft);
  color: var(--c-primary-ink);
}
.wbs__item:disabled {
  cursor: default;
}
.wbs__item.is-active {
  background: var(--c-primary);
  color: #fff;
  cursor: default;
}
.wbs__item.is-done {
  color: var(--c-primary-ink);
}

.wbs__num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid var(--c-line-strong);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--c-muted);
  background: #fff;
  flex: 0 0 auto;
}
.wbs__item.is-done .wbs__num {
  border-color: var(--c-primary);
  background: var(--c-primary-soft);
  color: var(--c-primary-ink);
}
.wbs__item.is-active .wbs__num {
  border-color: #fff;
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}

.wbs__label {
  white-space: nowrap;
  letter-spacing: 0.01em;
}
.wbs__item.is-active .wbs__label {
  font-weight: 600;
}

/* 1440 放得下六个全称，1280 放不下 —— 断点按实测取 1380，
   过窄时只留当前步的文字，其余退成序号，避免出现「整」这种半个词 */
@media (max-width: 1380px) {
  .wbs__label {
    display: none;
  }
  .wbs__item.is-active .wbs__label {
    display: inline;
  }
  .wbs__item {
    padding: 4px 5px;
  }
}
</style>
