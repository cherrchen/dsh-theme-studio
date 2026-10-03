# ADR-0002: 设置适配与 effect 所有权

## Status

Accepted（当前源码所体现的选择；2026-10-02 追溯整理，不冒充原始提交中的 ADR）。

## Date

整理：2026-10-02。实现依据：fba048e / bbb0ada（2026-09-25）、d709754（2026-09-26）。

## Context

DSH 的 settings 从 namespace register/settingsScope 迁移到 profile Config/configure/configForms。两个 client service 不同时存在，Cordis proxy 只允许读取实际注入的服务。旧 register 返回 namespace scope 普通对象，把它交还 apply 会触发 Invalid effect，失败 child 回滚 namespace，表现为选择不能保存。设置 child 停止后若 start guard 没清理，重供也无法重新挂载 UI。

## Decision

1. Host 适配集中在 compat/settings-host.ts，按结构探测，register 优先于 configure。
2. legacy scope 返回值被消费但不交给 Cordis；provider 自己拥有注册生命周期。只有真实 disposer 返回值才交回 effect。
3. Config 使用新建 field 及可探测 volatile，configure({ auto:false }, owner) 关闭自动表单。
4. Client 两个 transport 分别 inject，callback 保持独立函数身份；仅读取 child 已注入服务。
5. 拥有启动的 child 在停止时释放 startOnce guard，允许 service 重供或 transport 切换重启。
6. runtime 通过共同 getSnapshot/subscribe/set 接口采用 Host accepted 状态。

## Alternatives Considered

| 方案 | 取舍 |
| --- | --- |
| 删除旧 settings 路径 | 会破坏已支持的旧 Host |
| 把两个 service 一起列为必需 inject | 宿主缺任一服务就永远不启动 |
| 读取未注入服务后检查 undefined | proxy 可能先抛错，检查来不及 |
| 直接 return settings.register(...) | scope 不符合 Cordis effect 形状，导致回滚 |
| 按能力适配与明确 owner cleanup | 两条路径共享业务逻辑；被采用 |

## Consequences

适配层保留稳定同步调用语义，不用 async wrapper 改写 register/configure。UI 与 runtime 生命周期归 settings child，公开 catalog 归父 fiber（ADR-0007），不能一起清理。set settlement 不表示写入必定成功；accepted snapshot 回收敛和 rejected Promise 的用户反馈仍是两类问题。

## Validation

Host settings.spec、真实 legacy settings-provider.spec、client transport 重供/切换和 runtime accepted snapshot 测试。

## Related Documents

[实现真源](../../src/compat/settings-host.ts)、[相关详细文档](../troubleshooting/selection-not-persisted.md)、[完整历史](../reference/repository-history.md)、[架构](../architecture/theme-studio.md)。
