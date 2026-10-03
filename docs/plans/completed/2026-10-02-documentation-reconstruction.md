# 完整文档体系与历史补齐

## Status

Completed，2026-10-02。本任务由用户要求在现有功能提交后执行，依据实际代码/提交补齐文档，再单独提交；不是假设在早期开发前已有的计划。

## Goal

沿用 dsh-plugin-multi-root-workspace 的文档结构与样式，完整保存 Theme Studio 的需求、架构、重要决策、阶段实施、公共契约、工程流程、故障知识与全部可达历史。

## Background

功能更新已提交为 509b88e，任务开始时工作树干净；不建立无内容的重复提交。参考项目具备七类 docs、中文主 README/英文配对、ADR/plan 模板、Documentation Skill 与 checker。本仓库原先主要只有两个 README、changelog、兼容/发布和英文对比度报告，信息职责不完整且有旧 pin 与 release 内容遗漏。

## Scope and Non-goals

补充仓库文档、维护规范、模板、Agent note、自动结构检查及相关 CI/发布清单。参考仓库只读，不修改本包业务 runtime、不升级依赖、不变更现有配色、不新打发布 tag、不推送 npm。只有 README/checker/工程 metadata 为文档布局同步而修改。

## Design

每项事实有 canonical 位置；根 README 做 orientation 与完整使用入口，详细契约在 reference，八类长期选择在 ADR，历史完成批次在 completed，长期未实施方向在 active 路线图。所有 README/正式 Agent note 中英配对。原 README.zh 与 development/theme-contrast 旧地址保留导航。

## Implementation

| 阶段 | 完成内容 |
| --- | --- |
| 证据核对 | 阅读参考 Skill/模板、当前代码与全部可达历史、tag 目标、原本地 builtin 计划；不恢复其 stale pending 状态 |
| 文档地图 | requirements/architecture/decisions/plans/development/reference/troubleshooting 七类目录与双语 README |
| 产品与架构 | 行为要求、所有权、组件、数据流、settings/public provider 生命周期、异常与验证边界 |
| ADR | 8 个选择：portable overlay、settings/effects、exact compat、official registration、derived chrome、contrast scope、readonly catalog、build/release |
| 完成记录 | Stage 1、DSH/settings/首次发版、official registration、builtin/chrome、DSH 0.2、Stage 2/3，加本文；清楚标示追溯日期 |
| 完整参考 | catalog/runtime/settings包、全部基础 palette 与派生 token 表、对比度完整报告范围与基线、上游接口、30 个可达原历史提交 |
| 历史纠正 | v0.1.3 补记 DSH 0.2 与 dev pin/bundle fixture；旧“最老 pin 恢复”改为实际最新基线；v0.1.0 tag 区分准备与实际 20f9632 目标 |
| 长期维护 | Documentation Skill、三类模板、两组中英 Agent note、AGENTS 约定、root pairhash |
| 自动化 | docs:check 检查结构、pairhash与root代码示例；忽略生成/本地工具状态；CI/release verify 接入；compat checker 适配新语言文件名 |
| 包入口 | files 增加 README.en.md；保留旧中文入口；完整工程文档仍在源码树，不误称全部已进入 npm |

## Validation

本批次实际通过 `pnpm docs:check`（0 errors / 0 warnings）、`compat:check`、host/client typecheck、81 tests（1 legacy provider skip）、build、pack dry-run 与 diff whitespace 检查。文件清单确认三种 README 入口、公开 Client 声明与两半 bundle 存在。checker 对临时树的 broken-link/stale-hash负例、纠正后的正例与忽略本地状态行为另做 smoke。

Stage 2/3 全十版矩阵证据来自此前 2026-10-02 功能提交，不把它改写成文档任务复跑十版。CI配置修改未在远端运行；未执行新发布、真实宿主视觉/磁盘旅程或全WCAG审核。根pairhash只表示review记录，机器结构检查不代替语义判断。

## Risks

大规模重排可能产生旧链接失效、翻译遗漏或把历史状态写成当前。保留旧入口、双语semantic review、对应的静态compat/readme gate与checker缓解这些问题。生成palette/token表必须以源码为真源，修改后重审；local Cursor 交接JSON未入库，文档不能假称复验了该文件。

## Documentation Impact

[文档地图](../../README.md)列所有入口；[维护工作流](../../development/documentation-workflow.md)定义日后同类变更的步骤；[提交历史](../../reference/repository-history.md)保存原始30个可达提交与替代关系；[CHANGELOG](../../../CHANGELOG.md)的Unreleased记录本批次用户入口与工程文档变化。

## Completion Criteria

文档按参考结构完整落地、历史有来源、旧知识不会误指当前支持、pair/link/naming/plan检查通过、受影响工程gate通过，单独提交在原目标分支。长期路线图的后续方向继续Planned，不把文档完成解释成这些产品功能已实现。
