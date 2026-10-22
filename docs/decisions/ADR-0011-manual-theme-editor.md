# ADR-0011: 手动主题编辑器——以 palette 原样拷贝加 overrides 差异落 imported 分区

## Status

Accepted（2026-10-21 初稿；同日经两轮技术评审修订及最终复核后接受。决策已接受，功能未实施，尚未发布）。

## Date

2026-10-21。

## Context

主题现有三条来源：8 套内置 preset（ADR-0005）、`dsh-theme-creator` skill 经 Cordis 会话产出 `dsh-theme.json` 再由用户走导入流程（ADR-0010）、外部 `dsh-theme.json` 文件导入（ADR-0009）。路线图「后续方向」中挂起的「主题编辑器」要求新增改名/改色 UI，既定验收约束为不回退 palette+overrides 模型、编辑结果可导出回导。

2026-10-21 需求确认后，Phase 1 形态定为：Themes 菜单 footer 的独立动作打开编辑对话框，以输入框编辑全部 preset token 面（每 scheme 145 个：136 个 `--dsw-*` + 9 个 `--shiki-*`，明暗合计 290 个值）创建新主题；基底可任选内置或已导入主题；仅新建，不做已导入主题的就地编辑；token 输入的图形化预览延后到后续阶段。

待定型的核心技术问题有三个：

1. **存储形态**。`dsh-theme.json` v1 强制 `palette` 携带完整 13 字段；编辑器改的是编译后的 token 值，不是 palette 字段，二者如何映射。合法基底还可能携带编辑面之外的 overrides（`--dsh-*` 自定义变量、超出 preset 面的 `--dsw-*`/`--shiki-*`），差异算法不能把这些条目弄丢。
2. **入口与门控**。现有「创建自己的主题…」是 skill 路径，受 `creatorAgentMode`（Host accepted 快照）与 `remote.skills`（连接能力）双层门控；手动表单与 AI 能力没有逻辑耦合。
3. **编辑面来源**。token 清单必须跟随 `deriveChrome`/`baseAliasTokens` 演化，不能维护第二份手写名单。

## Decision

1. **存储模型：palette 原样拷贝 + overrides 差异；编辑面外的基底 overrides 原样保留。**
   - `palette` 取基底主题的 palette 原样拷贝。
   - 表单初始值 = 基底**编译后** token（`deriveChrome` + `baseAliasTokens` + 基底 overrides 依序合并）。合并只拼字符串：`var()`、`color-mix()` 等表达式**不解析为颜色**，以原文呈现和保存。
   - 差异基准 = 基底的 **palette 派生 token**（`deriveChrome(palette)` + `baseAliasTokens(palette)`，不含基底自身 overrides）。对编辑面内每个 token：任一 scheme 的编辑值不同于派生基准时，明暗两个值都写入产物 `overrides`，保持文件格式要求的键集合对称。
   - 基底 overrides 中**不在编辑面内**的条目（例如 `--dsh-*` 自定义变量、preset 面外的 `--dsw-*`/`--shiki-*`）按文件格式固有的明暗对称形态**逐条原样并入**产物 `overrides`。这保证指向面外变量的 `var()` 引用不悬空，并使「仅改名复制」的产物与基底在两个 scheme 的**完整 token map** 完全等价（在面走差异通道、面外走保留通道；与派生值相同的冗余 override 会被省略，故产物 overrides 键集不必与基底相等——断言对象是编译 map，不是 overrides 集合）。
   - 基底文件本身已过 `validateThemeFileData`，保留条目天然满足名称、字体与色值规则；产物仍整体回环校验。
