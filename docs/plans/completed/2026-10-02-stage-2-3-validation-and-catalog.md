# Stage 2/3 主题校验与公开 catalog

## Status

Completed。2026-10-02 根据提交追溯整理；文件名前缀是对应工作完成/落地日期，不是原始计划创建日期。

## Goal

完成自动对比度校验器与其他插件可发现的 ctx.themeStudio catalog。

## Background

根 README 明确将 WCAG 声明延后到 Stage 2，将公开目录延后到 Stage 3。现有 BuiltinPresetRegistry 可共享给 provider 与 runtime，但公开前必须保护不可变性和 settings 独立生命周期。

## Current State

记录周期：2026-10-02。提交依据：`509b88e`。当前代码可能包含后续扩展，不能把本文的历史值直接恢复为当前基线。

## Scope

覆盖下列实际落地阶段、回归证据与文档影响。版本发布内容由 CHANGELOG 维护，发布状态由路线图维护。

## Non-goals

不实现 schema/import/export/register、主题 Creator Agent、Host catalog RPC、完整 DOM audit 或 palette 自动修复。

## Design

采用当前架构记录的组件所有权；历史替代关系在 ADR 与 repository history 明示，不伪造未实现接口。详见[架构](../../architecture/theme-studio.md)。

## Implementation

| 阶段 | 实施与证据 |
| --- | --- |
| 色值与公式 | DOM-free resolver 支持现有 hex/rgb/rgba/var/sRGB mix、alpha/backdrop、循环与嵌套保护 |
| 报告 | 48 默认 pairs × 明暗两种模式，full precision、passed/failed/unknown、可选 custom rules |
| CLI | report、JSON 与 strict；低比值如实记录，不自动修改 palette |
| 公开数据 | readonly preset 类型、防御性复制、深冻结、重复 id 拒绝 |
| Provider | 父 apply 提供 ctx.themeStudio.catalog，list/get/validate；子 runtime 共用实例 |
| 生命周期回归 | 无 settings、transport 重供/切换、consumer 停止/重启，不重复注册 row |
| 文档 | 中英文 README、changelog 与 scoped baseline，随后由完整文档体系补齐导航 |

## Validation

当次开发基线通过 81 tests（新 Config 树 legacy provider 1 skip）、typecheck、compat:check、build/pack；十个 DSH 版本在孤立树全部通过。清空生成目录后 actual browser bundle exports、contrastRatio 与 Cordis catalog smoke 通过；实际 strict report 返回 1，JSON/default 返回 0。报告 768 checks、188 failed、0 unknown。

## Risks

低比值与 unknown 必须区分；full precision 不以显示四舍五入代替。公开 catalog 不能由消费者改变 runtime 颜色，不能随 settings child 停止消失。真实浏览器视觉/本次磁盘持久化旅程与完整 WCAG 审核未做。

## Documentation Impact

对比度、catalog、runtime reference、ADR-0006/0007、兼容 evidence 与 Unreleased changelog。 [文档地图](../../README.md)列完整入口；[提交历史](../../reference/repository-history.md)保存每个可达历史提交。

## Completion Criteria

规定的校验与 discovery 已完成并提交到 feat/stage-2-3；尚未新发版，package.version 仍为 0.1.3。 验证限制与未发布状态须保留，不能以 Completed 暗示所有宿主/平台已经认证。

## Related Documents

[进度总账](../active/2026-10-02-theme-studio-roadmap.md)、[CHANGELOG](../../../CHANGELOG.md)、[兼容矩阵](../../development/dsh-compatibility.md)。
