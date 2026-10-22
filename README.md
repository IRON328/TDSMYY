# 拒绝脑补前端

在数模演易 Vue/Vite 外壳上逐步接入市调功能。实际开发目录是 `D:/scdc-develop`，本目录直接由 Git 管理；GitHub 仓库为 `Mgy-d/jujue-naobu-workbench`。通过功能分支、提交和 PR 管理源码，无需另拷贝一份 frontend 快照。

## 本地启动

使用 Node.js 20+ 与 pnpm，按 `pnpm-lock.yaml` 安装依赖：

```sh
pnpm install --frozen-lockfile
pnpm dev
```

默认端口 5181。需要后端时，参照 `.env.example` 设置本机 `.env.local`；不要提交凭据。`VITE_AUTH_MODE=mock` 和 `VITE_SANDBOX_MODE=mock` 只供前端演示，不能证明真实接口可用。

## 当前接入范围

首页“已有数据分析”进入 `/#/research/intake`。当前支持任务名称、文件元数据选择、保存本机草稿和刷新恢复。不会读取文件正文、上传、解析统计或保存服务端项目成果；页面明确显示未接通。文件正文不在 localStorage 内，刷新后需重新选择。

复用入口：`src/api/http.ts` 负责请求和认证，`src/api/` 中保留流式事件、附件与产物读取。新切片入口是 `src/views/ResearchIntakeView.vue` 和 `src/utils/research-intake.js`。生成外壳与 legacy DOM 调用需保持契约。

## 检查

```sh
pnpm test
node scripts/check-contract.mjs
pnpm build
python scripts/check_repository.py
```

`scripts/port` 和 `scripts/sandbox` 中的历史探针依赖各自的浏览器、后端或本机样本，不是上述默认测试入口。真实附件、会话样本已忽略，缺样本的探针不能视作可复现验收。不要运行历史外壳生成器覆盖手工接线。

代码、锁文件、必要静态资源与迁移配置进入仓库；密钥、原始调查数据、运行态、截图、验证构建及本机配置不进入仓库。`public/cases` 为原外壳随包发布的静态示例资源，不能代表真实后端执行结果。

稳定版本规则见 `VERSIONS.md`。当前分支通过检查不等于真实业务闭环验收；真实项目/版本保存、解析执行服务和正式沙箱需后端交付后再接入。
