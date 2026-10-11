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

## 逐版本结果（既有 0.2.1 升级批次）

原始实现提交：`344e57f`。验证日期：2026-10-10。环境：macOS arm64、Node 24.18.0、pnpm 11.7.0。十二个精确版本各自重新安装 npm 发布包，执行 `compat:check`、`typecheck`、完整 `test`、`build`、`pack --dry-run`，全部退出码为 0。命令记录在 [dsh-compatibility-results-2026-10-10.json](./dsh-compatibility-results-2026-10-10.json)。2026-10-02 的十版记录仍留在 [dsh-compatibility-results.json](./dsh-compatibility-results.json)，它不覆盖这次字体与保存失败改动。

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
| 0.2.1-alpha.1 | 4.0.5-alpha.1 | 3.18.5-alpha.1 | configure / configForms | 通过 |
| 0.2.1-alpha.2 | 4.0.5-alpha.1 | 3.18.5-alpha.1 | configure / configForms | 通过 |

旧版真实 settings provider 测试只在 provider 具有 register 时执行；profile Config 版本跳过该旧接口测试，由 configure 契约与客户端测试覆盖。主题运行时使用实际官方发布代码；其未调用的 UI primitives 被替代，设置传输使用内存 fixture。

发现旧版 0.1.7-alpha.1 的自动安装 peers 可经 semver 范围漂移到 0.1.7-rc.2。矩阵脚本根据 lockfile 将这些间接 DSH peers 也固定到被测版本，再重新安装；混装不会被当作测试通过。

## 复现与边界

Stage 2/3 本次在全部十个版本上新增验证：WCAG sRGB 计算、透明色与混色、未解析配对的失败语义、全部内置配对可计算、只读 catalog，以及真实 Cordis 注入消费者在 provider 卸载/重供时的停止与重启。catalog 在设置通道尚不存在或被替换时仍保持可发现；原有预览/应用和官方 ThemeRuntime 集成测试保持通过。新服务使用现有公开 `ctx.provide()`，未增加 DSH 版本分支或扩大支持版本。

当前开发基线额外清空生成目录后重新构建，验证了实际 browser bundle 的加载器导出、对比度计算与 catalog 服务，并验证报告命令默认模式退出 0、严格模式对现有低对比度配对退出 1。内置配色与校验范围见 [对比度诊断](theme-contrast.md)。2026-10-10 的十二版矩阵验证源码契约、服务生命周期与发布构建。它仍不是完整浏览器/宿主 UI 视觉或 WCAG 认证。

```sh
pnpm compat:matrix
# 只验证本次升级区间：
node scripts/run-dsh-matrix.mjs 0.1.7-rc.2 0.2.0-rc.1 0.2.0-rc.2
```

脚本在临时目录创建独立安装树，保留日志与 results.json，成功时清理安装树，失败时保留供排查。不会改动当前 checkout 的 manifest、lockfile 或 node_modules。该历史批次的 CI 定义在 Linux / Node 22.19.0 上执行全部支持版本，上传命令日志与结果；后续三平台与浏览器矩阵见下文。

该历史批次未覆盖完整 DSH Web profile 的磁盘持久化端到端流程、真实浏览器视觉截图、Desktop/Windows/Linux 本机呈现或 npm tarball 安装。`pack --dry-run` 只验证发布文件清单。插件仍为 platform:web，CSS 呈现由 ctx.theme 管理；未加入 Electron、Desktop provider 或 Node 客户端依赖。官方发布包缺失 source map 的 Vite 警告不影响测试退出码。

2026-10-02 的开发基线当时是 0.2.0-rc.2 / Cordis 4.0.4 / Schemastery 3.18.4。2026-10-10 的十二版矩阵覆盖那次清单，并加入两个 0.2.1 候选。

## 0.2.1 审查与结果

审查来源为本地标签 `dsh-v0.2.0-rc.2`、`dsh-v0.2.1-alpha.1`、`dsh-v0.2.1-alpha.2`，以及 npm 上这些精确版本的已发布包。alpha.1 与 rc.2 的 `packages/client/ui-theme/src` 没有实现差异。字体角色和 snapshot 形状变化发生在 alpha.2。

