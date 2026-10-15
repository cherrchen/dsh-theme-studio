# Theme Studio 架构

## Background

Current，2026-10-14 更新导入导出与复合 catalog。本架构描述当前源码；历史演进见[提交记录](../reference/repository-history.md)，计划中的主题编辑器与 Theme Creator Agent 不属于已实现组件。

## Goals and Non-goals

目标是让一个便携插件产生配色覆盖、保存用户选择、提供发现与诊断。官方主题服务继续处理 Appearance、系统模式与 DOM 呈现。这里不设计第二套主题 presenter、不替换官方 settings provider，也不建立跨 Host/Client 的 catalog RPC。

## Current State

```mermaid
flowchart TD
  Profile[cordis.patch.yml 包名载体行] --> Host[Host apply / Config]
  Profile --> Client[Client apply]
  Host --> Settings[settings register / configure]
  Settings --> Transport[settingsScope / configForms]
  Client --> Catalog[ThemeStudioRegistry]
  Client --> Service[ctx.themeStudio.catalog]
  Catalog --> Service
  Catalog --> Runtime[ThemeStudioRuntime]
  Transport --> Runtime
  Runtime --> Theme[ctx.theme.overrideTokens]
  Theme --> Presenter[官方 ThemeSnapshot / ThemePresenter / DOM]
  Runtime --> Store[store 快照投影]
  Store --> Row[settings.general.item Themes]
  Row --> Runtime
  Catalog --> Contrast[纯 sRGB 对比度校验]
  Row --> FileIO[theme-file / theme-import / download]
  FileIO --> Runtime
```

## Components

| 模块 | 责任 | 不负责的内容 |
| --- | --- | --- |
| `src/index.ts`、`settings.ts` | Host 注册/Config、导出 schema 与默认值 | UI、浏览器服务、主题呈现 |
| `compat/settings-host.ts` | register/configure 能力探测、volatile 适配、effect 返回值 | 版本字符串驱动分支 |
| `compat/settings-client.ts` | 两种 transport 的最小结构契约 | 独立 RPC 协议 |
| `compat/menu-icons.tsx` | ui-primitives 下拉箭头图标探测与本地回退 | 版本字符串分支 |
| `client/index.ts` | provider、字典、槽位、runtime/store 组装与启停 | durable authority |
| `client/presets.ts`、`chrome-tokens.ts` | 八套明暗配色、源 palette 保留与派生语义 token | 修改官方 stylesheets |
| `client/catalog.ts` | `BuiltinPresetRegistry` 冻结静态分区；`ThemeStudioRegistry` 复合 imported 分区、快照、订阅与回写源 | 注册/编辑第三方主题 |
| `client/theme-file.ts` | `dsh-theme.json` v1 解析/校验/编译/序列化、存储条目解析、id 冲突生成 | Host 持久化、对比度计算 |
| `client/theme-import.ts`、`download.ts` | 导入决策/持久化/预览编排、Blob 下载 | 文件系统访问、UI 组件 |
| `client/adapter.ts` | per-scheme map → per-token light/dark 值对 | 对比度认证、公共文件 schema |
| `client/font-boundary.ts` | 安装 overlay 前去掉官方字体变量 | 字体设置 UI、字号和字体列表写入 |
| `client/runtime.ts` | active/preview、Host adoption、双字段写队列、imported 分区同步、状态与监听器 | CSS 呈现 |
| `client/store.ts` | 单向同步 runtime snapshot 与 catalog 投影的 cards | 第二持久设置源 |
| `ThemeStudioRow.tsx`、CSS、`locales.ts` | 设置行、Menu 下拉选择器与色块、导入/重复/管理对话框、可访问性与文案 | 直接操纵 body 主题状态 |
| `contrast.ts`、`contrast-colors.ts` | 规则报告、sRGB 色值解析、混色、alpha 与亮度 | DOM/computed style 审核 |
| `compat/dsh-version.ts`、开发脚本 | 清单、纯分类、安装树静态检查与矩阵 | 生产 Host 的 Node 探测 |

## Interfaces

