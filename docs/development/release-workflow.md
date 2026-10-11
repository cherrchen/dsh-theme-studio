# 发布工作流

## 触发与产物

源码真源为 [release.yml](../../.github/workflows/release.yml)、[bump-version.mjs](../../scripts/bump-version.mjs)、[release-notes.mjs](../../scripts/release-notes.mjs)。推送 annotated `v<version>` tag 触发 Release workflow。verify job 复用完整 CI；通过后 publish job 先核对 tag、源码 package.json 与已验证 tarball 的版本完全相同，再允许发布。

产物包括独立 Host ESM、Client ModuleLoader bundle、公开声明、cordis.patch.yml、语言 README、双语 CHANGELOG 与 LICENSE。npm 包 files 没有包含全部 docs/Agent 工程资料，源码仓库文档入口应明确；打包清单不能仅凭文件存在于源码推断。

## 发布前的内容准备

1. 确认准备发布的 branch/commit 包含本次功能、文档与回归；当前 Stage 2/3 是 Unreleased，不能默认既有 v0.1.3 tag 包含。
2. 同步两份 CHANGELOG，增加对应版本标题、日期、用户可见 Added/Changed/Fixed 与 compare link；Unreleased 不重复永久保留已发布条目。
3. 路线图记录准备/已 tag 状态，不复制完整 release content。核对公开 API、token/contrast 基线、compat evidence、README 配对与旧入口。
4. root README 审阅同步后用 git hash-object 重记 i18n记录。清理可再生成 lib，避免已删除 plugin-page/invariant 声明入包。
5. 运行以下 gate：

```sh
pnpm install --frozen-lockfile
pnpm docs:check
pnpm compat:check
pnpm lint
pnpm typecheck
rm -rf lib
pnpm build
pnpm test
pnpm verify:package
pnpm pack --dry-run
```

若本次影响兼容 seam，再执行全矩阵与真实 profile安装/持久化/重启检查。contrast strict 对现有失败返回1，不是当前发布gate要求全绿；报告结果与未覆盖范围应如实说明。docschecker检查结构，不自动确认所有内容或翻译。

## 升版与 tag

版本脚本当前只改 package.json，不自动搬移changelog，不替维护者写 release notes，也不修改已经删除的 runtime version常量。

```sh
pnpm release patch
pnpm release minor
pnpm release 1.2.3
pnpm release prerelease --pre rc
```

以上是选项示例，不应连续全部执行。使用 --tag 时脚本先要求完全干净工作树，再改 version、提交为 chore(release):v<version>、创建 annotated tag：

```sh
pnpm release patch --tag
```

先提交对应 changelog/文档再用 --tag。若希望version与changelog同一commit，则不使用 --tag，手动一起提交，随后在该commit创建matching annotated tag。不要用 --tag 去绕过未提交的用户修改；不能重写已经用于发布的tag。

## 验证实际 tarball

`verify:package` 在 tarball 所在临时目录运行 `tar`，使用相对 archive 文件名和相对解压目录。Git for Windows 的 GNU tar 会把 Windows 盘符中的冒号识别为远端 archive 分隔符；不要把带盘符的绝对路径直接交给 `tar -f`。相对路径同时适用于 GNU tar 与 macOS BSD tar。

publish job 先把 manifest 和 Client bundle 解压为文件，再校验版本与 ModuleLoader 标记。Bash 的 `pipefail` 下不能用 `tar -xO | grep -q` 检查大 bundle：`grep` 提前匹配退出可能让 `tar` 收到 SIGPIPE，导致有效产物被误判为失败。标记使用固定字符串匹配，缺少标记的产物仍会阻止发布。

