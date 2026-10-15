# Changelog

记录已发布版本中对使用者可见的变化。英文版：[CHANGELOG.en.md](./CHANGELOG.en.md)。

遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

- 公开 `dsh-theme.json` v1 主题文件格式并随包发布 JSON Schema（`schemas/dsh-theme.schema.json`）：`palette` 明暗各 13 字段必填，可选稀疏 `overrides` 叠加在派生 token 之上；色值限对比度 resolver 支持的子集，`version` 可省略默认为 1。
- Themes 菜单新增导入/管理入口：导入经确认对话框写入设置并自动预览，重复 id 由用户选择覆盖或自动生成新 id；管理对话框支持导出与删除导入主题，内置主题也可导出为可回导的 `user.*` 文件。
- 公共 `ctx.themeStudio.catalog` 升级为 builtin + imported 复合目录（ADR-0009）：`list()`/`get()`/`validate()` 覆盖导入主题，`list()` 在调用时返回冻结快照。

### Changed

- `theme-studio` 设置命名空间新增 `importedThemes` 字段持久化导入主题源文件；Host schema 保持宽松、Client 严格解析，无法读取的条目被跳过而不影响其余设置。

### Fixed

- 导入、覆盖或删除被旧 settings 通道拒绝时显示保存失败并保留已接受的主题列表；设置尚未就绪时禁止导入与删除。
- 覆盖导入等待保存成功后预览新配色；重复 id 的自动重命名遵守 64 字符上限。
- Themes 菜单中指针离开主题项或悬停到「导入主题」「管理主题」时恢复已应用主题，不再残留最后悬停主题的预览；键盘选中这两个动作同样先取消预览。
- 导入编辑以 accepted 原始数组为合并基准，无法解析的既有条目在追加、覆盖或删除后保留，不再被静默抹除。
- 确认导入前重查 catalog 与在途写入的 id 占用；过期确认回到三选对话框，`append` 兜底走 keep-both 改名，不写入持久重复 id。
- 超长的导入主题名在选择器按钮与管理对话框中以省略号截断并保留完整名提示，不再撑宽设置行。
- 主题文件读取失败（如读取中途出错）现在显示导入错误对话框，不再产生未处理的 Promise rejection。

## [0.1.4] - 2026-10-11

### Added

- 支持 DSH 0.2.1-alpha.1 与 0.2.1-alpha.2。官方正文字体、代码字体、终端字体及对应字号保持独立；主题预览、应用、取消、恢复默认和明暗切换不会改写这些偏好。
- 主题保存被 Host 拒绝时，设置行提示失败并恢复上次已接受的选择。连续应用按顺序写入，较早的成功结果不能在较新选择之后落盘并把它盖掉；插件关闭后不再把过期结果装回界面。
- Stage 2 自动对比度校验：浅色/深色逐配对报告、透明色与 sRGB 混色解析、报告命令及严格退出码模式；README 记录实际校验范围与内置配色的已知失败。
- Stage 3 公开 Client `ctx.themeStudio.catalog`，提供只读主题发现与校验报告，并随 Cordis 插件生命周期释放与重供服务。

### Changed

- Client bundle 从宿主共享 `@deepseek-ai/dsh-client-store`，避免第二份 store 破坏客户端服务身份；提供隔离候选探测与多版本回归，发布复用完整验证。

- 按当前代码与全部历史提交补齐需求、架构、ADR、实施计划、开发流程、完整 API/token 参考与故障排查；根文档统一为中文 README.md、英文 README.en.md，旧 README.zh.md 保留导航入口。
- 新增 docs:check 文档结构检查并接入 CI/发布验证；同步 README 兼容检查与发布语言文件清单。

## [0.1.3] - 2026-09-30

### Added

- 新增三套对标 Claude Desktop、Codex Desktop 与 Claude Cream 的内置 overlay。
- 内置主题现在覆盖原先停在官方色板上的语义色、组件直接引用的 static，以及代码高亮 token；保留 tooltip 等使用的静态白色语义。
- 支持 DSH 0.2.0-rc.1 与 0.2.0-rc.2，补齐新版八项语义 token，并在独立安装树重新验证全部支持版本。

### Changed

- 开发依赖、overrides 与 lockfile 统一到最新受支持 DSH 0.2.0-rc.2；官方主题集成测试改为加载实际安装的发布 bundle。

## [0.1.2] - 2026-09-27

### Changed

- 移除 Theme Studio 自定义的插件页卡片和详情贡献；安装包通过包名加载器记录显示在官方插件管理器中。保留“设置 → 通用 → 主题”行。

## [0.1.1] - 2026-09-26

### Added

- 支持 DSH 0.1.7-rc.1 与 0.1.7-rc.2：这些版本会在 profile 安装或启动插件时校验插件声明的 DSH peer 范围。

### Fixed

- 在使用旧版 `register` API 注册 settings 命名空间的宿主上恢复主题选择持久化：不再把该 API 返回的命名空间 scope 交还给 Cordis，否则 Cordis 会将其判为无效 effect 并静默回滚注册。

## [0.1.0] - 2026-09-25

首次公开发布，提供可在 DSH Web 与 Desktop 中运行的主题覆盖插件。

### Added

- 在“设置 → 通用 → 主题”浏览 Graphite、OLED、Nordic、Paper、Warm 与默认卡，支持临时预览、取消、应用和重启后恢复。
- 通过 `ctx.theme.overrideTokens()` 叠加主题 token；官方浅色、深色与跟随系统外观仍由宿主管理。
- Host 侧持久化当前主题选择，并兼容受支持 DSH 版本间的 register/settingsScope 与 Config/configure/configForms 差异；设置服务停止重供后可重新启动主题行。
- 发布 standalone Host、Client bundle、TypeScript 声明和 `cordis.patch.yml`，并声明精确的 DSH 兼容版本。

[Unreleased]: https://github.com/cherrchen/dsh-theme-studio/compare/v0.1.4...HEAD
[0.1.4]: https://github.com/cherrchen/dsh-theme-studio/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/cherrchen/dsh-theme-studio/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/cherrchen/dsh-theme-studio/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/cherrchen/dsh-theme-studio/releases/tag/v0.1.1
[0.1.0]: https://github.com/cherrchen/dsh-theme-studio/releases/tag/v0.1.0
