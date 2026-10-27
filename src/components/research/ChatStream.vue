<!--
  对话流。

  三种项混排：智能体消息 / 我的消息 / 决策卡。
  决策卡由 DecisionCard 渲染，这里只负责把它排在正确位置并留出缩进 ——
  它必须和上下文同列，才能真的「读完就点」。

  组件不做流式打字（那属于后端推送的形态，先按整条渲染）。
  新消息进来时滚到底，但只在用户本来就贴着底部时才滚，避免打断向上翻阅。
-->
<template>
  <div ref="scrollEl" class="wstream" @scroll="onScroll">
    <div class="wstream__inner">
      <div v-for="item in items" :key="item.id" class="wstream__row" :class="`is-${item.kind}`">
        <!-- 智能体 -->
        <article v-if="item.kind === 'agent'" class="msg">
          <header class="msg__head">
            <span class="msg__avatar" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19V6M4 19h16M8 19v-6M12 19V9M16 19v-8M20 19v-4" />
              </svg>
            </span>
            <span class="msg__who">调查助手</span>
            <span v-if="item.at" class="msg__at">{{ item.at }}</span>
          </header>

          <p v-for="(p, i) in item.paragraphs" :key="i" class="msg__p">{{ p }}</p>

          <div v-if="item.next" class="msg__next">
            <span class="msg__next-tag">下一步</span>
            <span class="msg__next-text">{{ item.next }}</span>
          </div>

          <div v-if="item.artifacts?.length" class="msg__arts">
            <button
              v-for="art in item.artifacts"
              :key="art.id"
              type="button"
              class="acard"
              :class="{ 'is-pending': art.state === 'pending' }"
              @click="emit('open-artifact', art.id)"
            >
              <span class="acard__ico" :class="`is-${art.kind}`" aria-hidden="true">
                <svg v-if="art.kind === 'dataset'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M3 10h18M9 10v10" />
                </svg>
                <svg v-else-if="art.kind === 'questionnaire'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 6h11M9 12h11M9 18h11" />
                  <path d="M4 6h.01M4 12h.01M4 18h.01" />
                </svg>
                <svg v-else-if="art.kind === 'analysis'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 3v18h18" />
                  <path d="M7 15l4-5 3 3 4-6" />
                </svg>
                <svg v-else-if="art.kind === 'report'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 3v5h5" />
                  <path d="M19 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7z" />
                  <path d="M9 13h6M9 17h4" />
                </svg>
                <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M10 8.5l6 3.5-6 3.5z" />
                </svg>
              </span>
              <span class="acard__main">
                <span class="acard__t">{{ art.title }}</span>
                <span class="acard__s">{{ art.subtitle }}</span>
              </span>
              <span v-if="art.state === 'generated'" class="acard__badge">已生成</span>
              <span class="acard__go">
                查看
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </span>
            </button>
          </div>
        </article>

        <!-- 我的消息 -->
        <div v-else-if="item.kind === 'me'" class="mymsg">
          <p class="mymsg__text">{{ item.text }}</p>
          <span v-if="item.at" class="mymsg__at">{{ item.at }}</span>
        </div>

        <!-- 决策卡 -->
        <DecisionCard
          v-else
          class="wstream__decision"
          :card="item"
          :read-only="readOnly"
          @decide="(p) => emit('decide', p)"
          @reopen="(id) => emit('reopen', id)"
        />
      </div>

      <p v-if="!items.length" class="wstream__empty">
        还没有对话。在下面说一句，或点一个快捷指令开始。
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

import DecisionCard from './DecisionCard.vue'
import type { ChatItem } from './workbench-contract'

const props = defineProps<{
  items: ChatItem[]
  readOnly?: boolean
}>()

const emit = defineEmits<{
  (e: 'decide', payload: { cardId: string; optionKey: string; note: string }): void
  (e: 'reopen', cardId: string): void
  (e: 'open-artifact', id: string): void
}>()

const scrollEl = ref<HTMLElement | null>(null)
/** 只要用户往上翻过，就不自动跟随 —— 否则读历史时被拽回底部 */
const stickBottom = ref(true)

function onScroll() {
  const el = scrollEl.value
  if (!el) return
  stickBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 80
}

