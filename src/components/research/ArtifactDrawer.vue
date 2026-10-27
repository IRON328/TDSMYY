<!--
  右侧产物抽屉。

  与数模演易原型一致：抽屉不占常驻列宽，收起时对话区自己吃满；
  打开后是固定宽度的独立面板，头部「图标 + 标题 + 副标题 + 关闭」。
  这一条很关键 —— 市调现版原型把「闸门 / 产物 / 演示」做成常驻三 tab 竖栏，
  右栏常年占掉三分之一屏，写长对话时正文被压得很窄。

  抽屉里只做浏览与选择，编辑仍然回上游的编辑器组件，避免两处都能改同一份草稿。
-->
<template>
  <!-- 窄屏下抽屉是浮层，必须给遮罩：否则用户以为对话被截断了，其实是压在下面 -->
  <div v-if="open" class="wd__mask" @click="emit('close')"></div>

  <aside class="wd" :class="{ 'is-open': open }" :aria-hidden="!open" :aria-label="'本次产物'">
    <header class="wd__head">
      <span class="wd__mark" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 9h6v6H9z" />
        </svg>
      </span>
      <div class="wd__titles">
        <h3 class="wd__title">本次产物</h3>
        <span class="wd__sub">{{ open ? `${artifacts.length} 项` : '' }}</span>
      </div>
      <button type="button" class="wd__close" title="收起产物" aria-label="收起产物" @click="emit('close')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </header>

    <div class="wd__body">
      <p v-if="!artifacts.length" class="wd__empty">还没有产物。智能体每完成一步，这里会多一项。</p>

      <article
        v-for="art in artifacts"
        :key="art.id"
        class="wd__card"
        :class="{ 'is-active': art.id === activeId, 'is-pending': art.state === 'pending' }"
      >
        <header class="wd__card-head">
          <h4 class="wd__card-title">{{ art.title }}</h4>
          <span class="wd__badge" :class="art.state === 'generated' ? 'is-ok' : 'is-wait'">
            {{ art.state === 'generated' ? '已生成' : '生成中' }}
          </span>
          <button type="button" class="wd__export" :disabled="art.state !== 'generated'" @click="emit('export', art.id)">
            导出
          </button>
        </header>

        <p class="wd__card-sub">{{ art.subtitle }}</p>

        <div v-if="art.lines?.length" class="wd__preview">
          <div v-for="(line, i) in art.lines.slice(0, 7)" :key="i" class="wd__line" :class="{ 'is-head': i === 0 }">
            {{ line }}
          </div>
          <div v-if="art.lines.length > 7" class="wd__more">还有 {{ art.lines.length - 7 }} 行…</div>
        </div>
        <div v-else class="wd__preview wd__preview--empty">暂无预览内容</div>

        <footer class="wd__card-foot">
          <button type="button" class="wd__open" @click="emit('select', art.id)">
            打开查看
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </footer>
      </article>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { ArtifactRef } from './workbench-contract'

withDefaults(
  defineProps<{
    open: boolean
    artifacts: ArtifactRef[]
    activeId?: string
  }>(),
  { activeId: '' },
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', id: string): void
  (e: 'export', id: string): void
}>()
</script>

<style scoped>
.wd {
  display: flex;
  flex-direction: column;
  width: 0;
  flex: 0 0 0;
  overflow: hidden;
  border-left: 1px solid transparent;
  background: var(--c-surface);
  transition: flex-basis 0.2s ease, width 0.2s ease;
}
.wd.is-open {
  width: 380px;
  flex: 0 0 380px;
  border-left-color: var(--c-line);
}

.wd__head {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--c-line);
}

.wd__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: var(--c-primary-soft);
  color: var(--c-primary-ink);
  flex: 0 0 auto;
}

.wd__titles {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.wd__title {
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--c-ink);
}

.wd__sub {
  font-size: 11.5px;
  color: var(--c-muted);
  white-space: nowrap;
}

.wd__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--c-muted);
  cursor: pointer;
}
.wd__close:hover {
  background: var(--c-bg);
  color: var(--c-ink);
}

.wd__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.wd__empty {
  margin: 30px 8px;
  font-size: 12.5px;
  line-height: 1.75;
  color: var(--c-muted);
  text-align: center;
}

.wd__card {
  padding: 12px 13px 10px;
  border: 1px solid var(--c-line);
  border-radius: 10px;
  background: #fff;
}
.wd__card.is-active {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 2px var(--c-primary-soft);
}
.wd__card.is-pending {
  background: #fbfdfd;
}

.wd__card-head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 5px;
}

.wd__card-title {
  margin: 0;
  min-width: 0;
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--c-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wd__badge {
  flex: 0 0 auto;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  line-height: 1.6;
}
.wd__badge.is-ok {
  background: var(--c-primary-soft);
  color: var(--c-primary-ink);
}
.wd__badge.is-wait {
  background: var(--c-warn-soft);
  border: 1px solid var(--c-warn-line);
  color: var(--c-warn-ink);
}

.wd__export {
  flex: 0 0 auto;
  padding: 3px 8px;
  border: 1px solid var(--c-line);
  border-radius: 5px;
  background: #fff;
  font-family: inherit;
  font-size: 11px;
  color: var(--c-ink-2);
  cursor: pointer;
}
.wd__export:hover:not(:disabled) {
  border-color: var(--c-primary);
  color: var(--c-primary-ink);
}
.wd__export:disabled {
  opacity: 0.45;
  cursor: default;
}

.wd__card-sub {
  margin: 0 0 9px;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--c-muted);
}

.wd__preview {
  padding: 9px 10px;
  border-radius: 7px;
  background: var(--c-bg);
  border: 1px solid var(--c-line);
  font-size: 11.5px;
  line-height: 1.85;
  color: var(--c-ink-2);
}
.wd__preview--empty {
  color: var(--c-muted);
  text-align: center;
  padding: 16px 10px;
}

.wd__line {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.wd__line.is-head {
  font-weight: 600;
  color: var(--c-ink);
  padding-bottom: 4px;
  margin-bottom: 3px;
  border-bottom: 1px solid var(--c-line);
}

.wd__more {
  margin-top: 3px;
  font-size: 11px;
  color: var(--c-muted);
}

.wd__card-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.wd__open {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px 9px;
  border: 1px solid var(--c-line);
  border-radius: 6px;
  background: #fff;
  font-family: inherit;
  font-size: 11.5px;
  color: var(--c-primary-ink);
  cursor: pointer;
}
.wd__open:hover {
  border-color: var(--c-primary);
  background: var(--c-primary-soft);
}

.wd__mask {
  display: none;
}

@media (max-width: 1080px) {
  .wd__mask {
    display: block;
    position: absolute;
    inset: 0;
    z-index: 19;
    background: rgba(11, 46, 54, 0.26);
  }

  .wd.is-open {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 20;
    width: min(360px, 88vw);
    flex: 0 0 auto;
    box-shadow: -8px 0 26px rgba(11, 46, 54, 0.14);
  }
}
</style>
