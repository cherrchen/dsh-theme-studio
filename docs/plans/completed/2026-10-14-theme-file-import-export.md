# dsh-theme.json 公共格式与主题导入导出

## Status

Completed。2026-10-14 需求对齐确认后建立并实施完毕；功能尚未随 tag 发布。

## Goal

定义并发布公共 `dsh-theme.json` v1 文件格式，支持主题导入（写回 Host 设置）、导出（Blob 下载）与删除；导入主题进入公共只读 catalog，可被其他插件发现与校验。

## Background

路线图将"公共 .dsh-theme.json schema"与"导入导出"列为后续方向，开始前需解决版本、id 命名空间、token/色值范围、元数据、失败策略、文件安全、保存位置、ownership、重复 id、Host/Client 同步等契约。2026-10-14 需求对齐结论：

- 文件内容模型 = `palette`（13 字段 × light/dark 必填齐全）+ 可选稀疏 `overrides`，叠加在 `deriveChrome` 结果之上；不接受完整 token map 或纯 palette-only。
- 导入主题进入公共 `ctx.themeStudio.catalog`；`list()` 语义改为调用时快照，补新 ADR。
- UI 入口 = Themes 菜单 footer + Modal；不破坏点击即应用。
- 重复 id（与已导入主题冲突）弹 dialog 由用户选"覆盖更新"或"自动生成新 id"；与 builtin 冲突直接拒绝。

## Current State

当前 catalog（`BuiltinPresetRegistry`）构造即冻结，settings 仅 `activeThemeId` 一字段，UI 只有选择器；没有文件读写与动态主题来源。

## Scope

- `theme-file` 模块：v1 解析/校验（结构化错误码）、编译为 preset、序列化导出。
- settings 新增 `importedThemes` 字段（Host schema 宽松、Config 路径 volatile、Client 严格解析）。
- preset 保留源 palette；composite registry（builtin + imported）。
- runtime：adopt 时同步 imported、双字段串行持久化、删除激活主题走 unknown-id 修复。
- Themes 行：footer `Import…`/`Manage…`、导入确认 Modal、重复 id Modal、管理 Modal（导出/删除）、双语 locale。
- 随包发布 `schemas/dsh-theme.schema.json` 并验证与 TS 解析器一致。

## Non-goals

不做主题编辑器 UI（改名/改色）、Theme Creator Agent、第三方 register API、远程主题库/网络拉取、多主题 bundle 文件、拖拽导入、`preview` 字段覆写、真实文件系统集成。不在 Host 端做主题校验；不扩大 `platform:web` 权限。

## Design

### 文件格式 v1

```jsonc
{
  "version": 1,
  "id": "user.ocean",
  "name": "Ocean",
  "description": "…",   // optional
  "author": "…",        // optional
  "palette": { "light": {…13 fields}, "dark": {…13 fields} },
  "overrides": { "light": { "--dsw-*": "color" }, "dark": {…} }  // optional
}
```

- `version` 可省略 = 1；>1 拒绝。`$schema` 透传不校验。
- `id`：`^[a-z0-9][a-z0-9.-]{0,63}$`；拒绝 `dsh-theme-studio.` 前缀与 `default/light/dark/system`。
- 色值白名单对齐 resolver 语法：`#hex`、`rgb()/rgba()`、`transparent/black/white`、`var(--token[, fallback])`、`color-mix(in srgb,…)`；`var()` 只做语法校验，解析期未知名走 unknown 诊断。
- `overrides` token 名限 `--dsw-`/`--shiki-`/`--dsh-` 前缀，拒绝官方字体变量；light/dark 键集合必须对称。
- 单文件单主题、≤128KB；解析失败整文件拒绝。

### 持久化与 catalog