| 接缝 | 上游变化及风险 | 插件处理 |
| --- | --- | --- |
| 主题覆盖 | `overrideTokens` 的 source、light/dark、seq 和旧 disposer 语义未变。样式表没有新增颜色 token 名 | 不新增版本分支。安装前去掉官方字体变量，避免 ThemePresenter 后写 token 时盖住字体 |
| 字体所有权 | alpha.2 用 `fontSizes` / `fontFamilies` 替换单一 `fontSize`。终端直接读 snapshot；正文和代码尺寸走 CSS 变量 | Theme Studio 不写这些字段，不增加字体设置 UI |
| 设置写入 | 新 transport 的 `set` 返回 `false` 表示拒绝并已 recover；旧 transport 返回 void，拒绝后同样 recover | accepted snapshot 回收敛。`false` 与 rejected Promise 显示 `status.saveFailed`。连续 `set` 串行，未结算写入挡住 Host 回声 |
| 共享运行时 | 0.2.1-alpha.1 与 alpha.2 使用 Cordis 4.0.5-alpha.1、Schemastery 3.18.5-alpha.1，以及对应的 cordis plugin 与 cosmokit 1.8.6-alpha.1 | 这些精确预发布版本写入 peer/dependency 与 overrides。2026-10-10 早些时候的矩阵脚本对旧版去掉这组 override；随后的元数据驱动矩阵改为按每个发布包自己的声明钉配套版本 |
| invariants | npm 没有 `@deepseek-ai/dsh-invariants@0.2.1-alpha.1` 或 `alpha.2` | 开发依赖不再 pin 该包。旧版若传递依赖它，由该版自己的范围和矩阵漂移修正处理 |
| 设置与槽位实现 | settings、ui-settings、ui-slots 源码相对 rc.2 无实现差异 | 继续复用现有适配 |

当前开发基线是 0.2.1-alpha.2 / Cordis 4.0.5-alpha.1 / Schemastery 3.18.5-alpha.1。上述既有升级批次的十二版矩阵全部通过，包括 0.2.1-alpha.1 与 0.2.1-alpha.2。开发基线上的 `pnpm contrast:report --strict` 仍对现有低对比度配对退出 1。

## 元数据驱动的矩阵

2026-10-10 起，Cordis、Schemastery 和配套运行时不再使用脚本里的手写版本表。`scripts/lib/metadata.mjs` 读取被测精确版本的已发布 `dependencies` / `peerDependencies`，只接受能唯一确定的 exact、caret 或 tilde。CI 用 `scripts/list-dsh-releases.mjs` 从同一份清单生成版本轴。`scripts/upgrade-dsh.mjs` 可以改当前 checkout 的 pin，但默认不改 peer 和支持清单；`--admit-candidate` 只给一次性探测使用。每周 upgrade workflow 和 `run-dsh-matrix.mjs --candidate` 都不会提交或发布。

精确版本语法统一由 `scripts/lib/exact-pin.mjs` 定义；候选 workflow、依赖范围校验、lockfile 解析和中英文 README 兼容段落解析复用该定义。预发布标识符允许连字符（如 `0.2.3-alpha-hotfix.1`），但纯数字标识符不能有前导零。lockfile 只在版本结尾或 peer 后缀的 `(` 前结束匹配；README 解析要求完整版本边界，不能从非法版本中提取合法前缀或后缀。这里的示例只说明语法，不声称该候选已发布或已通过兼容矩阵。

官方 ThemeRuntime 行为矩阵在 `tests/integration/official-behavior-matrix.spec.ts`，覆盖激活、切换、预览/取消/应用、恢复默认、明暗/系统、偏好变化、卸载、重载、设置不可用、乐观状态回退、乱序写入和未知 id。jsdom 里把 snapshot 写到 `document.body` 只证明变量投影，不是浏览器旅程。`pnpm smoke:client` 在未设置 `DSH_BROWSER_E2E=1` 时报告 `not-run`，不能把它当成浏览器通过。

对比度差分门禁比较 `tests/client/contrast-baseline.json` 里已记录的失败配对。新增或消失的失败会让测试失败。`pnpm contrast:report --strict` 仍然对这些已知失败退出 1。

Client bundle 把 `@deepseek-ai/dsh-client-store` 保持为 `require`，避免打进第二份 store。CSS Module 编译进 bundle 并用幂等 style 标签注入；清理 overlay 不移除该标签。

