# ThemeStudioRuntime 与 overlay 参考

## Construction

源码：[runtime.ts](../../src/client/runtime.ts)。从 `/client` 导出 `ThemeStudioRuntime`、`ThemeStudioSnapshot`、`ThemeOverrideSurface`、`ImportedThemeSink`；构造 options 接收 theme、host（可 undefined）、catalog（最小 ThemeCatalog）。catalog 同时实现 `ImportedThemeSink` 时（`ThemeStudioRegistry` 如此）被结构检测为 imported 分区 sink——sink 只能从 catalog 导出，runtime 与公共 catalog 不会观察到分叉的 imported 分区。实例不依赖 DOM；theme 的唯一所需方法是 `overrideTokens(source, tokenPairs): disposer`。

构造先生成快照，根据 host 是否存在将 status 置为 unavailable/loading；存在则订阅 Host 并立即 adoption。不会把先前不存在的 theme id 自动注册到官方 registry。

## Snapshot

| 字段 | 类型 | 解释 |
| --- | --- | --- |
| `activeThemeId` | string 或 null | 当前持久 authority 对应的 active overlay id；应用时可先乐观更新 |
| `previewThemeId` | string 或 null | 预览 id；null 同时可能是 Default 或未预览 |
| `previewing` | boolean | 区分正在预览 Default 与未预览 |
| `settingsStatus` | loading / ready / unavailable | transport 返回的同步状态；host undefined 为 unavailable |
| `saveError` | boolean | 最近一次保存被拒绝后，界面已按 accepted snapshot 恢复 |
| `droppedImports` | number | 最近一份 accepted snapshot 中无法解析而跳过的导入条目数 |
| `revision` | number | 每次 publish 增加的变化计数，初始为 0 |

getSnapshot 返回冻结对象；引用在下次 publish 前稳定。subscribe 的 listener 无参数，每次更换快照后调用；返回取消监听函数。store 初始 revision=-1，sync 忽略小于等于当前 revision 的输入，不能反向覆盖 runtime。

## 动作与 overlay 行为

| 方法 | active 层 | preview 层 | 设置写入 |
| --- | --- | --- | --- |
| `previewTheme(id)` | 保留；若从 Default 预览转到具体主题则恢复先前 active | 替换为给定主题 | 无 |
| `previewTheme(null)` | 暂时删除，activeThemeId 保留 | 删除，previewing=true | 无 |
| `cancelPreview()` | 若刚预览 Default，重新安装持久 active | 删除 | 无 |
| `applyPreview()` | 预览 id 提升为 active；null 等价默认 | 删除，结束预览 | 写 id/null；无预览时 no-op |
| `activateTheme(id)` | 安装给定主题 | 删除，结束预览 | 写 id |
| `restoreDefault()` | 删除，activeThemeId=null | 删除，结束预览 | 写 null |
| `dispose()` | 删除 | 删除 | 不发起新写入，取消监听和本地后续 adoption |

另有 `saveImportedThemes(sources)`：把导入主题条目列表整体排入 `importedThemes` 字段写队列（无 Host 或 settings 尚未 ready 时为 no-op）；`requestedImportedSources()` 返回最近一次请求的列表，`editableImportedSources()` 按「在途请求优先、否则 accepted 原始数组」给出编辑合并基准——原始数组逐字保留无法解析的条目，后续导入、覆盖或删除不会把它们从持久设置里抹掉。以上修改调用 assertOpen；dispose 本身幂等。未知显式 id 抛错，不把拼写错误当默认。若 constructor host 为 undefined，仍可在直接实例上使用临时/本地动作，但持久操作不写 Host。实际 Client 组装没有 transport 时只提供 catalog，不挂载 Themes row。

## 两层 source

`ACTIVE_SOURCE=@dsh-electron/dsh-theme-studio:active`；`PREVIEW_SOURCE=@dsh-electron/dsh-theme-studio:preview`。source 名是共享 constants，与 package 身份一致。重复 source 调用由官方 overrideTokens 替换整层并重新置顶；返回 disposer 只删除该次调用创建的层。插件依赖官方这个契约保持预览优先于持久层。

Default 预览通过暂时移除 active 层呈现官方主题，不创建一套伪官方 token。取消时从 catalog 重建原 active。官方 Light/Dark/System 选择仍在 ctx.theme；overlay 每 token 提供两种模式并随官方 colorScheme 自动解析。

## Host adoption 与异步写入

