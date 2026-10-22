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

上述既有升级批次的十二版矩阵全部通过，包括 0.2.1-alpha.1 与 0.2.1-alpha.2。开发基线上的 `pnpm contrast:report --strict` 仍对现有低对比度配对退出 1。

### 0.2.1-alpha.3 审查与提升（2026-10-15）

审查来源为本地 `deepseek-harness` 仓库标签 `dsh-v0.2.1-alpha.2` → `dsh-v0.2.1-alpha.3`，以及 npm 上已发布的 0.2.1-alpha.3 精确版本包。

| 接缝 | 上游变化及风险 | 插件处理 |
| --- | --- | --- |
| 共享运行时 | alpha.3 使用 Cordis 4.0.5-alpha.2、Schemastery 3.18.5-alpha.2 与配套 cordis plugin / cosmokit 1.8.6-alpha.2；vendor 源树除版本号与 timer locale 外无代码差异 | peer 与 dependency 追加这两个精确预发布；overrides、开发 pin 与 minimumReleaseAgeExclude 随 `upgrade-dsh.mjs` 重钉 |
| 设置 Client | `ConfigFormSnapshot.mode` 字段与 `ConfigForms`/`SettingsDescribeMirror` 的 `persistence` 形参被移除：非 loopback 浏览器也写 Host 文档，不再保留进程内 memory 模式 | 插件只消费 `status`/`value`/`set`/`subscribe` 结构面，`ThemeSettingsHost` 不需改动；`tests/harness.ts` 的 stub 去掉无消费者的 `mode` 字段对齐新形状 |
| 设置写入 | `ConfigForm` 的 `set`/`mutate`/`unset` 契约不变（`mutate` 在 alpha.2 已存在），`set` 返回 `false` 表拒绝的语义不变 | 沿用现有 converging 与 `status.saveFailed` 处理 |
| 主题覆盖 | `overrideTokens` 的 source、light/dark、seq 与 disposer 语义未变；`ThemeRuntime` 内部多字段写改走 `mutate`，新增 desktop 字号快捷键（可选 `shortcuts` 注入） | 不新增版本分支；官方 ThemeRuntime 行为矩阵直接加载 alpha.3 真实 bundle 复验 |
| 槽位与渲染 | `SlotSpec`/`SlotEntryDef` 新增可选 `inline`；keyed hook 增加可选 `member` 形参 | 均为可选新增，向后兼容，`settings.general.item` 注册不变 |
| remotes 聚合 | 转发 `emit` 事件可携带 `resources` 访问控制元数据；新增 `RestartReason`、`LlmNativeAuth` 等类型导出 | 插件只依赖 `remote` 服务在场，不使用这些导出 |
| connection | Host 侧 `OperatorPeer` 改名 `Peer`，新增 `/connect` 路由、socket factory 与 `interactions` 选项 | 插件不经由这些公开导出，client 注入面 `connection` 服务仍在 |
| ui-primitives | 新增 `HoverCardGroup`；`projectUserText` 被 `UserTextRun`/`ReferenceChip` 取代 | 本插件只用 `Menu`/`Button`/`Modal`/`MenuEntry` 与 chevron 图标，alpha.3 导出未变 |
| 设置 Host | `packages/settings/settings/src` 无实现变更 | 沿用 `src/compat/settings-host.ts` 能力探测 |

当前开发基线是 0.2.1-alpha.3 / Cordis 4.0.5-alpha.2 / Schemastery 3.18.5-alpha.2。本轮先在隔离副本执行 `node scripts/run-dsh-matrix.mjs --candidate 0.2.1-alpha.3`，install、`compat:check`（candidate 判定）、lint、typecheck、build、全部单测、docs check、token audit、真实 tarball 安装、官方 ThemeRuntime 行为矩阵与真实 CLI profile composition 全部退出 0；提升后重跑全部十三个支持版本，逐命令结果见 [alpha.3 提升矩阵](./dsh-compatibility-alpha3-results-2026-10-15.json)。运行环境为 macOS arm64、Node 24.18.0、pnpm 11.7.0；本轮未设置 `DSH_BROWSER_E2E`，不声称验证真实浏览器旅程。

矩阵工具修复一处：候选模式下 `DSH_THEME_STUDIO_CANDIDATE` 使 `assessRepository` 的诊断名不同，`tests/scripts/compat-tools.spec.ts` 的 checkout 断言原先固定期待 `consistent`，现按该环境变量接受 `candidate probe consistent`。

