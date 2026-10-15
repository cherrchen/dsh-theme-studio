# Changelog

User-facing changes for released versions. 中文版：[CHANGELOG.md](./CHANGELOG.md)。

This changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Public `dsh-theme.json` v1 theme file format with a packaged JSON Schema (`schemas/dsh-theme.schema.json`): `palette` requires all 13 fields per scheme, optional sparse `overrides` layer over derived tokens; color values are limited to the contrast resolver's supported subset and an omitted `version` defaults to 1.
- Import and manage actions in the Themes menu: imports persist through a confirmation dialog and preview automatically, duplicate ids let the user choose overwrite or an automatically generated id; the manage dialog exports and removes imported themes, and builtin themes export as re-importable `user.*` files.
- The public `ctx.themeStudio.catalog` is now a builtin + imported composite (ADR-0009): `list()`/`get()`/`validate()` cover imported themes and `list()` returns a frozen snapshot at call time.

### Changed

- The `theme-studio` settings namespace gains an `importedThemes` field persisting imported theme source files; the Host schema stays loose while the Client parses strictly, so unreadable entries are skipped without breaking the rest of the settings.

### Fixed

- Rejected imports, replacements and removals report a save failure and preserve the accepted theme list on older settings transports; imports and removals are disabled until settings are ready.
- Replacement imports preview the new colors after acceptance; automatic duplicate-id renames stay within the 64-character limit.
- In the Themes menu, moving the pointer off a theme row or hovering "Import theme…"/"Manage themes…" restores the applied theme instead of keeping the last hovered preview; selecting either action by keyboard cancels the preview too.
- Import edits merge onto the accepted raw array so entries the parser skipped survive appends, replacements, and removals instead of being silently deleted.
- Import confirmation rechecks the id against the catalog and in-flight writes; a stale confirm returns to the duplicate dialog, and a late `append` collision falls back to a keep-both rename instead of persisting a duplicate id.
- Overlong imported theme names ellipsize in the selector pill and the manage dialog (with the full name as a tooltip) instead of stretching the settings row.
- A theme file that fails to read (for example, an I/O error mid-read) now shows the import error dialog instead of an unhandled Promise rejection.
- The import confirmation and manage dialogs now show a theme file's `description` field, matching the file-format reference; long descriptions ellipsize with the full text as a tooltip.
- Theme-menu hover preview is now tracked per whole row: resting the pointer on a row's padding or the icon/text gap no longer restores the applied theme; moving onto separators, group labels, footer actions, or outside the menu still does.
- A theme file's `$schema` field is now restricted to strings per the published JSON Schema; non-string values (such as deeply nested objects) previously passed validation and were persisted, then overflowed the deep-freeze recursion with a RangeError — and the same stored entry failed catalog loading again on every restart.
- A theme file's `version: null` is no longer treated as omitted; it is rejected as `unsupported-version`, matching the published JSON Schema.
- Theme-file validation no longer recursively stringifies rejected values: a deeply nested array as `id`, `name`, `version`, or an override color is now rejected with the matching error code instead of throwing a RangeError.

## [0.1.4] - 2026-10-11

### Added

- Support DSH 0.2.1-alpha.1 and 0.2.1-alpha.2. Official text, code, and terminal font families and sizes stay independent: preview, apply, cancel, Default, and light/dark/system changes do not rewrite them.
- When the Host rejects a theme save, the settings row reports the failure and restores the last accepted choice. Rapid applies are written in order, so an older success cannot land after a newer choice and replace it. A disposed plugin does not reapply a late result.
- Stage 2 automated contrast validation: per-pair light/dark reports, alpha and sRGB mix resolution, a report command with strict exit mode, and README documentation of actual coverage and known builtin failures.
- Stage 3 public Client `ctx.themeStudio.catalog` for readonly theme discovery and contrast reports, with Cordis service teardown and reload support.

### Changed

- The Client bundle shares the upstream Client runtime’s `@deepseek-ai/dsh-client-store` instead of bundling a second instance. Isolated candidate probes and multi-version regression gates now feed the release workflow.

- Completed requirements, architecture, ADRs, implementation records, development workflows, full API/token references, and troubleshooting from current code and all historical commits. Root documentation now uses canonical Chinese README.md and English README.en.md; README.zh.md preserves the former Chinese link.
- Added docs:check and wired it into CI/release verification, with matching README compatibility checks and publication language files.

## [0.1.3] - 2026-09-30

### Added

- Added three builtin overlays aligned with Claude Desktop, Codex Desktop, and Claude Cream.
- Builtin themes now cover semantic colors, component-referenced statics, and syntax-highlight tokens that previously stayed on the official palette, while preserving static white semantics used by tooltips and other components.
- Support DSH 0.2.0-rc.1 and 0.2.0-rc.2, including eight new semantic tokens and isolated verification of every supported release.

### Changed

- Unified development dependencies, overrides, and lockfile on the newest supported DSH 0.2.0-rc.2; official theme integration tests now load the actual installed published bundle.

## [0.1.2] - 2026-09-27

### Changed

- Removed Theme Studio’s custom Plugins-page card and detail contributions; the installed package is listed in the official plugin manager through its package-name loader entry. The General Themes settings row remains.

## [0.1.1] - 2026-09-26

### Added

- Support DSH 0.1.7-rc.1 and 0.1.7-rc.2, which enforce declared DSH peer ranges when a profile installs or boots a plugin.

### Fixed

- Persist the selected theme again on hosts that register settings namespaces through the legacy `register` API: the returned namespace scope is no longer handed back to Cordis, which rejected it as an invalid effect and silently rolled the registration back.

## [0.1.0] - 2026-09-25

First public release of the theme overlay plugin for DSH Web and Desktop.

### Added

- Browse Graphite, OLED, Nordic, Paper, Warm, and Default in Settings → General → Themes, with transient preview, cancel, apply, and restore after restart.
- Overlay theme tokens through `ctx.theme.overrideTokens()` while leaving the official light, dark, and system appearance with the host.
- Persist the selected theme on the Host and adapt register/settingsScope and Config/configure/configForms across supported DSH releases; restart the Themes row after the settings service stops and is provided again.
- Publish standalone Host and Client bundles, TypeScript declarations, and `cordis.patch.yml`, with an explicit DSH compatibility list.

[Unreleased]: https://github.com/cherrchen/dsh-theme-studio/compare/v0.1.4...HEAD
[0.1.4]: https://github.com/cherrchen/dsh-theme-studio/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/cherrchen/dsh-theme-studio/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/cherrchen/dsh-theme-studio/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/cherrchen/dsh-theme-studio/releases/tag/v0.1.1
[0.1.0]: https://github.com/cherrchen/dsh-theme-studio/releases/tag/v0.1.0
