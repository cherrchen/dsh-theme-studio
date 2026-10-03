# dsh-theme-studio

[中文](./README.md) | English

## Project Overview (What & Why)

Theme Studio is a portable DSH/Cordis theme overlay plugin. It adds builtin palettes above official Appearance and provides browsing, preview, apply, persistence, contrast diagnostics, and readonly discovery.

Users can change palettes while keeping official Light, Dark, and System behavior. Theme Studio produces token overlays through `ctx.theme.overrideTokens()`; the host owns ThemeSnapshot, ThemePresenter, and DOM presentation. The package is `platform:web` without Electron, client Node capabilities, or a Desktop provider. The npm scope `@dsh-electron/` identifies the publisher rather than a runtime requirement.

This repository is canonical. [DeepSeek Harness Desktop](https://github.com/cherrchen/deepseek-harness-electron) mirrors it through git subtree at `apps/electron/runtime/plugins/dsh-theme-studio` and rebuilds Host and Client from source. The same package runs in standard DSH Web.

The latest local release tag is `v0.1.3`. Stage 1 is implemented; the Stage 2 validator and Stage 3 catalog are committed but remain Unreleased and are absent from that tag. The [roadmap ledger](./docs/plans/active/2026-10-02-theme-studio-roadmap.md) owns progress and release state; the [changelog](./CHANGELOG.en.md) owns user-visible release changes. Earlier branches targeting older DSH versions do not define current support.

## Quick Start

With a supported DSH Web runtime:

```sh
dsh plugin --profile web add @dsh-electron/dsh-theme-studio
dsh --profile web
```

Open **Settings → General → Themes**. Official Appearance comes first at order 10; Themes follows with id themes and order 20. Default clears overlays, preview is transient, and apply saves the selection on the Host. Desktop includes the package in its runtime inventory; headless loads only Host settings, with no browser row or Client catalog.

npm and release tarballs contain published builds. To use unreleased Stage 2/3, build source containing those changes. A successful install still requires the host's UI/theme/locale/connection/remotes and a settings transport. [Themes-row troubleshooting](./docs/troubleshooting/themes-row-missing.md) distinguishes missing services from a section that is not ready.

## Environment Requirements

- Usage: a supported DSH profile, Web host, or Desktop integration.
- Source development: Node.js `^22.19.0 || >=24`, pnpm `11.7.0`, and Git; package.json engines/packageManager are authoritative.
- Development uses the newest supported DSH baseline. Compatibility checks verify the exact pin, vendor versions, and installed tree; do not copy a pin from an old plan.
- No model tools or prompt content are registered. Tests and reports require no model credentials.

## DSH compatibility

Supported exact releases come from `src/compat/dsh-version.ts`: 0.1.5-rc.2, 0.1.5-rc.3, 0.1.6-alpha.1, 0.1.6-alpha.2, 0.1.7-alpha.1, 0.1.7-alpha.2, 0.1.7-rc.1, 0.1.7-rc.2, 0.2.0-rc.1, and 0.2.0-rc.2. `pnpm compat:check` verifies this section, the Chinese README, peers, the development pin, overrides, lockfile, and actual installed tree. Hosts enforcing peer admission load the plugin only when their release is declared supported. Production entry points do not probe package versions through Node.

See the [DSH compatibility matrix](./docs/development/dsh-compatibility.md) for seam coverage, evidence, upgrade risks, and limits. `pnpm compat:matrix` checks every supported release in isolated temporary installations without changing the development tree.

## Installation

| Source | Command | Notes |
| --- | --- | --- |
| npm | `dsh plugin --profile web add @dsh-electron/dsh-theme-studio` | Published prebuilt package |
| tarball | `dsh plugin --profile web add ./dsh-electron-dsh-theme-studio-0.1.3.tgz` | Offline build from the matching Release/tag or your own pack |
| GitHub | `dsh plugin --profile web add github:cherrchen/dsh-theme-studio` | Source installation runs prepare; pin a tag for reproducibility |
| local | `dsh plugin --profile web add .` | Install dependencies and build this checkout first |

Build local source:

```sh
git clone https://github.com/cherrchen/dsh-theme-studio.git
cd dsh-theme-studio
pnpm install --frozen-lockfile
pnpm build
dsh plugin --profile web add .
```

Pin an existing GitHub release:

```sh
dsh plugin --profile web add github:cherrchen/dsh-theme-studio#v0.1.3
```

`dsh plugin add` activates `cordis.patch.yml`. The bare package loader row anchors Host/Client composition and official package-manager discovery. Keep it rather than mounting only the client subpath; the plugin no longer registers a separate Plugins-page card. If an installer reports pending lifecycle builds, follow its actual prepare prompt. This package has no multi-root plugin koffi/native-build dependency, so that project's installation exceptions do not apply. See [build and release troubleshooting](./docs/troubleshooting/build-and-release-failures.md).

## Usage

- **Default** removes both Theme Studio layers, returns to the official theme, and saves activeThemeId=null.
- **Preview** is transient and does not write the Host. Previewing Default temporarily hides the active overlay.
- **Cancel** drops preview and restores the durable theme.
- **Apply** saves a builtin id; Apply in the preview bar promotes the current preview.
- **Appearance** still owns Light/Dark/System. Each overlay supplies both modes and follows the official resolution.

Once the Host is ready, the last accepted theme is restored. Unknown durable ids return to Default and trigger a repair attempt. Unload removes both runtime layers and the settings row; transport re-provision starts them again. Without a transport, discovery is available but the UI does not start. An unavailable section shows that the connection will not save the selection. The four-color Mosaic currently displays the light sample, independently of the actual overlay mode.

Builtins are Claude, Codex, Claude Cream, Graphite, OLED, Nordic, Paper, and Warm. Their ids use `dsh-theme-studio.*`; Default is not a catalog member. See the [token reference](./docs/reference/theme-tokens.md) for the full directory and palette fields.

## Runtime Model

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

The Host adapts to actual settings register/configure capabilities; the Client uses settingsScope/configForms. The store projects runtime snapshots, while the Host accepted snapshot is durable authority. See [architecture](./docs/architecture/theme-studio.md), [runtime API](./docs/reference/theme-runtime.md), and [settings/package contract](./docs/reference/settings-and-package-contract.md).

## Contrast Validation (Stage 2, Unreleased)

`validateThemeContrast(preset)` returns immutable per-pair results for both schemes. Defaults cover normal text, links, status colors, code syntax, toast/tooltip/menu copy, and focus indicators. Text uses 4.5:1 and focus uses 3:1. Comparisons use full precision; unresolved colors become unknown rather than passing silently.

```sh
pnpm contrast:report
pnpm contrast:report --strict
pnpm build:types
node scripts/report-contrast.mjs --json > contrast-report.json
```

Default report mode fails only for unknown results; strict also fails for ratios below their threshold. The current 768 builtin checks include 188 failed and no unknowns, so strict returns nonzero as expected. Validation does not repair colors or block apply. The [contrast reference](./docs/reference/theme-contrast.md) documents formulas, pairs, all 16 scheme summaries, supported colors, and limits. The rules follow [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

## Public Theme Catalog (Stage 3, Unreleased)

Client consumers add this package to their `dsh.client.inject` metadata and inject themeStudio:

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

list returns a stable, deeply frozen list in card order. get/validate return undefined for unknown ids. The runtime and service share a catalog; settings readiness or transport changes do not revoke it. Cordis stops injected consumers when the Client unloads. This is discovery; it neither registers themes nor controls Appearance. See the [complete catalog API](./docs/reference/theme-catalog.md).

## Development and Verification

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

Documentation checks must pass. Strict contrast reporting is a diagnostic distinct from a successful test suite. Generated artifacts live in lib and are not committed; build after cleaning generated output to avoid packaging stale declarations. Tests cover runtime, UI, real Cordis, the legacy provider, and the installed official theme bundle. They are not a complete browser/disk/cross-platform UI journey. See the [development workflow](./docs/development/plugin-development-workflow.md) for procedures and limits.

## Project Structure and Documentation

| Location | Responsibility |
| --- | --- |
| src/index.ts, settings.ts, constants.ts | Host settings and shared identities |
| src/compat/ | Structural settings adapters, support list, and pure classification |
| src/client/ | Presets/chrome, catalog, validation, runtime, store, UI, and locale |
| tests/ | Unit, Client composition, Host provider, and official theme integration |
| scripts/, .github/workflows/ | Checks, matrices, reports, versions, and release engineering |
| docs/ | Requirements, architecture, ADRs, plans, development, reference, and troubleshooting |
| .agent/ | Documentation rules, templates, and durable maintenance knowledge |

The [documentation map](./docs/README.en.md) provides navigation, and [commit history](./docs/reference/repository-history.md) explains evolution. The npm package includes only the files-listed builds, language entry points, changelogs, patch, and license. Full source documentation is also available in the [GitHub documentation directory](https://github.com/cherrchen/dsh-theme-studio/tree/main/docs).

## Releases

An annotated v* tag matching package.json triggers release verification, builds, tarball checks, npm publication with provenance, and a GitHub Release. See the [release workflow](./docs/development/release-workflow.md) for preparation and tagging. This does not imply unreleased Stage 2/3 are published or establish current remote workflow, npm access, or OIDC settings.

## Model Experience

None. The package contributes human-facing Client UI and a catalog for plugins, without model tools or prompt content.

### KV Cache effect

None. The package does not add, replace, or retain model-request tokens.

## Known Limits and Deferred Work

- Builtins only: public .dsh-theme.json schema, import/export, registration/editing, and Theme Creator Agent are unimplemented.
- Contrast is scoped token-pair diagnostics. Some builtin pairs fail; the package does not certify entire themes or a rendered host against WCAG.
- Catalog is Client-only, excludes Default, and has no dynamic registration or Host RPC.
- Rejected settings writes have no dedicated error UI; an optimistic badge does not prove persistence.
- Mosaic uses the light sample. Full browser visual checks, this revision's real-profile disk journey, and native cross-platform presentation remain uncovered.

The [roadmap](./docs/plans/active/2026-10-02-theme-studio-roadmap.md) owns follow-up state; verified issues and diagnostics live in [troubleshooting](./docs/troubleshooting/README.en.md).