2. **入口独立。** 菜单 footer 新增动作（暂定「手动创建主题…」）打开编辑器，仅门控 `settingsReady`，不读 `creatorAgentMode`、`remote.skills`、`uiWorkspace`；skill 关闭或宿主无相应能力时入口照常可用。与既有 skill 入口并存，文案需明显区分。
3. **编辑面取自编译键集。** 可编辑 token 列表 = 当前 preset 编译键集（如 `BUILTIN_PRESETS[0].tokens.light` 的 145 键），按 token 名前缀派生分组；不新增独立 token 名单常量。官方字体 token 与刻意保留的 `--dsw-static-neutral-00`/`--dsw-static-neutral-bluish-00` 不在面内；Phase 1 不提供添加任意新 token 名的入口，面外既有 overrides 由 Decision 1 的保留规则负责。
4. **保存路径复用导入链路，前置序列化上限并收窄撞 id 语义。**
   - 组装 `{version:1, id, name, description?, author?, palette, overrides}` source 后**先序列化**：`serializeThemeFile` 的文本长度按 `THEME_FILE_MAX_LENGTH`（UTF-16 计）与 UTF-8 字节数（`TextEncoder`）双重检查——前者对应 `parseThemeFile` 的解析上限，后者对应 file picker 的 `File.size` 检查；`validateThemeFileData` 只管对象形状，单独用它不能保证导出后可回导。超限即阻塞保存并指出超长字段。
   - 再过 `validateThemeFileData` 回环校验 → `saveImportedTheme`（append 语义）→ `previewWhenImported` 自动预览。
   - **撞 id 只走改名/返回编辑，不走覆盖**：输入时与确认时都对 catalog 与在途写入校验；占用时自动 `uniqueThemeId` 改名或提示用户修改 id。不复用导入三选对话框的「覆盖更新」选项——「仅新建」范围不允许 replace 语义，也避免触发激活中主题重装路径。
   - 新主题落 imported 分区后自动获得菜单分组、Manage 导出/删除、激活中删除回落 Default、`catalog.validate(id)` 诊断。不新增 durable settings 字段。
5. **元信息、逐字段校验与草稿保留。**
   - name 必填；id 默认 `user.` + name slug 经 `uniqueThemeId` 去重，可手改——手改路径校验**完整** id 规则：`^[a-z0-9][a-z0-9.-]{0,63}$`、保留名（`default`/`light`/`dark`/`system`）、内置前缀 `dsh-theme-studio.` 拒绝、catalog 与在途写入占用检查（需要导出或共享 `readId` 级校验逻辑，不在编辑器内复制第二份规则）。
   - 每个色值输入框用 `checkColorSyntax` 即时校验；存在非法值、非法 id 或序列化超限时禁止保存并指向出错位置。
   - 保存前展示对比度摘要（`validateThemeContrast` 计数），仅诊断不阻塞，同 ADR-0006。
   - **草稿保留**：编辑状态由 row/对话框持有而非随关闭销毁；Host 拒绝写入（`saveError`）或写入未落盘时，重新打开编辑器能恢复上次内容供修改重试。草稿只存活在 UI 进程内存，不写 durable 存储，重启丢失属 Phase 1 可接受行为。
6. **菜单色块改从编译 token 派生，并解析为独立颜色。** `compileThemeFile` 的 `preview` 目前完全由 `palettePreview(palette)` 读 palette 四字段生成；palette 原样拷贝意味着用户改 `--dsw-alias-bg-base` 等值后菜单与 Manage 色块仍显示基底颜色。
   - 色块数据源改为**编译后 token map** 的四个 base-alias 值（`--dsw-alias-bg-base`、`--dsw-alias-bg-layer-1`、`--dsw-alias-label-primary`、`--dsw-alias-brand-primary`）。builtin preset 不受影响（`preset()` 工厂不经 `compileThemeFile`）；imported 主题色块从此反映其 overrides——这是对全部 imported 主题的行为修正，不仅是编辑器需求。
   - 但仅换数据源不够：`var()`、`color-mix()` 原字符串写进元素样式后由浏览器在**当前页面主题**中解析，候选主题的红 brand 会显示成当前主题的蓝。因此 preview 生成必须在**候选主题对应 scheme 的完整 token map** 中用与对比度同一套 sRGB resolver 求值，输出独立颜色值（`#rrggbb`/`rgba(...)`，仅展示用途，不参与对比度精度语义）：`light` 样本解析自 `tokens.light`，`dark` 样本解析自 `tokens.dark`；编译 map 已含面外 overrides，自定义变量引用照常解析。
   - 解析失败（缺失引用、循环引用、不支持语法、需 backdrop 的透明值）时该色块走**明确占位**：预览数据以专用标记表示、Mosaic 用可辨识样式呈现，不冒充任一真实颜色，也不阻止主题保存与使用（占位只是色块退化）。具体类型与样式编码由实现定，但预览数据不得携带未解析表达式交给 Mosaic。
   - 文件格式参考中「四色样本从 palette 派生」的表述随实现同步更新。这与编辑器内图形预览是两个问题，后者仍属 Phase 2。
