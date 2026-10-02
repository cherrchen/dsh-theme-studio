# DSH 迁移、设置修复与初次发布

## Status

Completed。2026-10-02 根据提交追溯整理；文件名前缀是对应工作完成/落地日期，不是原始计划创建日期。

## Goal

从单一早期 DSH 分支迁移为受测多版本插件，修复真实 Host 持久化与服务重供，并建立 tag 发布。

## Background

早期 main/develop 曾分别对应旧 runtime；后来支持更多 settings 世代，必须统一声明与安装树。legacy register 返回值和 client start guard 都会在真实 Cordis 中产生静默可用性缺口。

## Current State

记录周期：2026-08-31 至 2026-09-26。提交依据：`68eaa72、1bced59、d08aac9、8e12141、f34ab5b、fba048e、bbb0ada、4e22856、e56004d、20f9632、d709754、07b49f6、02d497b`。当前代码可能包含后续扩展，不能把本文的历史值直接恢复为当前基线。

## Scope

覆盖下列实际落地阶段、回归证据与文档影响。版本发布内容由 CHANGELOG 维护，发布状态由路线图维护。

## Non-goals

本计划不新增主题呈现、动态主题文件或安全授权门禁。早期版本曾被历史分支支持，并非当前精确清单成员。

## Design

采用当前架构记录的组件所有权；历史替代关系在 ADR 与 repository history 明示，不伪造未实现接口。详见[架构](../../architecture/theme-studio.md)。

## Implementation

| 阶段 | 实施与证据 |
| --- | --- |
| 早期迁移 | 68eaa72 记录 main/develop 区分；1bced59 把 dsh-client-runtime 迁到 alpha.2 seams；d08aac9 升 alpha.4 并删 invariant；8e12141 升 rc.1 |
| 多版本清单 | f34ab5b/fba048e 以精确版本取代宽范围，加入纯 version classifier、static checker、peer/dev/override 对齐 |
| 双 settings API | register/settingsScope 与 Config/configure/configForms 能力分支共存，live field 按 volatile 方法探测 |
| 可移植与恢复 | bbb0ada 移除生产入口 Node probe；设置 child teardown 清 guard、transport 重供恢复 |
| 首次发布 | e56004d 准备 v0.1.0、notes/bump/release CI；20f9632 修 bash version check 引号 |
| rc admission 与 legacy 修复 | d709754 加 rc.1/rc.2 peers；旧 register scope 不再返回为 effect，添加真实 provider 回归 |
| 流程与 v0.1.1 | 07b49f6 记录兼容提升；02d497b 发布准备 commit/tag |

## Validation

d709754 commit message 记录当时 packed 插件在真实 0.1.5-rc.2/0.1.7-rc.1/rc.2 profiles 的 admission/schema/apply/write/reload 验证及逐版 gate。该历史陈述归该提交，当前改动的本次真实 profile 磁盘旅程未重新执行。现行 tests 使用真实旧 provider 或新 configure 契约，并在不具有 legacy API 的安装树显式 skip。

## Risks

不能 return legacy scope 普通对象、不能读取未注入 proxy 服务、不能把 production host 绑定 Node、不能让 caret peers 混装。旧 workflow 最老 pin 恢复说明已被 0.2 基线更新取代。

## Documentation Impact

compatibility matrix、settings reference、release workflow、故障排查；ADR-0002/0003/0008。 [文档地图](../../README.md)列完整入口；[提交历史](../../reference/repository-history.md)保存每个可达历史提交。

## Completion Criteria

迁移与修复完成；本地 v0.1.0/v0.1.1 tags 存在。当前支持清单与开发基线已经过后续提升，不应恢复到此计划的历史值。 验证限制与未发布状态须保留，不能以 Completed 暗示所有宿主/平台已经认证。

## Related Documents

[进度总账](../active/2026-10-02-theme-studio-roadmap.md)、[CHANGELOG](../../../CHANGELOG.md)、[兼容矩阵](../../development/dsh-compatibility.md)。
