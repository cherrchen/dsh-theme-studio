# ADR-0005: 从基础 palette 派生 chrome 并保留静态白色

## Status

Accepted（当前源码所体现的选择；2026-10-02 追溯整理，不冒充原始提交中的 ADR）。

## Date

整理：2026-10-02。实现依据：c9ad6c6、b0a1a9d、e6dc0e9、105d262、a42316f（2026-09-28 至 30）。

## Context

最初 13-token overlay 覆盖基本表面、文字、brand 与状态色，但宿主大量 aliases 直接指向 static token 或 literal rgba，导致界面混入官方色板。新增 Claude/Codex/Claude Cream 后，这种局部未覆盖更明显。部分 tooltip/file tile 又明确把 static neutral 00 当白色使用，不能笼统将所有 static token 翻成主题前景。

## Decision

1. 保持每模式 13 个可审查 Palette 字段，deriveChrome 从它们生成语义、specific、Shiki 与必要 static token。
2. mix 使用 color-mix(in srgb)，fade 通过 transparent，surface/ink/brand/status 按角色派生。
3. 不覆盖 --dsw-static-neutral-00 与 --dsw-static-neutral-bluish-00，保留官方白色语义。
4. tooltip/toast bubble 为白色或浅文字保持深色背景，dark scheme 的 bubble 向 black 混合。
5. must-add 的 brand、bgBase 与 sidebar 保持明确值并由测试锁定，不因为诊断失败自动调整。
6. 新上游语义 token 在同一 deriveChrome 扩展，不另写 host CSS。

## Alternatives Considered

| 方案 | 取舍 |
| --- | --- |
| 永远只覆写 13 个字段 | 更多 UI 保留官方配色，主题呈现不完整 |
| 每主题手写所有派生 token | 高度重复，未来上游扩展成本高 |
| 覆写所有 static neutral 为 theme ink | tooltip 白字与其他白色用途会改变语义 |
| 修改宿主 token stylesheet | 破坏独立插件边界 |
| 单一派生函数与角色化保留 | 可复用且可测试；被采用 |

## Consequences

依赖 CSS color-mix 的呈现支持，校验器也必须能计算相同 sRGB/alpha 语义。派生名称跟随宿主，仍需逐版本审查。deriveChrome 不保证每个角色的对比度；Stage 2 记录现实失败。字段与完整派生表达式以 token 参考和源码为准。

## Validation

presets.spec 覆盖 key 集合、must-add palette 值、brand/hover 派生、保留 static white 与 bubble；0.2 矩阵覆盖新增八项语义 token。

## Related Documents

[实现真源](../../src/client/chrome-tokens.ts)、[相关详细文档](../reference/theme-tokens.md)、[完整历史](../reference/repository-history.md)、[架构](../architecture/theme-studio.md)。
