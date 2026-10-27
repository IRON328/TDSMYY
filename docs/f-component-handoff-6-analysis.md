# 第 6 阶段 · 数据分析 交接说明（F 交付）

对应验收标准（`docs/mvp-scope-and-status.md` 第 3 节）：

> 原件/字段/质检/处理口径/统计结果可追溯；采用输入与运行分开；计算完成与保存分开；确认后固定用于报告的结果。

数据形状提案见 `docs/f-proposal-6-analysis.md`（已确认 4 点）。本文只讲**怎么用、怎么接、验证了什么、哪里和提案不一样**。

---

## 1. 交付清单

| 文件 | 作用 | 行数 |
| --- | --- | --- |
| `src/components/research/f-analysis-contract.ts` | 类型、清洗、输入指纹、三个推导状态、四组检查、文案 | ~960 |
| `src/components/research/FieldCheckEditor.vue` | 区块 1 字段核对（题目→变量→数据列，编码/范围/缺失口径） | ~700 |
| `src/components/research/DataQualityEditor.vue` | 区块 2 质检（处理口径 + 问题清单 + 五种处理动作） | ~730 |
| `src/components/research/ChangeImpactEditor.vue` | 区块 3 处理影响（改了什么 → 哪张表会变） | ~640 |
| `src/components/research/AnalysisResultEditor.vue` | 区块 4 结果与采用（运行记录、结果表下钻、联合指纹采用） | ~900 |
| `src/views/research/DataAnalysisHost.vue` | 宿主：四个区块串一页 + 载荷登记 + 运行/保存两行状态 | ~700 |
| `src/utils/topicPlanDrafts.ts` | 加 `analysis` 与 `analysisPayload` 两个字段（缺失补默认值） | +56 / -4 |
| `src/views/ResearchWorkspaceView.vue` | 接入工作台第 6 阶段 | +4 行 |

对 P 的已跟踪文件仍然只有两处极小改动，且都是加行：`topicPlanDrafts.ts` 加两个字段的读写，`ResearchWorkspaceView.vue` 加 1 个 import + 1 行 `v-else-if`。

打开方式：

```bash
cd D:\tipdmsmyy\scdc-develop
pnpm dev
# http://127.0.0.1:5181/#/research/work?mode=full  → 左侧第 6 项「数据分析」
```

---

## 2. 组件契约

四个组件**同一份 props 接口**，各自只改自己那一段草稿：

```ts
interface AnalysisEditorProps {
  context: DraftContext            // { localTaskId, revision }
  draft: AnalysisDraft             // 四个区块共用的同一份草稿
  upstream: { plan, questionnaire } // 第 3 阶段变量 + 第 4 阶段题目，只读
  dataset: AnalysisDataset | null  // 数据侧产物，只读
  run: AnalysisRun | null          // 统计侧产物，只读
  result: AnalysisResult | null    // 统计侧产物，只读
  readOnly: boolean
  issues: string[]                 // 外壳的缺项清单（展示用）
}
// emits: update-draft: { context, draft }  —— 完整覆盖语义
```

| 组件 | 只改这些字段 |
| --- | --- |
| `FieldCheckEditor` | `draft.fields`、`draft.datasetNote` |
| `DataQualityEditor` | `draft.quality` |
| `ChangeImpactEditor` | `draft.impacts` |
| `AnalysisResultEditor` | `draft.resultNote`、`draft.adoption`、`draft.otherNote`、`draft.unknowns` |

组件内不 fetch、不读写 localStorage、不碰 store、**不跑统计、不解析文件**。

---

## 3. 三个推导状态（都不落盘）

| 函数 | 返回 | 判定 |
| --- | --- | --- |
| `resultState()` | `no-dataset / not-run / running / failed / stale / no-result / ready` | 运行状态 + `run.inputSignature === analysisInputSignature(draft, dataset)` |
| `reportState()` | `blocked / none / ready / drifted` | 采用时的 `(signature, runId)` 必须同时等于现在的这一对 |
| `qualityState()` | `empty / open / closed` | 不留 `undecided`，非「保留」必须有 `actionNote` |

`analysisInputSignature()` 覆盖：

```
dataset.signature
+ fields[] 的 column / role / measureId / coding / validRange / missingRule（按列名排序）
+ quality.issues[] 中 action 为 exclude / impute / recode 的 (column, kind, action)（排序）
```

**刻意不含**：`detail`、`actionNote`、`reviewed`、`affectedRows`、`questionId`、`datasetNote`、`resultNote`、`action` 为 `keep`/`undecided` 的质检项。

后果是符合直觉的（已实测）：补一句处理说明、勾一下「已复核」→ 已采用的报告结果**不失效**；改一次编码口径 → 立刻退回「需重跑」。改回原文则自动恢复，不用重新采用。

---

## 4. 接线步骤（给 P）