watch(
  () => props.items.length,
  async () => {
    if (!stickBottom.value) return
    await nextTick()
    const el = scrollEl.value
    if (el) el.scrollTop = el.scrollHeight
  },
)

// 决策卡展开/收起会改变高度，贴着底部时补一次
watch(
  () => props.items.map((i) => (i.kind === 'decision' ? i.answered : '')).join('|'),
  async () => {
    if (!stickBottom.value) return
    await nextTick()
    const el = scrollEl.value
    if (el) el.scrollTop = el.scrollHeight
  },
)
</script>

<style scoped>
.wstream {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 22px 24px 8px;
  scroll-behavior: smooth;
}

.wstream__inner {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 760px;
  margin: 0 auto;
}

/* ── 智能体消息 ── */
.msg {
  padding: 15px 17px 14px;
  background: var(--c-surface);
  border: 1px solid var(--c-line);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
}

.msg__head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 9px;
}

.msg__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(120deg, #12a594 0%, #1e9fc4 100%);
  color: #fff;
  flex: 0 0 auto;
}

.msg__who {
  font-size: 12px;
  font-weight: 600;
  color: var(--c-primary-ink);
  letter-spacing: 0.02em;
}

.msg__at {
  margin-left: auto;
  font-size: 11px;
  color: var(--c-muted);
  font-variant-numeric: tabular-nums;
}

.msg__p {
  margin: 0 0 9px;
  font-size: 13.5px;
  line-height: 1.82;
  color: var(--c-ink-2);
}
.msg__p:last-of-type {
  margin-bottom: 0;
}

.msg__next {
  display: flex;
  gap: 8px;
  margin-top: 11px;
  padding: 9px 12px;
  background: var(--c-primary-soft);
  border-left: 2px solid var(--c-primary);
  border-radius: 0 7px 7px 0;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--c-primary-ink);
}

.msg__next-tag {
  flex: 0 0 auto;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.msg__next-text {
  min-width: 0;
}

.msg__arts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

/* ── 产物卡 ── */
.acard {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--c-line);
  border-radius: 9px;
  background: #fff;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.14s ease, box-shadow 0.14s ease;
}
.acard:hover {
  border-color: var(--c-primary);
  box-shadow: 0 2px 10px rgba(18, 165, 148, 0.1);
}
.acard.is-pending {
  opacity: 0.7;
  cursor: default;
}

.acard__ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: var(--c-primary-soft);
  color: var(--c-primary-ink);
  flex: 0 0 auto;
}
.acard__ico.is-demo {
  background: #eef6fb;
  color: var(--c-blue);
}
.acard__ico.is-report {
  background: #fdf6e9;
  color: var(--c-warn-ink);
}

.acard__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.acard__t {
  font-size: 13px;
  font-weight: 600;
  color: var(--c-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acard__s {
  font-size: 11.5px;
  color: var(--c-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acard__badge {
  flex: 0 0 auto;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--c-warn-soft);
  border: 1px solid var(--c-warn-line);
  color: var(--c-warn-ink);
  font-size: 10.5px;
  line-height: 1.5;
}

.acard__go {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
  font-size: 12px;
  color: var(--c-primary-ink);
}

/* ── 我的消息 ── */
.mymsg {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  justify-content: flex-end;
}

.mymsg__text {
  max-width: 76%;
  margin: 0;
  padding: 9px 13px;
  background: var(--c-primary-soft);
  border: 1px solid #cfebe6;
  border-radius: 11px 11px 3px 11px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--c-ink);
  white-space: pre-wrap;
  word-break: break-word;
}

.mymsg__at {
  flex: 0 0 auto;
  font-size: 11px;
  color: var(--c-muted);
}

/* ── 决策卡缩进：与消息正文左对齐 ── */
.wstream__decision {
  margin-left: 29px;
}

.wstream__empty {
  margin: 40px 0;
  text-align: center;
  font-size: 13px;
  color: var(--c-muted);
}

@media (max-width: 900px) {
  .wstream {
    padding: 16px 12px 6px;
  }
  .wstream__decision {
    margin-left: 0;
  }
  .mymsg__text {
    max-width: 88%;
  }
}
</style>
