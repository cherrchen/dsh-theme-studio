# ADR-0008: 独立 Host/Client 构建与 tag 驱动发布

## Status

Accepted（当前源码所体现的选择；2026-10-02 追溯整理，不冒充原始提交中的 ADR）。

## Date

整理：2026-10-02。实现依据：a191fe9、e56004d、20f9632、599c468；文档约定于 2026-10-02 补齐。

## Context

仓库既独立发布又通过 subtree 被 Desktop 镜像；依赖外层 tsconfig 和 workspace 协议会使出树安装失败。Client 运行在 DSH loader，不是 Node ESM。版本、changelog 与构建产物需要在发布时一致，CI 发布凭据不能依赖开发者终端的临时状态。

## Decision

1. host/client tsconfig 自包含，build:types 生成声明与中间 JS，再由 standalone tsdown 两种配置构建。
2. Host 输出 ESM；Client 输出 loader wrapper 与内联 CSS Module helper，production peer 保持 external。
3. files 显式列出发布 JS、声明、patch、语言 README、changelog 与 license；生成 lib 不入 Git。
4. v* tag 必须匹配 package.version，release workflow 先 verify 再 publish，provenance 和 GitHub Release 附 tarball。
5. 双语 CHANGELOG 归档版本用户变更，路线图记录发布状态；版本脚本不自动编写正文。
6. 文档结构按参考项目采用中文 README.md + 英文 README.en.md，旧 README.zh.md 仅兼容导航；docs:check 作为稳定检查入口。

## Alternatives Considered

| 方案 | 取舍 |
| --- | --- |
| 复用外层 monorepo tsconfig | subtree 深度与独立 checkout 路径不稳定 |
| 直接发源码等待 runtime 转译 | 不能保证 installed browser loader 制品可用 |
| 每次手工 npm publish 与临时 notes | 容易 version/tag/notes 不一致 |
| 只维护英文或中文版历史 | npm 读者看到不完整的 release content |
| 独立制品 + tag gate + 文档检查 | 构建、证据与发布状态可追踪；被采用 |

## Consequences

需要维护两套构建面与 README 语言配对。build 不清空 lib，发布前应清理生成目录避免旧声明进入 tarball。docs 及 Agent 文件不全部打入 npm 包，完整工程资料通过源码仓库访问。当前凭据/OIDC 是否配置须从远端实际确认，文档不把历史 secret 声明当当前权限证明。

## Validation

typecheck/build/pack gate、release tag/version 检查与 docs:check；GitHub 远端 workflow 成功另行确认。

## Related Documents

[实现真源](../../tsdown.standalone.config.ts)、[相关详细文档](../development/release-workflow.md)、[完整历史](../reference/repository-history.md)、[架构](../architecture/theme-studio.md)。