1. **`LocalResearchTask` 加两个字段**：`analysis: AnalysisDraft`、`analysisPayload: AnalysisPayload`。

   `cleanTask` 必须写成「缺失补默认值」，**不能**把 `normalizeAnalysisDraft` 当准入：

   ```ts
   const analysis = v?.analysis === undefined ? emptyAnalysisDraft() : normalizeAnalysisDraft(v.analysis)
   if (!analysis) return null
   const analysisPayload = normalizeAnalysisPayload(v?.analysisPayload)  // 自身已兜底，不返回 null
   ```

   写成拒绝的话，10-27 之前存过的旧任务会整份打不开。这条与第 4 阶段的 `questionnaire` 是同一条纪律，已实测（见验证第 30 项）。

2. **三个只读产物从哪来**：`dataset` 来自数据侧解析结果，`run`/`result` 来自统计侧执行记录。三者都不是编辑器可写的内容。

3. **输入指纹只算一处**：`analysisInputSignature()`。BB 登记运行时应把 F 算出的值原样存进 `run.inputSignature`，不要服务端重算（与第 4 阶段禁止重算问卷指纹同一条理由）。

4. **界面挂载点**：第 6 阶段一个宿主即可（`DataAnalysisHost`），四个组件由它串起来。宿主这一层已经复刻了 `localTaskId + revision` 的陈旧事件拒绝，可以直接换成 store。

5. **宿主里的「载荷登记」面板是临时方案**：`DataAnalysisHost` 自带一个 `<details>`，允许手填数据集概览、登记一次运行、粘贴结果表。BB 接口到位后删掉这块，把 `dataset/run/result` 改成从接口取。

---

## 5. 与提案不一样的地方（4 处，都是收紧）

| # | 提案 | 实现 | 为什么 |
| --- | --- | --- | --- |
| 1 | `run`、`result` 放在 `AnalysisDraft` 里（只读透传） | 改成 **props**，草稿里只留 `adoption.{signature,runId,note}` 与 `resultNote` | 结果表一旦进草稿，就有「手改 localStorage 再声称是跑出来的」这条路径。落盘草稿里根本不存在结果表，就没有这个入口 |
| 2 | `AnalysisResult.sourceRowIds: string[]`（整表一个列表） | `rowSources: string[][]`，与结果行等长 | 扁平列表只能给出全表一堆 id，等于没有下钻。现在每行能定位到自己那几条原始记录 |
| 3 | 输入指纹含 `column/role/coding/validRange/missingRule` | 再加 `measureId` | 换个变量就是换个统计口径，这一项不进指纹会漏判 |
| 4 | 提案未定「运行成功但没结果表」 | 新增 `no-result` 状态与文案「缺结果表」 | 否则页面会显示「结果可用」却没有表，自相矛盾 |

另外：`affectedRows` 被**排除**在指纹外。它是用户登记的证据，改证据不该让已经跑出来的结果作废；真正影响数字的是 `action`。

---

## 6. 验证记录（真实页面 + Edge CDP，34 项全过）

环境：`pnpm dev`（5181）+ 无头 Edge + CDP；种子数据为 2 个问卷变量、2 道题。

### 结构与上游

| # | 操作 | 结果 |
| --- | --- | --- |
| 1 | 打开第 6 阶段 | 四个区块全部渲染；上游读到「变量 2 / 题目 2」，数据集与运行显示「未登记」 |
| 2 | 初始缺项 | 5 条，且每条都能靠编辑消除（无数据集、无映射、2 个变量未落列、无质检口径） |
| 3 | 缺项总览 | 页面顶部随编辑实时更新；归零后换成「本机完整」 |

### 字段核对

| # | 操作 | 结果 |
| --- | --- | --- |
| 4 | 手填数据集（文件名/312 行/4 列） | 数据源显示文件名、行数、列数、指纹 `1c95b264`，列名标签带推断类型 |
| 5 | 点「按问卷题目补 2 行」 | 生成 2 条映射，题目与变量已预填，列名/编码留空 |
| 6 | 逐条填 7 个字段（题目/变量/列/用途/范围/缺失/编码） | 徽标 `变量已映射 2 / 2`；下方落列清单显示 `每周到馆次数 → q1`、`找座困难程度 → q2` |
| 7 | 同一 tick 连改 6 个字段 | 修订号只 +1（合并提交生效） |
| 8 | 映射行补完后再看按钮 | 「按问卷题目补」按钮自动消失（不再显示「补 0 行」） |

### 质检与影响

| # | 操作 | 结果 |
| --- | --- | --- |
| 9 | 写处理口径 | 对应缺项消失 |
| 10 | 点「记录一处问题」 | 卡片出现，徽标「待处理 1 处」 |
| 11 | 填类型/字段/行数/表现/动作=剔除/依据 | 徽标变「质检闭环 · 1 处」 |
| 12 | 未勾「已复核」 | 只出一条软提示，不进缺项（勾选后可消除） |
| 13 | 影响区顶部 | 自动列出「已剔除（q2）」——由质检动作派生，不用手写 |
| 14 | 记一条影响，严重程度=影响结论 | 徽标「关键影响待处理 1」，缺项 +1 |
| 15 | 勾「已处理完」 | 缺项消失，徽标变「已记录 1 条」 |