Host 快照不是 ready 时只更新 settingsStatus。ready 后先把 `importedThemes` 逐条解析进 catalog 的 imported 分区（`setImported` 原子替换，无法解析的条目计入 `droppedImports`），再 normalize activeThemeId：null/undefined/非有效字符串视作默认；若 raw 是不在目录的字符串，清两层、清状态、publish，并尝试 set(activeThemeId, null)。repairingUnknown 阻止同一未结束修复被重复发起。imported 分区变化时：消失的预览主题丢弃预览层并恢复 active 层；仍存在的激活导入主题按新 preset 重装 active 层（预览 Default 期间不重装），仍存在的非 Default 预览随后装回顶层并刷新 token——层按安装 seq 覆盖，新装的 active 层否则会盖住预览；分区未变时不触碰任何层。正在预览 Default 时 active 层本就被摘除，同步不会把它装回来。

当新 durable id 不同于本地 id 时，取消预览并安装 accepted id；相同 id 且不在预览时补齐 active 层。Apply 先乐观更新并清除上一轮 `saveError`，然后调用 Host.set。写入队列按 `{field, value}` 组织：同一时刻只有一个 `set` 在途，同一字段更晚的写入替换尚未发出的值，并等这次在途写入结束后再发给 Host。因此两次 Apply 重叠时，较新的成功结果不会被较早的 `set` 后落盘盖掉；`activeThemeId` 与 `importedThemes` 互不阻塞。进行中的写入大于零时，Host 回声不会把界面收回更早的值。队列全部结算后，才读取 accepted snapshot：与乐观 id 和最近请求的完整导入列表都一致则记下该 id 并清除错误；任一字段不一致、最新一次 `set` 返回 `false`、或 Promise rejected，则把颜色层和卡片恢复到 accepted snapshot，并把 `saveError` 设为 true。Themes 行用 `status.saveFailed` 提示，用户可再次应用。只有核对 ready accepted snapshot 后才清空 `importedRequested` 合并基准，registry 随之重新成为权威；结算时 snapshot 尚在 loading，则保留请求列表直到 ready 后核对。旧 transport 即使拒绝后 resolve void，也会因导入列表不一致显示保存失败。自动导入预览订阅 runtime 的结算通知，并核对 accepted catalog 的源文件与请求相同；覆盖导入不会提前预览旧 preset，失败会结束监听。

`dispose` 之后，已发出的 settlement 不再安装 overlay，也不会再发出排队中的 `set`。没有 Host 的直接 runtime 仍只保留本地层，不把这当成保存失败。未知 id 修复只对同一个 raw 值自动尝试一次；失败时显示保存错误，再次选择 Default 或具体主题可以重试。

## 字体边界

`presetToOverrides` 仍只做 light/dark 形状转换。安装 active/preview 层之前，`withoutOfficialFontTokens` 去掉官方字体变量：`--dsh-font-family-*`、`--dsh-content-font-size`、`--dsh-code-font-size`、`--dsh-terminal-font-size`、`--ds-font-family-code`、`--dsw-font-family` 和 `--dsw-font-family-brand`。DSH 0.2.1-alpha.2 的 ThemePresenter 先写字体变量再写 token，终端则直接读 snapshot 的 `fontSizes` / `fontFamilies`。Theme Studio 不写这些字段，也不注册字体设置行。更早的 ThemeRuntime 只有单一 `fontSize`；测试按 snapshot 形状探测，不按版本字符串分支。

## `presetToOverrides`

导出位于 [adapter.ts](../../src/client/adapter.ts)。输入只需 tokens；输出 `{ [token]: { light, dark } }`。light/dark 键集合必须相等，每个值必须为字符串；缺一模式或非字符串抛 `PresetAdapterError`。转换不修改输入，输出是新对象。它不做 WCAG 校验、不解析 CSS，也不验证公共 `.dsh-theme.json` schema。

## 验证

`runtime.spec.ts` 覆盖默认、应用、替换、预览、取消、提升、重启、未知 durable id、重叠应用的串行写入、accepted 设置回收敛、卸载，以及导入主题的 adoption、分区替换时的层调和、删除激活导入主题回落与连续导入写不丢失。`theme-runtime.spec.ts` 使用已安装官方 Client 发布 bundle 验证明暗/系统模式和层级；未调用的 UI primitives 可被 stub，不能把此测试称为真实浏览器全量旅程。背景决策见 [ADR-0001](../decisions/ADR-0001-portable-token-overlays.md)、[ADR-0002](../decisions/ADR-0002-settings-adapters-and-effect-ownership.md)与 [ADR-0009](../decisions/ADR-0009-dynamic-imported-theme-catalog.md)。
