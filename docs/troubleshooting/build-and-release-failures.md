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

## Windows jsdom 测试找不到 setup

2026-10-10 检查 [CI run 38063562976](https://github.com/cherrchen/dsh-theme-studio/actions/runs/38063562976)：十二个 Windows 版本均在 test 阶段失败；已读取最老支持版 `0.1.5-rc.2` 与开发基线 `0.2.1-alpha.2` 的日志，两者都在六个 jsdom 套件初始化时报告 `Cannot find module '/tests/setup/module-loader.client.ts'`。安装、compat、lint、typecheck 和 build 在这两个任务中已通过。上游缺失 source map 的 ENOENT 警告不是此处的失败原因。

Windows 临时目录可同时出现长用户名路径与 `RUNNER~1` 短路径。Vite 8.2 起会 realpath 项目 root；Windows 的 safeRealpath 首次使用普通 `realpathSync`，随后可能改用 `realpathSync.native`，两者对 8.3 短名称的结果不同。node/jsdom 环境由此可能得到不同根目录。相关上游背景见 [Vite #23197](https://github.com/vitejs/vite/issues/23197) 与 [#23198](https://github.com/vitejs/vite/pull/23198)，后者处理 preserveSymlinks，不直接修复这里的短名称差异。首次仅使用普通 realpath 的修复在 [CI run 38064162111](https://github.com/cherrchen/dsh-theme-studio/actions/runs/38064162111) 中仍报同一错误。

仅将测试配置 root native 展开也不充分：工具本身如果从短路径 CWD 启动，仍会加载短路径下的模块。矩阵在启动 pnpm 前将临时安装目录 native 展开，测试配置也使用 `realpathSync.native` 将项目 root 展开为长路径，并以同一 root 构造 setupFiles 和 renderer shim 的绝对路径，保持子进程 CWD、工具模块与 node/jsdom 的文件定位一致。不得通过跳过 jsdom 套件、删掉 setup 或移除 Windows 矩阵掩盖失败。复验运行 `pnpm verify:all`，再查看修复 commit 的三平台完整 CI；本机 macOS 结果不能替代 Windows runner 的通过证据。

## History and Related Documents

历史依据：e56004d创建tag发布；20f9632修Bash引用；599c468调整version脚本；2026-10-02迁移README配对并接docs:check。 [详细契约](../development/release-workflow.md)、[完整提交历史](../reference/repository-history.md)、[开发工作流](../development/plugin-development-workflow.md)。
