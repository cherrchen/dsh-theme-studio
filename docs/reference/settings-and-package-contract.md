# 设置、槽位与包契约

## Settings

| 身份 | 字段/值 | 所有者 |
| --- | --- | --- |
| `ui-theme.preference` | system / light / dark | 官方 Appearance |
| `theme-studio.activeThemeId` | null 或 namespaced builtin id | Theme Studio |
| `THEME_STUDIO_SETTINGS_NAMESPACE` | theme-studio | Host namespace / profile entry id |
| `ACTIVE_THEME_ID_FIELD` | activeThemeId | 常量与 schema |

Host schema 是 string/null union，默认 null，不把当前 builtin id 清单固化进 schema。由 runtime 在读取 ready snapshot 后识别未知 id。`DEFAULT_THEME_STUDIO_SETTINGS` 与 `Config` 从主入口导出；旧 namespace schema 与 Config 用新建 field 避免 volatile 改写共享对象。

### 旧 Host / Client

`settings.register('theme-studio', schema)` 注册 durable namespace。这个方法返回 owner namespace scope，是普通对象；provider 自己将注册挂到调用 fiber。适配层不把 scope 返回给 Cordis apply，防止 Invalid effect 和回滚。Client 使用 `settingsScope.bind({ namespace: 'theme-studio' })`。

### 新 Host / Client

Host 暴露 `Config`，如果 schema 支持 volatile 则将 activeThemeId 标为 live field；`settings.configure({ auto: false }, ownerFiber)` 关闭自动配置 UI，因为 Themes row 已自定义。Client 使用 `configForms.get('theme-studio')`。legacy register 与 configure 同时存在时优先 register，依据结构选择，不在业务逻辑里比较版本。

共同 handle 接口为 getSnapshot、subscribe 和返回 Promise 的 set。set 的 resolved 值可以是 void 或 boolean，runtime 只等待 settlement。实际版本划分与证据见[兼容矩阵](../development/dsh-compatibility.md)。

## Client injection and slots

Client 必需服务是 `theme`、`slots`、`locale`、`connection`、`remote`。两个 settings transport 分别通过 ctx.inject 等待，不一起写入必需 inject 清单。即使 Host.section snapshot 是 unavailable，child 已存在时仍可挂载 row；而完全没有 transport 时不会启动 row。

| 注册项 | 标识 | 行为 |
| --- | --- | --- |
| 通用设置槽位 | settings.general.item / themes / order 20 | 列表、预览与应用 |
| Locale namespace | settings.theme-studio | en、zh；zh 为 key set 真源 |
| Public Cordis service | themeStudio | readonly catalog，与父 plugin fiber 同寿命 |

官方 Appearance order 10 在前。Default 卡使用 DEFAULT_PREVIEW，不是 catalog 成员。theme id → locale key 从 namespaced suffix 推导；预览名使用 NAME_KEYS，新增主题需同步两个位置及词典，避免状态栏回落到 Default。

## Package exports

| Export | Runtime | 声明 | 内容 |
| --- | --- | --- | --- |
| `.` | lib/index.js | lib/types/index.d.ts | Host name/apply、Config/schema、settings 与 source 常量 |
| `./client` | lib/client.js | lib/types/client/index.d.ts | browser apply、runtime、adapter、catalog、presets、store、对比度与公开类型 |
| `./package.json` | package.json | 不适用 | 包 metadata |

没有 `./invariant` export：官方 ThemeRuntime 负责 overlay consistency，settings 服务负责 persistence。本包不得复制一个宿主 invariant provider。历史移除见 `d08aac9`。

`lib/client.js` 是 loader wrapper，不是可直接 Node import 执行的普通 ESM。源码的 import type 仅用于 declaration merging，不触发 browser loader；运行时代码由 consuming bundle 的 loader require 和 `dsh.client.inject` 建图。

## Profile composition

```yaml
- insert:
    - id: theme-studio
      name: '@dsh-electron/dsh-theme-studio'
```

这是 [cordis.patch.yml](../../cordis.patch.yml) 的载体行。必须保留 bare package name，官方插件管理器和客户端 metadata 扫描以它为入口。不能只挂 `@dsh-electron/dsh-theme-studio/client` 或虚构 invariant 子路径。插件不注册 plugins.item、plugins.detail.badge、plugins.detail.section；正式包管理器从安装 metadata 显示包。

`dsh.client.platform=web`，`dsh.bundle.patch=./cordis.patch.yml`。构建 external/metadata 中的依赖分类以 package.json 与 standalone build config 为准。所有 dependencies、devDependencies、peers 使用 registry 范围或精确版本；没有 workspace 协议。

## Distribution and portability

npm scope `@dsh-electron/` 是发布者标识；它不意味着 Electron runtime。Desktop 镜像路径为 `apps/electron/runtime/plugins/dsh-theme-studio`，独立仓库是权威。tsconfig 不延伸到外层 repo，Desktop 可从源码重新生成两半产物；标准 DSH Web 使用同包。

files 清单包含 Host/Client JS、声明、patch、README 语言文件、CHANGELOG 和 LICENSE；开发脚本与 docs 树没有全部进入 tarball。完整工程文档在源码仓库，安装包 README 的源码文档链接使用 GitHub 页面入口。实际发版 tarball 需检查，不只凭 files 声明推断。

## Related documents

[构建流程](../development/plugin-development-workflow.md)、[发布流程](../development/release-workflow.md)、[ADR-0004](../decisions/ADR-0004-official-plugin-package-registration.md)、[ADR-0008](../decisions/ADR-0008-standalone-build-and-tagged-releases.md)。
