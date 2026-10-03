# 主题选择未保存、重启丢失或应用后回到旧主题

## Status

2026-10-02，根据当前实现与已记录历史修复整理。诊断步骤是复现指南，不暗示本轮已经在完整宿主中执行。

## Symptoms

Apply 徽标立即改变，但重启回到默认/旧选择；UI 显示此连接不会保存主题；Host 日志出现 Invalid effect；未知旧 id 被自动清理。

## Root Cause

1. section unavailable 或没有 Host handle，runtime 不写 settings；这不是永久保存成功。
2. legacy settings.register 返回 scope 普通对象，旧代码把它当 apply effect 导致 injection 回滚。d709754 已修正。
3. 新 Host Config field 未 live/entry id 不对，或自动 form/persistence 组合有错误。
4. Host.set 没接受乐观 id，runtime settlement 后回收敛到 accepted snapshot；这是 authority 行为。
5. set Promise rejected，当前没有 dedicated 错误 UI；需要看 Host rejection，而非仅凭徽标。
6. 持久 id 不在当前 catalog，runtime 清 layers 并尝试写 null 修复。

## Diagnosis

查看 section status、accepted activeThemeId、实际 register/configure 能力与 profile 配置；对照 theme-studio namespace/entry id。检查有没有 Invalid effect 和 schema 类型错误。不要打印完整 user-settings/凭据；只检查相关字段与错误。

```sh
pnpm compat:check
pnpm test
dsh --profile web --dump-config
```

## Verified Solution

legacy adapter 消费 register 返回值并返回 undefined，使用 provider 自己的 effect ownership。新路径保留 configure({auto:false}, owner) 与 live Config field。不要绕过 Host authority把前端状态当落盘值。unavailable 需修复连接/设置服务能力；rejected write 需处理 Host 根因。未知 id 预期回到 Default，若需保留第三方主题应先有正式注册/schema设计。

## Validation

真实 settings-provider.spec 验证 legacy scope 可写、plugin dispose 后释放；新 API 树显式 skip 该旧接口用例。runtime.spec 验证重启、unknown repair 与不接受写入后的回收敛。本次 Stage 2/3 的完整磁盘 profile 旅程未重跑，历史真实 profile 证据归 d709754。

## History and Related Documents

历史依据：d709754 / 02d497b；settlement authority 在 runtime 已有。 [详细契约](../reference/theme-runtime.md)、[完整提交历史](../reference/repository-history.md)、[开发工作流](../development/plugin-development-workflow.md)。
