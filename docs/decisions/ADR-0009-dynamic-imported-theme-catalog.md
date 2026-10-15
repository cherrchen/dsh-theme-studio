# ADR-0009: 动态导入主题进入公共 catalog

## Status

Accepted（2026-10-14 需求确认后随导入导出功能实施）。

## Date

2026-10-14。

## Context

ADR-0007 把 `ctx.themeStudio.catalog` 定为构造即冻结的只读快照：`list()` 引用稳定、`get` 返回同一 preset。公共 `dsh-theme.json` 导入导出需要目录随 Host 持久化的导入列表变化——导入主题必须先进入同一 catalog，`activeThemeId` 才能引用它们，其他插件的 `get/validate` 也才有意义。

候选语义有三条路线：新建独立 imported registry 让消费方拼合；为每个 catalog 变更重建整个服务对象；或在原 catalog 内增加一个可替换的 imported 分区。前两者要么把合并责任推给每个 consumer，要么破坏 `ctx.themeStudio` 服务的稳定身份。

## Decision

1. `ctx.themeStudio.catalog` 保持为同一服务对象，内部为 `ThemeStudioRegistry`：builtin 分区不变，imported 分区由 settings child 的 runtime 按 Host accepted snapshot 原子替换。
2. `list()` 语义改为**调用时返回当前冻结快照**：同一次 imported 变更之间返回同一引用，变更后返回新数组。旧 consumer 持有的旧数组仍有效、仍冻结，但不再反映新导入。
3. `get`/`validate` 覆盖两个分区；builtin id 永远不会被 imported 覆盖，同 id 的后写条目在 imported 分区内部按存储顺序靠后者生效。
4. registry 增加 `subscribe` 与单调 `revision`，供 UI 投影主题卡片；catalog 数据继续深冻结，`sourceOf(id)` 返回原始文件对象供导出回写。
5. 导入主题的唯一持久真源仍是 Host settings `importedThemes` 字段；catalog 分区只是它的编译投影，拒绝反向写入。
6. 无 settings transport 时 catalog 仍可用，此时只含 builtin；删除激活的导入主题走既有 unknown-id 修复路径回落 Default。

## Alternatives Considered

| 方案 | 取舍 |
| --- | --- |
| 独立 imported registry，consumer 自行拼合 | 每个 consumer 重复合并与去重逻辑，builtin 优先顺序容易分裂 |
| 每次变更重建 `ctx.themeStudio` 服务 | 服务引用失效，破坏 ADR-0007 的 provider 生命周期承诺 |
| 沿用静态 catalog，导入主题仅 UI 可见 | `get/validate` 对导入 id 失效，违背导入即公共目录的需求 |
| catalog 内可变 imported 分区 + 调用时快照 | 服务身份与父 fiber 生命周期不变；被采用 |

## Consequences

- `list()` 引用稳定承诺收紧为"快照稳定"：逐文档更新 [catalog 参考](../reference/theme-catalog.md)；把数组当永久缓存的 consumer 需重新调用 `list()`。`get`/`validate` 对未知 id 返回 undefined 的语义不变。
- imported 分区替换是原子的：一次 Host snapshot 只产生一次 revision/list 变更。
- 导入文件格式与 catalog 公共语义由同一版本承担，格式演进需同时考虑 [theme-file-format](../reference/theme-file-format.md) 的版本策略。
- Host schema 对 `importedThemes` 保持宽松、Client 严格解析：旧版本读新版条目会跳过而不是清空，新字段对降级安全。

## Validation

`catalog.spec.ts` 覆盖快照冻结、订阅、revision 与 builtin 冲突丢弃；`runtime.spec.ts` 覆盖从快照同步、删除激活主题回落与层重装；`apply.client.spec.ts` 覆盖 catalog 生命周期与导入主题进入公共目录。

## Related Documents

[ADR-0007](./ADR-0007-readonly-client-theme-catalog.md)（被本 ADR 修订的原始 catalog 决策）、[文件格式](../reference/theme-file-format.md)、[catalog 参考](../reference/theme-catalog.md)、[架构](../architecture/theme-studio.md)。