传给 npm 的本地 tarball 路径必须带 `./` 前缀或使用绝对路径。publish job 从 `./dist/*.tgz` 选择制品并保存到 `TARBALL`，避免 `dist/plugin.tgz` 被 npm 解释成 GitHub 的 `owner/repo` 简写。对应失败日志与诊断见[发布路径排查](../troubleshooting/build-and-release-failures.md#npm-publish-把-tarball-当成-github-仓库)。

```sh
pnpm pack --pack-destination /tmp/theme-studio-release
```

检查真实 tarball 的以下关键项：

| 项 | 要求 |
| --- | --- |
| package/package.json | version、exports、files、registry peers与dsh metadata正确 |
| package/cordis.patch.yml | bare package载体行存在 |
| package/lib/index.js | 可加载Host入口，不含运行时Node package probe |
| package/lib/client.js | ModuleLoader注册、public exports、portable client能力 |
| package/lib/types/index.d.ts | Host声明存在 |
| package/lib/types/client/index.d.ts | catalog/contrast公开声明及Context合并存在 |
| README与CHANGELOG语言文件 | 中文/英文对应，旧中文导航可达 |

可复用 CI 的 package job 检查表中的必需文件与 bundle 契约，并将真实 tarball 安装到临时包加载 Host；publish job 下载同一产物后再次核对必需文件、版本与 ModuleLoader 标记。pack dry-run 只列文件，不是将 tarball 安装到真实 profile。profile composition 与浏览器持久化的验证范围见[兼容矩阵](./dsh-compatibility.md)，catalog consumer 生命周期由对应集成测试覆盖。

## 推送与远端流程

准备commit/tag通过后由发布操作者推送：

```sh
git push origin main --follow-tags
```

这里以正式main发版为例，不能把feat/stage-2-3的本地完成当已自动合并/推送。本次文档任务不触发新tag或npm发布。

verify job 使用 Node 22.19 与 pnpm 11.7，通过可复用的 CI workflow 跑冻结安装，以及每个受支持 DSH 版本在 Ubuntu、macOS、Windows 上的隔离矩阵。PR 默认浏览器旅程在 Ubuntu 上跑注册时代代表与当前开发 pin；Release 强制 `browser_coverage: all` 跑全部支持版本。本地复验不等同于 GitHub 托管 runner 的结果，远端覆盖以该 commit 的 Actions 记录为准。publish job 下载 CI 已经验证的 tarball，不再自己重新构建。无预发布标记发布到 `latest`，`rc` 发布到 `next`，`alpha` 发布到 `alpha`，`beta` 发布到 `beta`。其他预发布标记会使发布失败。发布仅使用 npm Trusted Publishing / OIDC，要求 npm 包设置已把本仓库与 `release.yml` 绑定为 trusted publisher。未配置时发布失败，不回退到长期 token。

## npm权限与provenance

包 scope 为 `@dsh-electron`，`publishConfig.access=public`。workflow 配置 `id-token: write`，使用支持 OIDC 的 npm 11.5.1+ 执行 `npm publish --provenance`，无 `NPM_TOKEN` 或临时认证 npmrc。配置要求见 [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)。npm 上是否已经绑定 `cherrchen/dsh-theme-studio` 与 `release.yml`，需要维护者在包的 Publishing 设置核实；本次没有权限证据确认这一外部配置，也没有执行 npm publish。

只有matching v* tag push触发自动发布；普通文档commit没有发布权限副作用。若远端某阶段失败，先确认npm是否已接受该version、GitHub Release是否已存在，再恢复后续步骤，避免误以为整条链可无条件重复。诊断见[build/release排查](../troubleshooting/build-and-release-failures.md)。

## DSH兼容提升

完整操作真源移至[开发工作流](./plugin-development-workflow.md#dsh-兼容提升)，结果与风险在[兼容矩阵](./dsh-compatibility.md)。发布前仍须确保唯一清单、peers、最新development pin、workspace overrides、lockfile和中英文README一致。

旧文档要求恢复最老支持release；ab0d19c/a42316f已改为最新受支持基线，此处不再保留过时操作。候选支持是审查与验证后的明确提升，不因CI绿灯自动扩范围。

## 发布后记录

检查remote workflow每阶段结果、npm package内容与GitHub Release assets；确认后更新路线图release state。CHANGELOG已归档该版本用户变化，不再建立第二份release内容表。保存必要的实际日志/evidence，区分本地tag、npm可用、GitHub Release创建三个状态。跨平台/profile/视觉未覆盖项须继续保持公开。
