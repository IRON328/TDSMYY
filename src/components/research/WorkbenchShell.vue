<!--
  工作台外壳 —— 顶栏 + 对话区 + 产物抽屉。

  这一版刻意把「步骤条」放进顶栏、把「人工决策」放进对话流，
  与数模演易原型的工作台对齐。市调现版原型把决策放在常驻右栏，
  对话与决策被分开，智能体就不太像在跟你商量。

  组件不持有业务状态：步骤、徽标、消息、产物全部由上游传入，
  所有动作只 emit。这样正式接入时替换数据源不需要改这个文件。
-->
<template>
  <section class="wbshell">
    <!-- ── 顶栏 ── -->
    <header class="wbshell__top">
      <button type="button" class="wbshell__back" title="返回首页" aria-label="返回首页" @click="emit('back')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M11 18l-6-6 6-6" />
        </svg>
      </button>

      <span v-if="tag" class="wbshell__tag">{{ tag }}</span>
      <h1 class="wbshell__title" :title="title">{{ title }}</h1>

      <WorkbenchStepBar
        class="wbshell__steps"
        :steps="steps"
        :compact="compact"
        :read-only="readOnly"
        @jump="(k) => emit('jump', k)"
      />

      <div class="wbshell__grow"></div>

      <span class="wbshell__env" :class="`is-${envState}`">{{ envText }}</span>
      <span class="wbshell__stage" :class="`is-${stage.tone}`">
        <i class="wbshell__dot" aria-hidden="true"></i>
        {{ stage.text }}
      </span>

      <div class="wbshell__tools">
        <button type="button" class="wbshell__tool" :disabled="readOnly" @click="emit('ask')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M9.8 9a2.4 2.4 0 1 1 3.7 2c-1 .6-1.5 1.1-1.5 2.2" />
            <path d="M12 17h.01" />
          </svg>
          我有问题
        </button>
        <button type="button" class="wbshell__tool" :disabled="readOnly" @click="emit('prev')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 14l-4-4 4-4" />
            <path d="M5 10h8a6 6 0 0 1 6 6v2" />
          </svg>
          回到上一步
        </button>
      </div>

      <button
        type="button"
        class="wbshell__drawer-btn"
        :aria-pressed="drawerOpen"
        :title="drawerOpen ? '收起产物' : '展开产物'"
        @click="emit('toggle-drawer')"
      >
        <svg v-if="drawerOpen" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
        <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M15 3v18" />
        </svg>
        {{ drawerOpen ? '收起产物' : '产物' }}
        <b v-if="!drawerOpen && artifactCount" class="wbshell__count">{{ artifactCount }}</b>
      </button>
    </header>

    <!-- ── 主体 ── -->
    <div class="wbshell__body">
      <div class="wbshell__chat">
        <ChatStream
          :items="items"
          :read-only="readOnly"
          @decide="(p) => emit('decide', p)"
          @reopen="(id) => emit('reopen', id)"
          @open-artifact="(id) => emit('select-artifact', id)"
        />
        <WorkbenchComposer
          :chips="chips"
          :read-only="readOnly"
          :disabled="disabled"
          :busy="busy"
          :placeholder="placeholder"
          @send="(t) => emit('send', t)"
          @upload="emit('upload')"
        />
      </div>

      <ArtifactDrawer
        :open="drawerOpen"
        :artifacts="artifacts"
        :active-id="activeArtifactId"
        @close="emit('toggle-drawer')"
        @select="(id) => emit('select-artifact', id)"
        @export="(id) => emit('export', id)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import ArtifactDrawer from './ArtifactDrawer.vue'
import ChatStream from './ChatStream.vue'
import WorkbenchComposer from './WorkbenchComposer.vue'
import WorkbenchStepBar from './WorkbenchStepBar.vue'
import {
  envBadgeText,
  resolveSteps,
  type ArtifactRef,
  type ChatItem,
  type EnvState,
  type QuickChip,
  type StageBadge,
  type WorkbenchStepKey,
} from './workbench-contract'

const props = withDefaults(
  defineProps<{
    title: string
    tag?: string
    activeStep: WorkbenchStepKey
    confirmedSteps?: WorkbenchStepKey[]
    envState?: EnvState
    stage?: StageBadge
    items?: ChatItem[]
    artifacts?: ArtifactRef[]
    chips?: QuickChip[]
    drawerOpen?: boolean
    activeArtifactId?: string
    readOnly?: boolean
    disabled?: boolean
    busy?: boolean
    compact?: boolean
    placeholder?: string
  }>(),
  {
    tag: '',
    confirmedSteps: () => [],
    envState: 'none',
    stage: () => ({ text: '等待你的指令', tone: 'idle' as const }),
    items: () => [],
    artifacts: () => [],
    chips: () => [],
    drawerOpen: false,
    activeArtifactId: '',
    readOnly: false,
    disabled: false,
    busy: false,
    compact: false,
    placeholder: '和智能体对话：问它下一步、提出修改意见——你说一句，它才走一步',
  },
)

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'jump', key: WorkbenchStepKey): void
  (e: 'ask'): void
  (e: 'prev'): void
  (e: 'toggle-drawer'): void
  (e: 'decide', payload: { cardId: string; optionKey: string; note: string }): void
  (e: 'reopen', cardId: string): void
  (e: 'send', text: string): void
  (e: 'upload'): void
  (e: 'select-artifact', id: string): void
  (e: 'export', id: string): void
}>()