7. **模块拆分沿用既有惯例。** 纯函数层 `src/client/theme-editor.ts`（基底初始值表、diff→overrides 含面外保留、name→id slug、source 组装、序列化大小检查）无 DOM 可单测；`ThemeEditorDialog.tsx` 薄组件挂进 `ThemeStudioRow` 的 `DialogState`，新增编辑器 kind；注入面只增创建相关方法，runtime、store、catalog 零改动。实施时 Decision 6 的 preview 解析修正与编辑器本体分开提交，分别验证。

## Alternatives Considered

| 方案 | 取舍 |
| --- | --- |
| 编辑结果写回 palette 字段 | 表单编辑的是编译后 token：把 `--dsw-alias-bg-base` 写回 `palette.bgBase` 会让 `deriveChrome` 重新派生其余百余 token，用户改 5 项却上百项跟着变，违背所见即所得；且 palette 只有 13 字段，无法表达逐 token 修改。未采用 |
| 全量 token map 直存（事实上的格式 v2） | 破坏 v1「palette+overrides」契约；同版本无法回导该文件，违背路线图「编辑结果可导出回导」验收；新增解析路径。未采用 |
| 编辑面 = preset 键集 ∪ 基底 overrides 键（可变面） | 可变编辑面让分组、校验与「未触碰即保留」语义复杂化；固定 145 键 + 面外原样保留已覆盖等价性需求且更简单。未采用 |
| 丢弃编辑面外的基底 overrides | 已复现的缺陷：`--dsh-*` 自定义变量丢失使面内 `var()` 引用悬空，仅改名复制都不等价。未采用 |
| 色块维持 palette 派生（接受为 Phase 1 限制） | 用户改了背景/品牌色后菜单色块仍显示基底颜色，与编辑器目标相悖；编译 token 派生成本极低、对 builtin 零影响，故选修正而非记录限制 |
| 色块直写 token 原值（含 `var()`/`color-mix()` 表达式） | 浏览器在**当前已应用主题**中解析变量，候选色块显示的不是候选主题的颜色；嵌套 mix 内的引用同样漂移。未采用，preview 必须存解析后的独立颜色 |
| 合并进「创建自己的主题…」做 AI/手动二选一 | 两路径门控完全不同（skill 需要 `creatorAgentMode` + `remote.skills`，表单只需要 settings ready）；合并会让 `creatorAgentMode: off` 误杀手动入口。用户已确认独立入口，未采用 |
| 复用 `creatorAgentMode` 门控手动入口 | 该字段语义是 Host 侧 skill 注册档位，不是 UI 编辑能力开关；耦合会产生语义错乱。未采用 |
| 撞 id 复用导入三选对话框（含「覆盖更新」） | 覆盖把「创建」变成「更新」，突破仅新建范围并引入激活中主题重装路径；收窄为改名/返回编辑 |
| 仅靠 `validateThemeFileData` 回环 | 对象校验不查文件大小：超长元信息可过校验、导出后却被 `too-large` 拒绝，无法回导；增加序列化长度与 UTF-8 字节双检查 |
| Phase 1 支持就地编辑 imported 主题 | 涉及激活中主题重装、id 语义与「创建」动作混杂；延后，现阶段改旧主题走导出→改文件→覆盖导入 |
| 新增编辑器专用 durable 字段（草稿等） | `importedThemes` 已承载全部需求；草稿仅需内存态。未采用 |
| 编辑器内实时 preview overlay / 图形样张 | `runtime.previewTheme` 只收 catalog id，需新增 preset 级预览 API；与图形化预览一并归入 Phase 2 评估 |
| 手维护编辑面 token 名单常量 | 与 `CHROME_TOKEN_NAMES`/`audit:tokens` 纪律冲突，上游演化时会漂移；未采用 |

## Consequences

