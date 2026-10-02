# 主题行不出现，或设置服务重供后无法恢复

## Status

2026-10-02，根据当前实现与已记录历史修复整理。诊断步骤是复现指南，不暗示本轮已经在完整宿主中执行。

## Symptoms

设置 → 通用能看到官方外观，却没有 Themes；或原来存在，settings transport 停止后再提供仍消失。另一个常见症状是 Themes 行存在但一直显示正在读取。

## Root Cause

1. browser bundle 没被 bare package loader row 加入图；详见 client graph 排查。
2. Client 必需 theme/slots/locale/connection/remote 尚未提供，或缺 settingsScope/configForms 两者之一的任一可用 transport。
3. transport 已存在但其 section snapshot 仍 loading，这与完全没有 row 是不同状态。
4. 历史 start guard 在 child teardown 没释放；bbb0ada 已修正，旧安装包可仍含旧实现。
5. Host 未提供 settings section 或 profile entry id 与 theme-studio 不匹配。

## Diagnosis

```sh
pnpm compat:check
pnpm build
dsh --profile web --dump-config
```

检查 dump-config 中 bare package carrier，浏览器是否加载本包及 required services；检查是否声明 settings.general.item。只在已注入 context 中读取 transport，不能用 proxy 的未注入属性探测。headless 不应有行；完全没 transport 时 ctx.themeStudio catalog 可以存在，不能据此推断 row 已启动。

## Verified Solution

恢复真实缺失的宿主依赖或正确 profile，保留不同 transport callback 身份与 child-owned guard cleanup。若只是 loading，检查设置服务同步日志和 Host section，而不是创建一个跳过持久化的伪 ready 状态。新增 service 恢复逻辑先覆盖 teardown/reprovide 与另一 transport 切换。

## Validation

apply.client.spec 覆盖注册、reload、settingsScope stop/reprovide、切换 configForms 与没有 transport 时 catalog 可用。修改后运行 typecheck/test 并在真实 Web profile 重现，后者需另记执行证据。

## History and Related Documents

历史依据：bbb0ada；当前 provider parent lifecycle 在 509b88e 扩展。 [详细契约](../reference/settings-and-package-contract.md)、[完整提交历史](../reference/repository-history.md)、[开发工作流](../development/plugin-development-workflow.md)。
