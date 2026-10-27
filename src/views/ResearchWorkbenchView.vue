<template>
  <div class="wb">
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

    <main class="wrap">
      <section class="head">
        <p class="eyebrow">工作台</p>
        <h1>我的研究</h1>
        <p class="sub">选择一份研究，从上次停下的地方继续。所有记录只存在这台浏览器里。</p>
      </section>

      <p v-if="store.storageError && !deleteError" class="alert" role="alert">{{ store.storageError }}</p>

      <section class="starter" aria-label="开始新的研究">
        <button type="button" class="start-card" @click="startTask('full-study')">
          <strong>开始新的研究</strong>
          <span>从赛事理解走到报告与答辩</span>
        </button>
        <button type="button" class="start-card" @click="startTask('questionnaire-review')">
          <strong>核对已有问卷</strong>
          <span>直接检查题项，不补记前序阶段</span>
        </button>
        <button type="button" class="start-card" @click="startTask('dataset-analysis')">
          <strong>分析已有答卷</strong>
          <span>核查字段与质量，再进入分析</span>
        </button>
      </section>

      <section class="list-block">
        <div class="list-head">
          <h2>已保存的研究</h2>
          <span class="count">{{ rows.length }} 份</span>
          <p v-if="deletedNotice" class="notice" role="status">{{ deletedNotice }}</p>
        </div>

        <p v-if="!rows.length" class="empty">
          还没有研究记录。从上面选一种方式开始，或回到首页从一道真题进入。
        </p>

        <ul v-else class="list">
          <li v-for="row in rows" :key="row.id" class="item" :class="{ 'is-confirming': pendingDelete === row.id }">
            <div class="item-main">
              <h3>{{ row.title }}</h3>
              <p class="meta">
                <span class="kind">{{ row.kindLabel }}</span>
                <span>{{ row.stageLabel }}</span>
                <span>{{ row.updatedLabel }}</span>
              </p>
            </div>
            <div v-if="pendingDelete !== row.id" class="item-side">
              <span class="state" :class="row.stateTone">{{ row.stateLabel }}</span>
              <RouterLink class="open" :to="row.url">{{ row.stateTone === 'fresh' ? '去填写' : '继续' }} →</RouterLink>
              <button type="button" class="del" @click="askDelete(row.id)">删除</button>
            </div>
            <div v-else class="confirm">
              <p class="confirm-ask">名称、阶段进度与各阶段已填内容将一并清除，无法恢复。</p>
              <p v-if="deleteError" class="confirm-err" role="alert">{{ deleteError }}</p>
              <div class="confirm-actions">
                <button type="button" class="ghost" @click="cancelDelete">取消</button>
                <button type="button" class="danger" @click="confirmDelete(row.id)">确认删除</button>
              </div>
            </div>
          </li>
        </ul>
      </section>

      <p class="foot-note">
        本页只列出本机草稿，不代表已建立正式项目或已确认任何阶段。
      </p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useResearchStore } from '@/stores/research'
import { useUserStore } from '@/stores/user'
import type { LocalResearchTask, WorkflowKind } from '@/types/research-contracts'
import { kindToMode, sandboxRefKey, stagesFor, workflowLabel } from '@/utils/researchDrafts'
import { clearTopicPlanRecord } from '@/utils/topicPlanDrafts'

/**
 * 工作台 —— 项目列表页。
 *
 * 页面只做三件事：列出、排序、跳转。没有新建/删除的二次确认，
 * 也没有「进度百分比」，因为 `viewedPhase` 只记录「上次在看哪一步」，
 * 项目本身没有「已完成」的字段（阶段确认走服务端，尚未接入）。
 * 把它渲染成 60% 的进度条就是在编造，所以这里只写「上次查看：X」。
 */

const route = useRoute()
const router = useRouter()
const store = useResearchStore()
const userStore = useUserStore()

const initial = computed(() => (userStore.displayName || '学').slice(0, 1))

interface TaskRow {
  id: string
  title: string
  kindLabel: string
  stageLabel: string
  updatedLabel: string
  stateLabel: string
  stateTone: 'fresh' | 'saved' | 'dirty'
  url: { path: string; query: Record<string, string> }
}

function stageLabelOf(task: LocalResearchTask): string {
  const stages = stagesFor(task.workflowKind)
  const stage = stages[task.viewedPhase]
  return stage ? `上次查看：${stage.title}` : '尚无查看记录'
}

/** 相对时间：当天只给时刻，昨天给「昨天」，更早给月日；跨年补年份 */
function updatedLabelOf(ts: number): string {
  const then = new Date(ts)
  const now = new Date()
  const sameDay =
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate()
  if (sameDay) {
    return `今天 ${String(then.getHours()).padStart(2, '0')}:${String(then.getMinutes()).padStart(2, '0')}`
  }
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  const isYesterday =
    then.getFullYear() === yesterday.getFullYear() &&
    then.getMonth() === yesterday.getMonth() &&
    then.getDate() === yesterday.getDate()
  if (isYesterday) return '昨天'
  if (then.getFullYear() !== now.getFullYear()) {
    return `${then.getFullYear()} 年 ${then.getMonth() + 1} 月 ${then.getDate()} 日`
  }
  return `${then.getMonth() + 1} 月 ${then.getDate()} 日`
}

