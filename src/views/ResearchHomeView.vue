<template>
  <div class="rh">
    <header class="nav">
      <div class="nav-inner">
        <RouterLink class="brand" to="/">
          <div class="brand-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round">
              <path d="M4 19V6M4 19h16M8 19v-6M12 19V9M16 19v-8M20 19v-4" />
            </svg>
          </div>
          <div class="brand-txt">
            <span class="brand-name">市调演真</span>
            <span class="brand-sub">Survey Research Studio</span>
          </div>
        </RouterLink>
        <nav class="nav-links" aria-label="主导航">
          <RouterLink to="/" :class="{ on: route.path === '/' }">首页</RouterLink>
          <RouterLink to="/workbench" :class="{ on: route.path === '/workbench' }">工作台</RouterLink>
        </nav>
        <div class="nav-right">
          <template v-if="!userStore.isLogged">
            <button type="button" class="btn-ghost nav-entry" @click="goLogin">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              学生入口
            </button>
            <RouterLink class="btn-login" to="/login">登录</RouterLink>
          </template>
          <template v-else>
            <span class="avatar" :title="userStore.displayName">{{ initial }}</span>
            <button type="button" class="btn-ghost" @click="userStore.logout()">退出</button>
          </template>
        </div>
      </div>
    </header>

    <section class="hero">
      <div class="hero-inner">
        <div class="hero-badge"><i class="dot" />AI 辅助的市场调查研究工作台</div>
        <h1>让每份调查材料，成为<span class="g">有据可查的结论</span></h1>
        <p class="sub">整理材料、核对问卷、分析数据、审阅发现，每一步都留依据。</p>

        <HomeCaseCarousel :cases="HOME_CASES" @open="loadCase" />

        <div ref="composerEl">
          <HomeComposer v-model="query" @submit="startResearch" />
        </div>

        <div class="chips">
          <RouterLink class="chip" to="/research/work?mode=full">完整研究 · 从研究问题开始</RouterLink>
          <RouterLink class="chip" to="/research/work?mode=questionnaire">已有问卷核对</RouterLink>
          <RouterLink class="chip" to="/research/work?mode=analysis">已有答卷／数据分析</RouterLink>
          <button type="button" class="chip" @click="loadSample">载入示例题目</button>
        </div>
      </div>
    </section>

    <section class="section section-cases">
      <div class="sec-head">
        <h2>全部赛题</h2>
        <span class="sub">市调大赛历届获奖作品 · 按组别与研究领域筛选</span>
      </div>
      <HomeCaseGrid :cases="HOME_CASES" @open="loadCase" />
    </section>

    <footer class="foot">
      <div class="foot-in">
        <span>市调演真 · Survey Research Studio</span>
        <div class="grow" />
        <span>已有答卷／数据分析可用 · 完整研究与问卷核对逐步接入中</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import HomeCaseCarousel from '@/components/home/HomeCaseCarousel.vue'
import HomeCaseGrid from '@/components/home/HomeCaseGrid.vue'
import HomeComposer from '@/components/home/HomeComposer.vue'
import { HOME_CASES } from '@/components/home/home-cases'
import { useUserStore } from '@/stores/user'

/**
 * 站点首页 —— 版式逐块对齐《数模演易原型v2》的 `#view-home`：
 * 顶栏 → 居中 Hero（徽标 / 渐变主标题 / 副标题）→ 真题轮播 → 大输入区
 * → 快捷 chip → 「全部赛题」三行筛选 + 自适应网格 → 页脚。
 *
 * 与原型的两处有意差异，都在函数行为上、不在视觉上：
 *  1. 原型输入区按钮叫「开始演易」、落地到原型壳的工作台视图；这里是
 *     「开始研究」，落地到真实路由 `/research/work`。
 *  2. 原型点卡片进「题目详情」页；那个页面正文走 `/api/smyy/cases`，
 *     接口没起来时是空壳，所以这里改成把题目载入输入框（与题库同一份字段口径），
 *     用户可以接着做，而不是点进一个空页。
 */

/** 首页输入的题目暂存键：跳到工作台后回首页仍能看到，避免「打的字没了」 */
const SEED_KEY = 'scdc-f-home-seed-v1'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const query = ref('')
const composerEl = ref<HTMLElement | null>(null)

