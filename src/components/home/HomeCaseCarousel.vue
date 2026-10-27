<template>
  <div class="reco">
    <div class="reco-head">
      <div class="reco-title">
        <h2>{{ title }}</h2>
        <span class="reco-sub">{{ sub }}</span>
      </div>
      <div class="reco-acts">
        <button type="button" class="icon-btn" title="上一组" aria-label="上一组" @click="move(-1)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button type="button" class="icon-btn" title="下一组" aria-label="下一组" @click="move(1)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>

    <div
      ref="viewEl"
      class="car-view"
      @mouseenter="pause"
      @mouseleave="resume"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
    >
      <div
        ref="trackEl"
        class="car-track"
        :class="{ grabbing: dragging }"
        :style="{ transform: `translateX(${-idx * step + dragX}px)` }"
      >
        <HomeCaseCard v-for="item in cases" :key="item.id" :item="item" @open="emit('open', $event)" />
      </div>
    </div>

    <div v-if="dots.length > 1" class="car-dots">
      <i
        v-for="d in dots"
        :key="d"
        :class="{ on: d === idx }"
        role="button"
        :aria-label="`第 ${d + 1} 组`"
        @click="go(d)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import HomeCaseCard from './HomeCaseCard.vue'
import type { HomeCase } from './home-cases'

const props = withDefaults(defineProps<{ cases: HomeCase[]; title?: string; sub?: string }>(), {
  title: '正大杯历届获奖作品',
  sub: '真实获奖题目 · 点击载入题面',
})
const emit = defineEmits<{ open: [id: string] }>()

/**
 * 卡片宽 296 + 间距 16 是原型 `.car-track{gap:16}` + `.pcard{flex:0 0 296px}` 的口径。
 * 但窄屏下卡片会改成占满一屏（见 style 里的断点），步长就不是常数了 ——
 * 所以每次都实测：步长 = 首张卡实际宽 + 实测间距。写死 312 会让窄屏翻页时
 * 左侧露出上一张卡的碎片。
 */
const GAP_FALLBACK = 16
const AUTOPLAY_MS = 3800
/** 拖过这么多像素才算翻页，否则回弹 —— 与原型 `Math.abs(dx)>48` 一致 */
const DRAG_THRESHOLD = 48

const viewEl = ref<HTMLElement | null>(null)
const trackEl = ref<HTMLElement | null>(null)
const idx = ref(0)
const per = ref(3)
const dragX = ref(0)
const cardW = ref(296)
const gapPx = ref(GAP_FALLBACK)

const dragging = ref(false)
let startX = 0
let pointerId: number | null = null
let moved = false
let timer: ReturnType<typeof setInterval> | null = null
let observer: ResizeObserver | null = null

const step = computed(() => cardW.value + gapPx.value)
const max = computed(() => Math.max(0, props.cases.length - per.value))
const dots = computed(() => Array.from({ length: max.value + 1 }, (_, i) => i))

function measure() {
  const view = viewEl.value
  const track = trackEl.value
  if (!view || !track) return

  const first = track.firstElementChild as HTMLElement | null
  const gap = parseFloat(getComputedStyle(track).columnGap || '')
  gapPx.value = Number.isFinite(gap) ? gap : GAP_FALLBACK
  if (first && first.offsetWidth > 0) cardW.value = first.offsetWidth

  // 视图还没渲染出来时给一个默认宽度，避免首屏 per=1 把圆点画成一排
  const usable = view.clientWidth > 200 ? view.clientWidth : 1176
  per.value = Math.max(1, Math.min(props.cases.length, Math.floor((usable + gapPx.value) / step.value)))
  if (idx.value > max.value) idx.value = max.value
}

function move(step: number) {
  idx.value += step
  if (idx.value > max.value) idx.value = 0
  if (idx.value < 0) idx.value = max.value
}

function go(i: number) {
  idx.value = Math.max(0, Math.min(max.value, i))
}

function pause() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function resume() {
  pause()
  if (max.value <= 0) return
  timer = setInterval(() => move(1), AUTOPLAY_MS)
}

function onDown(event: PointerEvent) {
  if (event.button !== 0) return
  dragging.value = true
  moved = false
  startX = event.clientX
  pointerId = event.pointerId
  pause()
}

function onMove(event: PointerEvent) {
  if (!dragging.value || pointerId !== event.pointerId) return
  dragX.value = event.clientX - startX
  if (Math.abs(dragX.value) > 4) moved = true
}

function onUp(event: PointerEvent) {
  if (!dragging.value) return
  dragging.value = false
  pointerId = null
  const offset = event.clientX - startX
  dragX.value = 0
  if (Math.abs(offset) > DRAG_THRESHOLD) move(offset < 0 ? 1 : -1)
  resume()
}

/**
 * 拖拽结束时浏览器仍会补一次 click，落到卡片上就会误开。
 * 在捕获阶段拦掉这一次，`moved` 用完即清 —— 与原型同一套处理。
 */
function onClickCapture(event: MouseEvent) {
  if (!moved) return
  event.preventDefault()
  event.stopPropagation()
  moved = false
}

onMounted(async () => {
  await nextTick()
  measure()
  resume()
  const el = viewEl.value
  if (el) {
    observer = new ResizeObserver(() => measure())
    observer.observe(el)
    el.addEventListener('click', onClickCapture, true)
  }
})

onBeforeUnmount(() => {
  pause()
  observer?.disconnect()
  observer = null
  viewEl.value?.removeEventListener('click', onClickCapture, true)
})
</script>

<style scoped>
.reco {
  width: 100%;
  margin-top: 28px;
  text-align: left;
}
.reco-head {
  display: flex;
  align-items: flex-end;
  gap: 14px;
  margin-bottom: 10px;
}
.reco-title {
  display: flex;
  align-items: flex-end;
  gap: 14px;
  min-width: 0;
}
.reco-title h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.2px;
  color: var(--hp-blue-900);
}
.reco-sub {
  font-size: 12.5px;
  color: var(--hp-ink-3);
}
.reco-acts {
  display: flex;
  gap: 8px;
  margin-left: auto;
}
.icon-btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--hp-line);
  border-radius: 9px;
  background: #fff;
  color: var(--hp-ink-2);
  cursor: pointer;
  transition: 0.16s;
}
.icon-btn:hover {
  border-color: var(--hp-blue-300);
  color: var(--hp-blue-700);
  background: var(--hp-blue-50);
}
.car-view {
  overflow: hidden;
  padding: 6px 2px 12px;
  margin: 0 -2px;
  touch-action: pan-y;
}
.car-track {
  display: flex;
  gap: 16px;
  cursor: grab;
  transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
}
.car-track.grabbing {
  cursor: grabbing;
  transition: none;
}
.car-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 2px;
}
.car-dots i {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #b8e8e2;
  cursor: pointer;
  transition: 0.25s;
}
.car-dots i.on {
  width: 22px;
  background: var(--hp-blue-500);
}
@media (max-width: 720px) {
  .reco-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
}
@media (max-width: 640px) {
  /* 一屏一张：卡片占满可视宽、间距归零，翻页才不会露出邻卡碎片 */
  .car-track {
    gap: 0;
  }
  .car-track :deep(.pcard) {
    flex: 0 0 100%;
  }
}
</style>