const rows = computed<TaskRow[]>(() =>
  Object.values(store.registry.tasks)
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((task) => {
      // revision === 0 意味着建了任务但一次都没动过（只是点进过入口）
      const fresh = task.revision === 0
      const stateLabel = fresh ? '新建 · 尚未填写' : task.savedAt ? '已保存到本机' : '本机编辑未保存'
      const stateTone = fresh ? 'fresh' : task.savedAt ? 'saved' : 'dirty'
      return {
        id: task.localTaskId,
        title: task.title || workflowLabel(task.workflowKind),
        kindLabel: workflowLabel(task.workflowKind),
        stageLabel: stageLabelOf(task),
        updatedLabel: `更新于 ${updatedLabelOf(task.updatedAt)}`,
        stateLabel,
        stateTone,
        url: {
          path: '/research/work',
          query: { mode: kindToMode(task.workflowKind), task: task.localTaskId },
        },
      }
    }),
)

/**
 * 新建一份任务。
 *
 * 必须在这里显式 `create`，不能只跳到 `/research/work?mode=x` ——
 * 工作台的 watch 调的是 `store.open(kind)`，而 `open` 会优先打开
 * `lastByKind[kind]` 那一份，等于把上一次的研究又打开一遍。
 * 这与工作台内部「新建任务」按钮的做法一致。
 */
function startTask(kind: WorkflowKind) {
  const task = store.create(kind)
  void router.push({
    path: '/research/work',
    query: { mode: kindToMode(kind), task: task.localTaskId },
  })
}

function goLogin() {
  void router.push('/login')
}

/* ============ 删除 ============ */

const pendingDelete = ref<string | null>(null)
const deleteError = ref('')
const deletedNotice = ref('')
let noticeTimer: number | undefined

function askDelete(localTaskId: string) {
  pendingDelete.value = localTaskId
  deleteError.value = ''
  deletedNotice.value = ''
}

function cancelDelete() {
  pendingDelete.value = null
  deleteError.value = ''
}

/**
 * 任务目录之外，一份研究还散落着两处数据：
 *  - `scdc-f-topic-plan-v1:<id>` 第 2/3/4/6 阶段草稿
 *  - `research-sandbox-ref:task:<id>` 沙箱运行引用
 * 目录里那条记录删掉之后它们就成了永远读不到的孤儿，所以一起清。
 * 两处键名分别由各自模块导出，不在这里拼字符串。
 */
function purgeTaskSideData(localTaskId: string) {
  clearTopicPlanRecord(localTaskId)
  try {
    localStorage.removeItem(sandboxRefKey(localTaskId))
  } catch {
    /* 隐私模式下删不掉，不影响目录已经删成功这件事 */
  }
}

function confirmDelete(localTaskId: string) {
  const title = store.registry.tasks[localTaskId]?.title || '这份研究'
  deleteError.value = ''
  // 目录写盘失败时 store 会保留原记录，这里不能继续去清阶段草稿
  if (!store.remove(localTaskId)) {
    deleteError.value = store.storageError || '删除失败，原记录未动。'
    return
  }
  purgeTaskSideData(localTaskId)
  pendingDelete.value = null
  deletedNotice.value = `已删除「${title}」及其各阶段草稿。`
  window.clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => {
    deletedNotice.value = ''
  }, 6000)
}

onBeforeUnmount(() => window.clearTimeout(noticeTimer))
</script>

<style scoped>
.wb {
  min-height: 100%;
  background: var(--c-bg);
  color: var(--hp-ink);
}

/* ============ 顶栏（与首页同款，避免两页视觉断层） ============ */
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

/* ============ 版心 ============ */
.wrap {
  max-width: 1000px;
  margin: 0 auto;
  padding: 56px var(--hp-px) 72px;
}
.eyebrow {
  margin: 0;
  color: var(--hp-blue-700);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1.4px;
}
.head h1 {
  margin: 10px 0 8px;
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: var(--hp-ink);
}
.head .sub {
  margin: 0;
  color: var(--hp-ink-3);
  font-size: 14px;
  line-height: 1.7;
}
.alert {
  margin: 22px 0 0;
  padding: 12px 16px;
  border: 1px solid #f0d3a8;
  border-radius: 10px;
  background: #fdf6e8;
  color: #7a5a1e;
  font-size: 13px;
  line-height: 1.7;
}

