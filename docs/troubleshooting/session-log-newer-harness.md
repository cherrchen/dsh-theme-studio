# 旧宿主拒绝读取新版写入的 Session 日志（`job/registered`）

## Status

2026-10-18，根据实机会话日志与上游 `deepseek-harness` 仓库 tag 级差分确诊。症状在 DSH `0.2.0-rc.2` 宿主上打开既有会话时复现。

## Symptoms

- 在 DSH `0.2.0-rc.2`（或任何早于 `0.2.1-alpha.3` 的宿主）上打开既有会话，历史区域报「历史加载失败」，详情为 `failed to observe session "...": session "..." contains event type "job/registered" (seq N) unknown to this harness and not marked ignorable; refusing to interpret the log — it was likely written by a newer harness`，错误标记 `(gateway/internal)`。
- 同一宿主上新建的会话、以及不含 `job/*` 事件的旧会话不受影响；主题预览/应用、Theme Creator、导入导出等插件功能不受影响。

## Root Cause

`0.2.1-alpha.3` 起，上游 Session 事件词表新增 `job/registered` 与 `job/settled`（提交 `f899e87a1e`，`dsh-commands`、`dsh-subagent`、`dsh-client-file-upload` 等在登记后台作业时写入；agent 的 bash 工具调用即产生 `kind:"bash"` 的 job 事件）。这些事件按**必需事件**写入：envelope 上没有 `ignorable: true`——作业状态参与会话重建，静默丢弃会重建出错误的会话。

读路径上，`dsh-session-persistence` 的 `validateStoredEvents` 逐条检查 `KNOWN_SESSION_EVENT_TYPES`：遇到未知类型且未标 `ignorable` 的事件即抛 `SessionFormatUnsupportedError`；`dsh-session-query` 的 `SessionObservationReader` 把它包装成 `SESSION_QUERY_PERSISTENCE_FAILED`，经 gateway 返回客户端历史流。`0.2.0-rc.2` 与 `0.2.1-alpha.1` / `alpha.2` 的词表都不含 `job/*`，因此整段日志被拒绝解释。

日志格式版本不是原因：两侧 `SESSION_FORMAT_VERSION` 均为 4，版本检查通过后才在事件校验处失败。

与本插件无关：插件不调用 `observeSession` / `sessionQuery`，不解析、不写入 Session 日志；`ctx.theme` 的 token overlay 不产生 Session 事件。报错发生在客户端打开会话时的历史流加载阶段，属于宿主行为，与是否安装本插件无关；插件对 `0.2.0-rc.2` 的支持声明保持有效。

## Diagnosis

实机会话目录 `~/.dsh/sessions/<workspace>/session-<id>/session.v4.jsonl.zstd` 解压后可见 `job/registered` / `job/settled` 行（示例 seq 24，`kind:"bash"`，envelope 无 `ignorable` 字段）。上游 tag 差分：`dsh-v0.2.0-rc.2`、`dsh-v0.2.1-alpha.1`、`dsh-v0.2.1-alpha.2` 的 `KNOWN_SESSION_EVENT_TYPES` 均不含 `job/*`，`dsh-v0.2.1-alpha.3` 起包含。

## Verified Solution

- 用写入这些日志的宿主版本（≥ `0.2.1-alpha.3`）打开对应会话；若留在 `0.2.0-rc.2`，含 `job/*` 事件的会话将持续不可读——这是上游刻意的前向兼容防护，不是本插件缺陷。
- 不要在插件侧修补日志或拦截该错误：读路径在宿主持久化层，插件不可达；把必需事件当作 `ignorable` 跳过会破坏作业状态重建。
- 若需要上游修复，方向是向 `0.2.0` 线回补 `job/*` 事件类型，或由上游裁决是否将这类事件标记为 `ignorable`；两者都超出本仓库范围。

## Validation

诊断依据：`dsh-session-persistence@0.2.0-rc.2` 的 `validateStoredEvents` 源码；`dsh-session` 各版本 `KNOWN_SESSION_EVENT_TYPES` 差分显示 `job/*` 自 `0.2.1-alpha.3` 进入词表；实机日志中 seq 24 为未标 `ignorable` 的 `job/registered`（`kind:"bash"`）。本插件源码不含任何 Session 日志读取或事件写入路径，可由 `rg "observe|sessionQuery|session\.append" src/` 验证。

## History and Related Documents

- 兼容契约与逐版本接缝：[详细契约](../development/dsh-compatibility.md)
- 支持版本真源：`src/compat/dsh-version.ts`
