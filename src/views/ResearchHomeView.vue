<template>
  <main class="research-home">
    <header class="topbar">
      <RouterLink class="brand" to="/"><span class="mark" aria-hidden="true">调</span><span><strong>市调演真</strong><small>市场调查研究工作台</small></span></RouterLink>
      <nav aria-label="主导航"><RouterLink to="/">首页</RouterLink><RouterLink to="/research/work">研究工作台</RouterLink><RouterLink to="/research/intake">本机草稿</RouterLink></nav>
      <div class="account"><span v-if="userStore.isLogged">{{ userStore.displayName }}</span><RouterLink v-else to="/login">登录 / 注册</RouterLink><button v-if="userStore.isLogged" @click="userStore.logout()">退出</button></div>
    </header>
    <section class="hero">
      <div><p class="eyebrow">面向市场调查的研究协作</p><h1>从调查材料，走向<br><em>有据可查的结论</em></h1><p class="lead">围绕研究问题整理材料、核对问卷、分析已有数据。每一步呈现依据与状态，结论由研究者审阅确认。</p><RouterLink class="primary" to="/research/work">开始／继续完整研究 <span aria-hidden="true">→</span></RouterLink></div>
      <aside class="hero-note"><span class="note-index">研究流程</span><ol><li>明确调查问题与对象</li><li>整理材料并核对问卷</li><li>分析数据，记录方法与限制</li><li>审阅发现，保存研究成果</li></ol><small>完整研究从赛事理解开始；已有问卷与已有答卷可独立进入。</small></aside>
    </section>
    <section class="entry-section">
      <div class="section-heading"><div><p class="eyebrow">选择你的起点</p><h2>你现在要推进哪一步？</h2></div><span>完整研究路径逐步开放</span></div>
      <div class="entries">
        <RouterLink class="entry pending" to="/research/work?mode=full">
          <span class="entry-number">01</span><h3>完整研究</h3><p>从研究问题、调查材料到分析与成果整理的完整路径。</p><span class="entry-state">阶段框架已接入 <b>进入赛事理解 →</b></span>
        </RouterLink>
        <RouterLink class="entry pending" to="/research/work?mode=questionnaire">
          <span class="entry-number">02</span><h3>已有问卷核对</h3><p>检查问卷结构、题项口径、跳转逻辑与数据质量。</p><span class="entry-state">流程待接入 <b>查看范围 →</b></span>
        </RouterLink>
        <RouterLink class="entry ready" to="/research/work?mode=analysis">
          <span class="entry-number">03</span><h3>已有答卷／数据分析</h3><p>上传 CSV 或 XLSX，查看字段与描述统计，或运行受限 Python。</p><span class="entry-state">首版可用 <b>进入工作台 →</b></span>
        </RouterLink>
      </div>
    </section>
    <footer><strong>市调演真</strong><span>市场调查研究工作台 · 结论保留依据，成果由人审阅</span><RouterLink to="/research/work">打开工作台</RouterLink></footer>
  </main>
</template>
<script setup lang="ts">
import { useUserStore } from '@/stores/user'
const userStore=useUserStore()
</script>
<style scoped>
.research-home{min-height:100vh;background:#f5f8f6;color:#183a34;font-family:inherit}.topbar{height:76px;padding:0 clamp(20px,6vw,88px);display:flex;align-items:center;gap:42px;border-bottom:1px solid #e3ebe7;background:#fff}.brand{display:flex;gap:11px;align-items:center;color:inherit;text-decoration:none}.brand>span:last-child{display:grid;gap:2px}.brand strong{font-size:16px}.brand small{font-size:11px;color:#758b83}.mark{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:#137b65;color:white;font-weight:750}.topbar nav{display:flex;gap:26px;flex:1}.topbar nav a,.account a{font-size:13px;color:#557168;text-decoration:none}.account{display:flex;align-items:center;gap:15px;font-size:13px}.account button{border:0;background:transparent;color:#557168;cursor:pointer}.hero{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(300px,.75fr);gap:9vw;align-items:center;padding:84px clamp(20px,10vw,148px) 91px;background:#eaf2ed}.eyebrow{text-transform:uppercase;letter-spacing:.09em;font-size:11px;font-weight:700;color:#538172}.hero h1{font-size:clamp(38px,5vw,62px);line-height:1.19;letter-spacing:-.045em;margin:17px 0}.hero h1 em{font-style:normal;color:#18785f}.lead{max-width:600px;color:#607970;line-height:1.9;font-size:15px;margin:0 0 25px}.primary{display:inline-flex;gap:32px;align-items:center;padding:13px 17px;border-radius:8px;background:#176f5b;color:#fff;text-decoration:none;font-weight:650;font-size:13px}.primary:hover{background:#105d4b}.hero-note{border-top:1px solid #b8cec3;padding-top:15px}.note-index{font-size:12px;color:#687f75;font-weight:650}.hero-note ol{padding-left:22px;margin:19px 0;color:#24483e}.hero-note li{padding:7px 0;font-size:13px}.hero-note small{color:#72877e;font-size:11px;line-height:1.7}.entry-section{padding:62px clamp(20px,10vw,148px) 78px}.section-heading{display:flex;justify-content:space-between;align-items:end;margin-bottom:22px}.section-heading h2{font-size:25px;margin:8px 0 0;letter-spacing:-.025em}.section-heading>span{font-size:12px;color:#81938b}.entries{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.entry{min-height:202px;padding:22px;border:1px solid #dce7e1;border-radius:13px;background:white;color:inherit;text-decoration:none;display:flex;flex-direction:column}.entry.ready{border-color:#96c6b1;background:#fbfffc}.entry-number{color:#45816b;font-size:11px;font-weight:700}.entry h3{font-size:18px;margin:22px 0 8px}.entry p{color:#70847b;font-size:12px;line-height:1.8;margin:0}.entry-state{display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:20px;color:#85958d;font-size:11px}.ready .entry-state{color:#297559}.entry-state b{font-weight:650}footer{display:flex;align-items:center;gap:18px;padding:22px clamp(20px,6vw,88px);border-top:1px solid #e0e9e4;background:#fff;font-size:11px;color:#71857b}footer strong{color:#245c4b;font-size:13px}footer a{margin-left:auto;color:#28735b}@media(max-width:760px){.topbar{height:auto;min-height:68px;padding:12px 18px;gap:18px;flex-wrap:wrap}.topbar nav{order:3;flex-basis:100%;gap:20px}.account{margin-left:auto}.hero{grid-template-columns:1fr;gap:38px;padding:56px 22px}.hero h1{font-size:40px}.entry-section{padding:46px 20px}.entries{grid-template-columns:1fr}.entry{min-height:170px}.section-heading{align-items:start;gap:12px;flex-direction:column}footer{flex-wrap:wrap}footer span{flex-basis:100%;order:3}}
</style>
