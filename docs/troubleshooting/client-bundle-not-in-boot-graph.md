# 包已安装但浏览器 bundle 未进入启动图

## Status

2026-10-02，根据当前实现与已记录历史修复整理。诊断步骤是复现指南，不暗示本轮已经在完整宿主中执行。

## Symptoms

官方包列表或 Host row 显示安装，浏览器没有 Themes UI、没有 themeStudio provider；源码看起来有 client apply，实际未执行。

## Root Cause

客户端 metadata scanner 从 bare package loader row 读取 package.json dsh.client。若 profile 仅挂 /client、虚构 invariant 子路径或漏掉 carrier，Host 可看似安装但 lib/client.js 不进入 browser graph。另一个症状是使用方只有 TypeScript import type，它不会运行时加载 provider。

## Diagnosis

```sh
pnpm build
pnpm pack --dry-run
dsh --profile web --dump-config
```

核对 exports/client 文件、patch 中 name=@dsh-electron/dsh-theme-studio、manifest dsh.client.platform=web 与 inject metadata。浏览器网络/loader记录必须出现 package id；Node 直接 import client 报 window 未定义不是 browser artifact 损坏证明。

## Verified Solution

恢复 cordis.patch.yml 的 bare package insert row，不另增 plugins.item card 冒充 loader。消费者在 dsh.client.inject 加本包，并在 Cordis inject 等 themeStudio；bundle dependency 与 service dependency 需要同时正确。clean lib 后 rebuild，排除旧 artifact。

## Validation

apply.client.spec 对 patch bare row 静态断言，官方 integration fixture 通过 ModuleLoader 加实际 upstream bundle；509b88e 已对本包实际 browser loader exports/catalog smoke 验证。本轮 docs gate 不代表在完整浏览器重跑。

## History and Related Documents

历史依据：e1e1ffe 的 custom plugin page 被 faa9b92 替代；599c468 发布最终注册行为。 [详细契约](../decisions/ADR-0004-official-plugin-package-registration.md)、[完整提交历史](../reference/repository-history.md)、[开发工作流](../development/plugin-development-workflow.md)。