const initial = computed(() => (userStore.displayName || '学').slice(0, 1))

function goLogin() {
  void router.push('/login')
}

/** 载入一道真题到输入框：直接复用题库字段拼文本，不另写一份摘要 */
function loadCase(id: string) {
  const item = HOME_CASES.find((c) => c.id === id)
  if (!item) return
  // 角标只写届次，拼进题目时补全「组别·奖项」，用户才知道这是哪一类比赛
  query.value = `【${item.year} 正大杯 ${item.cat} ${item.level}】${item.title}\n${item.desc}`
  void scrollToComposer()
}

function loadSample() {
  const first = HOME_CASES[0]
  if (first) loadCase(first.id)
}

async function scrollToComposer() {
  await nextTick()
  composerEl.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  composerEl.value?.querySelector('textarea')?.focus()
}

/**
 * 开始研究。
 *
 * 工作台目前只认 `?mode=`，没有「带着题目进来」的入口（那属于接入层，
 * 由另一名前端负责）。所以这里把题目落到 sessionStorage 暂存：
 * 跳过去再回首页，输入框会原样还原，用户不用重打一遍。
 * 等工作台支持 `?seed=` 一类参数后，把这段换成参数传递即可。
 */
function startResearch() {
  const text = query.value.trim()
  if (!text) return
  try {
    sessionStorage.setItem(SEED_KEY, text)
  } catch {
    /* 隐私模式下写不进去也不影响跳转 */
  }
  void router.push('/research/work?mode=full')
}

onMounted(() => {
  try {
    const seed = sessionStorage.getItem(SEED_KEY)
    if (seed) query.value = seed
  } catch {
    /* 读不到就当没有 */
  }
})
</script>

<style scoped>
.rh {
  min-height: 100%;
  background: var(--c-bg);
  color: var(--hp-ink);
}

/* ============ 顶栏 ============ */
.nav {
  position: sticky;
  top: 0;
  z-index: 60;
  border-bottom: 1px solid var(--hp-line);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: saturate(180%) blur(12px);
}
.nav-inner {
  display: flex;
  align-items: center;
  gap: 32px;
  width: 100%;
  max-width: var(--hp-pw);
  height: 66px;
  margin: 0 auto;
  padding: 0 var(--hp-px);
}
.brand {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
  color: inherit;
  text-decoration: none;
}
.brand-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--hp-grad);
  box-shadow: 0 6px 16px rgba(11, 110, 104, 0.28);
}
.brand-txt {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}
.brand-name {
  font-size: 19px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: var(--hp-blue-900);
}
.brand-sub {
  margin-top: -3px;
  font-size: 11px;
  letter-spacing: 0.6px;
  color: var(--hp-ink-4);
}
.nav-links {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  margin-left: 28px;
}
.nav-links a {
  padding: 7px 14px;
  border-radius: 9px;
  color: var(--hp-ink-2);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: 0.18s;
}
.nav-links a:hover {
  background: var(--hp-blue-50);
  color: var(--hp-blue-700);
}
.nav-links a.on {
  background: var(--hp-blue-100);
  color: var(--hp-blue-800);
}
.nav-right {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}
.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  border: 1px solid var(--hp-line);
  border-radius: 10px;
  background: #fff;
  color: var(--hp-ink-2);
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.18s;
}
.btn-ghost:hover {
  border-color: var(--hp-blue-300);
  color: var(--hp-blue-700);
  background: var(--hp-blue-50);
}
.btn-login {
  padding: 8px 20px;
  border-radius: 999px;
  background: var(--hp-grad);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 6px 16px rgba(11, 110, 104, 0.3);
  transition: 0.18s;
}
.btn-login:hover {
  filter: brightness(1.06);
  transform: translateY(-1px);
}
.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--hp-blue-100);
  color: var(--hp-blue-700);
  font-size: 13px;
  font-weight: 700;
}

