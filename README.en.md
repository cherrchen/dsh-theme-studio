<div align="center">

# dsh-theme-studio

[中文](./README.md) | English

</div>

## What & Why

DSH (DeepSeek Harness) natively offers only three appearance modes — light, dark, and follow-system; this plugin is an out-of-tree extension that modifies no upstream code and injects a "Themes" row into **Settings → General**, widening the color choices to "**8 built-in themes + a Default entry**", with support for importing and exporting custom `dsh-theme.json` theme files — and an optional Theme Creator skill that lets the model design a palette with you.

The official "Appearance" owns the mode, not the palette, while peer desktop tools have long shipped multiple themes; this plugin brings the same capability to DSH: the Themes row lands between the official "Appearance" and "Font size" rows, its selector mirrors the official Language row dropdown — hover to preview, click to apply.

- **Official Appearance stays in charge**: light / dark / system mode, fonts, and font sizes remain official settings; this plugin only produces token overlays through `ctx.theme.overrideTokens`, while the snapshot and DOM rendering stay with the host.
- **Preview never persists**: hovering a menu item applies colors temporarily and closing the menu restores them; only a click asks the Host to save, and the choice is restored after restarts.
- **Absent when absent**: declares `platform:web`, with no dependency on Electron, Node client capabilities, or a Desktop provider, and no model tools or prompt content; with no theme chosen the UI is item-for-item identical to an uninstalled harness.
- **Creation stays quiet**: the Theme Creator skill answers only the `/dsh-theme-creator` user gesture and stays out of the model catalog by default; the theme menu's "Create your own theme…" opens a Cordis session with the gesture prefilled (never auto-sent), and the result takes effect only after you confirm the import.

Current released version: `v0.1.5`. The user-visible changes of each version live in the [CHANGELOG](./CHANGELOG.en.md); progress and release state live in the [roadmap](./docs/plans/active/2026-10-02-theme-studio-roadmap.md).

## Quick Start

