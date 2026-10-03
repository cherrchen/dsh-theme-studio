# Stage 1 主题覆盖与设置 UI

## Status

Completed。2026-10-02 根据提交追溯整理；文件名前缀是对应工作完成/落地日期，不是原始计划创建日期。

## Goal

让用户在保留官方外观偏好的前提下浏览、预览、应用和持久化内置主题。

## Background

官方 ctx.theme 已提供 overrideTokens；插件最初从 13-token palette 出发，需要在独立仓库与 Desktop 镜像中运行。首次 feature commit 为 PR #1 的合并提交。

## Current State

记录周期：2026-08-26。提交依据：`a191fe9、0f7cdaf、4b7f619`。当前代码可能包含后续扩展，不能把本文的历史值直接恢复为当前基线。

## Scope

覆盖下列实际落地阶段、回归证据与文档影响。版本发布内容由 CHANGELOG 维护，发布状态由路线图维护。

## Non-goals

当时没有公开 schema、目录 service 或自动校验；后续提交拓展这三类范围，不能回写为 Stage 1 已完成。

## Design

采用当前架构记录的组件所有权；历史替代关系在 ADR 与 repository history 明示，不伪造未实现接口。详见[架构](../../architecture/theme-studio.md)。

## Implementation

| 阶段 | 实施与证据 |
| --- | --- |
| Palette 与 adapter | types/presets/catalog 提供明暗 pair、默认 preview；adapter 拒绝缺模式和非字符串 |
| Runtime | active/preview 两 source、取消/提升/默认预览、Host adoption、snapshot 与 dispose |
| Host | theme-studio.activeThemeId schema、默认 null 与 optional settings injection |
| Client UI | General Themes order 20、cards/store/locale、preview/apply 与 live status |
| 独立构建 | 自包含 tsconfig、Host/Client 制品、CSS Module helper、patch 与 manifest |
| 8/26 修正 | 0f7cdaf 满足镜像仓库当时的 lint 风格；4b7f619 缩小 swatch/cards，将 actions 移到右下、贴近 Appearance 布局 |

## Validation

runtime/adapter/UI/apply/Host 与官方主题 integration tests 已存在于 a191fe9。首次提交记录提及移除 unused previewLabel 参数并保证 mirrored tsconfig 独立；当前 2026-10-02 gate 在后续实现上通过，不是复跑原始 a191fe9 快照。

## Risks

预览是否写设置、Default 是否恢复原 active、卸载清理与官方模式变化都须保持。最初只覆写 13 字段的呈现缺口在后续 chrome 计划处理。

## Documentation Impact

需求、架构、runtime/reference；选择依据 ADR-0001。 [文档地图](../../README.md)列完整入口；[提交历史](../../reference/repository-history.md)保存每个可达历史提交。

## Completion Criteria

功能完成；首次 feature 在 8/26 落地，正式版本内容归 v0.1.0 CHANGELOG；后续迁移属于独立计划。 验证限制与未发布状态须保留，不能以 Completed 暗示所有宿主/平台已经认证。

## Related Documents

[进度总账](../active/2026-10-02-theme-studio-roadmap.md)、[CHANGELOG](../../../CHANGELOG.md)、[兼容矩阵](../../development/dsh-compatibility.md)。
