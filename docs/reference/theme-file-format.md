# `dsh-theme.json` 文件格式 v1

## Status and Scope

Current，v1。本文是主题文件格式的唯一真源；解析器实现见 [theme-file.ts](../../src/client/theme-file.ts)，随包发布的 JSON Schema 见 [schemas/dsh-theme.schema.json](../../schemas/dsh-theme.schema.json)。文件一次只携带一个主题。

## 示例

```jsonc
{
  "$schema": "./dsh-theme.schema.json",
  "version": 1,
  "id": "user.ocean",
  "name": "Ocean",
  "description": "Cool blue palette.",
  "author": "optional",
  "palette": {
    "light": {
      "bgBase": "#f4f8fb", "bgLayer1": "#ffffff", "bgLayer2": "#eef3f7",
      "bgOverlay": "#ffffff", "borderL1": "#d7e0e8", "borderL2": "#c3d0da",
      "brand": "#2b6cb0", "labelPrimary": "#1b2a3a", "labelSecondary": "#51606f",
      "error": "#b3282d", "success": "#22793d", "warn": "#975a16",
      "sidebar": "#eef3f7"
    },
    "dark": {
      "bgBase": "#101820", "bgLayer1": "#1a2430", "bgLayer2": "#223040",
      "bgOverlay": "#101820", "borderL1": "#2c3c4e", "borderL2": "#3a4d63",
      "brand": "#63a4d8", "labelPrimary": "#e6edf3", "labelSecondary": "#9fb0bf",
      "error": "#f0838a", "success": "#6cc596", "warn": "#e0b56a",
      "sidebar": "#1a2430"
    }
  },
  "overrides": {
    "light": { "--shiki-token-keyword": "#9a2c9a" },
    "dark": { "--shiki-token-keyword": "#d8a0d8" }
  }
}
```

## 字段

| 字段 | 必填 | 规则 |
| --- | --- | --- |
| `$schema` | 否 | 编辑器提示字符串；非字符串值被拒绝（`invalid-metadata`），字符串值不参与解析 |
| `version` | 否 | 省略视为 `1`；显式 `null` 及其他任何值拒绝（`unsupported-version`） |
| `id` | 是 | `^[a-z0-9][a-z0-9.-]{0,63}$`；不得使用 `dsh-theme-studio.` 前缀；`default`/`light`/`dark`/`system` 为保留名 |
| `name` | 是 | 非空字符串，菜单中按原文显示；不是本地化对象 |
| `description` | 否 | 字符串，显示在确认与管理界面 |
| `author` | 否 | 字符串，原样保存 |
| `palette` | 是 | `light` 与 `dark` 各含全部 13 个字段，不得多/缺字段 |
| `overrides` | 否 | `light`/`dark` 稀疏 token 覆写；两侧键集合必须相同 |

`palette` 的 13 个字段为 `bgBase`、`bgLayer1`、`bgLayer2`、`bgOverlay`、`borderL1`、`borderL2`、`brand`、`labelPrimary`、`labelSecondary`、`error`、`success`、`warn`、`sidebar`，与 builtin preset 的 [ChromePalette](./theme-tokens.md) 一致。`deriveChrome()` 把 palette 展开为完整 token 面，`overrides` 叠加在派生结果之上。

顶层不允许 `palette`、`overrides` 之外的未知字段（例如 `preview` 会被拒绝——四色样本从 palette 派生）。嵌套对象同样拒绝多余字段。

## 色值语法

色值限官方 resolver 支持的子集（真源 [contrast-colors.ts](../../src/client/contrast-colors.ts)）：

- `#rgb`、`#rgba`、`#rrggbb`、`#rrggbbaa`；
- `rgb()`/`rgba()` 逗号或空格/斜杠写法；
- `transparent`、`black`、`white`；
- `var(--token[, fallback])`，文件期只做语法校验，目标 token 不存在由对比度诊断报告；
- `color-mix(in srgb, …)`；
- 裸 `--token` 值被拒绝——文件中必须写 `var()`。

## `overrides` 规则

- token 名必须以 `--dsw-`、`--shiki-` 或 `--dsh-` 开头；
- 官方字体设置拥有的变量（`--dsh-font-family-*`、`--dsh-content-font-size`、`--dsh-code-font-size`、`--dsh-terminal-font-size`、`--dsw-font-family`、`--dsw-font-family-brand`）被拒绝，与 [font-boundary.ts](../../src/client/font-boundary.ts) 同一清单；
- `overrides.light` 与 `overrides.dark` 的键集合必须完全相同。

## 文件与导入约束

- 单文件单主题；大小上限 128KB；解析或校验失败整个文件被拒绝，不会导入半个主题。
- 与内置 `dsh-theme-studio.` 命名空间冲突的 id 无法通过格式校验；与已导入主题撞 id 时由 UI 弹窗选择覆盖更新或自动生成 `id-N`；添加数字后缀前按需截短原 id，保证结果不超过 64 字符，并逐个检查冲突。
- 导入与管理入口仅在 settings ready 时启用；确认导入、覆盖与保留两份同样受此限制，避免基于未加载的目录替换持久列表。
- 存储的原始文件对象位于 `theme-studio.importedThemes`（见[设置契约](./settings-and-package-contract.md)），Host schema 只做宽松结构校验；严格解析在 Client，无法读取的条目被跳过并计入 `droppedImports`。
- 导出的文件名是 `<id>.dsh-theme.json`；导入主题原样回写其存储文件，内置主题导出时 id 改写为 `user.<短名>` 以便回导。

## 命令行校验器

`lib/validate-theme.js` 随包发布（第三构建入口，在 `files` 清单内但不在 `exports` 中，以文件路径取用），供 Theme Creator skill 与用户手工校验使用：

```sh
node lib/validate-theme.js <theme.dsh-theme.json>
```

stdout 打印结构化 JSON：`format.ok` 表示文件通过本文件的格式校验（失败时附 `error.code` 与 `error.path`）；格式合法时附 `contrast` 报告（`passed`、`total`、`failed`、`unknown` 与逐条 `issues`）。退出码：`0` 校验通过；`1` 校验未过——包括格式拒绝、读取失败与含 `failed`/`unknown` 对比度检查；`2` 用法错误。`ok` 字段聚合全部结论；`ok:false` 不等于"不可导入"——低对比度在客户端同样只是诊断，不阻止导入与应用（见 [ADR-0006](../decisions/ADR-0006-contrast-diagnostics-scope.md)）。

## 版本策略

`version` 是文件格式版本，不是插件版本。当前只存在 1；未知更高版本被拒绝而非猜测解析，等插件升级后再导入。`$schema` 的字符串值对解析透明（类型仍按公开 schema 校验），升级格式时应同时更新本文件与 `schemas/dsh-theme.schema.json` 并补充一致性测试。

## 验证

`tests/client/theme-file.spec.ts` 覆盖正反例、色值子集、override 规则、builtin 往返导出与 JSON Schema 双向一致性；`theme-import.spec.ts` 覆盖重复 id 决策与持久化合并。
