# 上游主题、设置与插件接口调研

## Status and Evidence

Current snapshot，2026-10-02。依据当前安装的 DSH 0.2.0-rc.2 发布包声明、实际 Client bundle、Cordis 4.0.4 公开 provide/inject 行为、本仓库测试，以及 2026-09-30 兼容提升的标签审查记录。这里保存接口事实；支持清单在源码，逐版结果在[兼容矩阵](../development/dsh-compatibility.md)，不额外宣布新版本。

## 主题服务事实

| 上游面 | 观测 | 对本插件的影响 |
| --- | --- | --- |
| `ThemeRuntime.overrideTokens(source, tokens)` | 每 token 要 light/dark；同 source 替换整层并 restack；disposer 删除该次创建层 | 两层 source 与旧 disposer 安全性必须保留 |
| `ThemeSnapshot` | preference、active.colorScheme/tokens、themes 与 revision；新版本还管理 fontSize | overlay 不拥有字体或官方 preference |
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

## 0.2 变化与本包处理

现有兼容审查比较 dsh-v0.1.7-rc.2、dsh-v0.2.0-rc.1、dsh-v0.2.0-rc.2。关键 overlay、settings 和 slot 公开调用形状没有要求新增 adapter 分支。fontSize 上游范围扩大，本插件不处理；remotes 新增贡献也不影响已有设置访问。

新增 deep-diving/shimmer、document-selection、switch-thumb、turn-trigger 和 menu-group-header 语义颜色由同一 deriveChrome 接入，共八个 token。未知新 token 被旧 override 服务接受不等于旧 UI 存在相应使用点，视觉覆盖仍需场景检查。

## 调研边界

没有凭 package 版本相邻推定未发布中间状态。没有将 library 类型通过等同于完整 Web/桌面 UI 呈现通过。未执行本轮完整 profile 磁盘旅程、所有平台本机截图、WCAG DOM audit 或远端 npm/GitHub 发布确认。新上游 release 要按[兼容提升流程](../development/plugin-development-workflow.md#dsh-兼容提升)重新审查 seams 并验证矩阵。

## 后续审查清单

1. 从实际解析包位置确认 theme/settings/slots/store 与 vendor 统一版本。
2. 比较公开导出、snapshot 字段、source replacement/disposer 和 apply/effect 返回形状。
3. 检查 alias/specific/static/Shiki 的新增消费者及 opaque/translucent 背景角色。
4. 运行当前 shape adapter、真实 provider、ModuleLoader 官方主题和 consumer 生命周期用例。
5. 将新事实更新到所属 reference/ADR/compat evidence；不要只在 chat 保存结论。