/* ============ Hero ============ */
.hero {
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #effaf8 0%, #f3fafa 100%);
}
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: linear-gradient(var(--hp-blue-200) 1px, transparent 1px),
    linear-gradient(90deg, var(--hp-blue-200) 1px, transparent 1px);
  background-size: 56px 56px;
  opacity: 0.32;
  -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 0%, #000 30%, transparent 100%);
  mask-image: radial-gradient(ellipse 80% 70% at 50% 0%, #000 30%, transparent 100%);
}
.hero-inner {
  position: relative;
  width: 100%;
  max-width: var(--hp-pw);
  margin: 0 auto;
  padding: 54px var(--hp-px) 44px;
  text-align: center;
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  border: 1px solid var(--hp-line);
  border-radius: 999px;
  background: #fff;
  color: var(--hp-blue-700);
  font-size: 13px;
  font-weight: 600;
  box-shadow: var(--hp-sh1);
}
.hero-badge .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #2ba471;
  box-shadow: 0 0 0 3px rgba(43, 164, 113, 0.18);
}
.hero h1 {
  margin: 18px 0 12px;
  font-size: 44px;
  line-height: 1.24;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: var(--hp-blue-900);
}
.hero h1 .g {
  background: linear-gradient(105deg, #0b6e68 0%, #12a594 52%, #1e9fc4 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.hero p.sub {
  max-width: 660px;
  margin: 0 auto;
  color: var(--hp-ink-2);
  font-size: 15.5px;
  line-height: 1.7;
}

/* ============ 快捷入口 ============ */
.chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
}
.chip {
  display: inline-block;
  padding: 6px 13px;
  border: 1px solid var(--hp-line);
  border-radius: 999px;
  background: #fff;
  color: var(--hp-ink-2);
  font-size: 12.5px;
  text-decoration: none;
  cursor: pointer;
  transition: 0.18s;
}
.chip:hover {
  border-color: var(--hp-blue-300);
  color: var(--hp-blue-700);
  background: var(--hp-blue-50);
}

/* ============ 全部赛题 ============ */
.section {
  width: 100%;
  max-width: var(--hp-pw);
  margin: 0 auto;
  padding: 44px var(--hp-px);
}
.section-cases {
  padding-top: 30px;
}
.sec-head {
  display: flex;
  align-items: flex-end;
  gap: 14px;
  margin-bottom: 20px;
}
.sec-head h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.2px;
  color: var(--hp-blue-900);
}
.sec-head .sub {
  font-size: 13px;
  color: var(--hp-ink-3);
}

/* ============ 页脚 ============ */
.foot {
  margin-top: 20px;
  border-top: 1px solid var(--hp-line);
  background: #fff;
}
.foot-in {
  display: flex;
  align-items: center;
  gap: 20px;
  width: 100%;
  max-width: var(--hp-pw);
  margin: 0 auto;
  padding: 26px var(--hp-px);
  color: var(--hp-ink-3);
  font-size: 12.5px;
}
.grow {
  flex: 1;
}

/* ============ 窄屏 ============ */
@media (max-width: 960px) {
  .nav-inner {
    gap: 16px;
    height: 58px;
    padding: 0 18px;
  }
  .nav-links {
    margin-left: 0;
  }
  .brand-sub {
    display: none;
  }
  .hero-inner {
    padding: 40px 20px 34px;
  }
  .hero h1 {
    font-size: 30px;
    letter-spacing: -0.3px;
  }
  .hero p.sub {
    font-size: 14px;
  }
  .section {
    padding: 32px 20px;
  }
  .foot-in {
    flex-wrap: wrap;
    gap: 10px;
    padding: 22px 20px;
  }
}
@media (max-width: 640px) {
  /* 390 宽实测顶栏会顶出 16px 横向滚动条：收紧内边距与字级，不换行 */
  .nav-inner {
    gap: 10px;
    padding: 0 14px;
  }
  .nav-entry {
    display: none;
  }
  .brand {
    gap: 9px;
  }
  .brand-name {
    font-size: 16px;
  }
  .nav-links {
    gap: 2px;
  }
  .nav-links a {
    padding: 6px 8px;
    font-size: 13px;
  }
  .btn-login {
    padding: 7px 14px;
    font-size: 13px;
  }
  .hero h1 {
    font-size: 26px;
  }
}
</style>
