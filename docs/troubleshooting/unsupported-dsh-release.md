# DSH 不在支持清单或安装树混装

## Status

2026-10-02，根据当前实现与已记录历史修复整理。诊断步骤是复现指南，不暗示本轮已经在完整宿主中执行。

## Symptoms

dsh plugin add/boot 因 peer mismatch 不加载，compat:check 失败，typecheck 的 API 字段与当前源码不一致，或测试从另一个间接 DSH 版本加载。

## Root Cause

清单、peers、单一 dev pin、overrides、age exception、lockfile 或真实解析版本不一致。0.1.7-alpha.1 的 caret peers 可漂移到更新 release，顶层 pin 一致不保证全树一致。旧 main/develop README 的早期支持不是当前清单。

## Diagnosis

```sh
pnpm compat:check
pnpm list --depth 0
pnpm why @deepseek-ai/dsh-client-ui-theme
pnpm why @deepseek-ai/cordis
```

checker 按 required missing、mixed、uniform unsupported 分类并显示 drift。读取清单源码，不从此故障页建立第二支持表。检查实际 package resolution；不能只看 npm 显示安装完成。

## Verified Solution

恢复同一受支持 release 的直接/间接 DSH 和对应 vendor，再重新 install 与 gate。不要静默把 peer 扩为 ^0.1、删除 lockfile 后任意升级，或增加生产 Node probing。候选升级按 workflow建立独立树并复验全部旧版。headless 可没有可选 Client peers，但已安装的可选包若版本不一致仍是 mixed。

## Validation

compat.spec 的四类分类、compat:check 的静态/安装一致性以及 isolated matrix。实际 runtime 没有 Theme Studio 授权门禁；生产 admission 是宿主责任，不能照搬 multi-root fail-closed provider 描述。

## History and Related Documents

历史依据：f34ab5b/fba048e/d709754；最新 baseline 由 ab0d19c/a42316f 固定。 [详细契约](../development/dsh-compatibility.md)、[完整提交历史](../reference/repository-history.md)、[开发工作流](../development/plugin-development-workflow.md)。
