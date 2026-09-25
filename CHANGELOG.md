# Changelog

记录已发布版本中对使用者可见的变化。英文版：[CHANGELOG.en.md](./CHANGELOG.en.md)。

遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [0.1.0] - 2026-09-25

首次公开发布，提供可在 DSH Web 与 Desktop 中运行的主题覆盖插件。

### Added

- 在“设置 → 通用 → 主题”浏览内置配色，并支持临时预览、应用和重启后恢复。
- 通过 `ctx.theme.overrideTokens()` 叠加主题 token；官方浅色、深色与跟随系统外观仍由宿主管理。
- Host 侧持久化当前主题选择，并兼容受支持 DSH 版本间的 settings / configForms 差异。
- 发布 standalone Host、Client bundle、TypeScript 声明和 `cordis.patch.yml`，并声明精确的 DSH 兼容版本。

[Unreleased]: https://github.com/cherrchen/dsh-theme-studio/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/cherrchen/dsh-theme-studio/releases/tag/v0.1.0
