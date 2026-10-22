# 手动主题编辑器 Phase 1 实施计划

## Status

Active，2026-10-22。依据已接受的 [ADR-0011](../../decisions/ADR-0011-manual-theme-editor.md)，在当前 `feat/user-manul-design` 分支按下列顺序实施；尚未发布。

进展（2026-10-22）：Phase 0–3 已实施，各阶段窄验证通过（docs:check、对应 vitest 套件、typecheck）。提交因环境署名要求与「不带署名」条件冲突暂缓，各阶段产物以 checkpoint patch 保存在仓库外，尚未形成 commit。

## Goal

在 Themes 菜单提供独立的手动创建入口，基于内置或已导入主题编辑全部 preset token，生成可导出回导的 v1 主题文件，通过既有 imported 持久化链路保存。

## Background

技术评审已决定保留 palette+overrides 模型、仅新建不覆盖、手动入口不依赖 AI 能力、草稿仅存内存。需求细节及替代方案由 ADR-0011 负责，本计划只维护实施顺序、设计接缝与验收证据。

## Current State

- `theme-file.ts` 已提供严格对象校验、编译、序列化和去重；id 校验目前为私有函数，需共享而不复制规则。
- `compileThemeFile` 的 preview 仍从 palette 四字段生成，不能反映 overrides，需先独立修正。
- `theme-import.ts` 已处理在途写入、append 去重、accepted snapshot 采纳后预览及导出删除。
- `ThemeStudioRow` 已拥有 Menu、Modal 与导入对话框状态，可承载 editor kind 和跨关闭保存的草稿。
- runtime、store、catalog 的持久化及所有权不需要改变；本轮不触及 settings transport 或支持版本清单。
- 开始时已有用户未提交的 ADR-0011 及双语 decisions 索引；保留其评审内容，并随需求计划提交纳入分支。

## Scope

1. 修正所有 imported 主题的四色样本，扩宽公开 `ThemePreview` 以表达不可解析颜色。
2. 从 preset 编译键集动态生成编辑面与前缀分组，包含每 scheme 当前全部 145 个 token。
3. 基底任选 builtin/imported；元信息、明暗输入、过滤、折叠分组、即时校验和保存前对比度摘要。
4. 序列化 UTF-16 长度及 UTF-8 字节数双检查，整体回环校验后仅 append。
5. 保留关闭、等待写入及保存失败时的内存草稿；复用保存失败提示及 imported 管理功能。

## Non-goals

不提供已导入主题就地编辑、任意 token 添加、实时 overlay 或图形样张、撤销栈、持久草稿、格式 v2、远程主题库、依赖升级或本轮发布。不改写 Theme Creator skill、prompt、评分配置、对比度阈值或既有低对比度配色。

## Design

### Preview

`ThemePreview` 四项采用 `string | null`，`null` 是明确不可解析标记。在 `contrast-colors.ts` 复用已有 resolver 增加展示专用转换，成功且不需 backdrop 时输出独立 `#rrggbb`，否则返回 `null`；不得更改对比度计算精度。

`compileThemeFile` 先生成两侧完整 token map，再分别解析 bg-base、bg-layer-1、label-primary、brand-primary。Mosaic 仅对 null 画中性斜纹占位，不把未解析表达式交给浏览器。builtin preset 工厂及固定 light 样本的现有 UI 行为不变。

### Editor Model

新增 DOM-free `theme-editor.ts`，负责草稿类型、基底快照、编译初值、动态编辑键/分组、slug/id、diff 和 source 校验。

- 基底快照包含完整 palette 与已有 overrides；切换基底明确重置 token 值，不隐式复用旧基底的修改。
- 初始值取基底编译 token 原文。diff 基准只取 `deriveChrome` + `baseAliasTokens`；任一 scheme 不同则写两侧，面外 overrides 原样保留。
- 复用导出的完整 id 校验；name 必填，默认 id 为 `user.` + ASCII slug（无 ASCII 字符则用 `theme`），截断至 64 字符并去重。用户手改 id 后不再被 name 自动覆盖。
- 先序列化并检查两个上限，再整体 `validateThemeFileData`；错误包含字段路径。色值输入按 `checkColorSyntax` 校验，原始表达式不做展开。
- 对比度摘要基于合法候选编译结果，failed/unknown 仅作诊断，不作为保存条件。

### UI And Injection

`ThemeEditorDialog.tsx` 使用既有 Modal/Button 和宿主语义 token。row 保有受控草稿，关闭只隐藏，不销毁草稿内容。长表单使用有界滚动区；前缀分组仅展开时渲染输入，搜索可定位 token；每个输入有可访问标签和错误关联。

