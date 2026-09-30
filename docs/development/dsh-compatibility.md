# DSH 兼容矩阵与升级风险

支持版本的唯一真源是 `src/compat/dsh-version.ts` 中的 `SUPPORTED_DSH_RELEASES`。下面的表记录验证证据，不扩大支持范围。peer 声明、README、开发 pin、安装树与 lockfile 由 `pnpm compat:check` 检查。

## 上游接口审查

审查来源为本地 `deepseek-harness` 仓库的发布标签，比较 `dsh-v0.1.7-rc.2` → `dsh-v0.2.0-rc.1` → `dsh-v0.2.0-rc.2`。本地标签与 npm `@deepseek-ai/dsh-settings` 已发布版本列表均确认区间内没有其他版本；“全部版本”指这三个已发布版本，不包括任意中间提交或未来版本。

| 接缝 | 上游变化及风险 | 插件处理与证据 |
| --- | --- | --- |
| 宿主加载 | `packages/boot/app-boot/src/plugin-compatibility.ts` 对 DSH peers 执行包含预发布版本的 semver 校验；原白名单不接受新版，阻止加载 | 新增两个精确版本到支持列表和所有 DSH peers；静态契约检查 |
| 主题覆盖 | `packages/client/ui-theme/src/client/index.ts` 的 `overrideTokens(source, { light, dark })`、覆盖次序与 disposer 契约未变 | 不增加版本分支；集成测试加载已安装的官方客户端发布 bundle，验证明暗/系统模式、预览优先级、取消预览与卸载清理 |
| 设置 Host | `packages/settings/settings/src` 在目标区间无实现变更，保持 profile Config + `settings.configure({ auto: false }, fiber)` | 保留 `src/compat/settings-host.ts` 的 register/configure 能力探测；旧版真实 provider 测试与新版 configure 契约测试 |
| 设置 Client | `packages/client/ui-settings/src` 与 `packages/api/settings-controller` 的目标区间设置协议实现未变 | 保留 settingsScope/configForms 两种通道；测试异步持久化、不可用状态、服务重供与插件重启 |
| 槽位、locale、connection、store | 目标区间公开调用契约未变；renderer 修复 factory ancestor memoization，未改注册接口 | 保持 `settings.general.item` 注册、store 投影与 locale 注入；各安装树类型检查与客户端测试 |
| 共享运行时 | 新目标版本使用 Cordis 4.0.4 / Schemastery 3.18.4；只升级 DSH 包可能产生不同的 fiber/schema 行为 | 每一版本使用对应上游标签的 vendor 版本；检查实际解析的直接包版本与全部 lockfile DSH 版本 |
| 字体设置 | 官方主题 fontSize 范围由 12–17 扩大到 10–22 | 插件不拥有 fontSize，继续由官方主题服务管理 |
| 语义颜色 | 新增文档选中、deep-diving/shimmer、开关 thumb、turn-trigger、菜单分组标题 token，存在局部保留官方配色的风险 | 从内置 palette 派生八个新 token，通过 overrideTokens 输出；旧版接受任意 token 名，无需修改 CSS 呈现层 |
| remotes 聚合 | 新增 analytics 与 user-questions contributions | 本插件只使用已有设置通道，未新增相关服务依赖；对目标安装树做类型和构建验证 |

## 逐版本结果

验证日期：2026-09-30。环境：macOS arm64、Node 24.18.0、pnpm 11.7.0。每行均重新安装 npm 发布包，执行 `compat:check`、`typecheck`、完整 `test`、`build`、`pack --dry-run`。结果和每条命令的退出码保存在相邻的 `dsh-compatibility-results.json`。

| DSH 精确版本 | Cordis | Schemastery | 设置路径 | 结果 |
| --- | --- | --- | --- | --- |
| 0.1.5-rc.2 | 4.0.2 | 3.18.2 | register / settingsScope | 通过 |
| 0.1.5-rc.3 | 4.0.2 | 3.18.2 | register / settingsScope | 通过 |
| 0.1.6-alpha.1 | 4.0.2 | 3.18.2 | register / settingsScope | 通过 |
| 0.1.6-alpha.2 | 4.0.2 | 3.18.2 | register / settingsScope | 通过 |
| 0.1.7-alpha.1 | 4.0.3 | 3.18.3 | configure / configForms | 通过 |
| 0.1.7-alpha.2 | 4.0.4 | 3.18.4 | configure / configForms | 通过 |
| 0.1.7-rc.1 | 4.0.4 | 3.18.4 | configure / configForms | 通过 |
| 0.1.7-rc.2 | 4.0.4 | 3.18.4 | configure / configForms | 通过 |
| 0.2.0-rc.1 | 4.0.4 | 3.18.4 | configure / configForms | 通过 |
| 0.2.0-rc.2 | 4.0.4 | 3.18.4 | configure / configForms | 通过 |

旧版真实 settings provider 测试只在 provider 具有 register 时执行；profile Config 版本跳过该旧接口测试，由 configure 契约与客户端测试覆盖。主题运行时使用实际官方发布代码；其未调用的 UI primitives 被替代，设置传输使用内存 fixture。

发现旧版 0.1.7-alpha.1 的自动安装 peers 可经 semver 范围漂移到 0.1.7-rc.2。矩阵脚本根据 lockfile 将这些间接 DSH peers 也固定到被测版本，再重新安装；混装不会被当作测试通过。

## 复现与边界

```sh
pnpm compat:matrix
# 只验证本次升级区间：
node scripts/run-dsh-matrix.mjs 0.1.7-rc.2 0.2.0-rc.1 0.2.0-rc.2
```

脚本在临时目录创建独立安装树，保留日志与 results.json，成功时清理安装树，失败时保留供排查。不会改动当前 checkout 的 manifest、lockfile 或 node_modules。CI 在 Linux / Node 22.19.0 上执行全部支持版本，上传命令日志与结果；该 CI 配置已加入，本次未在 GitHub 远端执行。

本次未覆盖完整 DSH Web profile 的磁盘持久化端到端流程、真实浏览器视觉截图、Desktop/Windows/Linux 本机呈现或 npm tarball 安装。`pack --dry-run` 只验证发布文件清单。插件仍为 platform:web，CSS 呈现由 ctx.theme 管理；未加入 Electron、Desktop provider 或 Node 客户端依赖。官方发布包缺失 source map 的 Vite 警告不影响测试退出码。

开发基线仍为 0.1.5-rc.2 / Cordis 4.0.2 / Schemastery 3.18.2；已恢复该安装树。没有把临时矩阵 pin 写回开发配置。
