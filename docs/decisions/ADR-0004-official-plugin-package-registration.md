# ADR-0004: 官方插件包注册取代自定义 Plugins 页面

## Status

Accepted（当前源码所体现的选择；2026-10-02 追溯整理，不冒充原始提交中的 ADR）。

## Date

整理：2026-10-02。实现依据：e1e1ffe → faa9b92（2026-09-27）。

## Context

e1e1ffe 曾新增 plugins.item、plugins.detail.badge 与 plugins.detail.section 贡献，兼容适配根据宿主 slot 声明决定是否显示。当日 faa9b92 移除这一整层：官方插件管理器从已安装包 metadata 展示插件，客户端扫描又要求 loader 行挂 bare package name。保留两套 package card 会重复身份并增加跨版本 UI seam。

## Decision

1. cordis.patch.yml 保留 id=theme-studio、name=@dsh-electron/dsh-theme-studio 的 bare package 载体行。
2. Theme Studio 不注册插件页 card、badge 或 section；正式包管理器负责包身份。
3. 仅保留 settings.general.item 的 Themes UI，order=20。
4. manifest dsh.client metadata 由载体行进入 browser boot graph。
5. 不恢复已删 plugin-page 组件和 compat/plugin-page adapter。

## Alternatives Considered

| 方案 | 取舍 |
| --- | --- |
| 同时保留官方包列表与自定义卡片 | 重复、可能版本间呈现不一致 |
| 仅挂 /client 子路径 | 不满足 bare-name metadata 扫描，browser bundle 可丢失 |
| 为插件虚构 invariant 子路径作为载体 | 没有这个 export，也不属于本包职责 |
| 官方包注册 + 自定义 Themes 设置行 | 身份与功能入口分离；被采用 |

## Consequences

用户通过官方插件管理器查看安装包，通过设置选择主题。历史 e1e1ffe 是被取代的实现，不能在现行文档描述为仍有详情徽标。清理 lib 后构建防止已删 plugin-page 的旧声明进入包；生成文件存在不证明源代码功能存在。

## Validation

apply.client.spec 验证 bare loader row，plugins 三类 slots 为空，以及 Themes 行保持。

## Related Documents

[实现真源](../../cordis.patch.yml)、[相关详细文档](../troubleshooting/client-bundle-not-in-boot-graph.md)、[完整历史](../reference/repository-history.md)、[架构](../architecture/theme-studio.md)。
