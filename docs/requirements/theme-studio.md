# Theme Studio 开发需求

## Status

Current，2026-10-02 依据当前实现与提交历史追溯整理；2026-10-22 增补 ADR-0011 手动创建功能，同日增补手动编辑器两栏界面与色值输入组件（当前分支，未发布）。本文记录已经实施的行为和明确延后的方向，不假定存在未提供的原始 PRD。

## Background

DSH 官方 Appearance 提供 Light、Dark、System 与主题呈现。用户需要在保留这一偏好与宿主生命周期的前提下浏览其他配色、临时预览、持久化选择，并让主题随官方明暗切换。插件必须从独立仓库安装，能够作为 Desktop runtime 的 subtree 镜像，也能在标准 DSH Web 中运行。

## Goals

1. 在设置 → 通用 → 主题提供默认与内置主题选项列表，与官方外观行保持顺序和视觉层级。
2. 保持官方外观所有权，通过 token overlay 改变配色。
3. 将预览与持久选择分离，允许取消预览、应用预览和恢复默认。
4. 在 Host 设置就绪、插件重启、设置服务停止/重供时正确恢复 UI 与覆盖层。
5. 自动发现语义配对的对比度不足或无法计算，不用手工可读性判断代替报告。
6. 提供只读 Client catalog，让其他插件发现当前主题（含导入主题）与校验报告。
7. 提供公开的 `dsh-theme.json` 文件格式，支持导入、导出、管理与持久化用户主题。
8. 保持独立构建、公开声明、可打包发布与受测版本兼容契约。
9. 提供可选的 Theme Creator 能力：经用户手势唤起 skill 产出主题文件，默认不进入模型目录。
10. 提供独立于 AI 能力的手动创建表单，以现有主题为基底生成同格式的新主题。

## Non-goals

当前不提供第三方主题注册 API、主题就地编辑、编辑器内实时 overlay/图形预览、持久草稿、远程主题库或网络拉取。不新增模型工具、不改写系统提示、不替代官方 ThemePresenter；Theme Creator 的产出仍需用户经现有导入流程确认后才进入 durable settings，skill 自身不安装 overlay、不写设置。不为本包添加 Electron、preload、Desktop provider、Node 客户端能力或文件/网络授权——导入导出仅通过浏览器 file picker 与 Blob 下载完成，`lib/validate-theme.js` 是由用户在会话中显式运行的校验工具而非插件运行时能力。后续方向在[路线图](../plans/active/2026-10-02-theme-studio-roadmap.md)维护，未设定发布版本或交付日期。

## Functional Requirements

