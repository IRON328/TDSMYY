# 第 2、3 阶段接入真实工作台（F 交付）

日期：2026-10-27

## 一句话

选题分析（第 2 阶段）和研究方案（第 3 阶段）现在挂在 `/research/work?mode=full` 的阶段导航里，可以直接点开使用，编辑自动存本机，刷新恢复。

## 怎么用

1. 起开发服务：`pnpm dev`（端口 5181）
2. 打开 `http://127.0.0.1:5181/#/research/work?mode=full`
   - 注意是 **hash 路由**，`#` 不能省，写成 `/research/work?mode=full` 会落到首页
3. 左侧阶段导航点「2 选题分析」或「3 研究方案」
4. 顶部信息条会显示上游已确认信息；底部显示本机保存时间与修订号

## 新增文件

| 文件 | 作用 |
| --- | --- |
| `src/views/research/TopicAnalysisHost.vue` | 第 2 阶段宿主：上游摘要、陈旧事件拒绝、自动保存、清空 |
| `src/views/research/ResearchPlanHost.vue` | 第 3 阶段宿主：同时读赛事理解与已采用方向 |
| `src/utils/topicPlanDrafts.ts` | 两个阶段草稿的本机存储（独立 key，按 localTaskId 隔离） |

## 对 P 的唯一改动

`src/views/ResearchWorkspaceView.vue`，共 4 行（2 个 import + 2 行模板），未改动任何已有逻辑：

```diff
+import TopicAnalysisHost from '@/views/research/TopicAnalysisHost.vue'
+import ResearchPlanHost from '@/views/research/ResearchPlanHost.vue'

+<TopicAnalysisHost v-else-if="kind==='full-study' && task.viewedPhase===1" :key="task.localTaskId" :local-task-id="task.localTaskId" :competition="task.competition" @view-phase="viewStage" />
+<ResearchPlanHost v-else-if="kind==='full-study' && task.viewedPhase===2" :key="task.localTaskId" :local-task-id="task.localTaskId" :competition="task.competition" @view-phase="viewStage" />
```

`git diff --stat` 结果为 `1 file changed, 4 insertions(+)`。

## 草稿为什么没进 LocalResearchTask

`cleanTask` 是白名单：保存时只保留它认识的字段，未登记字段会被丢弃；而改错它会让已有草稿**整份加载失败**（`parseRegistry` 直接抛错）。所以这一版把 `topic` / `plan` 存在独立 key：

```
scdc-f-topic-plan-v1:<localTaskId>
```

结构是 `{ schemaVersion, revision, updatedAt, topic, plan }`，读取失败退化为空记录，不抛错。多任务之间已验证隔离。

## 验证记录（真实页面，Edge CDP 驱动）

| # | 项目 | 结果 |
| --- | --- | --- |
| 1 | 阶段导航 7 项、点第 2 项后高亮 | 通过 |
| 2 | 空草稿徽标「待补充 3 项」，缺项为无方向 / 未采用 / 第一阶段阻塞未知项 | 通过 |
| 3 | 上游摘要显示背景、要求 2 条、来源 1 条、未知项 1 条（影响决定 1 条） | 通过 |
| 4 | 新增方向并填名称 / 研究问题 / 抽样框 / 可行性 / 预期价值，revision 2→3 | 通过 |
| 5 | 点「采用」后 selectedDirectionId 落盘，revision 4，缺项更新为 4 项 | 通过 |
| 6 | 刷新后方向、名称、问题、已采用标记、修订号全部恢复 | 通过 |
| 7 | 第 3 阶段上游显示「采用方向：图书馆自习座位的时段缺口」，未采用提示消失 | 通过 |
| 8 | 补「可行性依据」「选择理由」后缺项 4→3 | 通过 |
| 9 | 「记为当前方向」写入 plan.directionId，revision 6，方案缺项 11→10，无漂移误报 | 通过 |
| 10 | 多任务隔离：新建任务 0 个方向；切回原任务恢复 1 个方向 | 通过 |
| 11 | 清空本阶段草稿后 revision 7、方向 0、提示正确，第 3 阶段如实提示「尚未采用任何方向」 | 通过 |
| 12 | 820px 窄屏 scrollWidth 812 < 820，无横向溢出，字段单列 | 通过 |
| 13 | 采用计数文案：未采用显示「尚未采用」，采用后「已采用 1 个」，取消后回到「尚未采用」 | 通过 |

第 13 项是这轮跑页面才发现的缺陷：原文案把「采用 1 个」写死了，未采用时也这么显示，已改为跟随实际状态。

## 未验项（写清楚，别当成已通过）

1. **只读态**：工作台没有传 `readOnly` 的入口，界面无法切只读。组件侧的只读已在此前自测宿主验过，宿主这一层没验。
2. **正式保存**：`save-request` 仍只显示「正式项目、候选保存和阶段确认接口尚未接入」，没有真实后端。
3. **陈旧事件拒绝**：代码路径已实现（localTaskId + revision 双校验），但真实 UI 上构造不出同 tick 冲突，只在代码层面确认过。
4. **第 4 阶段问卷**：本轮只接了第 2、3 阶段，问卷仍是「业务功能待接入」占位。

## 接正式结构时要做什么

1. `LocalResearchTask` 加 `topic` / `plan`，`cleanTask` 用默认值兜底而不是拒绝：
   ```ts
   const topic = v?.topic === undefined ? emptyTopicDraft() : normalizeTopicDraft(v.topic)
   if (v.topic !== undefined && !topic) return null
   ```
2. 两个宿主的 `persist()` 改成 emit 给 store，删掉 `utils/topicPlanDrafts.ts` 的读写。
3. 后端接上后把 `save-request` 的反馈换成真实结果（`BUSINESS_API_STATUS` 换成真实 gateway）。
4. 三个宿主的 glob 问题一并解决：`CompetitionUnderstandingHost.vue` 用的是精确路径 `ResearchDesignEditor.vue`，新增宿主是直接 import，不受影响；但阶段 4 若沿用 glob 写法会再踩一次。
