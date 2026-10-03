# ADR-0006: 对比度作为明确范围的诊断

## Status

Accepted（当前源码所体现的选择；2026-10-02 追溯整理，不冒充原始提交中的 ADR）。

## Date

整理：2026-10-02。实现依据：509b88e（2026-10-02）。

## Context

README 原先说明 builtin palettes 经人工检查，WCAG 声明等待 Stage 2。实现校验器之后实际算出多个低比值；不能将“校验器存在”当成“所有主题通过”。同时 palette 是对标和手工锁定的产品数据，自动改色会改变主题身份。

## Decision

1. 纯 DOM-free sRGB resolver 与结构化 report，light/dark 分别收集所有结果。
2. 默认普通文本 4.5:1、focus 3:1，比较完整浮点值；失败配对保留 ratio/minimum。
3. missing、cyclic、unsupported 与未确定透明 backdrop 为 unknown，绝不计作通过。
4. 报告注明被测 token 场景，不声称遍历 DOM、覆盖所有字体/按钮/渐变或满足完整 WCAG。
5. 默认 CLI 对 unknown 非零；strict 对低比值也非零，JSON 保留所有结果。
6. 不修正 palette、不阻止 preview/apply；known failures 记录有日期的基线。

## Alternatives Considered

| 方案 | 取舍 |
| --- | --- |
| 继续手工可读性声明 | 不可复现，也不能发现公式/透明色问题 |
| 所有计算失败 skip | 会把不支持输入误计为符合 |
| 自动变深/变浅主题色 | 改变产品 palette 与锁值，隐藏诊断事实 |
| 直接 browser computed-style audit | 需要真实 DOM/host 场景，超出本次纯模块 scope |
| 显式 scoped report | 可自动化且如实表达限制；被采用 |

## Consequences

当前 strict 命令非零是现有低对比度的预期结果，不能把它无条件放入要求全绿的 CI。CI 验证算法正确、基线可计算；配色达标需要另一次产品选择与验证。新支持 CSS 色域或 host 语义时需同步 resolver、独立数值例子和文档范围。

## Validation

contrast.spec 的独立例子与负例、实际 768 项报告及十版矩阵；完整基线只在对比度参考维护。

## Related Documents

[实现真源](../../src/client/contrast.ts)、[相关详细文档](../reference/theme-contrast.md)、[完整历史](../reference/repository-history.md)、[架构](../architecture/theme-studio.md)。
