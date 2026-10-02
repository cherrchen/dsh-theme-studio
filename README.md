# dsh-theme-studio

English | [中文](README.zh.md)

Portable DSH/Cordis plugin that overlays builtin color themes on the official Appearance preference. The package is `platform:web` with no Electron, Node, or Desktop dependency. The npm scope `@dsh-electron/` identifies the publisher, not a runtime requirement.

This repository is the canonical source. [DeepSeek Harness Desktop](https://github.com/cherrchen/deepseek-harness-electron) mirrors it with git subtree under `apps/electron/runtime/plugins/dsh-theme-studio` and rebuilds Host and Client artifacts from source. The same package runs unchanged in Desktop and in a standard DSH Web host.

Stages 1–3 provide builtin theme browsing, preview, apply, persistence, plugin lifecycle recovery, automated contrast diagnostics, and a public readonly Client catalog. Theme Schema, import/export, and Theme Creator Agent remain deferred.

## DSH compatibility

Supported releases are the exact versions in `src/compat/dsh-version.ts`: 0.1.5-rc.2, 0.1.5-rc.3, 0.1.6-alpha.1, 0.1.6-alpha.2, 0.1.7-alpha.1, 0.1.7-alpha.2, 0.1.7-rc.1, 0.1.7-rc.2, 0.2.0-rc.1, and 0.2.0-rc.2. `pnpm compat:check` fails when this section and that list disagree. The development install is pinned to the newest supported release. Hosts that enforce DSH peer compatibility admit the plugin only while the running release is on this list.

Matrix evidence and upgrade risks: [DSH compatibility matrix](docs/development/dsh-compatibility.md). Run `pnpm compat:matrix` to verify every supported release in isolated installations.

## Installation

The npm package name is `@dsh-electron/dsh-theme-studio`. See [the release workflow](docs/development/release-workflow.md) for the tag-driven release process.

**DeepSeek Harness Desktop** — Theme Studio is required built-in. Desktop always mounts it from the runtime plugin inventory.

**DSH Web** — add the package to a profile after building `lib/`:

```sh
pnpm install
pnpm build
dsh plugin --profile web add .
```

Or install directly from GitHub:

```sh
dsh plugin --profile web add github:cherrchen/dsh-theme-studio
```

`dsh plugin add` activates the bundled `cordis.patch.yml` layer. Official Appearance (`Light` / `Dark` / `System`) stays owned by `dsh-client-ui-theme`. Theme Studio only adds **Settings → General → Themes**.

## User experience

Settings → General shows Appearance first (`order = 10`) and Themes below it (`id = themes`, `order = 20`).

- **Default** clears the Theme Studio overlay and shows the official theme.
- **Preview** is transient and is not written to settings.
- **Apply** persists `activeThemeId` in the Host `theme-studio` namespace.
- Changing Appearance still switches the official light/dark base; the active Theme Studio palette follows automatically.

Restarting the app restores the last applied theme. Unloading the plugin removes both overlay layers so ThemeRuntime returns to the official theme.

## Runtime model

Theme Studio does not present CSS itself. It calls `ctx.theme.overrideTokens()`:

```text
Official Light / Dark / System
        ↓
ACTIVE_SOURCE  (@dsh-electron/dsh-theme-studio:active)
        ↓
PREVIEW_SOURCE (@dsh-electron/dsh-theme-studio:preview)
        ↓
ThemeSnapshot → ThemePresenter → DOM
```

Host settings:

```text
ui-theme.preference          system | light | dark
theme-studio.activeThemeId   null | dsh-theme-studio.*
```

`null` is Default. Builtin ids include `dsh-theme-studio.claude`, `.codex`, `.claude-cream`, `.graphite`, `.oled`, `.nordic`, `.paper`, and `.warm`.

## Contrast validation (Stage 2)

`validateThemeContrast(preset)` checks both schemes and returns immutable, per-pair results with full-precision ratios, thresholds, and `passed` / `failed` / `unknown` status. Defaults cover normal text, links, status colors, code syntax, toast/tooltip/menu copy, and focus indicators. Text pairs use the WCAG AA minimum of 4.5:1; focus indicators use 3:1. See [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

From a source checkout:

```sh
pnpm contrast:report
pnpm contrast:report --strict
# JSON export after compiling the pure modules:
pnpm build:types
node scripts/report-contrast.mjs --json > contrast-report.json
```

The report command exits nonzero for unknown pairs; `--strict` also fails for ratios below the minimum. Current builtin palettes have known failures, so strict mode currently exits nonzero. The validator reports them without changing the palettes or blocking preview/apply. [Scope and builtin results](docs/development/theme-contrast.md) record all 16 theme/scheme summaries.

These are token-pair diagnostics. A passing report applies only to the checked pairs; this package does not claim that all builtin palettes or a rendered host meet WCAG. Host CSS placement, inherited tokens, typography, gradients, and other plugins' overlays require separate rendered-UI evaluation.

## Public theme catalog (Stage 3)

Client plugins can inject `themeStudio` and discover the same immutable catalog used by the overlay runtime. Import the Client declarations for the typed `ctx.themeStudio` property:

```ts
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@dsh-electron/dsh-theme-studio/client'

export const inject = ['themeStudio']
export function apply(ctx: Context): void {
  const themes = ctx.themeStudio.catalog.list()
  const claude = ctx.themeStudio.catalog.get('dsh-theme-studio.claude')
  const report = ctx.themeStudio.catalog.validate('dsh-theme-studio.claude')
  // themes: ordered readonly presets; claude/report: undefined for unknown ids.
}
```

Add `@dsh-electron/dsh-theme-studio` to the consuming package's `dsh.client.inject` list so its browser bundle is loaded. `list()` returns a stable snapshot in Settings card order; `get()` exposes id, name, description, light/dark tokens, and preview colors. Default is not a catalog member. `validate()` returns the Stage 2 diagnostic report. The service is available while this Client plugin is loaded, including before settings become ready and across settings-transport changes. Cordis releases it and stops injected consumers on unload, then restarts them when the service returns. It is a discovery API; theme application continues through the existing settings UI.

## Composition

The Host plugin registers the `theme-studio` settings namespace when `ctx.settings` exists, and is a no-op otherwise. Hosts through 0.1.6-alpha.2 use `settings.register`. Starting with 0.1.7-alpha.1 the same section is the plugin `Config`, and the generated form is turned off because the Themes row is custom. The Client plugin requires `theme`, `slots`, `locale`, `connection`, and `remote`, then reads whichever settings transport the host provides: `settingsScope` or `configForms`. Headless profiles load only the Host half and do not boot the browser UI. The package intentionally has no `./invariant` export because ThemeRuntime owns overlay-layer consistency and the settings service owns persistence. Its browser bundle is registered through the bare package-name loader row; the official plugin manager reads the installed bundle metadata.

## npm publication

The npm package name is `@dsh-electron/dsh-theme-studio`. Releases are triggered by pushing a `v<version>` tag that matches `package.json`.

## Development

Use Node.js `^22.19` or `>=24` with pnpm 11.

```sh
pnpm install --frozen-lockfile
pnpm compat:check
pnpm typecheck
pnpm test
pnpm build
pnpm pack --dry-run
```

## Model Experience

None, as this package contributes human-facing Client UI without registering model tools or prompt content.

#### KV Cache effect

None. The package does not add, replace, or retain model-request tokens.

## Known Limitations and Deferred Work

- **Builtin themes only** — no import/export, theme registration API, or validation of a public `.dsh-theme.json` schema.
- **Scoped contrast diagnostics** — some builtin pairs fall below the minimum; the validator does not certify an entire host UI or automatically repair palettes.