- `theme-studio.importedThemes`：数组存校验过的原始文件对象（schema-versioned 源真），Client 编译为 preset；Host schema 宽松（`z.array(z.dict(z.any()))`），严格校验在 Client，未知 version 条目跳过不丢数据。
- composite registry：builtin 不可变 + imported 可替换；`list()` 返回按 revision 缓存的冻结快照；`get/validate` 覆盖两边；`sourceOf(id)` 返回原始文件供导出回写。
- runtime 在 adopt 内先 `setImported(parseStored(raw))` 再解析 `activeThemeId`，保证不依赖 publish 次序；imported 集合变化时重装 active 层、丢弃失效 preview。
- 写队列泛化为 `{field, value}` 逐字段合并，串行 drain；结算后统一 reconcile，rejected → saveError。
- builtin 导出改写 id 为 `user.<short>` 保证可回导；imported 导出原样回写。

### UI

- 菜单：Default → builtins → separator + `group.imported` label → imported（存储顺序）；footer `action.import` / `action.manage`。
- 导入：`<input type=file>` 单选 → 解析 → Modal 确认（名称/id/对比度告警计数）→ `set(importedThemes)` → 自动 preview。
- 重复 id Modal：覆盖更新 / 自动生成新 id（`id-2` 递增）/ 取消。
- Manage Modal：builtin（仅导出）+ imported（导出 + Remove danger）；删除激活主题自动回落 Default。
- settings `unavailable` 时导入/管理禁用。

## Implementation

| 阶段 | 内容 |
| --- | --- |
| 1 | `src/client/theme-file.ts`：类型、解析/校验、编译、序列化；contrast-colors 暴露色值语法校验 |
| 2 | `constants.ts`/`settings.ts`：`importedThemes` 字段与宽松 schema、Config volatile |
| 3 | `presets.ts`：`BuiltinThemePreset.palette` 保留源 palette |
| 4 | `catalog.ts`：`ThemeStudioRegistry` composite + `sourceOf` + revision 缓存 |
| 5 | `runtime.ts`：imports sink、双字段队列、层重装/preview 失效处理 |
| 6 | `client/index.ts` + `store.ts`：动态 cards、注入 import/export/remove 动作 |
| 7 | `ThemeStudioRow.tsx` + css + `locales.ts`：footer、隐藏 file input、三个 Modal、错误/告警文案 |
| 8 | `schemas/dsh-theme.schema.json` + files 清单 + ajv 一致性测试 |

## Validation

- 新增 schema 正反例（含 JSON Schema 双向一致性）、迁移默认值、composite catalog、runtime 导入/删除/覆盖/并发写、UI 交互测试；vitest 24 个文件 208 个用例全绿。
- `typecheck`（host+client）、`lint`、`build`、`audit:tokens`、`verify:package`、`smoke:theme`/`smoke:compose`、`compat:check` 均已通过。
- 不声称真实浏览器文件对话框旅程已验证；UI 覆盖止于隐藏 input/Modal 逻辑的组件级测试。

## Risks

- 动态 list() 语义变更依赖新 ADR；旧 consumer 若缓存数组引用会看到 builtin-only 快照——语义变化需在 catalog reference 明示。
- settings 旧数据无 `importedThemes` 字段 → schema default 补齐；条目损坏跳过并计数。
- configForms 路径下非 volatile 字段写入会抛错，`importedThemes` 必须 liveField。
- 文件色值语法与 resolver 漂移风险 → 语法校验与 resolver 同文件维护并加 parity 测试。

## Documentation Impact

requirements（去掉对应 Non-goal、新增 FR）、architecture（组件/数据流/生命周期）、新增 `reference/theme-file-format.md`、ADR-0009、catalog/settings reference 更新、双语 CHANGELOG、路线图状态与 README 特性描述、`README.i18n.yaml` 重录。

## Completion Criteria

代码与测试全绿、文档更新完毕、`docs:check` 通过；导入主题在公共 catalog 可见且 durable 行为（重启恢复、删除回落、拒绝收敛）由单测覆盖。
