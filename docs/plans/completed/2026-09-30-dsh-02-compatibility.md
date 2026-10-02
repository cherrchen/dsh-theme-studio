# DSH 0.2 兼容提升

## Status

Completed。2026-10-02 根据提交追溯整理；文件名前缀是对应工作完成/落地日期，不是原始计划创建日期。

## Goal

正式支持 DSH 0.2.0-rc.1/rc.2，把开发树固定到最新受测版本，并让全部既有版本继续通过。

## Background

rc.1/rc.2 的 peer admission 需要精确声明；0.2 新增语义 token，官方 ThemeRuntime bundle 测试也需加载实际安装版本而非固定拷贝。

## Current State

记录周期：2026-09-30。提交依据：`26b9503、ab0d19c、a42316f、109bfdc`。当前代码可能包含后续扩展，不能把本文的历史值直接恢复为当前基线。

## Scope

覆盖下列实际落地阶段、回归证据与文档影响。版本发布内容由 CHANGELOG 维护，发布状态由路线图维护。

## Non-goals

不扩大到未经验证版本，不改变 settings adapter 的旧分支，不新增 Desktop 或 Node 客户端 provider。

## Design

采用当前架构记录的组件所有权；历史替代关系在 ADR 与 repository history 明示，不伪造未实现接口。详见[架构](../../architecture/theme-studio.md)。

## Implementation

| 阶段 | 实施与证据 |
| --- | --- |
| 支持声明 | 清单与全部 DSH peers 增加两个 0.2 release |
| 安装树 | ab0d19c 统一 dev pin、overrides、age exceptions、lockfile 为 0.2.0-rc.2 与对应 vendor |
| 上游 seam 审查 | overrideTokens/settings/slots 保持契约，字体范围与 remotes 新项不由本插件接管 |
| 新语义色 | deriveChrome 添加 deep-diving/shimmer、document selection、switch、turn-trigger、menu header 等八项 |
| 真实发布代码 | integration fixture 改为 ModuleLoader materialize 已安装官方 bundle |
| 矩阵 | scripts/run-dsh-matrix.mjs 建孤立安装树并修正间接 caret drift，覆盖十版 gate |
| 合并与发版 | a42316f 合并 PR #4；109bfdc 准备本地 v0.1.3 tag |

## Validation

2026-09-30 原始全矩阵 evidence 已在后续 Stage 2/3 复验更新；当前 JSON 保存 2026-10-02 的最新十版结果。矩阵每版执行 install、compat:check、typecheck、test、build、pack dry-run，原开发 checkout 未被切换。

## Risks

旧 0.1.7-alpha.1 自动 peers 可漂移；统一所有解析副本才能算通过。source map 缺失 warning 与实际失败分开。GitHub Linux CI 配置不是本机已经跑过所有平台的证明。

## Documentation Impact

兼容矩阵与结果 JSON、开发 workflow、根 README 与 CHANGELOG；ADR-0003/0005。 [文档地图](../../README.md)列完整入口；[提交历史](../../reference/repository-history.md)保存每个可达历史提交。

## Completion Criteria

完成并包含在 v0.1.3；开发树保持最新受支持基线，旧文档中的最老 pin 恢复步骤已纠正。 验证限制与未发布状态须保留，不能以 Completed 暗示所有宿主/平台已经认证。

## Related Documents

[进度总账](../active/2026-10-02-theme-studio-roadmap.md)、[CHANGELOG](../../../CHANGELOG.md)、[兼容矩阵](../../development/dsh-compatibility.md)。