注入面增加 `createEditorDraft(baseId)` 和 `editorTakenIds()`：前者从 registry 取得不可变基底与原始 source 并交给纯函数，后者合并 catalog 和 `runtime.editableImportedSources()` 的 id。UI 不接触 Cordis 服务或持久源。

入口与保存仅看 `settingsStatus === 'ready'`。输入和确认时均重新检查占用；撞 id 提供生成新 id 或返回修改，不出现覆盖按钮。保存调用既有 `saveImportedTheme(source, 'append')`（其同步兜底仍保留两份），其注入包装继续负责 `previewWhenImported`。请求发起后保留草稿，避免 Host 拒绝或尚未落盘时丢失编辑内容。

## Implementation

### Phase 0: 需求与计划

记录本计划、双语 plans 索引及 roadmap 的 Active/未发布状态；保留 accepted ADR 的历史。运行 `pnpm docs:check` 后提交需求计划。后续每阶段提交前由主审查完整 diff，不添加 Generator 或 Co-authored-by 署名。

### Phase 1: 独立修正 imported Preview

实现展示 resolver、null 预览类型、编译后四色样本和 Mosaic 占位；同步双语文件格式参考与 catalog 公共类型说明。独立提交，不能与编辑器本体混合。

验收：普通 overrides、面外 var、自引用/循环/缺失、不支持语法、透明无 backdrop、嵌套 mix、两侧各自解析及 builtin 往返不变；候选色块不含 var/mix 原文，改变页面变量不会改变其颜色。

### Phase 2: 纯函数与保存产物

实现模型和共享 id 校验。测试初值原文、对称 diff、还原至派生基准、面外保留、全 map 仅改名等价、palette 不变及基底不被修改；测试 slug、保留/内置/非法/超长 id、已占用 id。检查纯 ASCII、中文多字节元信息、长合法表达式、等于上限与超出上限，成功产物须可序列化再解析。

### Phase 3: 编辑对话框与菜单

实现受控草稿、选择基底、元信息、分组/过滤、明暗输入与错误定位、摘要、保存和关闭；接入注入面及 zh/en locale。

测试入口在 AI 关闭/缺能力时可用、非 ready 禁用；全部编译键都有可达输入；非法色值/id/大小禁保存；catalog/在途撞 id 输入与确认两阶段防护且无覆盖；关闭/重开、未落盘及 Host 拒绝后草稿不丢；低对比度和 unknown 不阻塞。

### Phase 4: 集成、文档与收尾

补全真实 Client 注入路径、accepted 后 imported 卡片/预览、导出回导及既有删除回落回归。同步 canonical requirements、architecture、相关 reference、根双语 README、双语 CHANGELOG Unreleased 与路线图。根 README 两版语义复核后重录 `README.i18n.yaml`。

最终 gate 一次执行 `pnpm verify:all`；若环境缺失只记录真实阻塞与未运行项，不伪造通过。完成后将计划移到 completed，修正双语索引与所有链接，记录实施提交和实际验证证据，再运行 `pnpm docs:check`。

## Validation

各实现阶段只运行覆盖变更的窄测试及必要类型检查；Phase 1 包含 theme-file/contrast/catalog/Row，Phase 2 包含 editor/theme-file，Phase 3 包含 dialog/Row/apply/theme-import。最终完整 gate 不在每个阶段重复执行。

当前未修改 settings seam、兼容清单或版本依赖，不把历史十七版本矩阵当作本轮已复验；全版本隔离安装和真实浏览器/跨平台视觉验证未执行时需显式记录。任何网络安装或额外权限先征得用户同意。

## Risks

- 全量 290 个值应可达但不一次铺满；搜索和折叠必须保留错误位置及草稿。
- 文件大小是整体限制，不只是单字段字符数；UTF-8 与 UTF-16 两个边界不能互相替代。
- imported 基底可能引用编辑面外变量；仅验证面内 diff 不足以保证完整等价。
- Host accepted snapshot 才是 durable 成功；关闭对话框不能代表落盘成功，也不能清空失败草稿。
- `ThemePreview` 类型扩宽属于公开面，消费者必须知道 null 的语义；不返回伪造颜色。

## Documentation Impact

ADR 负责选择；requirements 负责验收；architecture 负责组件与数据流；file-format/catalog reference 负责公共语义；roadmap 负责进度和未发布状态；CHANGELOG 只记录用户可见变更。双语 README 同步并互链，不复制整份 ADR。

## Completion Criteria

按顺序形成需求计划、preview 修正、编辑模型、UI 与收尾提交；所有本轮实际执行的 gate 如实记录，无未解决的相关失败；编辑产物可往返、无 replace 路径、草稿不因关闭/拒绝丢失；文档同步、计划正确归档，当前分支不发布、不推送，不带 Generator/Co-author 署名。
