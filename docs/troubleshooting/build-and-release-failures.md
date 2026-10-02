# 独立构建、tarball 或 tag 发布失败

## Status

2026-10-02，根据当前实现与已记录历史修复整理。诊断步骤是复现指南，不暗示本轮已经在完整宿主中执行。

## Symptoms

git 安装只有源码没有 lib；tarball 带已经删除的 declaration；release job 报 tag/version 不符或 release notes 找不到该版本；打包成功但 npm/GitHub 发布失败。

## Root Cause

prepare 未运行/安装器生命周期待决；build clean=false 保留历史 lib 文件；tag 未匹配 package.version；双语 CHANGELOG 没有新版本 heading；npm权限/OIDC/token或remote workflow步骤失败。@dsh-electron scope不是Electron依赖，此包不包含multi-root的koffi构建例外。

## Diagnosis

```sh
pnpm docs:check
pnpm compat:check
pnpm typecheck
pnpm test
pnpm build
pnpm pack --dry-run
git status --short
git tag --list 'v*'
```

核对 package exports/files、lib两半、declarations与patch；已有tag只检查，勿运行会生成新tag的命令作诊断。远端权限必须从实际workflow日志判断，不读取或输出secret。

## Verified Solution

对可再生成lib先clean再build，检查tarball不含旧plugin-page/invariant文件。git来源按安装器实际prompt允许本包prepare，或使用已预构建tarball。发版先同步双语changelog/notes与version，再使用matching annotated tag；未发布功能不能靠现有0.1.3 tag体验。修remote失败前确认哪一阶段已经成功，避免重复发布同版本。

## Validation

本地type/build/pack并检查actual tarball清单；release verify还检查必需patch/index/client/types/package文件。CI定义或本地git tag不是npm成功证明。Source-map缺失warning来自upstream package时与真实exit code区分，不通过忽略所有异常来修复。

## History and Related Documents

历史依据：e56004d创建tag发布；20f9632修Bash引用；599c468调整version脚本；2026-10-02迁移README配对并接docs:check。 [详细契约](../development/release-workflow.md)、[完整提交历史](../reference/repository-history.md)、[开发工作流](../development/plugin-development-workflow.md)。