浏览器旅程脚本修复一处：alpha.3 起 Web 端设置入口收进侧边栏账号菜单（`settings.launcher` 由 `ui-settings-account` 的 AccountMenu 注册，直连 `settings.trigger` 齿轮按钮只在 launcher 缺席时回退渲染），`scripts/smoke-client.mjs` 原先固定点击名为 设置/Settings 的按钮而在 alpha.3 超时。现优先直连按钮、缺席时走 账号菜单/Account menu → 设置/Settings menuitem，两条路径覆盖新旧 shell；首启对话框仍在入口探测后统一关闭。

### 0.2.1-alpha.4 至 0.2.1-rc.2 审查与提升（2026-10-17）

审查来源为本地 `deepseek-harness` 仓库标签 `dsh-v0.2.1-alpha.3` → `dsh-v0.2.1-alpha.4` → `dsh-v0.2.1-alpha.5` → `dsh-v0.2.1-rc.1` → `dsh-v0.2.1-rc.2`，以及 npm 上这些精确版本的已发布包。本插件消费的全部接缝包在该区间 `src/` 无实现变更，仅下表所列。

| 接缝 | 上游变化及风险 | 插件处理 |
| --- | --- | --- |
| 宿主加载 | alpha.4 起 `plugin-compatibility.ts` 优先读取插件自身 `engines.dsh`，未声明时沿用原 `@deepseek-ai/dsh*` peer 校验；本插件 `engines` 只声明 `node` | 继续以 peer 精确版本清单表达支持范围，不引入第二份 `engines.dsh` 真源；契约检查不变 |
| 共享运行时 | alpha.4/alpha.5 沿用 Cordis 4.0.5-alpha.2、Schemastery 3.18.5-alpha.2；rc.1/rc.2 转正式版 Cordis 4.0.5、Schemastery 3.18.5，配套 cordis plugin 与 cosmokit 同步转正式 | peer/dependency 的 `>=` 范围已覆盖正式版；overrides、开发 pin 与 minimumReleaseAgeExclude 随 `upgrade-dsh.mjs` 重钉到 rc.2 |
| 设置 Host / Client | `packages/settings/settings/src`、`settings-controller`、`ui-settings` 目标区间无实现变更 | 沿用 `src/compat/settings-host.ts` 能力探测与双通道，不新增版本分支 |
| 主题覆盖 | `ui-theme` 无实现变更；`overrideTokens` 语义不变 | 不新增版本分支；官方 ThemeRuntime 行为矩阵直接加载 rc.2 真实 bundle 复验 |
| 槽位与渲染 | `ui-slots` 框架无变更；ui-plugin-manager 新增 `plugins.tab` 列表槽位及 `PluginTabProps`，`plugins.bundle.config` keyed slot 契约逐字未变；alpha.5 新增 `conversation.input.model.label` 槽位 | 均为可选新增；本插件消费的槽位契约不变 |
| remotes 聚合 | 新增 `dsh-plugin-market` remote contribution 与 `plugin-market/changed` 转发事件 | 插件只依赖 `remote` 服务在场，不使用新增导出 |
| connection、store、locale、ui-primitives、ui-workspace、skill | 目标区间 `src/` 无实现变更 | 既有注入面与能力探测不变 |
| 设置入口 | ui-settings-account 的 AccountMenu 改用 notice stack；`settings.launcher`/`settings.trigger` 槽位与回退逻辑不变 | smoke-client 的直连按钮/账号菜单双路径继续覆盖新旧 shell |

当前开发基线是 0.2.1-rc.2 / Cordis 4.0.5 / Schemastery 3.18.5。本轮先对四个候选分别在隔离副本执行 `node scripts/run-dsh-matrix.mjs --candidate <version>`，install、`compat:check`（candidate 判定）、lint、typecheck、build、全部单测、docs check、token audit、真实 tarball 安装、官方 ThemeRuntime 行为矩阵与真实 CLI profile composition 全部退出 0；提升后重跑全部十七个支持版本，逐命令结果见 [rc.2 提升矩阵](./dsh-compatibility-rc2-results-2026-10-17.json)。运行环境为 macOS arm64、Node 24.18.0、pnpm 11.7.0；本轮未设置 `DSH_BROWSER_E2E`，不声称验证真实浏览器旅程。

