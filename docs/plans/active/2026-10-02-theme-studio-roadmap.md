# Theme Studio 路线图与进度总账

## Status

Active：长期路线图。2026-10-02 根据实际提交与本地 tag 建立；下列 completed 批次是历史追溯，不冒充先前存在的实施计划。未来方向尚未实施或排期。

## Goal

在便携插件边界内提供可复用配色、可靠预览/持久化、可自动诊断的可读性与跨插件发现，并保留公开格式、创作与更完整呈现验证的后续入口。

## Background

Stage 1 自 2026-08-26 已落地，多次迁移设置、loader 和兼容接缝；v0.1.0–v0.1.4 是仓库发布 tag。2026-10-02 用户指定完成 Stage 2 对比度校验与 Stage 3 catalog，已形成 `509b88e`。本路线图的职责是进度和发布状态，不重复各版变更正文。

## 进度总账

| 编号/批次 | 实现状态 | 发布状态（本地证据） | 完整实施记录 |
| --- | --- | --- | --- |
| Stage 1 overlay/runtime/UI | Completed | 自 v0.1.0；后续版本持续维护 | [Stage 1](../completed/2026-08-26-stage-1-theme-overlays.md) |
| 早期 DSH/双 settings/持久化修复 | Completed | v0.1.0 / v0.1.1 | [迁移与设置修复](../completed/2026-09-25-dsh-settings-and-compatibility.md) |
| 官方 package registration | Completed；旧自定义插件页 Superseded | v0.1.2 | [注册调整](../completed/2026-09-27-official-plugin-registration.md) |
| Claude/Codex/Cream 与派生 chrome | Completed | v0.1.3 | [Builtin/chrome](../completed/2026-09-30-builtin-palettes-and-chrome.md) |
| DSH 0.2 精确支持与最新 pin | Completed | v0.1.3 | [0.2 兼容提升](../completed/2026-09-30-dsh-02-compatibility.md) |
| Stage 2 自动对比度诊断 | Completed，commit 509b88e | v0.1.4 | [Stage 2/3](../completed/2026-10-02-stage-2-3-validation-and-catalog.md) |
| Stage 3 readonly Client catalog | Completed，commit 509b88e | v0.1.4 | [Stage 2/3](../completed/2026-10-02-stage-2-3-validation-and-catalog.md) |
| 完整文档体系 | Completed，本批次单独提交 | v0.1.4 | [文档补齐](../completed/2026-10-02-documentation-reconstruction.md)、[文档地图](../../README.md) |
| DSH 0.2.1-alpha.1/alpha.2 与字体正交、保存失败提示 | Completed，本分支实现 | v0.1.4 | [兼容矩阵](../../development/dsh-compatibility.md) |
| 元数据驱动的多版本矩阵、候选探测与发布复用 | Completed，本分支实现 | v0.1.4；远端跨平台结果由 PR CI 提供 | [兼容矩阵](../../development/dsh-compatibility.md) |
| `dsh-theme.json` v1 与主题导入/导出、复合 catalog | Completed，本分支实现 | 未随 tag 发布（v0.1.4 之后） | [导入导出](../completed/2026-10-14-theme-file-import-export.md)、[文件格式](../../reference/theme-file-format.md) |

“发布状态”以 tag 与远端产物为准：v0.1.4 于 2026-10-11 打 tag、发布 GitHub Release 并推上 npm（`@dsh-electron/dsh-theme-studio@0.1.4`），Stage 2/3、文档补齐与兼容/发布改进均纳入其中；每个版本内容的唯一归档是 [CHANGELOG](../../../CHANGELOG.md)。

## Current State

runtime 通过两层 overrideTokens 工作，Host accepted snapshot 持久化（`activeThemeId` + `importedThemes`），官方 Appearance 保留所有权。catalog 在 Client 父 fiber 提供为 builtin+imported 复合目录，settings 子树可停止/重建。主题文件导入/导出/删除走浏览器 file picker 与 Blob 下载，不扩大 portable 权限。对比度默认报告可复现、全内置可计算，但有低于阈值的配对；报告与 UI 认证必须分开。

当前全部受支持 DSH 版本由[兼容契约](../../../src/compat/dsh-version.ts)决定。清单包含 0.2.1-alpha.1 至 0.2.1-alpha.3（0.2.1-alpha.3 于 2026-10-15 提升）；证据见[兼容矩阵](../../development/dsh-compatibility.md)。没有把 Theme Creator 或公共主题文件放进这次兼容升级。

## Scope and Non-goals

保留要求与阶段边界，不把 docs reconstruction 变成主题编辑、自动改色、升级依赖或新发布。未批准的未来工作不建立假完成进度，也不把目标分支 commit 当发布 tag。

## 后续方向（Planned，未实施）

| 方向 | 开始前需解决的契约 | 验收要求 |
| --- | --- | --- |
| 主题编辑器 | `dsh-theme.json` 之上新增改名/改色 UI 的契约与持久化路径 | 不回退 palette+overrides 模型；编辑结果可导出回导 |
| Theme Creator Agent | 模型工具契约、prompt、产物 schema、校验反馈与用户确认 | 模型产生主题经过格式与对比度检查；不可直接从当前 Model Experience 推断已有 |
| 配色可读性改进 | 对标 palette 身份、具体语义配对、视觉影响与变更范围 | 用实际报告和真实 UI 决定修正，不默认把所有品牌色都当普通文本 |
| 设置写入错误呈现 | 已在 0.2.1 兼容批次实现：accepted snapshot 回收敛，并显示可重试的保存失败 | 不再作为未实施项 |
| 明暗 Mosaic 与真实 UI 验证 | 色块跟随模式、浏览器场景、实际 backdrop、跨平台宿主 | 截图、真实 profile 磁盘旅程、unload/reload 与可访问性测试 |

以上未承诺编号、发布版本或日期。具体工作获得授权后应建立 active 实施计划，完成与验证后移入 completed。

## Validation

现有验证证据归 [matrix](../../development/dsh-compatibility.md)、[contrast baseline](../../reference/theme-contrast.md)和 completed 记录。新增阶段必须同时更新需求、架构/API、ADR、计划状态与双语 CHANGELOG；不能只更新此总账。

## Risks

新 DSH token 或 settings seam 变化可能破坏部分配色；扩展 resolver 可能改变数值结果；动态主题将改变 frozen catalog 和未知 durable id 的语义。未来代码不能静默改变现有 public API，不可将假设的新宿主行为写进 Current 文档。

## Documentation Impact

全仓库 docs:check 检查链接、语言配对、命名、ADR 编号与 plan lifecycle；semantic review 继续负责历史准确、翻译内容、结果范围和真源。结构绿灯不等于技术结论或 release 可批准。

## Completion Criteria

长期路线图在后续方向仍存在时保持 active。已经完成的具体批次全部位于 completed；新增任务的完成以实现、相关验证、文档与提交为准，不依赖人为把整张路线图标为“全部完成”。
