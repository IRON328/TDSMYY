# 拒绝脑补：后续产品开发

这是后续代码与决策的唯一主仓库。当前提交仅建立管理基线，尚未迁移 UI、接入后端或开始正式功能开发。
现有成果保存在独立私有仓库 [jujue-naobu-prototype-archive](https://github.com/Mgy-d/jujue-naobu-prototype-archive)，基线标签为 `prototype-baseline-2026-10-19`。

## 已明确与待明确

整合意向是保留市调业务流程，参考数模演易的站点外壳及 Vue 工程分层。
工作台外观迁移范围、详细迁移设计和后端方案仍待讨论；Java / AgentScope + Python 未定。
本仓库暂不复制整个 D:/scdc-develop，不把它的数学建模流程或原机器配置当作市调产品实现。

## 日常开发

1. 从最新 `main` 新建短期 `feat/<主题>`、`fix/<问题>` 或 `docs/<主题>` 分支。
2. 每次提交只处理一个可说明的改动，提交前检查 `git diff --cached`。
3. 推送分支并提 PR，说明问题、结果、验证和限制。
4. 执行与改动相关的检查；检查通过并完成审阅后合并到 `main`。
5. 可交付版本打标签；缺陷修复走新提交或 `git revert`，不改写共享历史。

当前无需额外长期 develop 分支。main 稳定、功能分支开发、PR 合并的规则先采用协作约定；
是否有 GitHub 服务端分支保护必须另行查询设置，不因本说明存在就宣称已强制启用。

## 工作区与数据

GitHub 保存源码和决策历史，本地或云工作区负责编辑、构建和运行。
仅提交源码、锁文件、必要文档、许可资料和明确标注的匿名/模拟测试样例。
真实答卷、个人浏览器数据、账号、密钥、.env、数据库、缓存、node_modules 和 dist 不入库。
部署配置中的秘密通过环境或密钥服务提供；需要示例时使用占位符。

## 检查

`python scripts/check_repository.py` 核对已跟踪文件中的禁入路径和高置信度凭据模式。
此检查不能替代人工审阅或完整秘密扫描；代码加入后再补对应构建、类型和业务测试。
更多约定见 CONTRIBUTING.md、AGENTS.md 和 docs/decisions/0001-repository-boundaries.md。