## 元数据驱动的矩阵

2026-10-10 起，Cordis、Schemastery 和配套运行时不再使用脚本里的手写版本表。`scripts/lib/metadata.mjs` 读取被测精确版本的已发布 `dependencies` / `peerDependencies`，只接受能唯一确定的 exact、caret 或 tilde。CI 用 `scripts/list-dsh-releases.mjs` 从同一份清单生成版本轴。`scripts/upgrade-dsh.mjs` 可以改当前 checkout 的 pin，但默认不改 peer 和支持清单；`--admit-candidate` 只给一次性探测使用。每周 upgrade workflow 和 `run-dsh-matrix.mjs --candidate` 都不会提交或发布。

精确版本语法统一由 `scripts/lib/exact-pin.mjs` 定义；候选 workflow、依赖范围校验、lockfile 解析和中英文 README 兼容段落解析复用该定义。预发布标识符允许连字符（如 `0.2.3-alpha-hotfix.1`），但纯数字标识符不能有前导零。lockfile 只在版本结尾或 peer 后缀的 `(` 前结束匹配；README 解析要求完整版本边界，不能从非法版本中提取合法前缀或后缀。这里的示例只说明语法，不声称该候选已发布或已通过兼容矩阵。

官方 ThemeRuntime 行为矩阵在 `tests/integration/official-behavior-matrix.spec.ts`，覆盖激活、切换、预览/取消/应用、恢复默认、明暗/系统、偏好变化、卸载、重载、设置不可用、乐观状态回退、乱序写入和未知 id。jsdom 里把 snapshot 写到 `document.body` 只证明变量投影，不是浏览器旅程。`pnpm smoke:client` 在未设置 `DSH_BROWSER_E2E=1` 时报告 `not-run`，不能把它当成浏览器通过。

对比度差分门禁比较 `tests/client/contrast-baseline.json` 里已记录的失败配对。新增或消失的失败会让测试失败。`pnpm contrast:report --strict` 仍然对这些已知失败退出 1。

Client bundle 把 `@deepseek-ai/dsh-client-store` 与 `@deepseek-ai/dsh-client-ui-primitives` 保持为 `require`，复用宿主模块表行而不是打进第二份实现；适配层对后者缺失的导出本地回退。CSS Module 编译进 bundle 并用幂等 style 标签注入；清理 overlay 不移除该标签。

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

## 主题下拉选择器与 ui-primitives 适配（2026-10-13）

Themes 行改为与官方语言行同款的下拉选择器：selector 按钮（`aria-haspopup=menu`/`aria-expanded`）显示已应用主题，点击展开共享 `Menu`（items + `selectedId` + 尾随勾选，`align="end"`、`portal`、`closeOnPointerLeave`）；选项悬停预览，菜单关闭（指针离开、外部点击、Esc 或再次点击选择器）恢复，点击应用。`@deepseek-ai/dsh-client-ui-primitives` 是宿主模块表基线行，已加入全部受支持版本的 peer 清单、开发 pin、overrides、minimumReleaseAgeExclude、`OPTIONAL_CORE_PACKAGES` 与 client externals。

逐版本导出审查：`Menu` 在全部受支持版本导出，surface、定位、键盘与外点关闭均由原生组件提供；`MenuItem.icon` 承载四色 Mosaic，label 用 `flex:1` span 把尾随勾选推到行尾。items API 没有行级 hover 钩子，悬停改为 document 级 `mouseover`/`mouseout` 委托：`role="menuitem"` 内含 `[data-ts-theme]` 标记的才是主题行，行内 padding 与图标间隙都算作悬停该行，不依赖随版本变化的行内命中区几何；0.1.5–0.1.6 的 `.list` min-width 为 218px（0.1.7 起 144px）。Esc 关闭路径也分版本：0.1.6-alpha.2 实测 Escape 先关闭整个 Settings 对话框，`Menu` 的 `onClose` 不再运行；selector 再次点击同样绕过 `onClose`，触发器在收起前直接补 `cancelPreview`，行在 unmount 时再兜底一次，任何绕过 `onClose` 的关闭路径都不会泄漏预览；新版本仅菜单关闭。导出上的版本差异仍是触发器箭头：`IconChevronDownOutlineRegular` 自 0.1.7-alpha.1 起发布，0.1.5–0.1.6 只有 `IconChevronDownOutline14`。`src/compat/menu-icons.tsx` 对两个导出做结构探测并按此序绑定，都不存在时回退到同路径内联 SVG；0.1.5/0.1.6 的类型面不含新名，探测输入按未声明 namespace 处理，不做部分类型化断言。`--dsw-radius-*` 在 0.1.7-rc.2 前不存在，selector 与 Mosaic 的 `var()` 均带字面值兜底。