2026-10-10 在 macOS arm64、Node 24.18.0、pnpm 11.7.0 上，对开发基线 0.2.1-alpha.2 执行了 `node scripts/smoke-compose.mjs`。它在临时 `DSH_HOME` 中用该版本的 `dsh` CLI 安装 `.pack/plugin.tgz`，dump 出一条 bare `theme-studio` 行，官方 `ui-theme` 仍在，安装后的 `lib/client.js` 含 ModuleLoader 注册。退出码 0。同日 `pnpm smoke:client` 在未设置 `DSH_BROWSER_E2E` 时打印 `not-run`，没有浏览器旅程。新的十二版矩阵是否全部通过，以本次命令的 `results.json` 为准，不能用早先那份十二版记录代替。

```sh
pnpm compat:matrix
node scripts/run-dsh-matrix.mjs 0.2.0-rc.2 0.2.1-alpha.1 0.2.1-alpha.2
node scripts/run-dsh-matrix.mjs --candidate <exact-version>
```

## 工程迁移复验（2026-10-10）

本轮在 macOS arm64、Node 24.18.0、pnpm 11.7.0 上重新运行全部十二个既有支持版本，没有修改支持清单或开发基线。结果见 [工程迁移矩阵](./dsh-compatibility-migration-results-2026-10-10.json)；该文件保存逐命令退出状态，与上面的历史 `pack --dry-run` 记录区分。

早期临时 tarball/CLI 安装日志中出现全局 pnpm 11.28.5；新建临时 manifest 已固定源码的 11.7.0（pack 会移除该字段，故从源码读取），开发基线真实 tarball 重新安装确认使用 11.7.0。

每版 gate 包含独立安装、`compat:check`、lint、typecheck、build、完整单测、docs check、token audit、真实 tarball 安装与 Host 加载、官方 ThemeRuntime 行为矩阵和真实 CLI profile composition。全部十二版通过。最终 `DSH_BROWSER_E2E=1 PLAYWRIGHT_MODULE=<Playwright入口> node scripts/run-dsh-matrix.mjs` 还在十二版上逐一运行实际 Chromium：从认证 URL 加载真实 ModuleLoader 与 Client store，确认 Themes 和官方 Appearance 共存；预览改变 `--dsw-alias-bg-base`、取消恢复、应用保持预览值、刷新恢复，以及停止并新启动 Host 后从隔离 profile 恢复同一主题。十二版浏览器命令全部退出 0；完整浏览器日志原文在结果文件的 `browserLogEvidence`，不依赖真实模型 API Key。本地随机 evidence 路径现统一传给子进程；开发基线补跑确认成功清理安装副本后 JSON、截图、DOM 和服务日志仍保留（结果文件的 `evidenceRetentionCheck`）。首次启动提示通过真实按钮处理；报告判定不把拼接 bundle URL 中偶然出现插件名当成插件错误。

新 Config 世代的 legacy register 用例仍显式 skip，由对应 configure/客户端路径覆盖。当前开发基线完整单测为 130 passed、1 skipped。

CLI 自身也需要统一依赖树：旧缓存中 `dsh-app-boot` / `dsh-plugin-manager` 漂到其他版本会分别造成 `watchUserPatches` 或 `evaluatePluginCompatibility` 缺失。现在 CLI 元数据探测纳入 `@deepseek-ai/dsh`，遍历最多八层依赖，并检查缓存 lockfile 的全部 DSH 包、Cordis 和 Schemastery。元数据前沿最多六个 npm 请求并发执行；失败保留包名和声明来源，不改变选择规则。

正式 CI 动态读取同一清单，在 Ubuntu、macOS、Windows 执行完整安装/构建/契约/运行时矩阵。PR 的 Ubuntu 浏览器矩阵默认选旧 register 世代和当前 pin，手动 `browser_coverage=all` 可覆盖全部；Release 强制全量浏览器矩阵，并依赖整个可复用 CI。失败的逐步日志、结果和浏览器截图/DOM/服务日志作为带 OS 与版本的 artifact 上传。

每周探测与手动候选使用 `contents: read`。如果最新 prerelease 已被支持，则重跑正式模式；未支持版本只能在独立副本或一次性 Actions checkout 放宽 admission。混装、缺包、非法版本或损坏的已安装元数据仍失败，探测不提交、推送、提升清单或发布。

本机结果不证明 GitHub-hosted Ubuntu/Windows 或跨平台浏览器呈现已通过；这部分需 Draft PR 的 CI 另行提供证据。npm OIDC 的 trusted publisher 绑定仍须维护者在 npm 包设置核实；本轮没有执行 tag、npm publish 或 GitHub Release。