| 编号 | 当前要求 | 验收依据 |
| --- | --- | --- |
| F1 | Themes 行 `id=themes`、`order=10.5`，位于官方 Appearance（10）与字号（11）之间 | `apply.client.spec.ts` 的注册断言 |
| F2 | Default 使用 `null`，不是可注册的内置 id | runtime、catalog 和 UI 测试 |
| F3 | 浏览按内置目录顺序提供八个主题，文案中英切换 | presets、NAME_KEYS 与 locale 测试 |
| F4 | Preview 不调用 Host 写入，后续预览替换同一 preview source | runtime 预览测试 |
| F5 | Cancel 删除 preview；Default 预览取消时恢复原 active 层 | runtime 单测与官方 ThemeRuntime 行为矩阵，包含 Default 预览取消且不写设置的回归场景 |
| F6 | Apply 与 Apply Preview 写入 `activeThemeId`；持久快照最终为准 | runtime 应用、回收敛测试 |
| F7 | 重启从 ready Host 快照恢复；未知持久 id 清理为默认并尝试修复设置 | runtime 恢复与未知 id 测试 |
| F8 | Light/Dark/System 仍由官方主题服务控制，overlay 提供完整明暗 token 对 | adapter 与官方 bundle 集成 |
| F9 | 卸载删除两层 overlay、监听器、UI 槽位与字典 | runtime 与 client apply 测试 |
| F10 | settingsScope / configForms 按真实能力选择；服务重供后可重新启动 | settings 双路径与 transport 切换测试 |
| F11 | Host 无 settings 时安全为空操作；headless 不启动 Client UI | Host 空服务测试与 manifest 分离 |
| F12 | `validateThemeContrast` 完整收集两种模式的 passed/failed/unknown | contrast 测试与实际报告 |
| F13 | unsupported/missing/cyclic 色值与未解析透明背景不能静默通过 | 色值 resolver 负例 |
| F14 | catalog `list/get/validate` 同步、只读，未知 id 返回 undefined | catalog 测试 |
| F15 | catalog 可在设置 ready 前发现，设置通道变更不撤销服务 | provider/consumer 生命周期测试 |
| F16 | 消费者随 Cordis provider 卸载停止、重供后重启 | 真实 Cordis 注入测试 |
| F17 | `dsh-theme.json` v1 按 [文件格式](../reference/theme-file-format.md) 校验；色值限 resolver 子集；解析失败整文件拒绝 | `theme-file.spec.ts` 正反例与 JSON Schema 一致性 |
| F18 | 菜单 footer 提供 Import/Manage；导入经确认对话框后写入 `importedThemes` 并自动预览 | `ThemeStudioRow.spec.tsx` 与 `theme-import.spec.ts` |
| F19 | 重复导入 id 必须弹窗由用户选覆盖或自动生成新 id，不做静默选择 | `theme-import.spec.ts` 与 UI 测试 |
| F20 | Manage 对话框对 builtin 仅导出，对导入主题提供导出与删除；删除激活主题回落 Default | UI 与 runtime 回落测试 |
| F21 | 导出名 `<id>.dsh-theme.json`；导入主题原样回写，builtin 导出改写为 `user.<短名>` 可回导 | `theme-file.spec.ts` 往返用例 |
| F22 | Host 无法解析的导入条目被跳过并计入 `droppedImports`，不影响其余条目与 activeThemeId | settings 与 runtime adoption 测试 |
| F23 | `creatorAgentMode` 提供 `off`/`gesture`/`catalog` 三档，默认 `gesture`；未知值规范化为默认 | schema 与 `creatorAgentModeOf` 测试 |
| F24 | Host 按 accepted 快照驱动 `dsh-theme-creator` 注册：`off` 不注册，`gesture` 仅用户手势可见，`catalog` 模型可路由；模式翻转先 dispose 再 register，fiber 释放即注销 | `creator.spec.ts` 生命周期测试 |
| F25 | `lib/validate-theme.js` 输出结构化 JSON：格式失败含错误码，合法文件附对比度报告；用法错误退出 2，校验未过退出 1 | `validate-theme.spec.ts` 正反例与构建产物冒烟 |
| F26 | 菜单 footer 在 `creatorAgentMode !== 'off'` 时提供「创建自己的主题」；`startSession` 两参签名可用时打开 Cordis 会话并预填 `/dsh-theme-creator `（不自动发送），否则弹出本地化手动输入提示 | `ThemeStudioRow.spec.tsx` 门控与降级测试 |
| F27 | 插件管理页（`plugins.bundle.config`）以 Menu 选择器写入 `creatorAgentMode`，控件样式与官方设置行一致；settings 离开 `ready` 时控件禁用、菜单收起且回到 `ready` 不自动重开，写入被拒时在选择器旁显示可本地化的保存失败；无该 slot 的宿主（0.1.5、0.1.6-alpha.1）保持已存储或默认档位 | `CreatorConfigSection.spec.tsx` 测试 |
| F28 | 「手动创建主题…」独立于 skill，仅在 settings ready 时可用；基底任选内置或已导入主题，保存仅新建 | `ThemeStudioRow.spec.tsx`、`apply.client.spec.ts` |
| F29 | 编辑面从 preset 编译键集派生（当前每 scheme 145 个）：一级类别单选、二级分组多选过滤，分组折叠、懒渲染并可搜索；每个 token 显示本地化用途说明，两侧字段有可见明暗标签、错误关联及定位 | `theme-editor.spec.ts`、`ThemeEditorDialog.spec.tsx`、CSS 编译测试 |
| F30 | palette 原样拷贝；以不含 overrides 的派生 token 为差异基准，任一侧变化写入对称键；面外 overrides 原样保留，仅改名复制保持两侧完整 token map 等价 | `theme-editor.spec.ts` |
| F31 | name 必填；id 自动 slug/去重且可手改，复用完整 id 校验；输入与确认均查 catalog/在途写入，占用只改名或返回编辑，不提供覆盖 | editor、dialog、Row 与 Client 注入测试 |
| F32 | 色值按 `checkColorSyntax` 校验并保留表达式原文；保存前序列化检查 UTF-16 长度与 UTF-8 字节上限，再整体回环校验；错误阻塞并指向可编辑字段或全局来源 | editor 的边界、中文多字节、回导测试与 dialog 错误定位测试 |
| F33 | 草稿由 row 内存持有，关闭、在途写入与 Host 拒绝后重开保留；settings 非 ready 禁止保存；对比度摘要仅诊断，failed/unknown 不阻塞 | dialog、Row 重试旅程与 Client 拒绝采纳测试 |
| F34 | imported 色块从各 scheme 的完整编译 token map 解析为独立颜色；无法求值或需 backdrop 的透明值用 `null` 占位，不受当前页面变量影响、不阻止使用 | `theme-file.spec.ts`、`contrast.spec.ts`、Row 占位测试 |
| F35 | 手动创建对话框为左右两栏：左栏基底与元信息，右栏独立滚动的 token 面板，窄屏退回单栏；顶部通栏集中呈现可点击定位的校验错误与对比度摘要 | `ThemeEditorDialog.spec.tsx`、CSS 编译测试 |
| F36 | 色值字段按当前值自动分派字面色/表达式两种输入并可手动切换：字面色提供内嵌色块与调色板 popover（基底 palette 与标准色、`input[type=color]` 取色、hex 预览）；表达式保留原文，色块按当前草稿完整 token map 解析、不可求值显示占位，附结构化 `color-mix(in srgb, A P%, B)` 拼装器；未触碰的表达式保存原文 | `ThemeEditorDialog.spec.tsx` |