发布包 `lib/index.js` 裸导入 clsx、shiki、katex 等未声明的宿主侧包，vitest 无法加载真实产物；测试经 `resolve.alias` 使用 `tests/shims/ui-primitives.tsx`（含 Menu 契约替身：anchor + 打开时渲染 menuitem、外点/Esc 调 `onClose`），适配层分支由 `tests/client/menu-icons.spec.tsx` 的模块 mock 覆盖。

证据：2026-10-13 在 macOS arm64、Node 24.18.0、pnpm 11.7.0 上 `node scripts/run-dsh-matrix.mjs 0.1.5-rc.2` 全部步骤通过，含最老类型面的 typecheck 与 smoke-compose 真实 CLI tarball 安装；开发基线门禁（compat:check、lint、typecheck、test、docs:check、build、verify-package）同步通过。同日在 `DSH_BROWSER_E2E=1` 下 `node scripts/run-dsh-matrix.mjs 0.1.6-alpha.2` 全步骤通过（含真实 Chromium 旅程：悬停预览、Esc 恢复、应用与 Host 重启恢复），并在开发基线 0.2.1-alpha.2 上单独通过 `scripts/smoke-client.mjs`。仍未覆盖逐版本逐像素的视觉比对与本地 chevron 回退的截图。

矩阵工具同步修复：重定向树（非 frozen）删除 lockfile 后全新解析，非 DSH dev 依赖可能新于 pnpm 默认 release-age 截止线，每个 `pnpm run`/`exec` 的前置 supply-chain verify 会误伤。脚本现给该隔离树补写 `minimumReleaseAge: 0`，源码 checkout 与 frozen 基线的策略不变。


## 主题导入导出 Review 修复复验（2026-10-14）