const steps = computed(() => resolveSteps(props.activeStep, props.confirmedSteps))
const envText = computed(() => envBadgeText(props.envState))
const artifactCount = computed(() => props.artifacts.length)
</script>

<style scoped>
.wbshell {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 520px;
  background: var(--c-bg);
}

/* ── 顶栏 ── */
.wbshell__top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  padding: 10px 16px;
  background: var(--c-surface);
  border-bottom: 1px solid var(--c-line);
  min-width: 0;
}

.wbshell__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  border: 1px solid var(--c-line);
  border-radius: 7px;
  background: #fff;
  color: var(--c-ink-2);
  cursor: pointer;
}
.wbshell__back:hover {
  border-color: var(--c-primary);
  color: var(--c-primary-ink);
}

.wbshell__tag {
  flex: 0 0 auto;
  padding: 3px 8px;
  border-radius: 5px;
  background: var(--c-primary-soft);
  color: var(--c-primary-ink);
  font-size: 11.5px;
  line-height: 1.5;
  white-space: nowrap;
}

.wbshell__title {
  margin: 0;
  max-width: 260px;
  min-width: 60px;
  flex: 0 1 auto;
  font-size: 14px;
  font-weight: 600;
  color: var(--c-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wbshell__steps {
  flex: 0 1 auto;
  min-width: 0;
}

.wbshell__grow {
  flex: 1 1 auto;
  min-width: 8px;
}

.wbshell__env {
  flex: 0 0 auto;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid var(--c-line);
  background: #f4f8f8;
  color: var(--c-muted);
  font-size: 11px;
  line-height: 1.6;
  white-space: nowrap;
}
.wbshell__env.is-ready {
  border-color: #bfe6cf;
  background: #e7f6ee;
  color: #1e7a4f;
}
.wbshell__env.is-failed {
  border-color: #f2c7c1;
  background: var(--c-error-soft);
  color: var(--c-error);
}

.wbshell__stage {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: 0 0 auto;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid var(--c-line);
  background: #fff;
  font-size: 11.5px;
  line-height: 1.6;
  white-space: nowrap;
}
.wbshell__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  flex: 0 0 auto;
}

.wbshell__stage.is-waiting {
  border-color: var(--c-warn-line);
  background: var(--c-warn-soft);
  color: var(--c-warn-ink);
}
.wbshell__stage.is-running {
  border-color: #bfe6df;
  background: var(--c-primary-soft);
  color: var(--c-primary-ink);
}
.wbshell__stage.is-running .wbshell__dot {
  animation: wbshell-pulse 1.1s ease-in-out infinite;
}
.wbshell__stage.is-blocked {
  border-color: #f2c7c1;
  background: var(--c-error-soft);
  color: var(--c-error);
}
.wbshell__stage.is-idle {
  color: var(--c-muted);
}

@keyframes wbshell-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.35;
    transform: scale(1.5);
  }
}

.wbshell__tools {
  display: flex;
  gap: 6px;
  flex: 0 0 auto;
}

.wbshell__tool {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 9px;
  border: 1px solid var(--c-line);
  border-radius: 7px;
  background: #fff;
  font-family: inherit;
  font-size: 11.5px;
  color: var(--c-ink-2);
  cursor: pointer;
  white-space: nowrap;
}
.wbshell__tool:hover:not(:disabled) {
  border-color: var(--c-primary);
  color: var(--c-primary-ink);
  background: var(--c-primary-soft);
}
.wbshell__tool:disabled {
  opacity: 0.5;
  cursor: default;
}

.wbshell__drawer-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
  padding: 5px 10px;
  border: 1px solid var(--c-line);
  border-radius: 7px;
  background: #fff;
  font-family: inherit;
  font-size: 11.5px;
  color: var(--c-ink-2);
  cursor: pointer;
  white-space: nowrap;
}
.wbshell__drawer-btn:hover {
  border-color: var(--c-primary);
  color: var(--c-primary-ink);
}

.wbshell__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 15px;
  height: 15px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--c-primary);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
}

/* ── 主体 ── */
.wbshell__body {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
}

.wbshell__chat {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

/* 顶栏在窄屏逐级瘦身：先卸工具按钮文字，再卸徽标 */
@media (max-width: 1280px) {
  .wbshell__env {
    display: none;
  }
  .wbshell__title {
    max-width: 180px;
  }
}

@media (max-width: 1080px) {
  .wbshell__tool {
    padding: 5px 7px;
    font-size: 0;
  }
  .wbshell__tool svg {
    width: 15px;
    height: 15px;
  }
}

@media (max-width: 900px) {
  .wbshell__top {
    padding: 8px 10px;
    gap: 6px;
  }
  .wbshell__tag,
  .wbshell__stage {
    display: none;
  }
  .wbshell__title {
    max-width: 120px;
    font-size: 13px;
  }
  .wbshell__drawer-btn {
    font-size: 0;
    padding: 5px 7px;
  }
}
</style>