## Non-functional Requirements

### 可移植性与包边界

`platform:web` 与 registry semver 依赖是硬约束。Host 主入口只负责设置；Client 编译为宿主 loader 可加载的浏览器 bundle。不能依赖外层 monorepo 的相对 tsconfig、`workspace:` 协议或 Desktop 的主题实现。验证参考[包契约](../reference/settings-and-package-contract.md)与 [ADR-0001](../decisions/ADR-0001-portable-token-overlays.md)。

### 状态一致性

Host accepted snapshot 是持久 authority；preview 不进入 durable settings。每个 source 只有一个逻辑 overlay。store 是 runtime 的投影，不能成为第二持久源。新 revision 必须大于旧 revision 才能同步。disposed runtime 拒绝后续写动作，并让未完成写入不再驱动本地恢复。

### 可读性与诚实诊断

默认规则覆盖普通文字、链接、状态文字、代码语法、toast/tooltip/menu 与焦点指示。普通文字阈值为 4.5:1，焦点指示为 3:1，比较不能先四舍五入。范围、色值语法、透明合成、基线与未覆盖项以[对比度参考](../reference/theme-contrast.md)为准。内置主题有失败配对；当前不能声称所有主题或完整宿主 UI 符合 WCAG。

### UI 与可访问性

主题选择器与官方语言行一致：`aria-haspopup=menu`、带 `aria-expanded` 的 selector 按钮显示已应用主题并展开共享 Menu；选项悬停预览，菜单关闭（指针离开、外部点击、Esc 或再次点击选择器）恢复，点击应用，选中项带尾随勾选；预览消息通过 polite live region 告知；色块为装饰性 aria-hidden。主题行 CSS 消费宿主语义 token，色块样本使用预览颜色。当前 Mosaic 固定显示 light 样本，不能把 preview.dark 数据存在解释成 UI 已自动随 Appearance 切换样本。

### 兼容性与验证

支持范围只由精确清单决定，静态声明与安装树不能漂移。业务逻辑依赖稳定本地适配面，而非散布版本字符串判断。当前运行时不执行 Node 包探测；宿主 peer admission 与开发/CI 检查各有职责。测试证据与未覆盖范围见[矩阵](../development/dsh-compatibility.md)。

## Acceptance and Limits

Stage 1 的状态迁移、恢复与 settings 适配已由单测和官方 ThemeRuntime 发布 bundle 集成验证；Stage 2/3 的初始证据来自 commit `509b88e` 和 2026-10-02 全部十版矩阵。后续工程迁移的真实 Web profile、浏览器磁盘持久化旅程与跨版本复验，以及跨平台呈现、视觉和 WCAG 的未覆盖边界，以[兼容矩阵的有日期证据](../development/dsh-compatibility.md)为准。历史测试不自动覆盖之后的未发布改动。

Host 拒绝保存时，界面恢复 accepted snapshot 并显示可重试的失败提示。重叠的应用按顺序提交，最新选择会在更早的 `set` 结算后再写入，避免旧的成功结果后落盘。结算完成后，accepted snapshot 仍覆盖乐观选择。官方字体和字号不属于 Theme Studio 的持久字段。
