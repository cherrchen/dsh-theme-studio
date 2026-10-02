# dsh-theme-studio

中文 | [English](./README.en.md)

## 项目简介（What & Why）

Theme Studio 是 DSH/Cordis 的可移植主题 overlay 插件：在官方外观偏好之上增加内置配色，提供浏览、预览、应用、持久化、对比度诊断与只读主题发现。

用户可以切换配色，同时继续使用官方浅色、深色和跟随系统。Theme Studio 只调用 `ctx.theme.overrideTokens()` 产生 token 覆盖；官方 ThemeSnapshot、ThemePresenter 和 DOM 呈现仍由宿主管理。包声明 `platform:web`，不依赖 Electron、Node 客户端能力或 Desktop provider。npm 作用域 `@dsh-electron/` 标识发布者，不是 runtime 要求。

本仓库是权威源码。[DeepSeek Harness Desktop](https://github.com/cherrchen/deepseek-harness-electron) 通过 git subtree 镜像到 `apps/electron/runtime/plugins/dsh-theme-studio`，从源码重建 Host 与 Client；同一包可在标准 DSH Web 中运行。

仓库最近发布 tag 为 `v0.1.3`。Stage 1 已实现；Stage 2 校验器与 Stage 3 catalog 已提交，仍位于 Unreleased，未包含在该 tag 中。当前进度及发布状态见[路线图总账](./docs/plans/active/2026-10-02-theme-studio-roadmap.md)，每版本用户可见变更见 [CHANGELOG](./CHANGELOG.md)。历史分支曾针对早期 DSH 版本，不代表当前支持承诺。

## 快速开始

已有受支持 DSH Web runtime 时：

```sh
dsh plugin --profile web add @dsh-electron/dsh-theme-studio
dsh --profile web
```

打开 **设置 → 通用 → 主题**。官方“外观”先出现（order 10），Themes 在下面（id themes，order 20）。默认卡清除覆盖层，预览不保存，应用后 Host 保存主题选择。Desktop 将本包作为内置 runtime 插件；headless 仅加载 Host 设置半，不启动浏览器行或 Client catalog。

npm/tarball 对应已发布构建；体验未发布 Stage 2/3 应构建包含该提交的源码。安装成功仍需宿主提供 UI/theme/locale/connection/remotes 与可用 settings transport；[主题行排查](./docs/troubleshooting/themes-row-missing.md)解释依赖缺失与服务未就绪的差别。

## 环境要求

- 使用：受支持的 DSH profile，Web host 或集成本包的 Desktop。
- 源码开发：Node.js `^22.19.0 || >=24`、pnpm `11.7.0`、Git；以 package.json engines/packageManager 为准。
- 开发安装固定在最新受支持 DSH 基线；具体 pin、vendor 版本和安装树由兼容检查验证，不从旧计划抄值。
- 本包不注册模型工具或提示内容；运行单测和报告无需模型凭据。

## DSH 兼容性

支持的精确版本以 `src/compat/dsh-version.ts` 为准：0.1.5-rc.2、0.1.5-rc.3、0.1.6-alpha.1、0.1.6-alpha.2、0.1.7-alpha.1、0.1.7-alpha.2、0.1.7-rc.1、0.1.7-rc.2、0.2.0-rc.1、0.2.0-rc.2。`pnpm compat:check` 检查本节、英文 README、peer 声明、开发 pin、overrides、lockfile 与实际安装树。启用 peer admission 的宿主仅在其运行版本被声明支持时加载插件。本包生产入口不通过 Node 探测包版本。

完整证据、适配接缝、升级风险与未覆盖边界见 [DSH 兼容矩阵](./docs/development/dsh-compatibility.md)。运行 `pnpm compat:matrix` 会在独立临时安装树验证全部清单版本，不修改当前依赖树。

## 安装

| 来源 | 命令 | 说明 |
| --- | --- | --- |
| npm | `dsh plugin --profile web add @dsh-electron/dsh-theme-studio` | 已发布的预构建包 |
| tarball | `dsh plugin --profile web add ./dsh-electron-dsh-theme-studio-0.1.3.tgz` | 离线构建；文件应来自匹配 tag 的 Release 或自行 pack |
| GitHub | `dsh plugin --profile web add github:cherrchen/dsh-theme-studio` | 源码安装由 prepare 构建；固定 tag 可复现 |
| 本地 | `dsh plugin --profile web add .` | 本仓库先完成依赖安装与构建 |

构建本地源码：

```sh
git clone https://github.com/cherrchen/dsh-theme-studio.git
cd dsh-theme-studio
pnpm install --frozen-lockfile
pnpm build
dsh plugin --profile web add .
```

从 GitHub 固定已有发布版本：

```sh
dsh plugin --profile web add github:cherrchen/dsh-theme-studio#v0.1.3
```

`dsh plugin add` 激活附带 `cordis.patch.yml`，bare package loader 行是 Host/Client 建图和官方包管理器的入口。不要把它改成仅加载 client 子路径；插件不再注册独立插件页卡片。若上层安装器提示生命周期构建待决，按实际提示处理 prepare；本包没有 multi-root 插件的 koffi/native-build 依赖，不能照搬它的安装例外。细节见[构建与发布排查](./docs/troubleshooting/build-and-release-failures.md)。

## 使用方法

- **默认**：删除 Theme Studio 两层覆盖，回到官方主题，保存 activeThemeId=null。
- **预览**：临时显示主题，不写 Host；预览默认会暂时隐藏原 active 层。
- **取消**：移除预览，恢复之前持久主题。
- **应用**：保存选中的内置 id；预览栏的应用将当前预览提升为持久主题。
- **外观**：继续由官方控制浅色/深色/系统；每套 overlay 提供两种模式，自动跟随解析。

Host ready 后恢复最后接受的主题，未知持久 id 恢复默认并尝试修复。插件卸载移除 runtime 两层与设置行；设置通道重供后重新启动。没有 transport 时 catalog 可用但 UI 不启动；transport 返回 unavailable 时 row 说明此连接不保存选择。当前四色 Mosaic 固定使用浅色样本，不代表实际 overlay 模式。

内置主题：Claude、Codex、Claude Cream、Graphite、OLED、Nordic、Paper、Warm。id 使用 `dsh-theme-studio.*` 命名空间，默认不是目录成员。完整 token 和配色字段见[token 参考](./docs/reference/theme-tokens.md)。

## 运行模型

```text
Official Light / Dark / System
        ↓
ACTIVE_SOURCE  (@dsh-electron/dsh-theme-studio:active)
        ↓
PREVIEW_SOURCE (@dsh-electron/dsh-theme-studio:preview)
        ↓
ThemeSnapshot → ThemePresenter → DOM
```

```text
ui-theme.preference          system | light | dark
theme-studio.activeThemeId   null | dsh-theme-studio.*
```

Host 使用实际 settings register/configure 能力；Client 使用 settingsScope/configForms。store 只是 runtime 快照投影，Host accepted snapshot 才是持久 authority。详见[架构](./docs/architecture/theme-studio.md)、[runtime API](./docs/reference/theme-runtime.md)与[设置/包契约](./docs/reference/settings-and-package-contract.md)。

## 对比度校验（Stage 2，Unreleased）

`validateThemeContrast(preset)` 对明暗两套配色返回不可变逐配对报告。默认覆盖普通文字、链接、状态色、代码语法、toast/tooltip/menu 和 focus。文本阈值 4.5:1，焦点指示 3:1；比较使用全精度，解析失败为 unknown，不能静默通过。

```sh
pnpm contrast:report
pnpm contrast:report --strict
pnpm build:types
node scripts/report-contrast.mjs --json > contrast-report.json
```

默认报告仅对 unknown 返回失败；strict 同时对低于阈值返回失败。当前内置 768 项中 188 failed、0 unknown，strict 返回非零是预期。校验不自动改色或阻止应用。完整算法、配对、16 个模式基线、色值支持及未覆盖范围见[对比度参考](./docs/reference/theme-contrast.md)。采用的规则依据 [W3C 文字对比度](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)与[非文字对比度](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)。

## 公开主题目录（Stage 3，Unreleased）

Client 消费者在自己的 `dsh.client.inject` metadata 加入本包，再注入 themeStudio：

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

list 返回稳定、深层冻结的 card 顺序列表；get/validate 对未知 id 返回 undefined。服务与 runtime 共用 catalog，设置未 ready 或 transport 切换不会撤销它，Client 卸载时 Cordis 停止依赖消费者。它只负责发现，不能注册新主题或改变 Appearance。完整契约见 [catalog API](./docs/reference/theme-catalog.md)。

## 开发与验证

```sh
pnpm install --frozen-lockfile
pnpm docs:check
pnpm compat:check
pnpm typecheck
pnpm test
pnpm build
pnpm pack --dry-run
pnpm compat:matrix
```

文档结构检查必须通过；对比度 strict 是诊断，不与单测成功混淆。构建产物在 lib，不进入 Git；清理生成目录后构建避免旧 declaration 混入包。测试直接覆盖 runtime、UI、真实 Cordis、legacy provider 与已安装官方主题 bundle；不把这些测试扩大解释为完整 browser/磁盘/跨平台 UI e2e。操作与验证边界见[开发工作流](./docs/development/plugin-development-workflow.md)。

## 项目结构与文档

| 位置 | 责任 |
| --- | --- |
| src/index.ts、settings.ts、constants.ts | Host 设置与共享身份 |
| src/compat/ | settings 结构适配、兼容清单与纯分类 |
| src/client/ | preset/chrome、catalog、validator、runtime、store、UI 与 locale |
| tests/ | 单元、Client 组装、Host provider 与官方主题集成 |
| scripts/、.github/workflows/ | 检查、矩阵、报告、版本与发布工程 |
| docs/ | 需求、架构、ADR、计划、开发、参考与故障排查 |
| .agent/ | 文档规范、模板与可复用维护知识 |

完整[文档地图](./docs/README.md)与[提交历史](./docs/reference/repository-history.md)分别负责导航与演进事实。npm 包仅包含 files 清单中的构建、语言入口、changelog、patch 与 license；完整源码文档也可从 [GitHub 文档目录](https://github.com/cherrchen/dsh-theme-studio/tree/main/docs)访问。

## 发布

发布由与 package.json 匹配的 annotated v* tag 触发。CI 校验、构建、检查 tarball，随后 npm provenance 发布并生成 GitHub Release。版本准备与 tag 操作见[发布流程](./docs/development/release-workflow.md)；本文不表示未发布 Stage 2/3 已发布，也不代替检查远端 workflow、npm 权限或 OIDC 配置。

## Model Experience

无。本包贡献面向用户的 Client UI 与其他插件可读的目录，不注册模型工具或提示内容。

### KV Cache effect

无。本包不增加、替换或保留模型请求 token。

## 已知限制与后续工作

- 仅内置主题；公共 .dsh-theme.json schema、导入导出、注册/编辑和 Theme Creator Agent 仍未实现。
- 对比度是有限 token 配对诊断，部分内置配色低于阈值；不认证完整主题或实际 host UI 符合 WCAG。
- catalog 只在 Client 提供，不包含 Default、不支持动态目录或 Host RPC。
- 设置写入 rejected Promise 暂无专门错误 UI；乐观徽标不能证明落盘成功。
- Mosaic 固定浅色样本；完整浏览器视觉、实际 profile 的本次磁盘旅程与跨平台呈现验证尚未补齐。

这些限制的处理状态在[路线图](./docs/plans/active/2026-10-02-theme-studio-roadmap.md)维护；已验证故障与诊断入口见[故障排查](./docs/troubleshooting/README.md)。
