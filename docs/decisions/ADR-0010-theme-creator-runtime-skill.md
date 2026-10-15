# ADR-0010: Theme Creator 走运行时 skill 注入而非第五 agent preset

## Status

Accepted（2026-10-15 需求确认后随 Theme Creator 功能实施）。

## Date

2026-10-15。

## Context

路线图要求让用户在 DSH 内创作自定义配色并产出可导入的 `dsh-theme.json`，同时不默认把创作指令注入每个会话。两条路线：

- **新增第五个 agent preset**：preset 条目（`@deepseek-ai/dsh-agent-preset`）不是 group，loader patch 的 `insert` 无法向官方 preset 行追加内容，只能 vendor 并整体覆盖其 `config`；preset 又在会话首 turn 后锁定，创作必须发生在新建会话里。
- **插件注册运行时 skill**：`ctx.skills` 是 scope 分层注册表，上游设计就是让 host 层插件把 skill 注册进 global layer 合并进各 preset 的 scope chain；skill 的 invocation policy 区分模型可见（catalog）与仅用户手势（`/name`）。

用户确认入口形态为 Themes 菜单 footer 的「创建自己的主题」动作，一键打开 Cordis preset 会话并在输入框预填 `/dsh-theme-creator `（不自动发送），能力不满足时降级为手动输入提示。`uiWorkspace.startSession(workspaceId?, options?)` 的两参签名自 DSH 0.2.1-alpha.1 才存在，而 skill 注册在全部受支持版本可用。

## Decision

1. Host 入口以 `ctx.inject(['skills'])` 接入官方技能注册表，注册名为 `dsh-theme-creator` 的虚拟 skill；注册与否完全由 Host accepted 设置快照的 `creatorAgentMode` 驱动：`off` 不注册，`gesture` 注册 `{ modelInvocable: false, userInvocable: true }`，`catalog` 注册 `{ modelInvocable: true, userInvocable: true }`。默认 `gesture`——模型目录零占用，用户经 `/dsh-theme-creator` 手势触发。
2. skill 正文随包打包：教模型在工作区写 `dsh-theme.json`、运行 `node lib/validate-theme.js <file>` 迭代到 `ok`、然后引导用户回到 Import 流程确认。不新增模型工具，不改写系统提示。
3. `lib/validate-theme.js` 作为第三个独立构建入口随包发布，复用 `theme-file.ts` 与 `contrast.ts` 纯函数，输出结构化 JSON 报告；退出码区分用法错误（2）、校验未过（1）与通过（0）。
4. 一键跳转按能力门控：Client 以 `ctx.get('uiWorkspace')` 读取可选服务，`startSession.length >= 2` 才提供 `startSession(undefined, { agentPreset: 'cordis', prompt: '/dsh-theme-creator ' })`；不满足时该动作弹出本地化提示，让用户自行在会话中输入 `/dsh-theme-creator`。预填是草稿，发送前用户可审阅补充。
5. `creatorAgentMode` 由插件管理页的分段控件写入：Client 向 `plugins.bundle.config`（key 为本包名，0.1.6-alpha.2 起存在）贡献控件，与 `activeThemeId`/`importedThemes` 共用 durable namespace 与写入队列；无该页的宿主保持已存储或默认档位。模型可见性变化（register/dispose）由 Host 快照 watch 驱动，skill catalog 的 mid-session 刷新由上游注册表负责。
6. `SegmentedControl` 自 0.1.7-alpha.1 才发布；0.1.5–0.1.6 宿主经 `src/compat/segmented-control.tsx` 结构探测回退到本地 tablist 实现，与 `menu-icons.tsx` 同一适配模式。

## Alternatives Considered

| 方案 | 取舍 |
| --- | --- |
| 新增第五个 agent preset（vendor 官方 composition） | 需要复制并整体覆盖官方 preset 配置，跨 12 个受支持版本维护 schema 漂移；创作脱离用户当前会话，看不到当前主题；未采用 |
| 默认注入创作指令到每个会话 | 违背「不默认注入」的明确要求；未采用 |
| skill 仅 gesture，不做 catalog 模式 | 拒绝模型自动路由的合法需求；`catalog` 保留为显式 opt-in |
| 一键动作无门控直接调用两参 startSession | 0.1.5–0.2.0 宿主签名只有一参，会静默失败；`Function.length` 探测是结构断言而非版本比较 |
| 校验器要求全部对比度检查通过才放行导入 | 违背 ADR-0006 的诊断定位：CLI 的 `ok:false` 不阻止用户在 UI 导入，与客户端行为一致 |

## Consequences

- `peerDependencies` 增加 `@deepseek-ai/dsh-skill` 与 `@deepseek-ai/dsh-client-ui-workspace`，两者进入 `OPTIONAL_CORE_PACKAGES` 与开发 pin；无对应服务时相关分支不启动，核心主题功能不受影响。
- skill 注册是 effects：fiber 释放即注销，模式翻转先 dispose 再 register，由测试覆盖。
- `creatorAgentMode` 是 durable 字段，默认 `gesture`；旧版本快照缺失该字段由 `creatorAgentModeOf` 规范化。
- 一键跳转不自动发送：用户必须审阅并回车，`/name` 手势才产生真实的 skill 注入。
- `import.meta.url` 在 host bundle（`lib/index.js`）中解析兄弟入口 `lib/validate-theme.js` 的绝对路径，skill 正文在注册时把该路径烘进校验命令。