/* ============ 三种起点 ============ */
.starter {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 30px;
}
.start-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 18px 18px 17px;
  border: 1px solid var(--hp-line);
  border-radius: var(--hp-r);
  background: #fff;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: 0.18s;
}
.start-card strong {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--hp-blue-900);
}
.start-card span {
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--hp-ink-3);
}
.start-card:hover {
  border-color: var(--hp-blue-200);
  background: var(--hp-blue-50);
  transform: translateY(-2px);
  box-shadow: var(--hp-sh2);
}

/* ============ 列表 ============ */
.list-block {
  margin-top: 46px;
}
.list-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.list-head h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--hp-ink);
}
.count {
  font-size: 12.5px;
  color: var(--hp-ink-4);
}
.empty {
  margin: 0;
  padding: 34px 20px;
  border: 1px dashed var(--hp-line);
  border-radius: var(--hp-r);
  background: #fff;
  color: var(--hp-ink-3);
  font-size: 13.5px;
  line-height: 1.8;
  text-align: center;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.item {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 16px 20px;
  border: 1px solid var(--hp-line);
  border-radius: var(--hp-r);
  background: #fff;
  transition: 0.18s;
}
.item:hover {
  border-color: var(--hp-blue-200);
  box-shadow: var(--hp-sh1);
}
.item-main {
  min-width: 0;
  flex: 1;
}
.item-main h3 {
  margin: 0 0 7px;
  font-size: 15px;
  font-weight: 700;
  color: var(--hp-ink);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow-wrap: anywhere;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  font-size: 12.5px;
  color: var(--hp-ink-3);
}
/* 分隔点挂在后一项前面，避免窄屏换行时行尾吊一个孤零零的「·」 */
.meta > span + span::before {
  content: '·';
  margin-right: 6px;
  color: var(--hp-ink-4);
}
.meta .kind {
  color: var(--hp-blue-700);
  font-weight: 600;
}
.item-side {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 14px;
}
.state {
  padding: 4px 9px;
  border-radius: 7px;
  font-size: 11.5px;
  white-space: nowrap;
}
.state.fresh {
  background: #f2f6f5;
  color: #6f8b83;
}
.state.saved {
  background: var(--hp-blue-100);
  color: var(--hp-blue-800);
}
.state.dirty {
  background: #fdf6e8;
  color: #8a641f;
}
.open {
  padding: 7px 15px;
  border: 1px solid var(--hp-line);
  border-radius: 9px;
  color: var(--hp-blue-800);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
  transition: 0.18s;
}
.open:hover {
  border-color: var(--hp-blue-300);
  background: var(--hp-blue-50);
}

/* ============ 删除 ============ */
.notice {
  margin: 0 0 0 4px;
  color: var(--hp-blue-700);
  font-size: 12.5px;
}
.item.is-confirming {
  border-color: #f0c9c4;
  background: #fffbfa;
}
.del {
  padding: 7px 4px;
  border: 0;
  background: none;
  color: var(--hp-ink-4);
  font-size: 12.5px;
  cursor: pointer;
  transition: 0.18s;
}
.del:hover {
  color: #b3382b;
}
.confirm {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: flex-end;
  gap: 9px;
  max-width: 340px;
}
.confirm-ask {
  margin: 0;
  color: #8a5a2b;
  font-size: 12.5px;
  line-height: 1.65;
  text-align: right;
}
.confirm-err {
  margin: 0;
  color: #a14332;
  font-size: 12.5px;
  text-align: right;
}
.confirm-actions {
  display: flex;
  gap: 8px;
}
.ghost,
.danger {
  padding: 7px 14px;
  border-radius: 9px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.18s;
}
.ghost {
  border: 1px solid var(--hp-line);
  background: #fff;
  color: var(--hp-ink-2);
}
.ghost:hover {
  border-color: var(--hp-blue-300);
  color: var(--hp-blue-700);
}
/* 紧挨着填色红按钮时，默认线色几乎看不见，给「取消」加一档 */
.confirm .ghost {
  border-color: #cfdedd;
  color: var(--hp-ink-2);
}
.danger {
  border: 1px solid #b3382b;
  background: #b3382b;
  color: #fff;
}
.danger:hover {
  filter: brightness(1.06);
}

.foot-note {
  margin: 34px 0 0;
  color: var(--hp-ink-4);
  font-size: 12px;
  line-height: 1.8;
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
  .wrap {
    padding: 40px 20px 56px;
  }
  .head h1 {
    font-size: 27px;
  }
  .starter {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
}
@media (max-width: 640px) {
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
  .item {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .item-side {
    justify-content: space-between;
  }
  /* 窄屏一行放不下三段，换行后点号会跑到行首；改成纯间距 */
  .meta {
    gap: 10px;
  }
  .meta > span + span::before {
    content: none;
  }
  .confirm {
    max-width: none;
    align-items: stretch;
  }
  .confirm-ask,
  .confirm-err {
    text-align: left;
  }
  .confirm-actions {
    justify-content: flex-end;
  }
}
</style>