The plugin is published on [npm](https://www.npmjs.com/package/@dsh-electron/dsh-theme-studio). You can paste the package name `@dsh-electron/dsh-theme-studio` into DSH's plugin install page, or install it in two commands:

```sh
dsh plugin --profile web add @dsh-electron/dsh-theme-studio
dsh --profile web
```

Pick the `--profile` for how you launch DSH — see its docs for the values; other install options (tarball, GitHub, a local clone) are covered under [Installation](#installation).

Once it is up, open **Settings → General**: the "Themes" row sits between the official "Appearance" and "Font size" rows. Click the selector on the right to open the theme menu — hover any item to preview its palette instantly, click to apply and let the Host save; pick "Default" to clear every overlay and return to the official theme.

## Requirements

**Using the plugin**: a Web profile on one of the supported DSH releases — an exact match, not a range; the list lives under [DSH compatibility](#dsh-compatibility). `dsh plugin` handles the install; no local Node toolchain is needed.

**Building from source / contributing**: Node.js `^22.19.0 || >=24`, pnpm `11.7.0` (enable via corepack); the dev-pinned DSH is `0.2.1-rc.3`.

**Platforms**: any environment that runs a supported DSH Web; DeepSeek Harness Desktop integrates this package as a built-in runtime plugin.

## DSH compatibility

The exact supported releases are owned by `src/compat/dsh-version.ts` as the single allowlist:

| DSH line | Supported releases |
| --- | --- |
| `v0.1.5` | `0.1.5-rc.2`, `0.1.5-rc.3` |
| `v0.1.6` | `0.1.6-alpha.1`, `0.1.6-alpha.2` |
| `v0.1.7` | `0.1.7-alpha.1`, `0.1.7-alpha.2`, `0.1.7-rc.1`, `0.1.7-rc.2` |
| `v0.2.0` | `0.2.0-rc.1`, `0.2.0-rc.2` |
| `v0.2.1` | `0.2.1-alpha.1`, `0.2.1-alpha.2`, `0.2.1-alpha.3`, `0.2.1-alpha.4`, `0.2.1-alpha.5`, `0.2.1-rc.1`, `0.2.1-rc.2`, `0.2.1-rc.3` |

Releases outside the table — or installs mixing different `@deepseek-ai/dsh-*` versions — are unverified: the plugin itself does not probe the installed tree or block itself at runtime. Peer admission during install may reject some mismatched releases, but an unrejected mixed install can still start; it simply falls outside the supported set.

`pnpm compat:check` verifies that this section, the peer declarations, the development pin, the overrides, the lockfile, and the installed tree agree; `pnpm compat:matrix` regresses every listed release in an isolated install tree. Adaptation seams, verification evidence, and uncovered edges live in the [DSH compatibility matrix](./docs/development/dsh-compatibility.md).

## Installation

`dsh plugin` supports four install sources. All commands below use the web profile as the example; for the Electron desktop swap `--profile web` for `--profile desktop` — the install method is the same.

| Source | Command | Notes |
| --- | --- | --- |
| npm registry (recommended) | `dsh plugin --profile web add @dsh-electron/dsh-theme-studio` | Pre-built artifacts, ready to use |
| GitHub | `dsh plugin --profile web add github:cherrchen/dsh-theme-studio` | Builds automatically from source on install; `allowBuilds` must name this package — pin a version |
| tarball | `dsh plugin --profile web add ./plugin.tgz` | Pre-built offline package, handy for air-gapped or offline delivery |
| From source | `dsh plugin --profile web add /path/to/dsh-theme-studio` | pnpm `link:` to a local checkout — best for development; no `allowBuilds` needed |

**A first `dsh plugin add` from GitHub may fail with `[ERR_PNPM_IGNORED_BUILDS]`**: add the following line to that profile's `pnpm-workspace.yaml` (this package's `prepare` performs the build), then run `add` again:

```yaml
allowBuilds:
  '@dsh-electron/dsh-theme-studio': true
```

If the retry exits 0 but the plugin never lands in `dsh.profile.bundles`, do a `remove` + `add`. Further diagnosis: [build and release troubleshooting](./docs/troubleshooting/build-and-release-failures.md).

### Install from npm (recommended)

```sh
dsh plugin --profile web add @dsh-electron/dsh-theme-studio
```

This installs pre-built artifacts; no `allowBuilds` is needed.

### Install from a tarball

```sh
pnpm pack @dsh-electron/dsh-theme-studio
dsh plugin --profile web add ./plugin.tgz
```

You can also download `plugin.tgz` from the [GitHub Release assets](https://github.com/cherrchen/dsh-theme-studio/releases/download/v0.1.5/plugin.tgz). Also pre-built, handy for air-gapped or offline delivery — available only once the matching Release assets exist.

### Install from GitHub

```sh
dsh plugin --profile web add github:cherrchen/dsh-theme-studio
```

A GitHub install fetches source code and builds it automatically during `add` — no manual build needed — but `allowBuilds` has to name this package itself, as described above.

Pinning a version (e.g. `#v0.1.5`) is recommended so a later push cannot silently change what actually runs:

```sh
dsh plugin --profile web add github:cherrchen/dsh-theme-studio#v0.1.5
```

### Install from a local clone

```sh
git clone https://github.com/cherrchen/dsh-theme-studio.git
cd dsh-theme-studio
pnpm install --frozen-lockfile
pnpm build
dsh plugin --profile web add .
```

> [!TIP]
> If `dsh` is not on your PATH (e.g. you run DSH from a source checkout), use `pnpm dsh` instead.

## Running

Development gates:

```sh
pnpm lint && pnpm typecheck
pnpm test
pnpm build
pnpm docs:check
pnpm compat:check
```

Install into a DSH runtime and verify the composition:

```sh
dsh plugin --profile web add /path/to/dsh-theme-studio
dsh --profile web --dump-config | grep -A3 'theme-studio'
```

Expected output:

```text
# == @dsh-electron/dsh-theme-studio
- id: theme-studio
  name: '@dsh-electron/dsh-theme-studio'
```

That is `cordis.patch.yml` mounting the Host settings half and the Client overlay UI through the official package manager. After startup, **Settings → General** shows the "Themes" row.

## Usage

### The theme selector

To the right of the "Themes" row is a dropdown selector in the style of the official Language row, showing the currently applied theme's four-color swatch and name. The opened menu lists "Default" and every built-in palette in order, each with its own swatch:

- **Hover preview**: hovering a menu item applies that theme temporarily without writing to the Host; closing the menu (pointer leave, outside click, Esc, or toggling the selector again) restores the previous state.
- **Click to apply**: clicking or pressing Enter asks the Host to persist the theme id, which is restored across restarts and new sessions.
- **Default**: removes all of this plugin's overlays, returns to the official theme, and saves `activeThemeId=null`.

The official "Appearance" keeps controlling light / dark / system mode: every built-in theme ships both light and dark values that follow the official mode resolution. Fonts and font sizes likewise stay saved by the official settings — previewing, applying, cancelling, and restoring default never rewrite them.

### Built-in themes

Claude, Codex, Claude Cream, Graphite, OLED, Nordic, Paper, Warm — ids all under the `dsh-theme-studio.*` namespace; "Default" is not a catalog member. The four-color Mosaic in the selector and menu always uses the light sample and does not indicate the mode actually in effect. Full token and palette fields are documented in the [token reference](./docs/reference/theme-tokens.md).

### Importing and managing themes

The footer of the theme menu offers **Import theme** and **Manage themes**:

- **Import**: picking a `.dsh-theme.json` file (v1 format — see the [file format reference](./docs/reference/theme-file-format.en.md)) opens a confirmation dialog; confirming persists the theme through the Host and previews it automatically. An id already used by an imported theme offers overwrite or an automatic rename; ids colliding with the builtin namespace are rejected.
- **Export**: both builtin and imported themes download as `<id>.dsh-theme.json`; builtin exports rewrite the id under the `user.` prefix so the file can be imported back.
- **Remove**: the manage dialog can delete imported themes; removing the active theme falls back to "Default".

Imported themes persist in Host settings and join the public catalog — other plugins can discover them through `ctx.themeStudio.catalog` as well.

### Creating your own theme

The theme menu's **Create your own theme…** opens a Cordis session with `/dsh-theme-creator ` prefilled in the input box — never auto-sent, so you can append a short brief before pressing Enter. On older DSH releases the entry instead asks you to type the gesture manually. The Theme Creator skill walks the model through writing a `dsh-theme.json` in the workspace and self-checking it with the bundled validator `node lib/validate-theme.js <file>`; you then confirm the result through **Import theme**.

Creator visibility is controlled by `creatorAgentMode` (switchable on the Plugins management page, default `gesture`): `gesture` answers user gestures only and stays out of the model catalog, `catalog` also lets the model route to it, and `off` disables the feature and hides the entry.

### Manual theme creation (unreleased)

> Included in the current source — not yet released; npm 0.1.5 does not include this feature.

The theme menu's **Create theme manually…** is a creation entry independent of the `/dsh-theme-creator` AI assistant. It is enabled only while settings are ready and does not depend on the creator mode or workspace state:

- Pick any builtin or imported theme as the base, then fill in the name (the id is generated automatically; you can edit it or use "Generate available id"), author and description. Switching the base rebuilds the entire draft, including the name, id and token edits.
- The token area groups tokens by prefix with every group collapsed and offers name search; each token provides a Light and a Dark input. Expressions such as `var()` and `color-mix()` are stored verbatim, and tokens outside the editable surface keep their base values.
- Contrast diagnostics are informational and never block saving; the name, id and color values must be valid. The serialized text must not exceed 131072 in either UTF-16 code units or UTF-8 bytes; an overflow identifies its largest contribution.
- **Save theme** only appends — never overwrites: a taken id prompts a rename or a generated one. Once the Host accepts the write the theme joins the imported list and previews automatically, and can be exported back to `dsh-theme.json` from **Manage themes**.
- The draft lives in the row's runtime memory: closing the dialog, a pending write or a rejected save keeps every value when reopened; a process restart or row unmount loses it. There is no live graphical preview — preview/apply the saved theme to see it.

## Project structure

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

## Contributing

Issues and PRs are welcome:

1. Read [`AGENTS.md`](./AGENTS.md) (repository rules) and the [development workflow](./docs/development/plugin-development-workflow.md) (environment, commands, runtime support matrix, upgrade procedure) first.
2. Branch from `main`; commit messages follow conventional commits (`feat` / `fix` / `perf` / `refactor` + scope) — see the existing history.
3. Before opening a PR, all of these must pass locally: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm docs:check`, `pnpm compat:check`; add `pnpm compat:matrix` when the change touches a compatibility seam.
4. Behavior-affecting changes update the matching documents under `docs/` in the same change; the READMEs stay bilingual and in sync; engineering trade-offs get a new ADR.
5. Hard constraint: **never modify any package of the upstream repository (deepseek-harness)** — the plugin is an out-of-tree extension only, and `src/compat/dsh-version.ts` is the single support allowlist.

## Known limitations

- Manual theme creation is implemented on the current branch but unreleased (npm 0.1.5 does not include it — see "Manual theme creation (unreleased)" above); in-place editing, a graphical token preview and durable drafts remain on the [roadmap](./docs/plans/active/2026-10-02-theme-studio-roadmap.md).
- The contrast check is a diagnostic, not a gate: some built-in palettes fall below threshold and are neither repaired automatically nor blocked from preview or apply; `pnpm contrast:report` is documented in the [token reference](./docs/reference/theme-tokens.md).
- Preview is hover-driven: keyboard focus on menu items does not preview; press Enter to apply directly.
- The read-only catalog `ctx.themeStudio.catalog` exists only on the Client, covers builtin and imported themes but not "Default"; it offers no register API or Host RPC, and the imported section follows the settings snapshot — see the [catalog reference](./docs/reference/theme-catalog.md).
- When the Host refuses to save, the row reports the failure and restores the last accepted choice; when the settings channel is unavailable the catalog still works but the row explains that this connection does not save selections — see [missing Themes row](./docs/troubleshooting/themes-row-missing.md).
- The four-color Mosaic uses a fixed light sample; cross-platform browser visual coverage is limited — verified bounds are listed in the [compatibility matrix](./docs/development/dsh-compatibility.md).

## Documentation

The project's long-lived documents live under [`docs/`](./docs/README.md):

- [Changelog (CHANGELOG)](./CHANGELOG.en.md)
- [Requirements](./docs/requirements/theme-studio.md)
- [Target architecture](./docs/architecture/theme-studio.md)
- [Settings and package contract](./docs/reference/settings-and-package-contract.md)
- [`dsh-theme.json` file format](./docs/reference/theme-file-format.en.md)
- [DSH compatibility matrix](./docs/development/dsh-compatibility.md)
- [Architecture decision records (ADR)](./docs/decisions/README.md)
- [Plans](./docs/plans/README.md)
- [Development workflow](./docs/development/plugin-development-workflow.md)
- [Troubleshooting](./docs/troubleshooting/README.md)

Repository-level rules for Coding Agents are defined in [`AGENTS.md`](./AGENTS.md).

## License

[MIT](./LICENSE)
