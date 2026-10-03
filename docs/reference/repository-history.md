# 完整提交历史与演进

## Evidence and Scope

2026-10-02 追溯整理。依据 `git log --all` 的全部可达提交、提交 diff/body、当前源码与本地 v0.1.0–v0.1.3 tags。本文不是原始计划，也不推测丢失分支、不可达对象或远端部署。

合并提交与 feature 分支提交同时保留，避免只读 first-parent 漏掉设计/修复。完整原文可由下列命令恢复；表中“作用”是内容解释，不把 summary 当作所有实现证据。

```sh
git log --all --reverse --date=short --format='%h %ad %s'
git show --stat --format=fuller <commit>
git show <commit> -- <path>
git tag --list 'v*'
git log --first-parent --oneline
```

## 逐提交记录

| Commit | 日期 | 原始标题 | 作用与当前关系 |
| --- | --- | --- | --- |
| [ece01e7](https://github.com/cherrchen/dsh-theme-studio/commit/ece01e7) | 2026-08-26 | Initial commit | 初始化仓库、license 与 README；尚无插件实现。 |
| [a191fe9](https://github.com/cherrchen/dsh-theme-studio/commit/a191fe9) | 2026-08-26 | feat: add Stage 1 theme overlay runtime and settings UI (#1) | PR #1：Stage 1 runtime、Host schema、Client UI、store/locale、基本 presets、独立构建与测试；提交正文保留 unused 参数/tsconfig/翻译配对修正。 |
| [0f7cdaf](https://github.com/cherrchen/dsh-theme-studio/commit/0f7cdaf) | 2026-08-26 | fix: satisfy Electron oxlint arrow-parens and max-len | 对齐 Desktop 镜像当时 oxlint 的 arrow-parens/max-len；不引入 Desktop runtime。 |
| [4b7f619](https://github.com/cherrchen/dsh-theme-studio/commit/4b7f619) | 2026-08-26 | fix(client): compact Theme Unit cards to Appearance layout | 压缩 theme card/swatch，调整名称与 actions 布局，接近 Appearance。 |
| [68eaa72](https://github.com/cherrchen/dsh-theme-studio/commit/68eaa72) | 2026-08-31 | docs: note main targets DSH v0.1.1-rc.2 | 历史 main 对应 DSH 0.1.1-rc.2，develop 为新兼容线；当前 README 已不使用这个分支承诺。 |
| [1bced59](https://github.com/cherrchen/dsh-theme-studio/commit/1bced59) | 2026-08-31 | fix: migrate client plugins for DSH v0.1.2-alpha.2 | 迁移 DSH 0.1.2-alpha.2 client seams，移除 dsh-client-runtime 路径并改 Host/Client 组装。 |
| [d08aac9](https://github.com/cherrchen/dsh-theme-studio/commit/d08aac9) | 2026-09-03 | chore: support DSH v0.1.2-alpha.4 | 升级历史 alpha.4；删除 invariant 源码、export 与相关构建入口，保留官方 consistency 所有权。 |
| [8e12141](https://github.com/cherrchen/dsh-theme-studio/commit/8e12141) | 2026-09-03 | chore: support DSH 0.1.2-rc.1 | 历史分支升级到 DSH 0.1.2-rc.1；此版本目前不在支持清单。 |
| [f34ab5b](https://github.com/cherrchen/dsh-theme-studio/commit/f34ab5b) | 2026-09-25 | chore: support DSH 0.1.5-rc.2 through 0.1.6-alpha.1 | 支持 0.1.5-rc.2/rc.3/0.1.6-alpha.1，精确 peers、纯 classifier、检查脚本及安装树声明。 |
| [fba048e](https://github.com/cherrchen/dsh-theme-studio/commit/fba048e) | 2026-09-25 | chore: support DSH 0.1.5-rc.2 through 0.1.7-alpha.2 | 扩展到 0.1.6-alpha.2/0.1.7-alpha.1/alpha.2，双设置世代与 volatile Config 适配。 |
| [bbb0ada](https://github.com/cherrchen/dsh-theme-studio/commit/bbb0ada) | 2026-09-25 | fix: keep the web entry free of Node probing and restart the Themes row | 移除 Host 入口 Node probing；设置 child 停止后清 start guard，重供可恢复行。 |
| [4e22856](https://github.com/cherrchen/dsh-theme-studio/commit/4e22856) | 2026-09-25 | chore: support DSH 0.1.5-rc.2 through 0.1.7-alpha.2 (#2) | 合并 PR #2，保留前述兼容/portable/restart 三批变更；不是额外独立能力。 |
| [e56004d](https://github.com/cherrchen/dsh-theme-studio/commit/e56004d) | 2026-09-25 | chore(release): prepare v0.1.0 | v0.1.0 准备、双语 changelog、release workflow、版本/notes 脚本与 npm 元数据。 |
| [20f9632](https://github.com/cherrchen/dsh-theme-studio/commit/20f9632) | 2026-09-25 | fix(release): quote version check for bash | 修复 Release 的 Bash tag/version 检查引用，避免表达式词拆分；不是新产品版本。 |
| [d709754](https://github.com/cherrchen/dsh-theme-studio/commit/d709754) | 2026-09-26 | chore: support DSH 0.1.7-rc.1 and 0.1.7-rc.2 | 增加 0.1.7-rc.1/rc.2；修 legacy register 普通 scope 被当 effect 回滚，新增真实 provider 回归。 |
| [07b49f6](https://github.com/cherrchen/dsh-theme-studio/commit/07b49f6) | 2026-09-26 | docs: record the DSH compatibility bump procedure | 保存兼容升级流程；最老 pin 恢复步骤后来被 0.2 新基线取代。 |
| [02d497b](https://github.com/cherrchen/dsh-theme-studio/commit/02d497b) | 2026-09-26 | chore(release): v0.1.1 | v0.1.1 版本准备，归档 rc admission 与持久化修复。 |
| [e1e1ffe](https://github.com/cherrchen/dsh-theme-studio/commit/e1e1ffe) | 2026-09-27 | feat(plugins): show Theme Studio on the official Plugins page | 增加自定义 Plugins-page item/detail 贡献与 slot 兼容层；当日下一提交删除，属于被取代尝试。 |
| [faa9b92](https://github.com/cherrchen/dsh-theme-studio/commit/faa9b92) | 2026-09-27 | Use official plugin package registration | 改用正式 installed package 注册，删除 plugin-page/adapter，保持 bare loader row 与 Themes UI。 |
| [599c468](https://github.com/cherrchen/dsh-theme-studio/commit/599c468) | 2026-09-27 | chore(release): v0.1.2 | v0.1.2 版本准备与最终注册行为归档；版本脚本只变 package.version、不再额外版本常量。 |
| [c9ad6c6](https://github.com/cherrchen/dsh-theme-studio/commit/c9ad6c6) | 2026-09-28 | feat(themes): add Claude, Codex, and Claude Cream palettes | 新增 Claude/Codex/Claude Cream 三组明暗 palette，放在显示列表前部。 |
| [b0a1a9d](https://github.com/cherrchen/dsh-theme-studio/commit/b0a1a9d) | 2026-09-28 | feat(themes): localize new builtins and wire preview labels | 新主题中英文案与 NAME_KEYS 接入，预览状态使用正确名称。 |
| [e6dc0e9](https://github.com/cherrchen/dsh-theme-studio/commit/e6dc0e9) | 2026-09-28 | test(themes): lock must-add palettes and document builtin ids | 锁 must-add brand/bgBase/sidebar 值并文档化 builtin ids。 |
| [105d262](https://github.com/cherrchen/dsh-theme-studio/commit/105d262) | 2026-09-29 | feat(themes): cover interface colors the 13-token overlay left official | 13 基础 palette 之外派生 semantic/specific/static/Shiki，保留静态白色、修 bubble 与扩展 tests。 |
| [29f7e48](https://github.com/cherrchen/dsh-theme-studio/commit/29f7e48) | 2026-09-30 | Merge pull request #3 from cherrchen/feat/add-codex-claude-theme | 合并 PR #3 的配色、locale、锁值与 chrome 四批变更。 |
| [26b9503](https://github.com/cherrchen/dsh-theme-studio/commit/26b9503) | 2026-09-30 | feat: support DSH releases through 0.2.0-rc.2 | 扩展精确支持到 DSH 0.2.0-rc.1/rc.2，新增八语义 token、真实官方 bundle fixture 与 isolated matrix。 |
| [ab0d19c](https://github.com/cherrchen/dsh-theme-studio/commit/ab0d19c) | 2026-09-30 | chore: pin DSH development dependencies to 0.2.0-rc.2 | development pin/overrides/lockfile 统一至 0.2.0-rc.2 与对应 vendor，改变此前旧基线恢复约定。 |
| [a42316f](https://github.com/cherrchen/dsh-theme-studio/commit/a42316f) | 2026-09-30 | Support DSH 0.2 releases and upgrade development pin to 0.2.0-rc.2 (#4) | 合并 PR #4，将 0.2 支持与 dev pin 正式纳入主线。 |
| [109bfdc](https://github.com/cherrchen/dsh-theme-studio/commit/109bfdc) | 2026-09-30 | chore(release): v0.1.3 | v0.1.3 版本准备；tag 前已经包含 PR #3 配色和 PR #4 兼容提升。 |
| [509b88e](https://github.com/cherrchen/dsh-theme-studio/commit/509b88e) | 2026-10-02 | Add contrast validation and public theme catalog | Stage 2 对比度解析/报告/CLI 与 Stage 3 readonly Client service、consumer lifecycle、十版验证；Unreleased。 |

## 发布边界

| 本地 tag | 对应版本准备提交 | 日期 | 内容归档 |
| --- | --- | --- | --- |
| v0.1.0 | e56004d（准备）；tag 实际指向 20f9632 | 2026-09-25 | [CHANGELOG 0.1.0](../../CHANGELOG.md#010---2026-09-25) |
| v0.1.1 | 02d497b | 2026-09-26 | [CHANGELOG 0.1.1](../../CHANGELOG.md#011---2026-09-26) |
| v0.1.2 | 599c468 | 2026-09-27 | [CHANGELOG 0.1.2](../../CHANGELOG.md#012---2026-09-27) |
| v0.1.3 | 109bfdc | 2026-09-30 | [CHANGELOG 0.1.3](../../CHANGELOG.md#013---2026-09-30) |

20f9632 的 v0.1.0 workflow 修正发生在版本准备之后；应通过实际 tag 指向区分发布树，不能只把所有当天 commit 都说成 tag 内容。发布状态总账在[路线图](../plans/active/2026-10-02-theme-studio-roadmap.md)，版本内容在 CHANGELOG；本轮未查询 npm/GitHub 远端是否成功发布。

## 演进中的替代关系

1. 早期 main/develop 的单运行时说明已经被精确多版本清单替代。旧 DSH 0.1.1/0.1.2 曾出现在历史 docs，不是当前承诺。
2. invariant 曾存在，d08aac9 已移除。官方主题和设置服务承担 consistency，不能从旧生成 declaration 重新发明 export。
3. production install probing 曾被尝试，bbb0ada 已移除。当前纯 classifier 与开发 checker 不代表生产入口 Node probing 回归。
4. e1e1ffe 自定义插件页当天由 faa9b92 取代。官方包身份与设置功能入口分别维护。
5. 13-token Palette 是人工输入模型，不等于最终只有 13 个输出 token；105d262 和 0.2 提升已扩展 deriveChrome。
6. 旧 release workflow 的“恢复最老 dev pin”被 ab0d19c 的最新受支持基线取代。本次文档修正保持当前源码，而不恢复旧约定。
7. Stage 2/3 已完成实现但仍未发布新版本；不能把 public catalog/validator 归入既有 v0.1.3。

## 历史验证如何阅读

提交正文记载的真实 profile、packed tarball、逐版 gate 是当时的记录；没有保存日志或重新运行时，应明确来源，而不是把它们当本轮实测。当前自动化 evidence JSON 保存 2026-10-02 十版矩阵，完整边界见[兼容文档](../development/dsh-compatibility.md)。本次文档 checker 与后续 gate 的运行属于文档补充验证，不能伪称曾在每个原始提交运行。

## 相关文档

[已完成计划](../plans/README.md)、[ADR](../decisions/README.md)、[上游接口调研](./upstream-theme-research.md)、[开发流程](../development/plugin-development-workflow.md)。新增 release content 先更新 CHANGELOG，再推进路线图 release state；新增重大实施历史则追加 completed 记录和本文。
