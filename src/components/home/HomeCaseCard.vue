<template>
  <button type="button" class="pcard" @click="emit('open', item.id)">
    <div class="pcard-cover">
      <HomeCaseCover :kind="item.cover" />
    </div>
    <span class="pcard-tag">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      {{ item.tag }} · {{ item.level }}
    </span>
    <h3>{{ item.title }}</h3>
    <p>{{ item.desc }}</p>
    <div class="pcard-foot">
      <span>{{ formatViews(item.views) }} 次浏览</span>
      <span class="pcard-go">
        查看
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </span>
    </div>
  </button>
</template>

<script setup lang="ts">
import HomeCaseCover from './HomeCaseCover.vue'
import { formatViews, type HomeCase } from './home-cases'

/** 首页轮播卡（原型 `.pcard`）：渐变封面 + 角标 + 标题 + 简介 + 浏览数/查看 */
defineProps<{ item: HomeCase }>()
const emit = defineEmits<{ open: [id: string] }>()
</script>

<style scoped>
.pcard {
  display: block;
  width: 100%;
  flex: 0 0 296px;
  padding: 18px 18px 16px;
  border: 1px solid var(--hp-line);
  border-radius: var(--hp-r);
  background: #fff;
  color: var(--hp-ink);
  text-align: left;
  cursor: pointer;
  transition: 0.2s;
}
.pcard:hover {
  transform: translateY(-4px);
  box-shadow: var(--hp-sh3);
  border-color: var(--hp-blue-200);
}
.pcard-cover {
  position: relative;
  height: 88px;
  margin-bottom: 14px;
  border-radius: 10px;
  overflow: hidden;
  background: linear-gradient(135deg, #12a594 0%, #1e9fc4 60%, #17a2c4 100%);
}
.pcard-cover::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(255, 255, 255, 0.22) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.22) 1px, transparent 1px);
  background-size: 22px 22px;
}
.pcard-cover::after {
  content: '';
  position: absolute;
  left: -10%;
  bottom: -38%;
  width: 120%;
  height: 120%;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.42), transparent 62%);
}
.pcard-cover :deep(svg) {
  position: absolute;
  right: 14px;
  top: 14px;
  opacity: 0.9;
}
.pcard-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 9px;
  padding: 4px 9px;
  border-radius: 6px;
  background: var(--hp-blue-50);
  color: var(--hp-blue-700);
  font-size: 11.5px;
  font-weight: 700;
}
.pcard h3 {
  margin: 0 0 8px;
  font-size: 15.5px;
  font-weight: 700;
  line-height: 1.45;
  color: var(--hp-ink);
  /* 市调获奖题目是「口号 + 破折号 + 正题」的双标题，普遍比数模题名长一倍。
     不限行会把卡片撑高、把下面的输入区顶下去，破坏与原型对齐的纵向节奏。
     卡片只是预览，完整题面点开后会整段填进输入框，这里截断不丢信息。 */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  height: 2.9em;
  overflow: hidden;
}
.pcard p {
  height: 42px;
  margin: 0;
  overflow: hidden;
  font-size: 12.8px;
  line-height: 1.65;
  color: var(--hp-ink-3);
}
.pcard-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--hp-line-2);
  font-size: 12px;
  color: var(--hp-ink-4);
}
.pcard-go {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-left: auto;
  color: var(--hp-blue-600);
  font-weight: 700;
}
</style>
