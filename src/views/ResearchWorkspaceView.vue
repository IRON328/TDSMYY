<template>
  <main class="research-workspace">
    <header class="workspace-nav"><RouterLink to="/" class="brand"><span class="mark">调</span><span><strong>市调演真</strong><small>研究工作台</small></span></RouterLink><RouterLink to="/">← 返回研究入口</RouterLink><span class="draft-hint">本机草稿可在此继续</span></header>
    <section class="workspace-heading"><div><p class="eyebrow">研究任务 · {{ modeLabel }}</p><h1>{{ draft.title || '已有数据分析' }}</h1><p>组织调查上下文、材料、运行与候选结果。本机工作区不会自动成为正式业务项目。</p></div><span class="local-chip">本机研究工作区</span></section>
    <section class="context">
      <label>研究任务名称<input v-model="draft.title" maxlength="120" @change="saveDraft" /></label>
      <dl><div><dt>研究类型</dt><dd>{{ modeLabel }}</dd></div><div><dt>本机草稿</dt><dd>{{ draft.draftId || '尚未建立' }}</dd></div><div><dt>正式项目</dt><dd>项目 / 版本接口待接入</dd></div><div><dt>调查材料</dt><dd>{{ draft.inputFile ? draft.inputFile.name+'（需重新选择正文）' : '尚未选择' }}</dd></div></dl>
      <div class="entry-tabs"><RouterLink :class="{active:mode==='full'}" to="/research/work?mode=full">完整研究 <small>待接入</small></RouterLink><RouterLink :class="{active:mode==='questionnaire'}" to="/research/work?mode=questionnaire">问卷核对 <small>待接入</small></RouterLink><RouterLink :class="{active:mode==='analysis'}" to="/research/work?mode=analysis">已有数据分析 <small>当前切片</small></RouterLink></div>
      <p v-if="mode!=='analysis'" class="pending-note">该入口已纳入研究流程，目前功能待接入。下方已有数据分析模块可继续承载合成数据验证与本机研究。</p>
    </section>
    <ResearchSandboxView :task-title="draft.title" @update:task-title="updateTitle" @update:input-file="updateInputFile" />
  </main>
</template>
<script setup lang="ts">
import { computed,onMounted,reactive } from 'vue'
import { useRoute } from 'vue-router'
import ResearchSandboxView from '@/views/ResearchSandboxView.vue'
import { createResearchIntakeDraft,loadResearchIntakeDraft,saveResearchIntakeDraft } from '@/utils/research-intake'
const route=useRoute()
const mode=computed(()=>['full','questionnaire'].includes(String(route.query.mode))?String(route.query.mode):'analysis')
const modeLabel=computed(()=>mode.value==='full'?'完整研究':mode.value==='questionnaire'?'问卷核对':'已有数据分析')
const draft=reactive(loadResearchIntakeDraft(localStorage) || createResearchIntakeDraft(''))
function saveDraft(){try{const saved=saveResearchIntakeDraft(localStorage,draft);Object.assign(draft,saved)}catch{}}
function updateTitle(value:string){draft.title=value;saveDraft()}
function updateInputFile(file:{name:string;size:number;lastModified:number}|null){draft.inputFile=file;draft.updatedAt=Date.now();saveDraft()}
onMounted(()=>{const saved=loadResearchIntakeDraft(localStorage);if(saved)Object.assign(draft,saved);else Object.assign(draft,createResearchIntakeDraft('local-'+crypto.randomUUID()))})
</script>
<style scoped>
.research-workspace{min-height:100vh;background:#f5f8f6;color:#183a34}.workspace-nav{display:flex;align-items:center;gap:25px;min-height:70px;padding:0 clamp(18px,6vw,82px);background:#fff;border-bottom:1px solid #e1e9e4}.workspace-nav>a:not(.brand){font-size:12px;color:#58736a}.draft-hint{font-size:12px;color:#71857b}.brand{display:flex;align-items:center;gap:10px;margin-right:auto;text-decoration:none;color:inherit}.brand>span:last-child{display:grid;gap:2px}.brand strong{font-size:15px}.brand small{font-size:10px;color:#778c83}.mark{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:#137b65;color:#fff}.workspace-heading{display:flex;justify-content:space-between;align-items:center;padding:45px clamp(20px,8vw,116px) 28px}.eyebrow{margin:0;color:#548471;font-size:11px;letter-spacing:.08em}.workspace-heading h1{font-size:30px;margin:9px 0}.workspace-heading p:last-child{font-size:13px;color:#72877d}.local-chip{border-radius:99px;padding:8px 12px;background:#e4f1e9;color:#38745c;font-size:11px}.context{margin:0 clamp(20px,8vw,116px) 18px;padding:21px 24px 0;border:1px solid #dce7e1;border-radius:13px;background:#fff}.context>label{display:grid;gap:7px;max-width:520px;color:#5e796e;font-size:12px}.context input{height:38px;padding:0 10px;border:1px solid #d5e1db;border-radius:7px;font:inherit;color:#183a34}.context dl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px;margin:20px 0}.context dl div{min-width:0}.context dt{color:#82938b;font-size:10px}.context dd{margin:5px 0 0;font-size:12px;overflow-wrap:anywhere}.entry-tabs{display:flex;gap:24px;border-top:1px solid #e8eee9}.entry-tabs a{padding:15px 2px 13px;color:#6b8177;font-size:12px;text-decoration:none;border-bottom:2px solid transparent}.entry-tabs a.active{color:#16745c;border-color:#16745c}.entry-tabs small{margin-left:6px;font-size:10px;opacity:.7}.pending-note{margin:0;padding:12px 0 16px;color:#876d36;font-size:12px}.research-workspace :deep(.sandbox-page){max-width:none;margin:0 clamp(20px,8vw,116px);padding:26px 24px 56px;border:1px solid #dce7e1;border-radius:13px;background:#fff}.research-workspace :deep(.sandbox-page>header){display:none}.research-workspace :deep(.sandbox-page>.intro){margin-bottom:4px}.research-workspace :deep(.sandbox-page .intro .eyebrow){display:none}.research-workspace :deep(.sandbox-page>.intro h1){font-size:19px;color:#234d40}.research-workspace :deep(.sandbox-page>.intro p){font-size:12px}.research-workspace :deep(.sandbox-page section){padding:21px 0}.research-workspace :deep(.sandbox-page>section:last-child){border:0}@media(max-width:700px){.workspace-nav{flex-wrap:wrap;padding:12px 17px;gap:13px}.workspace-nav .brand{flex-basis:100%}.workspace-heading{align-items:start;gap:12px;padding:32px 20px 20px}.workspace-heading h1{font-size:25px}.context{margin:0 14px 14px;padding:17px 15px 0}.context dl{grid-template-columns:repeat(2,minmax(0,1fr))}.entry-tabs{gap:12px;overflow:auto}.entry-tabs a{white-space:nowrap}.research-workspace :deep(.sandbox-page){margin:0 14px;padding:20px 15px}}
</style>
