<!--
  工作台 / 首页筛选区的自测预览 —— 仅开发环境，不参与正式路由产物。

  存在的理由：这两个组件目前没有业务宿主（工作台还没接进 ResearchWorkspaceView）。
  没有宿主就看不到真实渲染，只能靠想象判断间距和对齐，那是不可靠的。
  这里用种子数据把六阶段里最典型的两步跑出来，验证三件事：
    1. 决策卡点选后结论是否正确回填、步骤条是否推进；
    2. 「改一下」是否回到未答而不是新开一张卡；
    3. 抽屉开合时对话区宽度是否跟着变。

  种子数据是演示用的，与正式真题数据无关。
-->
<template>
  <div class="pv">
    <header class="pv__bar">
      <strong class="pv__brand">工作台组件预览</strong>
      <span class="pv__note">仅开发环境 · 种子数据不代表业务数据</span>
      <div class="pv__grow"></div>
      <div class="pv__tabs">
        <button type="button" class="pv__tab" :class="{ 'is-on': tab === 'work' }" @click="tab = 'work'">
          工作台
        </button>
      </div>
      <label class="pv__check">
        <input v-model="readOnly" type="checkbox" />
        只读
      </label>
    </header>

    <div v-if="tab === 'work'" class="pv__stage">
      <WorkbenchShell
        title="城乡居民消费信心影响因素研究"
        tag="2026 市调真题"
        :active-step="activeStep"
        :confirmed-steps="confirmed"
        :env-state="'none'"
        :stage="stage"
        :items="items"
        :artifacts="artifacts"
        :chips="chips"
        :drawer-open="drawerOpen"
        :active-artifact-id="activeArtifactId"
        :read-only="readOnly"
        :busy="busy"
        @back="resetAll"
        @jump="onJump"
        @ask="onAsk"
        @prev="onPrev"
        @toggle-drawer="drawerOpen = !drawerOpen"
        @decide="onDecide"
        @reopen="onReopen"
        @send="onSend"
        @upload="onUpload"
        @select-artifact="onSelectArtifact"
        @export="onExport"
      />
    </div>


    <p v-if="feedback" class="pv__feedback" role="status">{{ feedback }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import WorkbenchShell from '@/components/research/WorkbenchShell.vue'
import {
  defaultChips,
  type ArtifactRef,
  type ChatItem,
  type StageBadge,
  type WorkbenchStepKey,
} from '@/components/research/workbench-contract'

const tab = ref<'work'>('work')
const readOnly = ref(false)
// 窄屏下抽屉是浮层，默认收着 —— 否则一进来就压住半屏对话
const drawerOpen = ref(typeof window !== 'undefined' && window.innerWidth >= 1080)
const busy = ref(false)
const feedback = ref('')
const activeArtifactId = ref('a1')

const activeStep = ref<WorkbenchStepKey>('problem')
const confirmed = ref<WorkbenchStepKey[]>([])

const stage = computed<StageBadge>(() => {
  if (activeStep.value === 'problem') return { text: '等待：确认研究问题', tone: 'waiting' }
  if (activeStep.value === 'material') return { text: '进行中：整理材料', tone: 'running' }
  return { text: '等待你的指令', tone: 'idle' }
})

const chips = computed(() => defaultChips(activeStep.value))

let seq = 100
const nextId = (p: string) => `${p}-${++seq}`

const items = ref<ChatItem[]>([
  {
    kind: 'agent',
    id: 'm1',
    at: '11:42',
    paragraphs: [
      '我把题干里的约束先拆了一遍。这道题要的不是「消费信心高不高」，而是「哪些因素在起作用、作用有多大」——所以它是解释性研究，不是描述性研究。',
      '材料里给出了 2025 年四个季度的抽样框和 1,860 份有效样本，其中有 3 个变量存在明显缺失（月收入、家庭负债、住房面积）。这决定了后面清洗规则必须先定，否则分析口径会漂。',
    ],
    next: '下一步：把研究问题定下来，我会给出研究对象、核心假设和「什么样的结论才算回答了它」。这一步定错了，后面问卷和分析全要返工。',
    artifacts: [
      {
        id: 'a1',
        title: '题意与约束梳理',
        subtitle: '研究对象 · 假设 · 判断标准',
        kind: 'report',
        state: 'generated',
        lines: ['一、研究对象', '18–55 岁城镇常住居民', '二、核心假设', 'H1 收入预期 → 消费信心（正）', 'H2 负债压力 → 消费信心（负）', '三、判断标准', '主效应显著且方向与假设一致'],
      },
    ],
  },
  {
    kind: 'decision',
    id: 'd1',
    step: 'problem',
    title: '研究问题这样理解，对吗？',
    body:
      '研究对象锁定「18–55 岁城镇常住居民」，核心问题是「收入预期与负债压力如何共同影响消费信心」，边界是不做跨省比较、不预测宏观走势。如果你还要加约束（比如限定某类城市、或要求分人群结论），现在说最省事。',
    options: [
      { key: 'ok', label: '理解正确，继续', kind: 'primary', doneLabel: '研究问题已确认' },
      { key: 'note:scope', label: '补充约束', kind: 'secondary' },
      { key: 'skip', label: '先跳过，我自己想想', kind: 'ghost', doneLabel: '已跳过，暂不推进' },
    ],
    footer: '不想现在决定可以跳过；也可以点右上角「我有问题」，先问一句再定。',
  },
])

/* 从对话流里收集产物，抽屉只读这里 —— 避免两处各存一份 */
const artifacts = computed<ArtifactRef[]>(() =>
  items.value.flatMap((i) => (i.kind === 'agent' ? i.artifacts ?? [] : [])),
)

function findDecision(id: string) {
  const hit = items.value.find((i) => i.id === id)
  return hit && hit.kind === 'decision' ? hit : null
}

function onDecide(payload: { cardId: string; optionKey: string; note: string }) {
  const card = findDecision(payload.cardId)
  if (!card) return
  card.answered = payload.optionKey
  card.note = payload.note

  if (payload.optionKey !== 'ok') {
    feedback.value = payload.note ? `已记录：${payload.note}` : '已跳过，流程停在原处等你'
    return
  }

  feedback.value = ''
  const step = card.step
  if (step && !confirmed.value.includes(step)) confirmed.value.push(step)

  // 推进到下一阶段并追加智能体回复
  if (step === 'problem') {
    activeStep.value = 'material'
    items.value.push(
      {
        kind: 'me',
        id: nextId('u'),
        text: '理解正确，继续',
        at: '11:44',
      },
      {
        kind: 'agent',
        id: nextId('m'),
        at: '11:44',
        paragraphs: [
          '好。那我先盘材料。题干附件里有 4 份数据表、1 份问卷初稿、1 份抽样方案说明，能直接支撑 H1，但 H2 缺一个关键字段——家庭负债明细只在附件三里有汇总值，没有分项。',
          '这意味着 H2 只能做粗粒度检验。要么接受这个限制，要么补一轮小样本采集。我倾向先跑粗粒度看方向，方向对了再决定要不要补。',
        ],
        next: '下一步：确认材料够不够。如果你手上还有负债分项数据，现在传上来能省一轮。',
        artifacts: [
          {
            id: nextId('a'),
            title: '材料清单与缺口',
            subtitle: '4 份数据 · 1 份问卷 · 2 处缺口',
            kind: 'dataset',
            state: 'generated',
            lines: ['✓ 抽样方案说明.pdf', '✓ 消费信心量表.xlsx（1860 行）', '✓ 收入分布.xlsx', '✓ 问卷初稿.docx', '△ 家庭负债：仅汇总值', '△ 住房面积：缺失 11.3%'],
          },
        ],
      },
      {
        kind: 'decision',
        id: nextId('d'),
        step: 'material',
        title: '材料缺口怎么处理？',
        body: 'H2 缺负债分项，直接跑只能看方向。三个走法：接受粗粒度先看方向、补一轮小样本采集、或者把 H2 换成「负债压力感知」这个量表题——代价是假设变了，报告里要写明。',
        options: [
          { key: 'note:collect', label: '补采一轮小样本', kind: 'primary' },
          { key: 'crude', label: '先跑粗粒度看方向', kind: 'secondary', doneLabel: '按粗粒度口径继续' },
          { key: 'skip', label: '先放着，后面再说', kind: 'ghost', doneLabel: '暂不处理' },
        ],
        footer: '补采会多花 3–5 天，但对 H2 的结论强度影响很大。',
      },
    )
  } else {
    feedback.value = '材料口径已记下'
  }
}

function onReopen(cardId: string) {
  const card = findDecision(cardId)
  if (!card) return
  card.answered = null
  card.note = ''
  // 退回未确认 = 该阶段不再算完成，步骤条与当前阶段一起回退。
  // 下游基于旧决策产生的消息保留不删（那是历史记录），
  // 正式接入时给它们打「需重跑」标记，而不是假装没发生过。
  if (card.step) {
    confirmed.value = confirmed.value.filter((k) => k !== card.step)
    activeStep.value = card.step
  }
  feedback.value = '已退回未确认 —— 下游结果需要重跑（正式接入时标为失效，不删记录）'
}

function onJump(key: WorkbenchStepKey) {
  activeStep.value = key
  feedback.value = `跳到「${key}」（正式接入时这里要先确认是否丢弃下游结果）`
}

function onPrev() {
  const idx = ['problem', 'material', 'questionnaire', 'analysis', 'review', 'report'].indexOf(activeStep.value)
  if (idx <= 0) {
    feedback.value = '已经是第一步'
    return
  }
  activeStep.value = ['problem', 'material', 'questionnaire', 'analysis', 'review', 'report'][idx - 1] as WorkbenchStepKey
  confirmed.value = confirmed.value.filter((k) => k !== activeStep.value)
  feedback.value = '已回到上一步，该步确认状态已清除'
}

function onAsk() {
  feedback.value = '「我有问题」应在输入框里插入一条待发问句，正式接入时由宿主实现'
}

function onSend(text: string) {
  items.value.push({ kind: 'me', id: nextId('u'), text, at: '11:46' })
  busy.value = true
  setTimeout(() => {
    busy.value = false
    items.value.push({
      kind: 'agent',
      id: nextId('m'),
      at: '11:46',
      paragraphs: [`收到：「${text}」。预览页不接真实模型，这里只演示消息进出的排布。`],
    })
  }, 700)
}

function onUpload() {
  feedback.value = '上传入口在正式接入时打开文件选择器'
}

function onSelectArtifact(id: string) {
  activeArtifactId.value = id
  drawerOpen.value = true
}

function onExport(id: string) {
  feedback.value = `导出 ${id}（预览页不落盘）`
}

function resetAll() {
  feedback.value = '返回首页（预览页不跳转）'
}

</script>

<style scoped>
.pv {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--c-bg);
  color: var(--c-ink);
  font-family: var(--font-sans);
}

.pv__bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
  padding: 8px 16px;
  background: #fff;
  border-bottom: 1px solid var(--c-line);
}

.pv__brand {
  font-size: 13px;
  color: var(--c-ink);
}

.pv__note {
  font-size: 11.5px;
  color: var(--c-muted);
}

.pv__grow {
  flex: 1;
}

.pv__tabs {
  display: flex;
  gap: 4px;
  padding: 3px;
  background: var(--c-bg);
  border-radius: 8px;
}

.pv__tab {
  padding: 4px 12px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  color: var(--c-ink-2);
  cursor: pointer;
}
.pv__tab.is-on {
  background: #fff;
  color: var(--c-primary-ink);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}

.pv__check {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--c-ink-2);
}

.pv__stage {
  flex: 1;
  min-height: 0;
}

.pv__feedback {
  flex: 0 0 auto;
  margin: 0;
  padding: 7px 16px;
  border-top: 1px solid var(--c-line);
  background: #fff;
  font-size: 12px;
  color: var(--c-primary-ink);
}
</style>
