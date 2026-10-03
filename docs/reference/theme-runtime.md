# ThemeStudioRuntime 与 overlay 参考

## Construction

源码：[runtime.ts](../../src/client/runtime.ts)。从 `/client` 导出 `ThemeStudioRuntime`、`ThemeStudioSnapshot`、`ThemeOverrideSurface`；构造 options 接收 theme、host（可 undefined）及 catalog（最小 ThemeCatalog）。实例不依赖 DOM；theme 的唯一所需方法是 `overrideTokens(source, tokenPairs): disposer`。

构造先生成快照，根据 host 是否存在将 status 置为 unavailable/loading；存在则订阅 Host 并立即 adoption。不会把先前不存在的 theme id 自动注册到官方 registry。

## Snapshot

| 字段 | 类型 | 解释 |
| --- | --- | --- |
| `activeThemeId` | string 或 null | 当前持久 authority 对应的 active overlay id；应用时可先乐观更新 |
| `previewThemeId` | string 或 null | 预览 id；null 同时可能是 Default 或未预览 |
| `previewing` | boolean | 区分正在预览 Default 与未预览 |
| `settingsStatus` | loading / ready / unavailable | transport 返回的同步状态；host undefined 为 unavailable |
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

以上修改调用 assertOpen；dispose 本身幂等。未知显式 id 抛错，不把拼写错误当默认。若 constructor host 为 undefined，仍可在直接实例上使用临时/本地动作，但持久操作不写 Host。实际 Client 组装没有 transport 时只提供 catalog，不挂载 Themes row。

## 两层 source

`ACTIVE_SOURCE=@dsh-electron/dsh-theme-studio:active`；`PREVIEW_SOURCE=@dsh-electron/dsh-theme-studio:preview`。source 名是共享 constants，与 package 身份一致。重复 source 调用由官方 overrideTokens 替换整层并重新置顶；返回 disposer 只删除该次调用创建的层。插件依赖官方这个契约保持预览优先于持久层。

Default 预览通过暂时移除 active 层呈现官方主题，不创建一套伪官方 token。取消时从 catalog 重建原 active。官方 Light/Dark/System 选择仍在 ctx.theme；overlay 每 token 提供两种模式并随官方 colorScheme 自动解析。

## Host adoption 与异步写入

Host 快照不是 ready 时只更新 settingsStatus。ready 后 normalize activeThemeId：null/undefined/非有效字符串视作默认；若 raw 是不在目录的字符串，清两层、清状态、publish，并尝试 set(activeThemeId, null)。repairingUnknown 阻止同一未结束修复被重复发起。

当新 durable id 不同于本地 id 时，取消预览并安装 accepted id；相同 id 且不在预览时补齐 active 层。Apply 先乐观更新，然后 await Host.set；如果 settlement 属于当前 persistGeneration 且 runtime 未 dispose，再读 accepted snapshot，必要时重新收敛。这里保护本地回调次序，不替 Host 服务保证写入事务或跨请求落盘顺序。

当前 rejected Promise 没有专门 catch/错误 UI。未知 id 修复使用 finally 清 guard，失败也不代表已经保存为默认。排查时同时检查 Host 错误与 snapshot，不能只看立即更新的卡片徽标。

## `presetToOverrides`

导出位于 [adapter.ts](../../src/client/adapter.ts)。输入只需 tokens；输出 `{ [token]: { light, dark } }`。light/dark 键集合必须相等，每个值必须为字符串；缺一模式或非字符串抛 `PresetAdapterError`。转换不修改输入，输出是新对象。它不做 WCAG 校验、不解析 CSS，也不验证公共 `.dsh-theme.json` schema。

## 验证

`runtime.spec.ts` 覆盖默认、应用、替换、预览、取消、提升、重启、未知 durable id、accepted 设置回收敛及卸载。`theme-runtime.spec.ts` 使用已安装官方 Client 发布 bundle 验证明暗/系统模式和层级；未调用的 UI primitives 可被 stub，不能把此测试称为真实浏览器全量旅程。背景决策见 [ADR-0001](../decisions/ADR-0001-portable-token-overlays.md)与 [ADR-0002](../decisions/ADR-0002-settings-adapters-and-effect-ownership.md)。
