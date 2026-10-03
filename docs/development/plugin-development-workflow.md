# 插件开发工作流

## 环境与仓库边界

本仓库独立构建和发布，被 Desktop subtree 镜像但不依赖外层 repo。Node.js engines 为 `^22.19.0 || >=24`，packageManager 为 pnpm@11.7.0。当前开发依赖 DSH 精确 pin、Cordis 和 Schemastery 版本以 package.json、workspace overrides 和 lockfile 为准；`pnpm compat:check` 验证真实解析树。

新 checkout 先读根 AGENTS.md、docs/README.md 和相关 reference/ADR，检查工作树。不得覆盖用户未提交的 manifest/lockfile，不从其他 DSH 插件复制 Electron、koffi、kernel sandbox、provider replacement 或运行时 Node probe。

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm docs:check
pnpm compat:check
```

install 可能运行 prepare/build；pnpm 的生命周期许可、release-age 和 peer 自动解析会影响安装，按实际日志解决。不要用 `--ignore-scripts` 的成功来代替已经有可用 artifact；矩阵的 ignore-scripts 安装后明确运行 build。

## 代码布局与修改入口

| 工作 | 入口 | 必须同步 |
| --- | --- | --- |
| 增加 builtin | presets.ts、ChromePalette | locale、NAME_KEYS、token/contrast 参考与测试 |
| 增加派生 token | deriveChrome | 角色、解析支持、全部明暗名称、上游消费者审查 |
| 改 state 行为 | runtime.ts | snapshot/store/UI 与 runtime/reference 用例 |
| 改 public catalog | types/catalog/index | declarations、consumer lifecycle、ADR/API 文档 |
| 改 settings | compat/settings-host/client | 新旧 provider、transport 重供/切换 |
| 改兼容支持 | dsh-version.ts 与声明 | 统一安装树、README、矩阵及 evidence |
| 改构建发布 | standalone config/scripts/workflows | package exports/files、release docs、实际 tarball |
| 改文档 | 所属 canonical 文档 | README 语言配对、入链出链、docs:check |

## 构建模型

build:types 运行 host/client tsc，生成 `lib/types/` 下声明与中间 JS。build 再从中间 JS 用 standalone tsdown 输出 Host ESM `lib/index.js` 与 browser loader `lib/client.js`。Client CJS wrapper 由宿主 ModuleLoader 管理，不能用 Node import 当普通 ESM。

CSS Module helper 使用 lightningcss，编译 class mapping 并注入幂等 style 标签。runtime overlay 清理与 stylesheet cache 是不同生命周期。production packages 保持 external，store 相关实现可由 bundle 包含；实际列表看 build 输出。`pnpm bundle` 经 tsdown.config 可以通过 DSH_BUILD_FACE 选择 host/client；独立 build 生成两半。

build 的 clean=false，不删除旧声明。发布验证前仅清理**可再生成的 lib 目录**，不要删除源码或用户产物：

```sh
rm -rf lib
pnpm build
pnpm pack --dry-run
```

如果 lib 包含手工文件，先保留再清理；仓库约定它是生成目录。旧 plugin-page/invariant declarations 残留不是功能仍存在的证明。

## 日常验证 gate

```sh
pnpm docs:check
pnpm compat:check
pnpm typecheck
pnpm test
pnpm build
pnpm pack --dry-run
```

没有 lint script、kernel probe 或模型 smoke script；不能照搬 multi-root workspace 的 `verify:all`/`kernel:probe` 命令。文档重构增加 docs checker，相关逻辑入口已纳入 CI 和 release verify。

| 覆盖层 | 实际机制 | 边界 |
| --- | --- | --- |
| 纯规则 | adapter/presets/contrast/catalog specs | 不渲染全量 host DOM |
| state | runtime.spec | 内存 settings 与 override surface 替身 |
| UI | ThemeStudioRow.spec，jsdom/Testing Library | 动作、aria/live status；非视觉截图 |
| 组装 | apply.client.spec，真实 Cordis | provider/consumer、slots/locale 替身、settings 重供 |
| Host | settings.spec、settings-provider.spec | legacy installed provider 用例仅在具 register 时运行 |
| 官方主题 | integration/theme-runtime.spec | 实际已安装发布 bundle，未使用 UI primitives 被 stub |
| compatibility | 静态 checker 与孤立安装 matrix | type/build/test/pack，不是每个平台完整 UI e2e |

2026-10-02 Stage 2/3 基线 81 tests passed，1 legacy provider skip（新 Config 安装）。source map ENOENT warning 来自上游发布包缺 map，不影响测试退出码；若测试实际失败仍需处理。不要固定未来测试数量作为通过规则。

## 报告与验证

```sh
pnpm contrast:report
pnpm contrast:report --strict
pnpm build:types
node scripts/report-contrast.mjs --json > contrast-report.json
```

默认结果能计算时退出 0，strict 会对当前已知低值退出 1；不能把 strict 与 test 的成功门禁混淆。算法、支持语法与完整基线在[contrast reference](../reference/theme-contrast.md)维护。改变配色或规则后重新计算并更新两语言基线。

## DSH 兼容提升

1. 记录候选精确版本、对应 vendor、当前安装树和未提交修改，先审查公开 seams。
2. 用 registry 依赖建立统一候选树，核对实际解析直接和间接 DSH 包；caret peers 漂移必须修正，不能通过跳过检查来掩盖混装。
3. 新旧差异只放 compat/，保持同步返回、this、effect 所有权与公开入口。可移植主入口不得增加 Node 探测。
4. 对候选运行相关 type/test/build/pack 与真实组合路径；候选不在声明前可在隔离副本审查与验证，不提前扩大正式支持。
5. 正式提升时同步唯一清单、peers、最新 dev pin、overrides、age exceptions、lockfile、README、CHANGELOG，并让 compat:check 驱动一致性。
6. 在全部既有版本的孤立树重跑矩阵；旧版失败必须处理或明确调整支持承诺，不悄悄跳过。
7. 当前 checkout 保持最新受支持开发基线，更新 matrix evidence 与范围。不得执行旧 workflow 的最老 pin 恢复步骤。

```sh
pnpm compat:matrix
node scripts/run-dsh-matrix.mjs 0.1.7-rc.2 0.2.0-rc.1 0.2.0-rc.2
```

脚本只接受清单版本。每版复制源码到临时目录，重建无 lockfile 的独立依赖树、匹配 vendor、统一漂移的间接 peers，依次 install/compat/type/test/build/pack。成功清理大安装树，命令 log 和 results.json 留存；失败保留树用于诊断。脚本不切换本地 pin。[兼容文档](./dsh-compatibility.md)保存已执行日期与平台，不把 CI 定义当实际执行。

## 本地 profile 检查

构建后使用受支持 runtime 安装本地路径或实际 tarball，检查 dump-config 存在 bare carrier、Web Themes row 与官方 Appearance。选择主题、preview/cancel/apply，改变 Light/Dark/System，重启确认 durable 选择，禁用/重载确认 overlays/UI 清理和 catalog consumers 重启。

```sh
dsh plugin --profile web add .
dsh --profile web --dump-config
dsh --profile web
```

这是维护者复现步骤，不声称本轮已经执行这一完整旅程。headless 不期望 browser row；Desktop/不同 OS 的实际呈现需另记证据。故障入口见[排查目录](../troubleshooting/README.md)。

## 提交与发布

提交前运行相关 gate、semantic review、git diff --check，说明何种实现/文档 changed、证据与未覆盖项。不要因 docs 改动重写未发布的业务需求。schema/动态 catalog 等新范围先评审，不借现有 discover service 顺便增加写方法。

发布使用[release workflow](./release-workflow.md)，双语 CHANGELOG 描述版本用户变更，路线图维护 release state；不能只改 version 数字或把 commit 成功当 npm 发布成功。
