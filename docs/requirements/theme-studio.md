# Theme Studio 开发需求

## Status

Current，2026-10-02 依据当前实现与提交历史追溯整理。本文记录已经实施的行为和明确延后的方向，不假定存在未提供的原始 PRD。

## Background

DSH 官方 Appearance 提供 Light、Dark、System 与主题呈现。用户需要在保留这一偏好与宿主生命周期的前提下浏览其他配色、临时预览、持久化选择，并让主题随官方明暗切换。插件必须从独立仓库安装，能够作为 Desktop runtime 的 subtree 镜像，也能在标准 DSH Web 中运行。

## Goals

1. 在设置 → 通用 → 主题提供默认与内置主题卡片，与官方外观行保持顺序和视觉层级。
2. 保持官方外观所有权，通过 token overlay 改变配色。
3. 将预览与持久选择分离，允许取消预览、应用预览和恢复默认。
4. 在 Host 设置就绪、插件重启、设置服务停止/重供时正确恢复 UI 与覆盖层。
5. 自动发现语义配对的对比度不足或无法计算，不用手工可读性判断代替报告。
6. 提供只读 Client catalog，让其他插件发现当前内置主题与校验报告。
7. 保持独立构建、公开声明、可打包发布与受测版本兼容契约。

## Non-goals

当前不提供公开主题文件 schema、导入导出、第三方主题注册、主题编辑器或 Theme Creator Agent。不新增模型工具、不改写系统提示、不替代官方 ThemePresenter。不为本包添加 Electron、preload、Desktop provider、Node 客户端能力或文件/网络授权。后续方向在[路线图](../plans/active/2026-10-02-theme-studio-roadmap.md)维护，未设定发布版本或交付日期。

## Functional Requirements

| 编号 | 当前要求 | 验收依据 |
| --- | --- | --- |
| F1 | Themes 行 `id=themes`、`order=20`；官方 Appearance 在前 | `apply.client.spec.ts` 的注册断言 |
| F2 | Default 使用 `null`，不是可注册的内置 id | runtime、catalog 和 UI 测试 |
| F3 | 浏览按内置目录顺序提供八个主题，文案中英切换 | presets、NAME_KEYS 与 locale 测试 |
| F4 | Preview 不调用 Host 写入，后续预览替换同一 preview source | runtime 预览测试 |
| F5 | Cancel 删除 preview；Default 预览取消时恢复原 active 层 | runtime.ts 状态迁移；单测/官方集成覆盖具体主题取消，Default 预览取消尚需专门回归场景 |
| F6 | Apply 与 Apply Preview 写入 `activeThemeId`；持久快照最终为准 | runtime 应用、回收敛测试 |
| F7 | 重启从 ready Host 快照恢复；未知持久 id 清理为默认并尝试修复设置 | runtime 恢复与未知 id 测试 |
| F8 | Light/Dark/System 仍由官方主题服务控制，overlay 提供完整明暗 token 对 | adapter 与官方 bundle 集成 |
| F9 | 卸载删除两层 overlay、监听器、UI 槽位与字典 | runtime 与 client apply 测试 |
| F10 | settingsScope / configForms 按真实能力选择；服务重供后可重新启动 | settings 双路径与 transport 切换测试 |
| F11 | Host 无 settings 时安全为空操作；headless 不启动 Client UI | Host 空服务测试与 manifest 分离 |
| F12 | `validateThemeContrast` 完整收集两种模式的 passed/failed/unknown | contrast 测试与实际报告 |
| F13 | unsupported/missing/cyclic 色值与未解析透明背景不能静默通过 | 色值 resolver 负例 |
| F14 | catalog `list/get/validate` 同步、只读，未知 id 返回 undefined | catalog 测试 |
| F15 | catalog 可在设置 ready 前发现，设置通道变更不撤销服务 | provider/consumer 生命周期测试 |
| F16 | 消费者随 Cordis provider 卸载停止、重供后重启 | 真实 Cordis 注入测试 |

## Non-functional Requirements

### 可移植性与包边界

`platform:web` 与 registry semver 依赖是硬约束。Host 主入口只负责设置；Client 编译为宿主 loader 可加载的浏览器 bundle。不能依赖外层 monorepo 的相对 tsconfig、`workspace:` 协议或 Desktop 的主题实现。验证参考[包契约](../reference/settings-and-package-contract.md)与 [ADR-0001](../decisions/ADR-0001-portable-token-overlays.md)。

### 状态一致性

Host accepted snapshot 是持久 authority；preview 不进入 durable settings。每个 source 只有一个逻辑 overlay。store 是 runtime 的投影，不能成为第二持久源。新 revision 必须大于旧 revision 才能同步。disposed runtime 拒绝后续写动作，并让未完成写入不再驱动本地恢复。

### 可读性与诚实诊断

默认规则覆盖普通文字、链接、状态文字、代码语法、toast/tooltip/menu 与焦点指示。普通文字阈值为 4.5:1，焦点指示为 3:1，比较不能先四舍五入。范围、色值语法、透明合成、基线与未覆盖项以[对比度参考](../reference/theme-contrast.md)为准。内置主题有失败配对；当前不能声称所有主题或完整宿主 UI 符合 WCAG。

### UI 与可访问性

预览/应用按钮提供带主题名的 aria-label，状态按钮提供 aria-pressed，预览消息通过 polite live region 告知；色块为装饰性 aria-hidden。主题行 CSS 消费宿主语义 token，色块样本使用预览颜色。当前 Mosaic 固定显示 light 样本，不能把 preview.dark 数据存在解释成 UI 已自动随 Appearance 切换样本。

### 兼容性与验证

支持范围只由精确清单决定，静态声明与安装树不能漂移。业务逻辑依赖稳定本地适配面，而非散布版本字符串判断。当前运行时不执行 Node 包探测；宿主 peer admission 与开发/CI 检查各有职责。测试证据与未覆盖范围见[矩阵](../development/dsh-compatibility.md)。

## Acceptance and Limits

Stage 1 的状态迁移、恢复与 settings 适配已由单测和官方 ThemeRuntime 发布 bundle 集成验证；Stage 2/3 由 commit `509b88e` 和 2026-10-02 全部十版矩阵验证。完整浏览器视觉、真实 Web profile 的本次磁盘持久化旅程、跨平台本机呈现与完整 WCAG 审核未完成。历史提交记录中的真实 profile 验证属于当时的证据，不自动覆盖当前未发布改动。

异步 settings 写入的 rejected Promise 没有专门用户错误 UI；同步 accepted snapshot 的回收敛不等于异常写入已具备事务回滚。这个限制应在后续需求评审中处理，不能由文档宣称已修复。