针对 [PR #9](https://github.com/cherrchen/dsh-theme-studio/pull/9) 在 `1cb8a96` 上的 Review 修复，在 macOS arm64、Node 24.18.0、pnpm 11.7.0 上执行了 `pnpm verify:all`，并用可写临时 npm 缓存重跑全部十二个既有支持版本的 `pnpm compat:matrix`。全部通过，逐命令结果与各版本测试摘要见 [Review 修复矩阵](./dsh-compatibility-review-results-2026-10-14.json)。支持清单与最新开发基线没有变化。

回归用例覆盖旧 transport resolve void 但未接受的导入、覆盖与删除及重试，结算时 loading 后再 ready 的核对，设置加载或重新加载期间的导入确认保护，覆盖主题接受后的真实 preview token、并发导入与重复拒绝时的监听清理，以及 62–64 字符 id 的重命名和目录采纳。开发基线为 226 passed、1 个条件性 legacy-provider skip；每个隔离版本另执行 lint、typecheck、build、docs check、token audit、真实 tarball 安装、官方 ThemeRuntime 与 CLI profile smoke。

这次没有设置 `DSH_BROWSER_E2E=1`，不声称验证真实浏览器 file picker 或导入主题的磁盘持久化旅程；本机矩阵也不替代 Linux/Windows 的 PR CI 证据。runtime 与文件规则仍分别以 [runtime 参考](../reference/theme-runtime.md)和[文件格式](../reference/theme-file-format.md)为准。

## Theme Creator 接缝审查（2026-10-15）

本批次把 `@deepseek-ai/dsh-skill` 与 `@deepseek-ai/dsh-client-ui-workspace` 加入 peer 声明、开发 pin 与 `OPTIONAL_CORE_PACKAGES`；两者按可选服务处理，缺席时对应功能关闭。审查来源为本地 `deepseek-harness` 仓库 git 历史（含 `--follow` 与 tag --contains），非版本字符串分支。

| 接缝 | 上游事实 | 插件处理 |
| --- | --- | --- |
| `ctx.skills.register` | `SkillRegistration` 与 `register()` 在全部十三个受支持版本可用；`dsh-skill-badge` 是 provider 注册 bundled skill 的上游先例 | Host 以 `ctx.inject(['skills'])` 等待服务；`watchCreatorAgent` 按 accepted `creatorAgentMode` reconcile register/dispose，测试覆盖三档映射与模式翻转 |
| `uiWorkspace.startSession` | `startSession(workspaceId?, options?)` 的两参签名在 `e400349e3a` 引入，首个包含 tag 为 `dsh-v0.2.1-alpha.1`；更早版本只有 `startSession(workspaceId)` | Client 以 `ctx.get('uiWorkspace')` 读可选服务，`startSession.length >= 2` 为能力探测；不满足时「创建自己的主题」降级为本地化手动手势提示 |
| `settings/document-updated` | 新 transport 的设置变更事件，`ctx.on` 返回 disposer | `settings-host.ts` 的 `{section, dispose}` 附件在新 transport 下以 `describe()` 读值、该事件作 watch；旧 transport 继续包装 namespace scope |
| `plugins.bundle.config` | keyed slot 由 `ui-plugin-manager` 在 `slot-contract.ts` 声明，首个包含 tag 为 `dsh-v0.1.6-alpha.2`；该包本身也从 0.1.6-alpha.2 起才发布，更早版本既不声明该 slot 也无法安装该包 | `src/compat/plugin-manager-slot.ts` 本地镜像上游 `SlotMap` 条目（owner 结构逐字一致），Client 以 `ctx.slots.inject('plugins.bundle.config', …)` 惰性贡献 `CreatorConfigSection`（key 为包名）；slot 不声明时注册不挂载，宿主保持已存储或默认 `creatorAgentMode` |

验证证据：开发基线 0.2.1-alpha.2 上 `compat:check`、lint、typecheck、build、全部单测通过（含新增 creator/validate-theme/row/CreatorConfigSection 覆盖）；`lib/validate-theme.js` 冒烟覆盖合法文件（exit 0）、格式拒绝（exit 1）与用法错误（exit 2）。本轮未重跑逐版本安装树矩阵——新增接缝全部落在可选服务与结构探测上，不改动既有必需路径；逐版本证据以下一次矩阵批次为准。真实 Cordis 会话中 skill 注入与 `/dsh-theme-creator` 手势的端到端旅程未在本机验证。

## Session 日志的回读边界（2026-10-18）

宿主持久化读路径拒绝解释包含未知必需事件的日志：`dsh-session-persistence` 的 `validateStoredEvents` 对不在 `KNOWN_SESSION_EVENT_TYPES` 且未标 `ignorable` 的事件直接拒绝。`0.2.1-alpha.3` 起写入方新增 `job/registered` / `job/settled` 两个必需事件（后台作业登记，agent 的 bash 调用即产生）；因此凡在 ≥ `0.2.1-alpha.3` 宿主上运行过这类作业的会话，回到 `0.2.1-alpha.2` 及更早版本（含 `0.2.0-rc.2`）打开时，历史加载以 `SESSION_QUERY_PERSISTENCE_FAILED` 失败。这是上游刻意的前向兼容防护，与本插件的支持声明无关——插件不读、不写 Session 日志，宿主该行为不受插件影响。症状与解法见 [troubleshooting 条目](../troubleshooting/session-log-newer-harness.md)。

## 手动主题编辑器复验（2026-10-22）

在 macOS arm64、Node 24.18.0、pnpm 11.7.0 上，当前开发基线 `0.2.1-rc.2` 的 `pnpm verify:all` 完整通过（349 passed、1 个预期 legacy-provider skip），包含全新 tarball 安装、校验器、官方 ThemeRuntime 与真实 CLI web profile 冒烟。默认 npm 缓存写权限失败后，改用临时可写缓存重跑通过，未改变开发 pin 或支持清单。

隔离矩阵已完整通过 `0.1.5-rc.2`、`0.1.5-rc.3`、`0.1.6-alpha.1`、`0.1.6-alpha.2`、`0.2.1-alpha.3`，逐命令结果和未完成版本见[本轮矩阵证据](./dsh-compatibility-manual-editor-results-2026-10-22.json)。剩余矩阵与真实浏览器验证按用户后续指示暂缓，已停止任务；不声称全十七版本或浏览器通过，亦未运行 Linux/Windows 验证。实施提交及本轮范围见[已完成计划](../plans/completed/2026-10-22-manual-theme-editor.md)。
