# 第 6 阶段 · 数据分析 数据形状提案（F 交付，待确认后实现）

对应验收标准（`docs/mvp-scope-and-status.md` 第 3 节）：

> 原件/字段/质检/处理口径/统计结果可追溯；采用输入与运行分开；计算完成与保存分开；确认后固定用于报告的结果。

这句话里藏了四个「分开」，每一个都是把原型那种「一页填完就是完成」拆成可判定状态的地方。本提案先把这四层拆清，再谈界面。

---

## 1. 这一阶段真正难在哪

原型（`scdc/front` 的四个组件）是一份扁平对象：`FieldCheck{ mappings[] }`、`DataQuality{ rows[], issues[] }`、`ChangeImpact{ items[] }`、`DataAnalysis{ 表/图 }`。四个组件各自独立，谁也不知道上游有没有变。

问题出在最后一句「确认后固定用于报告的结果」。扁平的 `DataAnalysis` 里只要有一个 `confirmed: true` 布尔值，就有把「输入已经换了」的老结果继续拿去写报告的后门——而且看不出来。

所以本阶段的骨架是：

```
输入快照（指纹）  ←  字段核对 + 质检口径 + 过滤条件 + 数据集指纹
      │
      ├─ 运行记录（谁跑的、什么时候、成功还是失败）  ← BB 侧产生，本阶段只读
      │
      └─ 结果（表 / 图 / 原始行引用）
                │
                └─ 采用：记录「这次运行 + 这份输入」的联合指纹
```

**结果是否可用于报告 = 推导出来的**，不落盘布尔。判定条件只有一条：`采用时的联合指纹 === 当前输入的联合指纹`。任何一处输入变了（删一行、改一次字段映射、换一次过滤条件），「已可用于报告」自动失效。

---

## 2. 四个组件与它们各管什么

四个都挂在同一个宿主里，按顺序改同一份记录（和阶段 3 的十个小节同构）。

| # | 组件 | 一句话 | 输入 | 产出 |
| --- | --- | --- | --- | --- |
| 1 | `FieldCheckEditor.vue` | 问卷的每一题，落到数据里的哪一列 | 阶段 4 题目 + 数据集列名 | `fields[]` |
| 2 | `DataQualityEditor.vue` | 哪些行/值有问题，每一处怎么处理 | 上面的 `fields[]` + 数据集概览 | `quality{ issues[], rule }` |
| 3 | `ChangeImpactEditor.vue` | 改口径/剔行会让哪些结论变 | 上面两块 + 上一版结果 | `impacts[]` |
| 4 | `AnalysisResultEditor.vue` | 跑出了什么，能不能下钻到原始行 | 运行记录 + 结果表 | `result` + `adoption` |

四块共用的上游：**阶段 3 的变量清单**（`measures[]`，含 `level`）与**阶段 4 的题目清单**（`questions[]`，含 `type`、`measureId`）。

---

## 3. 数据结构

```ts
// f-analysis-contract.ts（F 侧新增，不进 P 的 research-contracts.ts）

/** 数据集概览：由 BB 的解析结果提供，F 侧不解析 xlsx。 */
export interface AnalysisDataset {
  /** 数据集指纹：文件哈希 + 解析器版本，任一变了就不能复用旧结果 */
  signature: string
  /** 原始文件名，只用于显示 */
  fileName: string
  rowCount: number
  /** 列名清单；顺序即原始列顺序 */
  columns: DatasetColumn[]
  /** 前若干行样例，供映射时对照（只读） */
  sampleRows: Record<string, string | number | null>[]
}

export interface DatasetColumn {
  name: string
  /** 解析器推断的类型；只是建议，最终以字段核对为准 */
  guess: 'text' | 'number' | 'date' | 'empty'
}

/** 字段核对：一题一列，且必须说明编码与缺失口径 */
export interface FieldMapping {
  id: string
  /** 阶段 4 的题目 id；'' = 该列不对应任何题（如受访者编号） */
  questionId: string
  /** 阶段 3 的变量 id；'' = 该列不进分析 */
  measureId: string
  /** 数据集里的列名 */
  column: string
  /** 进分析还是只做识别（编号、时间戳通常不进分析） */
  role: 'measure' | 'identifier' | 'ignore'
  /** 编码：选项/取值 → 数字代码；空表示原件已是编码值 */
  coding: string
  /** 有效值范围（如「1-5 的整数」），留空视为未核 */
  validRange: string
  /** 缺失值口径：空单元格 / 99 / 拒答编码 */
  missingRule: string
}

/** 质检问题：一处问题一条，必须给出处理动作 */
export interface QualityIssue {
  id: string
  kind: 'missing' | 'outlier' | 'duplicate' | 'ineligible' | 'mismatch'
  /** 涉及字段（列名）；'' = 整行层面 */
  column: string
  /** 受影响行数（用户填真实值，不自动统计） */
  affectedRows: number | null
  /** 具体表现 */
  detail: string
  /** 处理动作 */
  action: 'keep' | 'exclude' | 'impute' | 'recode' | 'undecided'
  /** action !== 'keep' && !== 'undecided' 时必填：为什么这么处理 */
  actionNote: string
  /** 处理后是否已复核 */
  reviewed: boolean
}

/** 处理影响说明：一条「我改了什么，会让什么变」 */
export interface ImpactItem {
  id: string
  /** 影响的结论/表格 */
  target: string
  severity: 'hint' | 'warning' | 'critical'
  /** 变更内容 */
  change: string
  /** 影响判断 */
  effect: string
  resolved: boolean
}

/** 运行记录：BB 侧产生，本阶段只读 */
export interface AnalysisRun {
  runId: string
  /** 什么时候跑的（ISO） */
  startedAt: string
  status: 'succeeded' | 'failed' | 'running'
  /** 失败原因；status === 'failed' 时必填 */
  failureReason: string
  /** 运行时用的输入指纹，必须与当前输入指纹一致才算这个结果有效 */
  inputSignature: string
}

/** 结果：只存「看到了什么」，不存脚本 */
export interface AnalysisResult {
  /** 表头 + 行；数值单独一列，避免字符串排序 */
  table: { headers: string[]; rows: (string | number | null)[][] }
  /** 表格对应的原始行 id，用于下钻 */
  sourceRowIds: string[]
  /** 结论一句话（可空，写了才能进报告） */
  finding: string
}

export interface AnalysisDraft {
  /** 数据集为什么是这一份 */
  datasetNote: string
  fields: FieldMapping[]
  quality: { issues: QualityIssue[]; rule: string }
  impacts: ImpactItem[]
  /** 只读透传；本组件不改它 */
  run: AnalysisRun | null
  result: AnalysisResult | null
  /** 采用：记录联合指纹 */
  adoption: { signature: string; runId: string; note: string }
  otherNote: string
  unknowns: ContestUnknown[]
}
```