运行时只依赖 `ThemeOverrideSurface.overrideTokens(source, tokens)`、`ThemeCatalog.get/list` 和 `ThemeSettingsHost.getSnapshot/subscribe/set`。公开服务增加 `ThemeStudioCatalog.validate(id)`；这些最小接口允许用测试替身验证逻辑，也保留官方发布 bundle 的真实集成路径。完整接口见 [runtime](../reference/theme-runtime.md)、[catalog](../reference/theme-catalog.md)、[settings](../reference/settings-and-package-contract.md)。

## Data Flow

### 从配色到呈现

内置 Palette 含 13 个人工字段。`tokens()` 将其映射为基本 token 并与 `deriveChrome()` 合并，随后 preset 工厂冻结配色、preview 与源 `palette`（导出 `dsh-theme.json` 的真源）。catalog 构造时再做防御性复制，确保传入列表后续变更不影响 runtime。adapter 确认两种模式 token 键相同且值为字符串，转成 `ThemeTokenOverrides`。导入主题经 `compileThemeFile` 走同一 `deriveChrome` 路径：13 字段 palette 展开后叠加 `overrides` 稀疏 token。

```text
Official Light / Dark / System
        ↓
ACTIVE_SOURCE  (@dsh-electron/dsh-theme-studio:active)
        ↓
PREVIEW_SOURCE (@dsh-electron/dsh-theme-studio:preview)
        ↓
ThemeSnapshot → ThemePresenter → DOM
```

官方服务按 overlay seq 决定同 token 的最后覆盖层。替换相同 source 后，旧 disposer 不能删除新层。插件依赖这一正式契约，不能把 old-disposer 的清理改成无条件 source 删除。

### 从 UI 到持久设置

Client 创建 store，runtime 变化后通过订阅调用 bound actions 的 `sync`；registry 的 imported 分区替换同样触发 store 的 `setCards` 投影。槽位注入组件时绑定 actions 并立即同步当前快照。下拉交互调用 runtime facade：悬停以整个 `menuitem` 行为单位——document 级 `mouseover`/`mouseout` 委托解析指针所在行，带 `data-ts-theme` 标记的行内任一位置（含 padding 与图标间隙）都走 previewTheme；落到无标记的行（footer 动作）、分隔线、组标签或菜单外，以及菜单关闭、选中 footer 动作都走 cancelPreview，选中主题走 activateTheme/restoreDefault。Apply 乐观更新 active 层并异步调用 Host.set。写入队列按 `{field, value}` 串行：`activeThemeId` 与 `importedThemes` 各自合并未发出的值且互不阻塞；进行中的自身写入会挡住 Host 回声。全部结算后，accepted Host snapshot 与乐观选择不一致时重新 adoption，并在 Themes 行显示可本地化的保存失败。`saveError` 只是这次失败的界面标记，不是第二份持久设置。

导入数据流：隐藏 file input 读文件 → `inspectThemeFile` 校验并附对比度摘要（计入在途写入的 id 冲突）→ Modal 确认（重复 id 时先经三选对话框）→ `saveImportedTheme` 以 `editableImportedSources()` 为合并基准写入 `importedThemes`（在途请求优先，否则 accepted 原始数组，无法解析的条目逐字保留）→ Host 采纳后 imported 分区替换 → `previewWhenImported` 等待 runtime 结算并核对 accepted 源文件后，对更新过的 id 触发 transient preview。确认前会按 catalog 与在途写入重查 id：已过期仍判冲突则回到三选对话框，`append` 兜底走 keep-both 改名，不写持久重复 id。导出走 `sourceOf` 原样回写（imported）或 `themeFileForPreset` 重建（builtin，id 改写为 `user.` 前缀）。删除激活的导入主题不写 `activeThemeId`——由 adoption 期的 unknown-id 修复回落 Default。

### catalog 与校验

Client `apply` 首先创建唯一 `ThemeStudioRegistry`，调用 `ctx.provide('themeStudio', Object.freeze({ catalog }))`。设置通道 child 启动的 runtime 使用同一实例作 catalog；实现了 `ImportedThemeSink` 的 catalog 被结构检测为 imported 分区 sink，因此两个视图不可能分叉。每份 ready Host snapshot 把 `importedThemes` 解析为 imported 分区并原子替换，再结算 `activeThemeId`——导入 id 因此不会走 unknown-id 修复路径。`validate` 每次按当前冻结 preset 计算新报告，报告和 checks 都不可变；registry 提供 `revision`/`subscribe` 供 UI 投影，但报告本身没有变化流或缓存失效协议。校验既不写设置也不安装 overlay。

