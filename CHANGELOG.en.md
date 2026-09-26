# Changelog

User-facing changes for released versions. 中文版：[CHANGELOG.md](./CHANGELOG.md)。

This changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Support DSH 0.1.7-rc.1 and 0.1.7-rc.2, which enforce declared DSH peer ranges when a profile installs or boots a plugin.

### Fixed

- Persist the selected theme again on hosts that register settings namespaces through the legacy `register` API: the returned namespace scope is no longer handed back to Cordis, which rejected it as an invalid effect and silently rolled the registration back.

## [0.1.0] - 2026-09-25

First public release of the theme overlay plugin for DSH Web and Desktop.

### Added

- Browse builtin palettes in Settings → General → Themes, with transient preview, apply, and restore after restart.
- Overlay theme tokens through `ctx.theme.overrideTokens()` while leaving the official light, dark, and system appearance with the host.
- Persist the selected theme on the Host and support the settings / configForms differences across supported DSH releases.
- Publish standalone Host and Client bundles, TypeScript declarations, and `cordis.patch.yml`, with an explicit DSH compatibility list.

[Unreleased]: https://github.com/cherrchen/dsh-theme-studio/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/cherrchen/dsh-theme-studio/releases/tag/v0.1.0
