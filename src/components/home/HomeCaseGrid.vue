<template>
  <div class="case-grid-area">
    <div class="filters">
      <div v-for="row in rows" :key="row.key" class="frow">
        <span class="frow-lbl">{{ row.label }}</span>
        <div class="frow-opts">
          <button
            v-for="v in row.values"
            :key="v"
            type="button"
            class="chip"
            :class="{ on: current[row.key] === v }"
            @click="current[row.key] = v"
          >
            {{ v }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="list.length" class="grid">
      <button v-for="item in list" :key="item.id" type="button" class="gcard" @click="emit('open', item.id)">
        <div class="gcard-top">
          <span class="tag-c" :class="catTone(item.cat)">{{ item.tag }}</span>
          <span class="mtag">{{ item.level }}</span>
        </div>
        <h4>{{ item.title }}</h4>
        <p>{{ item.desc }}</p>
        <div class="gcard-tags">
          <span v-for="t in item.tags" :key="t" class="mtag">{{ t }}</span>
        </div>
      </button>
    </div>
    <div v-else class="grid-empty">该筛选条件下暂无赛题</div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'

import { CASE_CATS, CASE_TYPES, CASE_YEARS, catTone, type HomeCase } from './home-cases'

/**
 * 首页「全部赛题」筛选网格（原型 `.filters` + `.grid`）。
 *
 * 三行筛选（组别 / 领域 / 届次）**全部保留**：上一版按「取值不足两个就跳过」
 * 把届次行省掉了，但原型就是三行，首页要求与原型一致，所以这里不省。
 * 市调大赛逐届评选，届次有四个真实取值，这一行不会空。
 */
const props = defineProps<{ cases: HomeCase[] }>()
const emit = defineEmits<{ open: [id: string] }>()

type FacetKey = 'cat' | 'type' | 'year'

const current = reactive<Record<FacetKey, string>>({ cat: '全部', type: '全部', year: '全部' })

const rows: { key: FacetKey; label: string; values: string[] }[] = [
  { key: 'cat', label: '组别', values: CASE_CATS },
  { key: 'type', label: '领域', values: CASE_TYPES },
  { key: 'year', label: '届次', values: CASE_YEARS },
]

const list = computed(() =>
  props.cases.filter(
    (item) =>
      (current.cat === '全部' || item.cat === current.cat) &&
      (current.type === '全部' || item.type === current.type) &&
      (current.year === '全部' || item.year === current.year),
  ),
)
</script>

<style scoped>
.filters {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 22px;
}
.frow {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.frow-lbl {
  width: 70px;
  flex-shrink: 0;
  padding-right: 10px;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.4px;
  color: var(--hp-ink-3);
}
.frow-opts {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}
.chip {
  padding: 6px 14px;
  border: 1px solid var(--hp-line);
  border-radius: 999px;
  background: #fff;
  color: var(--hp-ink-2);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.16s;
}
.chip:hover {
  border-color: var(--hp-blue-300);
  color: var(--hp-blue-700);
  background: var(--hp-blue-50);
}
.chip.on {
  border-color: var(--hp-blue-200);
  background: var(--hp-blue-100);
  color: var(--hp-blue-800);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(272px, 1fr));
  gap: 16px;
}
.gcard {
  width: 100%;
  padding: 16px 18px;
  border: 1px solid var(--hp-line);
  border-radius: var(--hp-r);
  background: #fff;
  color: var(--hp-ink);
  text-align: left;
  cursor: pointer;
  transition: 0.2s;
}
.gcard:hover {
  transform: translateY(-3px);
  box-shadow: var(--hp-sh2);
  border-color: var(--hp-blue-200);
}
.gcard-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.gcard h4 {
  margin: 0 0 6px;
  font-size: 14.5px;
  font-weight: 700;
  line-height: 1.5;
}
.gcard p {
  height: 40px;
  margin: 0;
  overflow: hidden;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--hp-ink-3);
}
.gcard-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}
.mtag {
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--hp-line-2);
  color: var(--hp-ink-2);
  font-size: 11px;
}
.tag-c {
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--hp-blue-100);
  color: var(--hp-blue-700);
  font-size: 11px;
  font-weight: 700;
}
.tag-c.m {
  background: #e6f6f7;
  color: #0b7285;
}
.tag-c.o {
  background: #fff3e0;
  color: #b25e00;
}
.tag-c.g {
  background: #e9f7ef;
  color: #1e7a4f;
}
.grid-empty {
  grid-column: 1 / -1;
  padding: 40px;
  text-align: center;
  color: #8a9aad;
}
@media (max-width: 720px) {
  .frow-lbl {
    width: 100%;
    padding-right: 0;
  }
}
</style>