## Lifecycle

| 时机 | provider | runtime/UI |
| --- | --- | --- |
| Client 必需服务满足，apply 运行 | 立即提供 catalog | 等待实际 settingsScope 或 configForms |
| 设置 child 初次启动 | 同一 provider | 启动 runtime、注册字典、监听、槽位 |
| Host snapshot loading | 可发现 | 显示读取状态，不凭未就绪值替换 durable 状态 |
| 设置 child 停止 | 保持 | effect 释放 overlays、字典、槽位、监听；清 startOnce guard |
| 设置重供/切换另一 transport | 保持同一 catalog | 新 child 可再次启动 |
| Client 插件卸载 | Cordis 撤销，消费者停止 | 所有 child 随 fiber 释放 |
| Client 插件重载 | 新 catalog，新 provider | 从 Host accepted snapshot 恢复，消费者重新运行 |

两个 transport callback 必须保持不同函数身份，Cordis 以 callback 身份作为注入 plugin runtime 的 key。startOnce 只由成功拥有启动的 child 释放；不能让没有启动的 child 清空 guard。

## Error Handling

未知持久 id 会移除两层、恢复默认、发起设置修复；未知显式 activate/preview id 抛错。adapter 拒绝不完整键对与非字符串。disposed runtime 的写方法抛错，dispose 幂等。对比度不支持的语法返回 unknown、保留 reason，不能因解析失败跳过该 check。重复 builtin id 在构造时抛错；导入文件携带结构化错误码（`not-json`/`too-large`/`invalid-id`/`reserved-id`/`builtin-id`/`unsupported-version`/`invalid-color`/`invalid-override-name` 等）整文件拒绝，重复导入 id 由对话框交给用户选择覆盖或自动改名。

Host.set 返回 `false` 或 Promise rejected 时，runtime 按 accepted snapshot 回收敛，Themes 行显示 `status.saveFailed`。renderer/style 载入错误仍由宿主报错。构建 helper 注入的静态 CSS 标签幂等保留，不应把 runtime 的 overlay 清理描述成所有 CSS 标签也被卸载。排查见 [troubleshooting](../troubleshooting/README.md)。

颜色 overlay 在进入 `overrideTokens` 前去掉官方字体变量。正文字体、代码字体、终端字体和三类字号仍由官方 `ui-theme` 设置与 ThemeRuntime snapshot 拥有；0.2.1-alpha.2 的终端直接消费 snapshot 字体字段，正文和代码尺寸则由 ThemePresenter 写成 CSS 变量后再套颜色 token。

## Compatibility

Host 通过公开 settings 方法探测结构；Client 分别 inject transport，避免读取 proxy 未注入服务。官方 loader 从 bare package row 扫描 `dsh.client` metadata。Headless 只加载 Host，Client catalog 不存在。所有依赖通过 registry semver/精确 peer 范围表达；tsconfig 自包含。详细版本证据以[矩阵](../development/dsh-compatibility.md)为准。

## Alternatives and Decisions

选择原因分别记录在 [ADR 目录](../decisions/README.md)：overlay 替代 CSS presenter、双 settings transport 替代单一新版 API、官方包注册替代自定义插件页、派生 chrome 替代只有 13 个 token、诊断报告替代自动改色、readonly catalog 替代第三方动态注册。

## Risks and Validation

语义 token 名与实际 host 使用场景可能随上游变化；公开 token 对比度报告不能推导真实 DOM 的完整符合性。`color-mix(in srgb)` 和 resolver 的支持子集必须同时更新。store 与 service 必须继续共享 catalog。相关 seam 已纳入测试；跨版本、平台与真实磁盘旅程的实际证据和未覆盖范围由[兼容矩阵](../development/dsh-compatibility.md)维护。验收文件、日期和历史提交见[需求](../requirements/theme-studio.md)与 completed 计划。
