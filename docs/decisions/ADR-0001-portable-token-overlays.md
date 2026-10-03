# ADR-0001: 可移植 token overlay 与官方主题所有权

## Status

Accepted（当前源码所体现的选择；2026-10-02 追溯整理，不冒充原始提交中的 ADR）。

## Date

整理：2026-10-02。实现依据：a191fe9（2026-08-26），后续 bbb0ada / d08aac9 延续边界。

## Context

DSH 已经拥有官方 Appearance、ThemeRuntime 和呈现层。Theme Studio 同时需要在标准 Web 与 Desktop 的 subtree 镜像运行，如果自己读取 OS/DOM 切换主题或调用 Desktop provider，会形成两个主题 authority，并失去独立安装能力。首次 Stage 1 提交明确以 overrideTokens 预览与持久化，源码说明 presentation stays with ctx.theme。

## Decision

1. 包保持 platform:web，依赖使用 registry semver，Host/Client tsconfig 自包含。
2. 明暗/system 与 DOM 呈现归官方 ctx.theme，插件只提供 light/dark token 对。
3. active 与 preview 各有稳定 source；Default 清 overlay，不复制官方 palette。
4. Host 只负责设置，Client 负责 UI/runtime；headless 不引入 browser UI。
5. 不加入 Electron、preload globals、ctx.desktop、node:* 或 Desktop provider 依赖。

## Alternatives Considered

| 方案 | 取舍 |
| --- | --- |
| 修改官方 stylesheets / body theme selector | 容易产生主题呈现冲突，难随 host lifecycle 清理 |
| Desktop 原生主题接口 | 不能用于标准 DSH Web，违背包的 portable 边界 |
| 注册另一组官方 light/dark preferences | 把插件选择混入官方 Appearance，会改变持久模型 |
| 两层 token overlay | 保留官方偏好，source disposer 可恢复；被采用 |

## Consequences

优点是相同插件能复用官方明暗解析与 overlay 栈，UI 不持有 DOM 呈现。代价是不能凭 overlay palette 宣称已覆盖宿主所有 static/semantic token；后续需要派生 chrome 与逐版本测试。清理依赖官方 disposer 只删除自身代次的契约，不能无条件撤销更新后的层。

## Validation

runtime 与官方 ThemeRuntime 集成；便携限制由 AGENTS.md 与打包检查维护。

## Related Documents

[实现真源](../../src/client/runtime.ts)、[相关详细文档](../architecture/theme-studio.md)、[完整历史](../reference/repository-history.md)、[架构](../architecture/theme-studio.md)。
