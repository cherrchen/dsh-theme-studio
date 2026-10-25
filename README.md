<div align="center">

# dsh-theme-studio

中文 | [English](./README.en.md)

</div>

## 项目简介

DSH（DeepSeek Harness）原生只提供浅色 / 深色 / 跟随系统三种外观模式；本插件是一个不修改上游任何代码的外部扩展，在「设置 → 通用」注入「主题」行，把可选配色扩为"**8 套内置主题 + 默认项**"，并支持导入/导出自定义的 `dsh-theme.json` 主题文件，还可以借助可选的 Theme Creator skill 让模型帮你创作配色。

官方「外观」管模式不管配色，同类桌面工具早已提供多套主题可选；本插件把同样的能力带给 DSH：主题行落在官方「外观」与「字号」之间，选择器沿用官方语言行同款下拉样式，悬停即预览、点击即应用。

- **官方外观所有权不动**：浅色 / 深色 / 跟随系统、字体与字号仍由官方设置管理；本插件只通过 `ctx.theme.overrideTokens` 产生 token 覆盖层，快照与 DOM 呈现仍归宿主。
- **预览不写盘**：悬停菜单项只临时套色，关闭菜单即恢复；只有点击应用才由 Host 持久化，重启后自动还原。
- **不配等于没装**：声明 `platform:web`，不依赖 Electron、Node 客户端能力或 Desktop provider，也不注册模型工具或提示词内容；未选主题时界面与未装插件逐项一致。
- **创作不打扰**：Theme Creator skill 默认只响应 `/dsh-theme-creator` 用户手势，不进模型目录；主题菜单的「创建自己的主题」会打开 Cordis 会话并预填手势（不自动发送），产物经导入确认后才生效。

当前发布版本 `v0.1.5`。各版本的用户可见变更见 [CHANGELOG](./CHANGELOG.md)；进度与发布状态见[路线图](./docs/plans/active/2026-10-02-theme-studio-roadmap.md)。

## 快速开始

