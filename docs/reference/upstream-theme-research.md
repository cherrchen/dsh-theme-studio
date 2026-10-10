# 上游主题、设置与插件接口调研

## Status and Evidence

Current snapshot，2026-10-10。依据本地标签 `dsh-v0.2.0-rc.2`、`dsh-v0.2.1-alpha.1`、`dsh-v0.2.1-alpha.2` 与当前安装的 DSH 0.2.1-alpha.2 发布包。这里保存接口事实；支持清单在源码，逐版结果在[兼容矩阵](../development/dsh-compatibility.md)。

## 主题服务事实

| 上游面 | 观测 | 对本插件的影响 |
| --- | --- | --- |
| `ThemeRuntime.overrideTokens(source, tokens)` | 每 token 要 light/dark；同 source 替换整层并 restack；disposer 删除该次创建层 | 两层 source 与旧 disposer 安全性必须保留 |
| `ThemeSnapshot` | preference、active.colorScheme/tokens、themes 与 revision。0.2.1-alpha.2 起用 `fontSizes` 与 `fontFamilies` 取代单一 `fontSize`；更早版本仍是 `fontSize` | overlay 不拥有字体或官方 preference。安装层前去掉官方字体变量 |
| `ThemeRuntime.setTheme` | 官方 light/dark/system/registered id 的 preference 写入 | Theme Studio id 不作为官方 preference |
| `ThemePresenter` | 消费最终 snapshot 并驱动 DOM/token | 本包不新增 presenter 或 body theme selector |
| Token sheets | 部分 alias 指向 static 或 literal rgba，部分组件直接引用 static | 13 基础 token 不足覆盖 chrome，需 deriveChrome |
| Tooltip / file tile | static neutral 00 保持白色角色 | 不覆写这两项 static white，保持 bubble 语义 |

当前 integration fixture 从已安装 `@deepseek-ai/dsh-client-ui-theme/client` 经 ModuleLoader materialize，直接调用官方 ThemeRuntime。UI 未调用 primitives 被 stub，settings 为内存 fixture。这比复制上游 runtime 更能发现版本变化，但仍不是实际浏览器或完整 profile。

## Settings API 世代

旧 Host 是 namespace register，Client settingsScope.bind；新 Host 读取 plugin Config，configure 控制自动 form，Client configForms.get。两条路径最小共同契约是 snapshot/subscribe/set。旧 register 普通 scope 的返回形状在真实 provider 回归已验证；它不是 disposer，也不能成为 apply return。

从本仓库受测安装树看，旧 register/settingsScope 使用到 0.1.6-alpha.2，新 Config/configForms 从 0.1.7-alpha.1 起。实现按能力而非版本字符串选择，因此不要将这一表述改为硬编码版本分支。set resolved void/boolean 不改变业务读 accepted snapshot 的契约。

## Cordis 服务与 effect

provide(name,value) 由调用 fiber 注册并释放服务；相同 isolation scope 不允许重复提供。inject 等待服务可用，在 provider 停止后释放依赖 child，重供后重新运行。Context proxy 不是任意属性探测字典，仅读取实际注入的 service。

apply 可返回 function、thenable 或相应 iterable；namespace scope 普通对象不满足 effect 形状。不同 callback identity 对应不同 plugin runtime，所以 settingsScope/configForms 不能共用同一个注册 callback 函数身份。公开 themeStudio 的 provider 在父 fiber，设置 UI 在 child；真 Cordis lifecycle 测试覆盖这一分离。

## Browser loader 与 package graph

官方客户端模块扫描读取安装包 `dsh.client`，carrier loader row 的 name 必须为 bare package name。Client artifact 通过 `window.__ModuleLoader__.load({ id, factory })` 注册。`dsh.client.inject` 是 bundle 依赖 metadata；导出的 Cordis `inject` 是运行时 service 依赖，这两层不互相替代。

仅写 TypeScript declaration import 不加载 provider artifact；仅加入 browser dependency 也不授权未注入 proxy 读取服务。Theme Studio 的官方 plugin-manager identity 来自 installed package metadata，不需要 plugins.item/detail 贡献。

## 0.2.0 变化与本包处理

