# Changelog

记录已发布版本中对使用者可见的变化。英文版：[CHANGELOG.en.md](./CHANGELOG.en.md)。

遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

- Themes 菜单新增「手动创建主题…」（当前分支，未发布）：独立于 `/dsh-theme-creator` 的创建入口，任选内置或导入主题为基底，编辑全部可编辑 token 的浅色/深色值（分组收起、可搜索、`var()`/`color-mix()` 等表达式原样保留），保存为只新增、不覆盖的导入主题，经 Host 接受后自动预览并可导出回导。

### Changed

- 公共 `ThemePreview` 四个字段类型放宽为 `string | null`：导入主题的预览样本改为在自身完整 token 图中解析，不再复用其他主题的色值。

### Fixed

- 导入主题的四色 Mosaic 现在按该主题自身编译后的 token 图解析（含 `var()`/`color-mix()` 表达式）；无法解析为不透明色的样本渲染为占位条纹，不再显示误导性颜色。

## [0.1.5] - 2026-10-17

### Added

- 公开 `dsh-theme.json` v1 主题文件格式并随包发布 JSON Schema（`schemas/dsh-theme.schema.json`）：`palette` 明暗各 13 字段必填，可选稀疏 `overrides` 叠加在派生 token 之上；色值限对比度 resolver 支持的子集，`version` 可省略默认为 1。
- Themes 菜单新增导入/管理入口：导入经确认对话框写入设置并自动预览，重复 id 由用户选择覆盖或自动生成新 id；管理对话框支持导出与删除导入主题，内置主题也可导出为可回导的 `user.*` 文件。
- 公共 `ctx.themeStudio.catalog` 升级为 builtin + imported 复合目录（ADR-0009）：`list()`/`get()`/`validate()` 覆盖导入主题，`list()` 在调用时返回冻结快照。
- 支持 DSH 0.2.1-alpha.3。
- 支持 DSH 0.2.1-alpha.4、0.2.1-alpha.5、0.2.1-rc.1 与 0.2.1-rc.2。
- 新增 Theme Creator（ADR-0010）：`dsh-theme-creator` skill 由 `creatorAgentMode` 设置驱动（`off`/`gesture`/`catalog`，默认 `gesture`——只响应 `/dsh-theme-creator` 用户手势、不进模型目录）；skill 指导模型在工作区写出 `dsh-theme.json` 并经随包校验器自检，产物仍由用户经导入流程确认。
- Themes 菜单新增「创建自己的主题」：在支持两参 `startSession` 的版本上打开 Cordis 会话并预填 `/dsh-theme-creator `（不自动发送）；较早版本降级为手动手势提示。`creatorAgentMode` 在插件管理页（Plugins → Theme Studio）切换；无插件管理页的宿主保持已存储或默认档位。
- 随包发布 `lib/validate-theme.js` 命令行校验器：`node lib/validate-theme.js <file>` 输出结构化 JSON 格式与对比度报告（通过 0 / 未过 1 / 用法错误 2）。

### Changed

- `theme-studio` 设置命名空间新增 `importedThemes` 字段持久化导入主题源文件；Host schema 保持宽松、Client 严格解析，无法读取的条目被跳过而不影响其余设置。
- `theme-studio` 设置命名空间新增 `creatorAgentMode` 字段控制 Theme Creator 可见性；旧快照缺失该字段时按默认 `gesture` 处理。

### Fixed

- 导入、覆盖或删除被旧 settings 通道拒绝时显示保存失败并保留已接受的主题列表；设置尚未就绪时禁止导入与删除。
- 覆盖导入等待保存成功后预览新配色；重复 id 的自动重命名遵守 64 字符上限。
- Themes 菜单中指针离开主题项或悬停到「导入主题」「管理主题」时恢复已应用主题，不再残留最后悬停主题的预览；键盘选中这两个动作同样先取消预览。
- 导入编辑以 accepted 原始数组为合并基准，无法解析的既有条目在追加、覆盖或删除后保留，不再被静默抹除。
- 确认导入前重查 catalog 与在途写入的 id 占用；过期确认回到三选对话框，`append` 兜底走 keep-both 改名，不写入持久重复 id。
- 超长的导入主题名在选择器按钮与管理对话框中以省略号截断并保留完整名提示，不再撑宽设置行。
- 主题文件读取失败（如读取中途出错）现在显示导入错误对话框，不再产生未处理的 Promise rejection。
- 导入确认与管理对话框现在显示主题文件的 `description` 字段，与文件格式文档一致；超长描述以省略号截断并保留完整文本提示。
- 主题菜单的悬停预览改为按整行判定：指针在行内 padding 或图标与文字间隙时不再误恢复已应用主题；移到分隔线、组标签、footer 动作或菜单外仍恢复。
- 主题文件的 `$schema` 字段按公开 JSON Schema 收紧为字符串；此前非字符串值（如深嵌套对象）可通过校验并持久化，其后的深冻结会因递归过深抛出 RangeError，且该持久化条目每次启动都使导入目录加载失败。
- 主题文件的 `version: null` 不再被当作省略处理，按公开 JSON Schema 拒绝为 `unsupported-version`。
- 主题文件校验不再对被拒绝的值做递归字符串化：把 `id`、`name`、`version` 或 override 色值写成深嵌套数组的文件现在按对应错误码拒绝，不再抛出 RangeError。
- 激活导入主题且正在预览其他主题时，`importedThemes` 变更重装 active 层后不再盖住预览层：仍然有效的预览会重新装回顶层并刷新 token，屏幕与预览状态保持一致。

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

[Unreleased]: https://github.com/cherrchen/dsh-theme-studio/compare/v0.1.5...HEAD
[0.1.5]: https://github.com/cherrchen/dsh-theme-studio/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/cherrchen/dsh-theme-studio/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/cherrchen/dsh-theme-studio/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/cherrchen/dsh-theme-studio/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/cherrchen/dsh-theme-studio/releases/tag/v0.1.1
[0.1.0]: https://github.com/cherrchen/dsh-theme-studio/releases/tag/v0.1.0