### 运行、结果与采用

| # | 操作 | 结果 |
| --- | --- | --- |
| 16 | 未登记运行 | 结果徽标「尚未运行」；采用按钮禁用，并写明原因 |
| 17 | 登记一次运行 | 运行记录显示「成功 / runId / 时间」；指纹对比行显示 `4cc4b4a1 → 4cc4b4a1 一致` |
| 18 | 有运行无结果表 | 徽标「缺结果表」+ 缺项说明，不再误报「结果可用」 |
| 19 | 粘贴结果表（制表符） | 表头 4 列、3 行；数值右对齐、文本左对齐；数字单元格转成 number |
| 20 | 点第 3 行「5 条原始行」 | 展开该行对应的 5 个原始记录 id；「收起」可收回 |
| 21 | 没写结论就点采用 | 按钮禁用，提示「先写结论一句话，再采用」 |
| 22 | 写结论 + 写理由 + 采用 | 徽标「已可用于报告」；缺项归零 → 「本机完整」 |
| 23 | 已采用后再看按钮 | 变「当前输入与运行已采用」并禁用，不重复采用 |
| 24 | 只改质检说明、勾「已复核」 | **采用不失效**（这两项不进指纹） |
| 25 | 改一条编码口径 | 「输入已改，需重跑」+「采用已失效」，缺项只报一条（不再三重复述） |
| 26 | 改回原文 | 自动恢复「结果可用 / 已可用于报告」，不用重新采用 |
| 27 | 刷新页面 | 数据集、映射、质检、影响、运行、结果、采用全部恢复；页脚「已存本机 · 10:43:40」 |
| 28 | 同输入再登记一次运行 | 结果仍「可用」，但采用「已失效」（runId 变了）——联合指纹按设计工作 |

### 兼容、清空、只读、窄屏

| # | 操作 | 结果 |
| --- | --- | --- |
| 29 | 未知项新增/填写/标记阻碍/取消/删除 | 标记阻碍时进缺项，取消即消失；删除后列表归零 |
| 30 | 从落盘记录里删掉 `analysis`、`analysisPayload` | 页面正常打开；方案与问卷原样保留，第 6 阶段为空——旧任务不会被整份作废 |
| 31 | 点「清空本阶段草稿」 | 只清第 6 阶段（映射/质检/影响/采用/数据集/运行/结果），前四阶段保留 |
| 32 | 只读态（临时宿主挂 4 个组件） | 18 个输入框全部只读、11 个下拉全部禁用、2 个复选禁用、10 个按钮禁用 |
| 33 | 只读态伪造输入 | 用原生 setter + `dispatchEvent` 强写 → **0 次 emit**（拦截在 `commit` 里，不只靠 DOM 属性）；下钻按钮仍可点（只读不等于看不到原件） |
| 34 | 1280 / 820 宽度 | 均无横向溢出；820 下三列字段变单列、结果表在容器内可横向滚动 |

只读态还修了一处：原先只读会把状态徽标整个换成「只读」，复核的人反而看不到「已可用于报告」。现在保留全部状态徽标，「只读」是加在最后的一个。

---

## 7. 没验的、需要别人配合的

1. **「本机保存 → 切任务 → 刷新恢复」全链路**仍依赖 P 的 `LocalResearchTask` 加字段。F 侧只能验到「同一任务内刷新恢复」。
2. **真实数据集与真实运行**：本阶段所有数据都是手工登记的。BB 的解析结果、执行记录一到位，要重跑第 4、17、19 项。
3. **`sampleRows` 样例行**：类型与渲染都已支持，但宿主的手填面板没有提供入口（只填列名）。BB 传进来就能显示，未做真实联调。
4. **结果表列宽策略**：现在数值列右对齐、文本列左对齐、单元格不换行。列特别多时靠容器横向滚动，未做列宽自适应。
5. **多选/矩阵类结果表**（一行多列展开）未特殊处理，按普通表格渲染。

---

## 8. 需要 BB 确认的一件事（与提案 §8 相同）

`AnalysisRun.inputSignature` 由 **F 侧算、BB 原样存**。理由是口径只能有一处定义：BB 自己再算一遍，算法一漂移，所有「已可用于报告」会集体失效。

需要 BB 提供的字段（`AnalysisDataset` / `AnalysisRun` / `AnalysisResult`）已经写在 `f-analysis-contract.ts` 里，`normalizeDataset` / `normalizeRun` / `normalizeResult` 就是给他们的校验参照。**不要**让后端存 `resultState` / `reportState` / `qualityState`——这三个都是算出来的。
