# ADR-0007: 只读 Client catalog 与父 fiber 生命周期

## Status

Accepted（当前源码所体现的选择；2026-10-02 追溯整理，不冒充原始提交中的 ADR）。

## Date

整理：2026-10-02。实现依据：509b88e（2026-10-02）。

## Context

内置 registry 原先只供 runtime 查找。其他插件需要发现主题，但当前没有公共 file schema、registration 或 import/export 协议。若把 discovery 挂在 settings child，设置服务暂停会无必要地撤销只读目录；若让 consumer 修改 preset，runtime 输出可在无 Host 写入情况下变化。

## Decision

1. ctx.themeStudio 是 Client service，公开 readonly catalog 的 list/get/validate。
2. Client apply 创建 catalog 并 provide；settings child 的 runtime 使用同一实例。
3. provider 的所有权属于父 plugin fiber，独立于 settings transport 的 ready/重供。
4. catalog 防御性复制列表与嵌套数据、冻结 facade，重复 id 拒绝。
5. list 引用稳定，get 返回同一 preset；unknown/default/official preference 返回 undefined。
6. consumer 使用 package browser dependency metadata 与 Cordis inject；provider 卸载后停止、重供后重启。
7. 服务不写 Appearance/Host，不提供第三方 register 或 Host RPC。

## Alternatives Considered

| 方案 | 取舍 |
| --- | --- |
| 直接导出可变全局数组 | consumer 能改变 runtime palette，缺少 provider lifecycle |
| 挂到 settingsScope child | 设置变化会撤销与持久化无关的 discovery |
| 新建 Host catalog RPC | 增加 transport 与协议，builtin Client 数据无需这一层 |
| 同时实现动态注册 | 尚无 schema/ownership/revocation 契约，会扩大任务范围 |
| 父 fiber 的只读服务 | 共享实现且生命周期清楚；被采用 |

## Consequences

catalog 名称和 token 数据成为公开类型契约，需要维护兼容。重载创建新实例，旧 frozen snapshot 可仍被保存但不是 live provider。report 每次新算，无 revision/订阅承诺。将来动态 catalog 需要新需求与决策，不能静默改变 list 稳定语义。

## Validation

catalog.spec 与真实 Cordis provider/consumer lifecycle 回归，actual lib/client.js 导出 smoke；全部十版矩阵通过。

## Related Documents

[实现真源](../../src/client/catalog.ts)、[相关详细文档](../reference/theme-catalog.md)、[完整历史](../reference/repository-history.md)、[架构](../architecture/theme-studio.md)。
