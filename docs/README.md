# 项目文档

English: [README.en.md](./README.en.md)

本目录保存 Theme Studio 的长期需求、架构、工程决策、实施记录与技术参考。文档体系于 2026-10-02 根据仓库实际代码、全部可达提交与本地发布 tag 补齐；追溯整理不意味着这些文档曾在原始实施日期存在。

## 文档地图

| 目录 | 用途 | 核心入口 |
| --- | --- | --- |
| [requirements/](./requirements/README.md) | 产品与非功能需求、验收依据 | [Theme Studio 需求](./requirements/theme-studio.md) |
| [architecture/](./architecture/README.md) | 当前组件、数据流、生命周期与边界 | [Theme Studio 架构](./architecture/theme-studio.md) |
| [decisions/](./decisions/README.md) | ADR：选择的背景、替代方案与后果 | [决策目录](./decisions/README.md) |
| [plans/](./plans/README.md) | 活跃路线图、已完成计划与进度总账 | [路线图](./plans/active/2026-10-02-theme-studio-roadmap.md) |
| [development/](./development/README.md) | 环境、验证、兼容提升、文档与发布工程 | [开发工作流](./development/plugin-development-workflow.md) |
| [reference/](./reference/README.md) | API、设置、token、算法与历史事实 | [完整提交历史](./reference/repository-history.md) |
| [troubleshooting/](./troubleshooting/README.md) | 症状、原因、诊断与已验证处理办法 | [排查目录](./troubleshooting/README.md) |

## 当前事实与唯一真源

| 信息 | 真源 | 其他文档的职责 |
| --- | --- | --- |
| 支持的 DSH 精确版本 | `src/compat/dsh-version.ts` | README 展示受检查的清单；兼容文档保存证据 |
| 内置主题、token 与名称 | `src/client/presets.ts`、`chrome-tokens.ts`、`locales.ts` | token 参考解释目录、派生关系与用途 |
| Overlay 行为 | `src/client/runtime.ts` | runtime 参考说明方法语义与状态变化 |
| 公开 catalog | `src/client/types.ts`、`catalog.ts`、`index.ts` | catalog 参考保存消费契约与示例 |
| 对比度规则与结果 | `contrast.ts`、`contrast-colors.ts` 与实际运行报告 | 对比度参考保存范围、算法和有日期的基线 |
| 进度与发布状态 | [路线图进度总账](./plans/active/2026-10-02-theme-studio-roadmap.md#进度总账) | README 提供入口，completed 计划保留实施证据 |
| 版本用户可见变更 | [CHANGELOG](../CHANGELOG.md) | 历史参考解释提交关系，不建立第二套 release notes |
| 历史兼容测试证据 | [矩阵结果](./development/dsh-compatibility-results.json) | 不把旧证据解释成新改动已重新测试 |

## 阅读路径

- 使用者：根 [README](../README.md) → [设置与包契约](./reference/settings-and-package-contract.md) → [故障排查](./troubleshooting/README.md)。
- 插件作者：[catalog API](./reference/theme-catalog.md) → [token 目录](./reference/theme-tokens.md) → [对比度报告](./reference/theme-contrast.md)。
- 开发者：[需求](./requirements/theme-studio.md) → [架构](./architecture/theme-studio.md) → [开发工作流](./development/plugin-development-workflow.md) → 相关 ADR 与计划。
- 维护者：[完整历史](./reference/repository-history.md) → [兼容矩阵](./development/dsh-compatibility.md) → [发布流程](./development/release-workflow.md)。

## 文档维护原则

事实只在所属文档维护，其他位置优先链接。Current、Completed、Planned 和 Superseded 必须明确区分。已完成计划移入 `plans/completed/`；ADR 不覆盖历史选择；验证必须说明运行日期、环境、通过项、跳过项与未覆盖范围。

所有 README 与 `.agent/note/` 正式知识文件采用中文主版本 `.md`、英文对应 `.en.md`；两版同一逻辑文档，出现冲突时修复英文版本。根 `README.zh.md` 仅保留旧中文链接入口，正文在 `README.md`。规范见 [Documentation Skill](../.agent/skills/documentation/SKILL.md)，自动检查入口为 `pnpm docs:check`。

长期维护知识：[兼容契约陷阱](../.agent/note/dsh-compat-contract.md)、[runtime/loader 所有权](../.agent/note/runtime-and-loader.md)。这些 note 链接正式真源，不承担第二份 API 或 release 内容。
