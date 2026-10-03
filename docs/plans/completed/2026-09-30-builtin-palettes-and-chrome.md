# 新增内置配色与 chrome 派生

## Status

Completed。2026-10-02 根据提交追溯整理；文件名前缀是对应工作完成/落地日期，不是原始计划创建日期。

## Goal

加入 Claude、Codex、Claude Cream，统一覆盖仅 13-token overlay 遗漏的接口与代码配色。

## Background

基础主题已具备明暗 pair，但很多宿主 alias/static/Shiki 保留官方值。must-add palettes 需要保持可审查的品牌色、表面和 sidebar，locale/status 标签也需同步新增 id。

本地忽略目录中的原始 Cursor 计划 `add_codex_claude_themes_618316a3.plan.md` 仍保存交接约束：三主题置于原五主题之前、颜色来自交接 JSON、locale/NAME_KEYS/锁值测试同步、最初不改 runtime/schema/Electron、不自动 bump version，并分三次提交。该计划的 pending 标记未更新，不能用作现行进度；后续 105d262 的 chrome 扩展是进一步变更。交接包本身未入库，本次文档以已提交 palette、tests 与历史 diff 为可重现证据，不声称重新验证未提供的外部 JSON。

## Current State

记录周期：2026-09-28 至 2026-09-30。提交依据：`c9ad6c6、b0a1a9d、e6dc0e9、105d262、29f7e48`。当前代码可能包含后续扩展，不能把本文的历史值直接恢复为当前基线。

## Scope

覆盖下列实际落地阶段、回归证据与文档影响。版本发布内容由 CHANGELOG 维护，发布状态由路线图维护。

## Non-goals

不将对标 palette 当作第三方产品的官方授权或完整复刻认证；不更改宿主 CSS、不在此阶段实现自动对比度诊断。

## Design

采用当前架构记录的组件所有权；历史替代关系在 ADR 与 repository history 明示，不伪造未实现接口。详见[架构](../../architecture/theme-studio.md)。

## Implementation

| 阶段 | 实施与证据 |
| --- | --- |
| 新增配色 | c9ad6c6 定义三组 light/dark Palette，置于显示列表前列 |
| 本地化与状态 | b0a1a9d 增加双语文案与 NAME_KEYS，预览状态不 fallback Default |
| Palette 锁值 | e6dc0e9 固定 must-add brand/bgBase/sidebar，README 列 builtin ids |
| Chrome 推导 | 105d262 新增 deriveChrome、所有派生 token 集合、presets 合并与 no-static-white 覆写测试 |
| 合并 | 29f7e48 合并 PR #3；后续 v0.1.3 发布归 changelog |

## Validation

presets.spec 验证顺序、基本和派生 token 两模式对称、关键 literal values、brand/link/info/static 关系、hover/fade 与 tooltip/toast。2026-10-02 全矩阵继续覆盖这些测试；完整配色与表达式列于 token reference。

## Risks

派生 label/caption/disabled 和品牌色不天然满足普通文字阈值；静态 neutral-00 必须保留白色。新的 host token 应从同一 deriveChrome 扩展，不写独立 stylesheet。

## Documentation Impact

token reference、locale 接入规则、ADR-0005、Stage 2 对比度 baseline。 [文档地图](../../README.md)列完整入口；[提交历史](../../reference/repository-history.md)保存每个可达历史提交。

## Completion Criteria

完成，含在 v0.1.3；新增 palette 与 chrome 都有源码与回归证据，对比度认证仍不能从这些测试推导。 验证限制与未发布状态须保留，不能以 Completed 暗示所有宿主/平台已经认证。

## Related Documents

[进度总账](../active/2026-10-02-theme-studio-roadmap.md)、[CHANGELOG](../../../CHANGELOG.md)、[兼容矩阵](../../development/dsh-compatibility.md)。
