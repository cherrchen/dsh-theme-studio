# 官方插件注册调整

## Status

Completed。2026-10-02 根据提交追溯整理；文件名前缀是对应工作完成/落地日期，不是原始计划创建日期。

## Goal

让正式插件管理器以 installed package metadata 显示 Theme Studio，并保持 Themes 设置入口。

## Background

先尝试自定义 Plugins-page card/detail contributions，随后发现包名 loader 载体才是官方身份与 Client 建图真源。当日进行了明确替代，不能只记录增加卡片而遗漏删除。

## Current State

记录周期：2026-09-27。提交依据：`e1e1ffe、faa9b92、599c468`。当前代码可能包含后续扩展，不能把本文的历史值直接恢复为当前基线。

## Scope

覆盖下列实际落地阶段、回归证据与文档影响。版本发布内容由 CHANGELOG 维护，发布状态由路线图维护。

## Non-goals

不保留自定义插件卡片，不新增官方 manager API，不修改宿主 boot scanner。

## Design

采用当前架构记录的组件所有权；历史替代关系在 ADR 与 repository history 明示，不伪造未实现接口。详见[架构](../../architecture/theme-studio.md)。

## Implementation

| 阶段 | 实施与证据 |
| --- | --- |
| 初次实现 | e1e1ffe 添加 plugins.item、detail badge/section、locale、compat adapter 与相关 tests |
| 正式替代 | faa9b92 删除 plugin-page 组件及 adapter，保留 bare package loader row 与 General Themes |
| 验证调整 | apply tests 要求插件页三个 slot 都没有贡献，settings row 保持 order 20 |
| 发布准备 | 599c468 的 v0.1.2 changelog 记录最终包注册行为，删除多余版本常量与旧组件知识 |

## Validation

e1e1ffe commit message 记录旧尝试在清单各版与实际 browser bundle 的验证；最终当前逻辑由 bare loader row/empty plugin slots 的回归及后续全矩阵覆盖。旧 e1e1ffe 测试不能当作已删除组件仍存在的证明。

## Risks

挂 /client 子路径可让 metadata scan 丢失包，生成 lib 可能残留已删声明。需要检查源 patch 和清理后 tarball，而不只看 UI 是否有一个同名 card。

## Documentation Impact

package reference、architecture、client graph troubleshooting、ADR-0004。 [文档地图](../../README.md)列完整入口；[提交历史](../../reference/repository-history.md)保存每个可达历史提交。

## Completion Criteria

完成，并纳入本地 v0.1.2 tag；plugins.item/detail 的尝试明确被 superseded。 验证限制与未发布状态须保留，不能以 Completed 暗示所有宿主/平台已经认证。

## Related Documents

[进度总账](../active/2026-10-02-theme-studio-roadmap.md)、[CHANGELOG](../../../CHANGELOG.md)、[兼容矩阵](../../development/dsh-compatibility.md)。
