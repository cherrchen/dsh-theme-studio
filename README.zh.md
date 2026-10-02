# dsh-theme-studio

[English](README.md) | 中文

可移植的 DSH/Cordis 插件：在官方外观偏好之上叠加内置配色主题。包声明 `platform:web`，不依赖 Electron、Node 或 Desktop。npm 作用域 `@dsh-electron/` 标识发布者，不是运行时要求。

本仓库是源码权威。[DeepSeek Harness Desktop](https://github.com/cherrchen/deepseek-harness-electron) 通过 git subtree 镜像到 `apps/electron/runtime/plugins/dsh-theme-studio`，并从源码重新构建 Host 与 Client artifacts。同一包可在 Desktop 与标准 DSH Web Host 中不变地运行。

Stage 1–3 提供内置主题浏览、预览、应用、持久化、插件生命周期恢复、自动对比度诊断与公开的只读 Client catalog。Theme Schema、导入导出与 Theme Creator Agent 仍为后续工作。

## DSH 兼容性

支持的精确版本以 `src/compat/dsh-version.ts` 为准：0.1.5-rc.2、0.1.5-rc.3、0.1.6-alpha.1、0.1.6-alpha.2、0.1.7-alpha.1、0.1.7-alpha.2、0.1.7-rc.1、0.1.7-rc.2、0.2.0-rc.1、0.2.0-rc.2。本节与该列表不一致时，`pnpm compat:check` 会失败。开发安装固定在最新的受支持版本。启用 DSH peer 兼容校验的宿主，仅在运行时版本位于该列表时加载本插件。

逐版本证据与升级风险见 [DSH 兼容矩阵](docs/development/dsh-compatibility.md)。运行 `pnpm compat:matrix` 可在独立安装树中验证所有支持版本。

## 安装

本包在 npm 上的包名为 `@dsh-electron/dsh-theme-studio`。tag 驱动的发布流程见[发布说明](docs/development/release-workflow.md)。

**DeepSeek Harness Desktop** — Theme Studio 是必需内置插件。Desktop 始终从 runtime plugin inventory 挂载它。

**DSH Web** — 构建 `lib/` 后加入 profile：

```sh
pnpm install
pnpm build
dsh plugin --profile web add .
```

或直接从 GitHub 安装：

```sh
dsh plugin --profile web add github:cherrchen/dsh-theme-studio
```

`dsh plugin add` 会启用附带的 `cordis.patch.yml` 层。官方外观（浅色 / 深色 / 跟随系统）仍由 `dsh-client-ui-theme` 拥有。Theme Studio 只在**设置 → 通用 → 主题**增加一行。

## 使用体验

设置 → 通用中，外观在前（`order = 10`），主题在后（`id = themes`，`order = 20`）。

- **默认**清除 Theme Studio 覆盖层，回到官方主题。
- **预览**是临时的，不会写入设置。
- **应用**把 `activeThemeId` 持久化到 Host 的 `theme-studio` 命名空间。
- 更改外观仍切换官方浅色/深色底色；已应用的 Theme Studio 调色板会自动跟随。

重启应用会恢复上次应用的主题。卸载插件会移除两层覆盖，ThemeRuntime 回到官方主题。

## 运行模型

Theme Studio 不自行呈现 CSS。它调用 `ctx.theme.overrideTokens()`：

```text
Official Light / Dark / System
        ↓
ACTIVE_SOURCE  (@dsh-electron/dsh-theme-studio:active)
        ↓
PREVIEW_SOURCE (@dsh-electron/dsh-theme-studio:preview)
        ↓
ThemeSnapshot → ThemePresenter → DOM
```

Host 设置：

```text
ui-theme.preference          system | light | dark
theme-studio.activeThemeId   null | dsh-theme-studio.*
```

`null` 表示默认。内置 id 包括 `dsh-theme-studio.claude`、`.codex`、`.claude-cream`、`.graphite`、`.oled`、`.nordic`、`.paper` 与 `.warm`。

## 对比度校验（Stage 2）

`validateThemeContrast(preset)` 校验浅色与深色两套配色，返回不可变的逐配对报告，包含完整精度的比值、阈值及 `passed` / `failed` / `unknown` 状态。默认覆盖普通文字、链接、状态色、代码语法、toast/tooltip/菜单文字与焦点指示。文字使用 WCAG AA 的 4.5:1 最低阈值，焦点指示使用 3:1。依据见 [W3C 文字对比度](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)与[非文字对比度](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)。

在源码目录中运行：

```sh
pnpm contrast:report
pnpm contrast:report --strict
# 编译纯模块后导出 JSON：
pnpm build:types
node scripts/report-contrast.mjs --json > contrast-report.json
```

报告命令遇到无法计算的配对时返回非零退出码；`--strict` 也会在低于阈值时失败。现有内置配色存在已知失败，因此严格模式目前返回非零。校验器如实报告，不修改配色或阻止预览/应用。[校验范围与内置结果](docs/development/theme-contrast.md)记录了全部 16 个主题/模式的汇总。

这是 token 配对诊断。通过报告仅表示所检查的配对通过；本包不宣称全部内置主题或实际宿主符合 WCAG。宿主 CSS 的实际配对、继承 token、字体、渐变及其他插件覆盖层，仍需单独检查实际呈现的 UI。

## 公开主题目录（Stage 3）

Client 插件可注入 `themeStudio`，发现与 overlay runtime 共用的不可变目录。导入 Client 声明即可获得带类型的 `ctx.themeStudio` 属性：

```ts
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@dsh-electron/dsh-theme-studio/client'

export const inject = ['themeStudio']
export function apply(ctx: Context): void {
  const themes = ctx.themeStudio.catalog.list()
  const claude = ctx.themeStudio.catalog.get('dsh-theme-studio.claude')
  const report = ctx.themeStudio.catalog.validate('dsh-theme-studio.claude')
  // themes 按顺序返回只读主题；未知 id 的 claude/report 为 undefined。
}
```

在使用方包的 `dsh.client.inject` 中加入 `@dsh-electron/dsh-theme-studio`，让宿主加载其浏览器 bundle。`list()` 返回稳定快照，顺序与设置卡片一致；`get()` 暴露 id、名称、描述、浅色/深色 token 与预览色。默认主题不是目录成员。`validate()` 返回 Stage 2 诊断报告。服务在本 Client 插件加载期间可用，包括设置就绪之前与设置通道切换期间。卸载时 Cordis 释放服务并停止注入它的插件；服务恢复后重新启动使用方。这是发现 API，应用主题继续通过已有设置 UI 进行。

## 组装

Host 插件在存在 `ctx.settings` 时注册 `theme-studio` 设置命名空间，否则为空操作。到 0.1.6-alpha.2 为止，Host 使用 `settings.register`。从 0.1.7-alpha.1 起，同一段配置是插件的 `Config`，并且会关闭自动生成的表单，因为主题行是自定义的。Client 插件需要 `theme`、`slots`、`locale`、`connection` 与 `remote`，然后读取宿主实际提供的设置通道：`settingsScope` 或 `configForms`。Headless profile 只加载 Host 半，不会启动浏览器 UI。本包有意不导出 `./invariant`，因为 ThemeRuntime 负责覆盖层一致性，设置服务负责持久化。浏览器包通过包名加载器记录注册；官方插件管理器从已安装 bundle 元数据读取插件。

## npm 发布

本包在 npm 上的包名为 `@dsh-electron/dsh-theme-studio`。推送与 `package.json` 版本一致的 `v<version>` tag 会触发发布。

## 开发

使用 Node.js `^22.19` 或 `>=24`，以及 pnpm 11。

```sh
pnpm install --frozen-lockfile
pnpm compat:check
pnpm typecheck
pnpm test
pnpm build
pnpm pack --dry-run
```

## Model Experience

无。本包贡献面向用户的 Client UI，不注册模型工具或提示内容。

#### KV Cache effect

无。本包不增加、替换或保留模型请求 token。

## 已知限制与延后工作

- **仅内置主题** — 尚无导入导出、主题注册 API 或公开 `.dsh-theme.json` schema 校验。
- **有限范围的对比度诊断** — 部分内置配对低于阈值；校验器不认证整个宿主 UI，也不自动修复配色。
