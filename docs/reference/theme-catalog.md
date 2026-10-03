# 公开 Theme Studio catalog API

## Status and Scope

Current，Stage 3，首次实现于 `509b88e`（2026-10-02），尚未包含在 `v0.1.3` tag 中。catalog 仅在 Client Cordis 上提供；headless Host 不提供浏览器服务。类型真源为 [types.ts](../../src/client/types.ts)，组装真源为 [client/index.ts](../../src/client/index.ts)。

## 消费者接入

使用方 package 的 registry dependencies/peers 应包含本包，并在 `dsh.client.inject` 中加入 `@dsh-electron/dsh-theme-studio`，使宿主先加载 provider 的浏览器 bundle。不要使用 `workspace:`，也不要直接把它作为 Node ESM 模块执行；Client 产物由 DSH `__ModuleLoader__` 协议加载。

```json
{
  "dsh": {
    "client": {
      "platform": "web",
      "inject": ["@dsh-electron/dsh-theme-studio"]
    }
  }
}
```

上述仅展示依赖 loader 的 metadata 增量，不是完整 package.json。消费 `/client` 类型以合并 Context 声明，再通过 Cordis inject 等待服务：

```ts
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@dsh-electron/dsh-theme-studio/client'

export const inject = ['themeStudio']

export function apply(ctx: Context): void {
  const catalog = ctx.themeStudio.catalog
  const themes = catalog.list()
  const theme = catalog.get('dsh-theme-studio.claude')
  const report = catalog.validate('dsh-theme-studio.claude')
  console.log(themes.length, theme?.name, report?.passed)
}
```

不能从未注入 themeStudio 的任意 context proxy 直接读取服务。生产 provider 卸载时，inject 的 consumer fiber 会被停止；provider 重供后 consumer apply 重新运行。

## 类型模型

| 类型 | 公开成员 | 语义 |
| --- | --- | --- |
| `ThemeStudioService` | readonly `catalog` | 只读服务 facade，运行时被冻结 |
| `ThemeCatalog` | `get(id)`、`list()` | overlay runtime 使用的最小发现面 |
| `ThemeStudioCatalog` | 继承 ThemeCatalog，增加 `validate(id)` | 公开发现与默认规则诊断 |
| `BuiltinThemePreset` | readonly `id/name/description?/tokens/preview` | 可 JSON 序列化的数据，不是公共文件格式 |
| `ThemePreview` | readonly `background/surface/foreground/accent` | 每种模式的四色装饰样本 |
| `ThemeContrastReport` | readonly `themeId/passed/checks` | 两种模式逐配对结果，详见[对比度参考](./theme-contrast.md) |

`tokens.light/dark` 为 `Readonly<Record<string, string>>`，`preview.light/dark` 为 ThemePreview。id 为命名空间 id，不是官方 `light/dark/system` 或默认 `null`。

## 方法契约

### `list(): readonly BuiltinThemePreset[]`

同步返回 Settings 卡片顺序的内置主题列表。对于同一个 catalog 实例，重复调用返回同一个数组引用。数组、preset、tokens 容器、两个 palette、preview 容器与样本均冻结。Default 不在列表中；UI 自行添加 id 为 null 的默认卡。

### `get(id: string): BuiltinThemePreset | undefined`

按精确 id 查找。存在时返回与 list 中相同的 preset 对象；未知 id、`default/light/dark/system` 均返回 undefined。不会 fallback 成别的主题，也不写 Host 设置。

### `validate(id: string): ThemeContrastReport | undefined`

已知主题按 `DEFAULT_CONTRAST_PAIRS` 同步计算新报告。未知 id 返回 undefined；未通过的已知主题返回 `passed: false` 报告，不能把 false 与 unknown id 混淆。该方法不安装 overlay、不修改 palette、不自动修复。结果引用没有稳定性保证；当前没有缓存、订阅或 revision。

自定义配对可调用 `/client` 导出的 `validateThemeContrast(theme, pairs)`。报告的阈值、unknown 语义与 strict 命令见[算法参考](./theme-contrast.md)。

## 生命周期与不可变性

provider 在 Client apply 中先于 settings child 创建。即使没有 settingsScope/configForms，catalog 仍可发现；没有这些 transport 时 Themes UI 不启动。settings child 卸载只清理 runtime/UI，不移除父 fiber 的 catalog。同一 Client apply 内，新旧 settings runtime 共用同一 catalog。

Client plugin 重载会创建新 catalog。卸载前取得的 frozen 数据不会失效，也不会变成可写对象；但 consumer 应让 Cordis 管理当前 provider，而不是把旧 provider 当成永久 live registry。

`BuiltinPresetRegistry(presets?)` 也作为类导出，默认使用 BUILTIN_PRESETS；构造时复制并冻结输入，重复 id 抛错。它能供测试或本地数据使用，但不会把自建实例注册进全局 Theme Studio UI。

## 非承诺接口

服务不提供 register/unregister、activate、preview、restoreDefault、import/export、Host RPC、locale 切换或动态目录更新。英文 `name/description` 是 catalog 元数据；Settings UI 通过 locale namespace 呈现中英文案。不要把 catalog 与官方 `ctx.theme.register` 的主题 registry 混为一谈。

## 验证与相关决策

`catalog.spec.ts` 覆盖稳定 list/get、深层冻结、复制隔离、重复 id 与未知 id。`apply.client.spec.ts` 在真实 Cordis Context 中覆盖 provider/consumer 注入、settings 缺失、transport 变更、卸载与重新提供。十版兼容证据见[矩阵](../development/dsh-compatibility.md)，选择原因见 [ADR-0007](../decisions/ADR-0007-readonly-client-theme-catalog.md)。