- 文件格式 v1 不变：schema、`lib/validate-theme.js`、导入/导出/往返测试无需改动；编辑器产出天然可导出回导、可被 skill 与 CLI 校验器共同处理。
- 产物 `overrides` 的键集不局限于 145 编辑面——含基底面外 overrides 的保留条目。这是合法且必要的：文件格式本就允许 `--dsw-*`/`--shiki-*`/`--dsh-*` 任意合规名。
- `compileThemeFile` 的 preview 语义变化：imported 主题色块反映 overrides 并解析为独立颜色，不再随当前已应用主题漂移（更诚实），builtin 不变；需要同步更新文件格式参考的表述与相关测试。`ThemePreview` 需要能表达「无法解析」位（公共类型加宽，属本变更的公开面）。
- catalog 公共语义不变（ADR-0009）：编辑器不引入注册/写 API，新主题仍经 Host `importedThemes` 写入 → accepted snapshot → imported 分区原子替换出现，单向数据流不破。
- 手动创建的主题与文件导入的主题同处 imported 分区，Phase 1 无法也无需区分来源；若未来需要来源标记，需先扩展文件格式（顶层未知字段当前被拒），属独立决策。
- 编辑器的撞 id 路径没有「覆盖」分支：用户想改已有主题只能先导出再覆盖导入，或删除旧主题后重建——与「仅新建」定位一致。
- 草稿仅存内存：对话框生命周期外的持久草稿、撤销栈均属 Phase 2+ 议题。
- ~100 个派生 token 初值是 `color-mix(in srgb, …)` / `var()` 表达式而非纯色：合法、可原样保存，但输入框呈现的复杂度需在文案与校验提示中设预期；表达式在表单与文件中同形，不做解析展开。
- 290 个输入框要求分组、折叠与过滤；Modal 内容区需滚动容器，渲染按分组懒执行。
- 新增 locale 键（动作、对话框标题、分组名、校验错误、对比度提示、超长/撞 id 提示）按 zh 真源双语同步；imported 主题 name 按原文显示，不涉及 `NAME_KEYS`。
- 文档义务：requirements 新增 F 条目、architecture 组件表与数据流补编辑器支路、roadmap 把「主题编辑器」移出后续方向、双语 CHANGELOG、文件格式参考的 preview 表述、本 ADR 与 decisions README 索引。

## Validation

实施验收要点（评审修订后；转为 requirements F 条目与 active 计划的依据）：

- `theme-editor` 纯函数测试：
  - 初始值表正确合并基底 overrides（表达式原文，不解析）；
  - diff 输出对称键集、略过未改 token、差异基准为派生 token；
  - 面外基底 overrides 原样保留；「仅改名复制」产物在两个 scheme 的完整 token map 与基底等价（overrides 键集可不等：与派生值相同的冗余条目被省略）；
  - slug/id 生成与去重含在途写入；id 校验覆盖保留名与内置前缀；
  - 序列化大小检查：中文等多字节元信息、长表达式、128KB 长度与字节边界正反例；
  - 组装 source 通过 `validateThemeFileData` 回环。
- 对话框 spec：入口仅随 `settingsReady` 可用；非法色值、非法 id、序列化超限拦截保存；撞 id 仅改名/返回编辑、无覆盖选项；Host 拒绝后草稿可恢复重试；分组渲染完整覆盖 145 键集。
- `compileThemeFile` preview 解析测试：值取自编译 token map 并在对应 scheme 的**完整** token map 中求值——`var()`（含指向面外自定义变量）、嵌套 `color-mix()`、明暗两侧各自解析；无法解析（缺失引用、循环、透明无 backdrop）输出占位标记而非原表达式或伪造颜色，且不阻止保存；切换当前已应用主题后候选色块保持不变；builtin 不变。
- 既有 seam 不得回归：settings 非 ready 禁用、Host 拒绝显示 `saveError`、imported 分区替换后卡片投影更新、激活中主题被删除回落 Default；评审时已验证的 46 项导入/文件格式/文档检查为基线。

## Related Documents

[dsh-theme.json 文件格式](../reference/theme-file-format.md)、[token 目录](../reference/theme-tokens.md)、[设置与包契约](../reference/settings-and-package-contract.md)、[ADR-0005](./ADR-0005-derived-chrome-and-static-white.md)（派生 chrome 与保留白）、[ADR-0006](./ADR-0006-contrast-diagnostics-scope.md)（对比度仅诊断）、[ADR-0009](./ADR-0009-dynamic-imported-theme-catalog.md)（imported 分区语义）、[ADR-0010](./ADR-0010-theme-creator-runtime-skill.md)（既有 skill 创作路径）、[路线图](../plans/active/2026-10-02-theme-studio-roadmap.md)。

## Implementation Status

2026-10-22：本 ADR 的方案已按 [实施计划](../plans/completed/2026-10-22-manual-theme-editor.md) Phase 0–4 落地于 `feat/user-manul-design` 分支，并按计划拆分提交。完整 `pnpm verify:all` 已通过；具体命令、兼容矩阵和验证边界见该计划。剩余矩阵与真实浏览器验证按用户后续指示暂缓，尚未发布。历史决策文本保持不变。
