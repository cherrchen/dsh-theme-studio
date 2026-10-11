# ADR-0003: 精确 DSH 兼容契约与无生产探测

## Status

Accepted（当前源码所体现的选择；2026-10-02 追溯整理，不冒充原始提交中的 ADR）。

## Date

整理：2026-10-02。实现依据：f34ab5b / fba048e / bbb0ada（2026-09-25）、d709754、a42316f。

## Context

早期分支仅将 peer/dev pin 升级到一个 DSH 版本；随后正式支持多个 settings 世代，宽 0.1.x 范围不能证明未来兼容。DSH 从 rc 版本开始会在 profile admission 检查 peers。另一个 DSH 插件的安全门禁方案需要 Node 包探测，但 Theme Studio 不扩大文件/命令/网络授权，将这种探测放到 portable 主入口既不必要也破坏边界。

## Decision

1. src/compat/dsh-version.ts 是精确支持清单的唯一真源。
2. 所有 DSH peer 范围等于清单的 || 表达式；单一 development pin 固定最新受支持基线。
3. compat:check 对齐 peers、pin、overrides、age exclusions、lockfile、实际解析树与中英文 README。
4. classifyInstallation 是注入 VersionReader 的纯分类；生产入口不解析 Node 包版本、不建立授权门禁。
5. 宿主 peer admission 管加载，开发/CI checker 管仓库一致性，两者不能混为一谈。
6. 修改兼容 seam 后在独立安装树复验全部清单版本，候选包及 vendor 统一；证据不能自动扩大支持列表。

## Alternatives Considered

| 方案 | 取舍 |
| --- | --- |
| 使用 ^0.1 或 >= 当前版本 | 会承诺未经测试的未来版本 |
| 仅检查顶层 package.json | 间接 peers 仍可能混装 |
| 生产入口 createRequire 探测 | 与 portable 契约冲突，本包无需授权门禁 |
| 将旧最小版本保持为永久开发 pin | 已被 0.2 最新受支持基线取代，旧文档需修正 |
| 精确清单与孤立矩阵 | 声明、安装树和证据可比；被采用 |

## Consequences

清单维护成本高，需要每版重新安装并跑 gate。0.1.7-alpha.1 的 caret peers 可能漂移，矩阵要统一间接版本。历史早期 alpha/rc 分支不是当前清单成员；清单外的测试分类 unsupported 不表示插件在生产主动自禁。

## Validation

compat.spec、compat:check 与全部十个版本的 matrix results；静态清单不复制为新的独立版本表。

## Amendment（2026-10-10）

原决定保持有效：支持清单仍是唯一承诺，生产入口仍不探测 Node 包版本，也不建立授权门禁。工具层改为：

1. Cordis、Schemastery 和配套运行时的精确版本从被测 DSH 发布包的依赖声明解析。一个包名若不能确定唯一满足全部声明的版本，探测失败，不猜测。
2. `pnpm-lock.yaml` 按 YAML 文档解析。DSH、Cordis 或 Schemastery 出现多个版本即视为混装。
3. `scripts/run-dsh-matrix.mjs` 复制 checkout 后再改 pin。`--candidate` 只在副本里放宽 peer admission，不把候选写入 `SUPPORTED_DSH_RELEASES`。
4. CI 在运行时读取清单。Release 复用该 workflow，并发布已经验证过的 tarball。稳定版使用 `latest`，rc 使用 `next`，alpha 使用 `alpha`，beta 使用 `beta`。
5. 发布只使用 npm OIDC，不保留长期 token 回退。npm trusted publisher 的外部配置仍需维护者核实；缺失时发布应失败。

## Related Documents

[实现真源](../../scripts/check-dsh-compat.mjs)、[相关详细文档](../development/dsh-compatibility.md)、[完整历史](../reference/repository-history.md)、[架构](../architecture/theme-studio.md)。