2026-09-30 的审查比较 dsh-v0.1.7-rc.2、dsh-v0.2.0-rc.1、dsh-v0.2.0-rc.2。关键 overlay、settings 和 slot 公开调用形状没有要求新增 adapter 分支。当时的单一 fontSize 范围扩大，本插件不处理；remotes 新增贡献也不影响已有设置访问。

新增 deep-diving/shimmer、document-selection、switch-thumb、turn-trigger 和 menu-group-header 语义颜色由同一 deriveChrome 接入，共八个 token。未知新 token 被旧 override 服务接受不等于旧 UI 存在相应使用点，视觉覆盖仍需场景检查。

## 0.2.1-alpha.1 到 0.2.1-alpha.2

`dsh-v0.2.0-rc.2` 到 `dsh-v0.2.1-alpha.1` 的 `packages/client/ui-theme/src` 没有实现差异。字体角色、ThemeSnapshot 字段和 boot script 的变化都在 alpha.1 到 alpha.2。

| 上游面 | alpha.2 的公开行为 | 对本插件的影响 |
| --- | --- | --- |
| `overrideTokens` | source、light/dark 对、seq 与“旧 disposer 不删新层”未变 | 继续使用 active/preview 两个 source |
| 颜色 token 名 | `src/styles` 中没有新增 `--dsw-alias-*` 颜色名 | 不新增 palette 字段 |
| `ThemeSnapshot` | `fontSize` 变为 `fontSizes` 与 `fontFamilies`；`setFontSize(role, px)` 与 `setFontFamily(role, value)` | 插件不调用这些写入 |
| ThemePresenter | 先把三类字号和 `--dsh-font-family-*` 写到 body，再写 `active.tokens` | 字体同名 token 会盖住官方字体，因此安装前剔除 |
| 终端 | `ui-sidebar-terminal` 直接读 snapshot 的 terminal 字体和字号，不依赖那两个 CSS 变量 | 不改 snapshot 字体字段即可保持终端偏好 |
| 正文字体与代码字体 | `--dsw-font-family` 与 `--ds-font-family-code` 在样式表里回退到用户列表；代码块尺寸跟随 `--dsh-code-font-size` | 这些名字不进入 overlay |
| settings `set` | 新 transport 返回 `false` 表示 Host 拒绝并已 recover；旧 transport 返回 void，拒绝后同样 recover snapshot | 以 accepted snapshot 回收敛；`false` 和 rejected Promise 都显示保存失败 |
| Cordis / Schemastery | 4.0.5-alpha.1 / 3.18.5-alpha.1；配套 plugin-include 1.0.10-alpha.1、plugin-group 1.0.5-alpha.1、plugin-loader 1.0.6-alpha.1、cosmokit 1.8.6-alpha.1 | 开发树按该组合 pin。`@deepseek-ai/dsh-invariants` 不再由该版本的直接依赖使用，也不再发布 0.2.1-alpha.2 |
| 设置与槽位源码 | `packages/settings/settings/src`、`ui-settings/src`、`ui-slots/src` 相对 rc.2 无实现差异 | 继续复用现有 settings 适配 |

`bootThemeInjections` 在插件启动前把字体变量写到 body。ThemeRuntime 构造时读取它们，避免设置读取完成前闪回默认字体。Theme Studio 的颜色层不参与这段启动脚本。

## 调研边界

没有凭 package 版本相邻推定未发布中间状态。没有将 library 类型通过等同于完整 Web/桌面 UI 呈现通过。未执行本轮完整 profile 磁盘旅程、所有平台本机截图、WCAG DOM audit 或远端 npm/GitHub 发布确认。新上游 release 要按[兼容提升流程](../development/plugin-development-workflow.md#dsh-兼容提升)重新审查 seams 并验证矩阵。

## 后续审查清单

1. 从实际解析包位置确认 theme/settings/slots/store 与 vendor 统一版本。
2. 比较公开导出、snapshot 字段、source replacement/disposer 和 apply/effect 返回形状。
3. 检查 alias/specific/static/Shiki 的新增消费者及 opaque/translucent 背景角色。
4. 运行当前 shape adapter、真实 provider、ModuleLoader 官方主题和 consumer 生命周期用例。
5. 将新事实更新到所属 reference/ADR/compat evidence；不要只在 chat 保存结论。