---

## 4. 三个推导状态，都不落盘

| 状态 | 怎么算出来的 |
| --- | --- |
| 结果可用（`resultState`） | `run.status === 'succeeded'` 且 `run.inputSignature === 当前输入指纹`。不一致就显示「输入已改，需要重跑」，结果留在页面上但标为不可引用 |
| 可用于报告（`reportState`） | `adoption.signature === 当前输入指纹` 且 `adoption.runId === run.runId`。任一不等就退回「需重新采用」 |
| 质检是否闭环（`qualityState`） | 每条 `action !== 'keep'` 的问题都要有 `actionNote`；`action === 'undecided'` 一条都不许留 |

**输入指纹**覆盖：`dataset.signature`、所有 `fields[]` 的 `column/role/coding/validRange/missingRule`、`quality.issues[]` 的 `action`。刻意**不含** `detail`、`actionNote`、`reviewed`——补一句说明不该让已跑出的结果失效。

这和阶段 4 的问卷指纹是同一套做法（FNV-1a 32 位、8 位十六进制）。

---

## 5. 三条硬规则（比字段更关键）

1. **组件不跑统计、不读文件。** 统计由 BB 执行，组件只接收 `dataset` / `run` / `result` 三个只读 props。想跑就发 `run-request`，外壳决定是否真的触发。
2. **计算完成 ≠ 保存完成。** 页面同时显示两行：`运行状态：成功 / 输入指纹 xxxx` 与 `保存状态：已存本机 / 未保存`。任一行失败都要说清哪一行失败。
3. **采用输入与运行分开。** 「采用」记的是 `(inputSignature, runId)` 这一对，不是「这张表我点了确定」。

---

## 6. 与旧 React 版的差异

| 项 | 旧版 | 本版 | 为什么改 |
| --- | --- | --- | --- |
| 字段核对 | 只有 `questionId + 字段名 + 类型` | 加 `role` / `coding` / `validRange` / `missingRule` | 「字段可追溯」要求能回答「这个 99 是拒答还是真的 99」 |
| 质检 | `resolved` 布尔 | `action` 五种 + 必须写处理理由 | 布尔 `resolved` 分不清「保留」和「剔除」，剔除的理由会永久丢失 |
| 影响说明 | 独立的 `ChangeImpact` 文档 | 挂在同一份分析草稿里 | 旧版与结果脱钩，改了口径不会反映到结果状态上 |
| 结果 | `confirmed` 布尔 | 联合指纹 | 见第 1 节 |
| 数据集 | 隐含在 `rows[]` 里 | 显式 `AnalysisDataset{signature}` | 结果必须能指回**哪一份原件** |

---

## 7. 需要确认 4 点

| # | 问题 | 建议 |
| --- | --- | --- |
| 1 | 四个组件同页串行改一份草稿（像阶段 3 十个区块），而不是四个独立页面/四个独立任务？ | 是，一次数据分析就是一条链，分开会让「影响说明」失去对象 |
| 2 | 数据集概览（列名、行数、样例行）由 BB 提供，F 侧不解析文件？ | 是，解析是 BB 职责，F 侧重复实现会出两份真相 |
| 3 | 质检问题里的「受影响行数」由用户手填，不自动统计？ | 是，与阶段 4 试填同一条纪律：不生成任何可能被当成证据的自动数字 |
| 4 | 结果表格首版只做只读展示 + 下钻原始行，不做单元格编辑？ | 是，结果要改只能重跑，不给手改结果留口子 |

回「1-4 都同意」我就产出 `f-analysis-contract.ts` + 四个组件 + 交接文档；要改哪条说编号。

---

## 8. 写代码前需要向 BB 确认的一件事

`AnalysisRun.inputSignature` 由谁算：**建议由 F 侧算出并作为运行请求的一部分传给 BB**，BB 原样回写。理由是口径只应有一处定义，若 BB 自己再算一遍，算法一漂移，所有「已可用于报告」会集体失效——这正是阶段 4 里明确禁止后端重算指纹的同一条理由。