插件已发布到 [npm](https://www.npmjs.com/package/@dsh-electron/dsh-theme-studio)。可以在 DSH 的插件安装页面填入包名 `@dsh-electron/dsh-theme-studio`，也可以用命令行两步装完：

```sh
dsh plugin --profile web add @dsh-electron/dsh-theme-studio
dsh --profile web
```

`--profile` 按你的启动方式选择，可选值见 DSH 文档；tarball、GitHub、本地源码等其他安装方式见[安装](#安装)。

启动后打开 **设置 → 通用**，「主题」行位于官方「外观」与「字号」之间。点击右侧选择器展开主题菜单：悬停任意项即时预览配色，点击应用并由 Host 保存；选「默认」清除全部覆盖、回到官方主题。

## 环境要求

**使用本插件**：一个受支持的 DSH 版本（精确匹配，不是范围；清单见 [DSH 兼容性](#dsh-兼容性)）下的 Web profile。`dsh plugin` 负责安装，无需本地 Node 工具链。

**从源码构建 / 贡献**：Node.js `^22.19.0 || >=24`，pnpm `11.7.0`（建议经 corepack 启用）；开发 pin 的 DSH 为 `0.2.1-rc.3`。

**运行平台**：任何能运行受支持 DSH Web 的环境；DeepSeek Harness Desktop 将本包作为内置 runtime 插件集成。

## DSH 兼容性

支持的精确版本以 `src/compat/dsh-version.ts` 为唯一清单：

| DSH 系列 | 受支持的版本 |
| --- | --- |
| `v0.1.5` | `0.1.5-rc.2`、`0.1.5-rc.3` |
| `v0.1.6` | `0.1.6-alpha.1`、`0.1.6-alpha.2` |
| `v0.1.7` | `0.1.7-alpha.1`、`0.1.7-alpha.2`、`0.1.7-rc.1`、`0.1.7-rc.2` |
| `v0.2.0` | `0.2.0-rc.1`、`0.2.0-rc.2` |
| `v0.2.1` | `0.2.1-alpha.1`、`0.2.1-alpha.2`、`0.2.1-alpha.3`、`0.2.1-alpha.4`、`0.2.1-alpha.5`、`0.2.1-rc.1`、`0.2.1-rc.2`、`0.2.1-rc.3` |

表外版本或 `@deepseek-ai/dsh-*` 混装的安装未经验证：插件自身不在运行时探测安装树或阻断启动；宿主安装期的 peer 准入可能拒绝部分不匹配版本，未被拒绝的混装仍可能启动，只是不在受支持范围。

`pnpm compat:check` 校验本节、peer 声明、开发 pin、overrides、lockfile 与安装树一致；`pnpm compat:matrix` 在隔离安装树中逐版本回归。适配接缝、验证证据与未覆盖边界见 [DSH 兼容矩阵](./docs/development/dsh-compatibility.md)。

## 安装

`dsh plugin` 支持四种安装来源。以下均以 web profile 为例；桌面端（Electron）把 `--profile web` 换成 `--profile desktop`，安装方式同源。

| 来源 | 命令 | 说明 |
| --- | --- | --- |
| npm 注册表（推荐） | `dsh plugin --profile web add @dsh-electron/dsh-theme-studio` | 预构建产物，即装即用 |
| GitHub | `dsh plugin --profile web add github:cherrchen/dsh-theme-studio` | 安装时自动从源码构建；`allowBuilds` 需含本包，建议锁定版本 |
| tarball | `dsh plugin --profile web add ./plugin.tgz` | 预构建离线包，适合内网/离线 |
| 从源码安装 | `dsh plugin --profile web add /path/to/dsh-theme-studio` | pnpm `link:` 链接本地 checkout，适合开发调试；无需 `allowBuilds` |

**GitHub 来源首次安装时 `dsh plugin add` 可能以 `[ERR_PNPM_IGNORED_BUILDS]` 失败**：在该 profile 的 `pnpm-workspace.yaml` 里补上下面这行（本包的 `prepare` 负责构建），再执行一次 `add` 即可：

```yaml
allowBuilds:
  '@dsh-electron/dsh-theme-studio': true
```

如果重跑退出 0 但插件没有进入 `dsh.profile.bundles`，做一次 `remove` + `add`。更多排查见[构建与发布故障](./docs/troubleshooting/build-and-release-failures.md)。

### 从 npm 安装（推荐）

```sh
dsh plugin --profile web add @dsh-electron/dsh-theme-studio
```

安装的是预构建产物，无需 `allowBuilds`。

### 从 tarball 安装

```sh
pnpm pack @dsh-electron/dsh-theme-studio
dsh plugin --profile web add ./plugin.tgz
```

也可以从 [GitHub Release 资产](https://github.com/cherrchen/dsh-theme-studio/releases/download/v0.1.5/plugin.tgz)下载 `plugin.tgz`。同样是预构建产物，适合内网或离线环境交付；仅在对应 Release 产物生成后可用。

### 从 GitHub 安装

```sh
dsh plugin --profile web add github:cherrchen/dsh-theme-studio
```

GitHub 来源装的是源码，`add` 时会自动构建，不需要手动编译；但 `allowBuilds` 要含本包自身，见上文说明。

建议锁定版本（如 `#v0.1.5`），让后续推送无法悄悄改变实际运行的内容：

```sh
dsh plugin --profile web add github:cherrchen/dsh-theme-studio#v0.1.5
```

### 从本地源码安装

```sh
git clone https://github.com/cherrchen/dsh-theme-studio.git
cd dsh-theme-studio
pnpm install --frozen-lockfile
pnpm build
dsh plugin --profile web add .
```

> [!TIP]
> `dsh` 不在 PATH 里时（例如用源码仓库跑 DSH），把命令里的 `dsh` 换成 `pnpm dsh`。

## 运行方法

开发自检：

```sh
pnpm lint && pnpm typecheck
pnpm test
pnpm build
pnpm docs:check
pnpm compat:check
```

安装进 DSH 运行时并验证组合：

```sh
dsh plugin --profile web add /path/to/dsh-theme-studio
dsh --profile web --dump-config | grep -A3 'theme-studio'
```

预期输出：

```text
# == @dsh-electron/dsh-theme-studio
- id: theme-studio
  name: '@dsh-electron/dsh-theme-studio'
```

即 `cordis.patch.yml` 把 Host 设置半部与 Client 覆盖 UI 挂进官方包管理器。启动后「设置 → 通用」应出现「主题」行。

## 使用方法

### 主题选择器

「主题」行右侧是与官方语言行同款的下拉选择器，显示当前已应用主题的四色预览块与名称。点开后的菜单按序列出「默认」与全部内置配色，每项也带预览块：

- **悬停预览**：指针悬停菜单项即临时套用该主题，不写 Host；菜单关闭（指针离开、点击外部、Esc 或再次点击选择器）即恢复原状。
- **点击应用**：点击或 Enter 选中后由 Host 持久化该主题 id，重启与新会话自动恢复。
- **默认**：移除本插件的全部覆盖层，回到官方主题，保存 `activeThemeId=null`。

官方「外观」继续控制浅色 / 深色 / 跟随系统：每套内置主题都提供明暗两套色值，随官方模式解析。字体与字号同理仍由官方设置保存，主题的预览、应用、取消、恢复默认都不改写它们。

### 内置主题

Claude、Codex、Claude Cream、Graphite、OLED、Nordic、Paper、Warm，id 均在 `dsh-theme-studio.*` 命名空间下；「默认」不是目录成员。选择器与菜单中的四色 Mosaic 固定使用浅色样本，不代表实际生效的模式。完整 token 与配色字段见[token 参考](./docs/reference/theme-tokens.md)。

### 导入与管理主题

主题菜单底部提供 **导入主题** 与 **管理主题**：

- **导入**：选择 `.dsh-theme.json` 文件（v1 格式，见[文件格式参考](./docs/reference/theme-file-format.md)）后弹出确认对话框，确认后写入 Host 设置并自动预览；文件 id 与已有导入主题冲突时可选择覆盖或自动改名，与内置命名空间冲突会被拒绝。
- **导出**：内置与导入主题都可导出为 `<id>.dsh-theme.json` 下载；内置主题导出时 id 改写为 `user.` 前缀，文件可直接回导。
- **删除**：管理对话框可删除导入主题；删除当前激活的主题会回落到「默认」。

导入的主题随 Host 设置持久化并进入公开 catalog，其他插件同样能通过 `ctx.themeStudio.catalog` 发现它们。

### 创作自己的主题

主题菜单底部的 **创建自己的主题** 打开一个 Cordis 会话并在输入框预填 `/dsh-theme-creator `（不自动发送——你可以补一句想要的风格再回车）；在较早的 DSH 版本上，该入口改为提示你手动输入这个手势。Theme Creator skill 会引导模型在工作区写出 `dsh-theme.json` 并用随包校验器 `node lib/validate-theme.js <file>` 自检，最后回到 **导入主题** 确认生效。

创作助手的可见性由 `creatorAgentMode` 控制（插件管理页中可切换，默认 `gesture`）：`gesture` 只响应用户手势、不进模型目录，`catalog` 同时允许模型路由，`off` 完全关闭并隐藏入口。

### 手动创建主题（未发布）

> 当前源码已包含，尚未发布——npm 0.1.5 不包含此功能。

主题菜单底部的 **手动创建主题…** 是独立于 `/dsh-theme-creator` AI 助手的创建入口，只在设置就绪时可用，不受创作助手模式与工作区状态影响：

- 任选内置或已导入主题为基底，填写名称（id 自动生成，可手动修改或点「生成可用 ID」）、作者与描述；切换基底会重建整个草稿（含名称、ID 与 token 编辑）。
- token 编辑区按前缀分组、默认收起，可按名称搜索；每个 token 提供浅色/深色两个输入，`var()`、`color-mix()` 等表达式按原文保存，基底中不可编辑的 token 原样保留。
- 对比度诊断只提示不阻止保存；名称、ID、色值必须合法。序列化文本须同时满足 UTF-16 长度与 UTF-8 字节数均不超过 131072 的限制；超限提示最大贡献项。
- **保存主题** 只新增不覆盖：id 冲突时提示改名或生成新 id；保存经 Host 接受后进入导入主题列表并自动预览，之后可在 **管理主题** 中导出为 `dsh-theme.json`。
- 草稿保存在主题行的运行内存中：关闭对话框、等待写入或保存被拒后重开内容仍在；进程重启或行卸载后草稿丢失。不提供图形化即时预览，保存后通过预览/应用查看效果。

## 项目结构

```text
.
├── src/
│   ├── index.ts                      Host 半部入口：settings 读写、持久化与恢复
│   ├── settings.ts                   theme-studio.* 设置字段定义
│   ├── constants.ts                  共享身份（包名、设置键、source id）
│   ├── compat/
│   │   ├── dsh-version.ts            受支持 DSH 精确版本清单（唯一权威）
│   │   ├── settings-host.ts          Host settings 能力的版本结构适配
│   │   ├── settings-client.ts        Client settingsScope/configForms 的版本结构适配
│   │   └── menu-icons.tsx            下拉 chevron 图标导出探测与本地回退
│   └── client/
│       ├── index.ts                  Client 入口：注册「主题」行（order 10.5）、runtime action 注入
│       ├── ThemeStudioRow.tsx        主题行与 Menu 下拉选择器
│       ├── runtime.ts                active / preview 两层 overrideTokens 的所有者
│       ├── presets.ts                8 套内置主题的 token 覆盖与预览色板
│       ├── catalog.ts                ctx.themeStudio.catalog：builtin+imported 只读目录
│       ├── theme-file.ts             dsh-theme.json v1 解析/校验/编译/序列化
│       ├── theme-import.ts           导入决策、持久化与导出编排
│       ├── download.ts               Blob 下载辅助
│       ├── contrast.ts               对比度逐配对诊断（report 命令后端）
│       ├── store.ts / adapter.ts     宿主快照的 runtime 投影与 settings transport
│       └── locales.ts                中英双语词典
├── tests/                            runtime、UI 组件、Cordis 组装、官方主题 bundle 集成
├── scripts/                          compat 检查与矩阵、对比度报告、smoke、发布工程
└── docs/                             需求、架构、ADR、计划、参考、开发工作流、故障排查
```

## 贡献指南

欢迎 Issue 与 PR：

1. 先读 [`AGENTS.md`](./AGENTS.md)（仓库级规则）与[开发工作流](./docs/development/plugin-development-workflow.md)（环境、命令、运行时支持矩阵、升级流程）。
2. 从 `main` 拉分支；提交信息遵循 conventional commits（`feat` / `fix` / `perf` / `refactor` + scope），参见现有历史。
3. PR 前本地必须全部通过：`pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm test`、`pnpm docs:check`、`pnpm compat:check`；改动兼容面时追加 `pnpm compat:matrix`。
4. 影响行为的变更需同批更新 `docs/` 下的对应文档；README 保持中英双语同步；有取舍的工程决策请新增 ADR。
5. 硬约束：**不修改上游仓库（deepseek-harness）任何包**；插件只做 out-of-tree 扩展，`src/compat/dsh-version.ts` 是唯一支持清单。

## 已知限制

- 手动主题创建已在当前分支实现但未发布（npm 0.1.5 不含，见上文「手动创建主题（未发布）」）；就地编辑、图形化 token 预览与持久草稿仍属规划，见[路线图](./docs/plans/active/2026-10-02-theme-studio-roadmap.md)。
- 对比度校验是诊断而非门禁：部分内置配色低于阈值，不自动修色也不阻止预览或应用；`pnpm contrast:report` 见[token 参考](./docs/reference/theme-tokens.md)。
- 预览由悬停驱动：键盘聚焦菜单项不触发预览，可直接 Enter 应用。
- 只读 catalog `ctx.themeStudio.catalog` 只在 Client 提供，含内置与导入主题、不含「默认」项；不提供 register API 或 Host RPC，导入分区随设置快照更新，契约见 [catalog 参考](./docs/reference/theme-catalog.md)。
- Host 拒绝保存时主题行提示失败并恢复上次已接受的选择；设置通道不可用时目录仍在但行会说明该连接不保存选择，排查见[主题行缺失](./docs/troubleshooting/themes-row-missing.md)。
- 四色 Mosaic 固定浅色样本；跨平台浏览器视觉回归覆盖有限，已验证边界见[兼容矩阵](./docs/development/dsh-compatibility.md)。

## 文档

项目长期文档位于 [`docs/`](./docs/README.md)：

- [版本变更记录（CHANGELOG）](./CHANGELOG.md)
- [需求](./docs/requirements/theme-studio.md)
- [目标架构](./docs/architecture/theme-studio.md)
- [设置与包契约](./docs/reference/settings-and-package-contract.md)
- [`dsh-theme.json` 文件格式](./docs/reference/theme-file-format.md)
- [DSH 兼容矩阵](./docs/development/dsh-compatibility.md)
- [决策记录（ADR）](./docs/decisions/README.md)
- [计划](./docs/plans/README.md)
- [开发工作流](./docs/development/plugin-development-workflow.md)
- [常见问题排查](./docs/troubleshooting/README.md)

Coding Agent 的仓库级规则定义于 [`AGENTS.md`](./AGENTS.md)。

## 许可证

[MIT](./LICENSE)
