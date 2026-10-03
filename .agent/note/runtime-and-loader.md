# Runtime、catalog 与 browser loader 维护知识

English: [runtime-and-loader.en.md](./runtime-and-loader.en.md)

## 范围

2026-10-02 整理。针对容易在重构中破坏且需要代码考古的所有权关系；完整 API 在 [runtime](../../docs/reference/theme-runtime.md)、[catalog](../../docs/reference/theme-catalog.md)、[包契约](../../docs/reference/settings-and-package-contract.md)，历史在 [repository-history](../../docs/reference/repository-history.md)。

## 不变量与历史陷阱

- **carrier 是 bare package name。** faa9b92 删除自定义 Plugins-page 贡献后，官方 manager 与 browser scan 从安装 metadata 建图。只挂 /client 或虚构 invariant 会丢失 graph。旧 lib/plugin-page declaration 可能是 stale build，不是应恢复源码的依据。
- **两层 disposer 有代次。** 同 source 替换由官方 overrideTokens restack；旧 disposer 不应删除新层。Default 预览暂时去掉 active，但持久 id仍保留，取消必须从catalog恢复原层。
- **settings child 与 catalog parent 不同寿命。** 509b88e 将 provider 放父 apply，runtime 使用同一冻结目录。transport停止可以卸载row/runtime，不能撤销discovery；父provider停止由Cordis管理consumer重启。
- **store不是第二authority。** Host accepted snapshot最终决定持久主题；revision投影只推进，不倒退。persistGeneration只防止本地旧settlement继续adoption，不替Host提供事务/写入串行保证。
- **公开目录没有动态写口。** list/get稳定引用与深冻结是契约。不能顺便加入register/import/activate，也不能把builtin metadata当public文件schema。
- **静态白色有角色。** neutral-00/bluish-00保留白色，deriveChrome负责bubble深底。不能为了dark主题将所有static neutral覆盖为主题ink。
- **诊断失败要如实保留。** strict对现有low contrast非零；unknown不算pass；full precision不能先round。报告不代表完整hostWCAG，不自动修改must-addpalette锁值。

## 检查入口

重构相关所有权前读 [ADR-0001](../../docs/decisions/ADR-0001-portable-token-overlays.md)、[ADR-0004](../../docs/decisions/ADR-0004-official-plugin-package-registration.md)、[ADR-0006](../../docs/decisions/ADR-0006-contrast-diagnostics-scope.md)、[ADR-0007](../../docs/decisions/ADR-0007-readonly-client-theme-catalog.md)。修改后覆盖preview/default/cancel、transport teardown/reprovide、provider/consumer unload/reload、deep freeze与actual browser exports。清理生成lib后pack，避免旧文件误入制品。

## 不可夸大的证据

实际ModuleLoader/officialThemeRuntime测试不等于完整浏览器截图；jsdom aria断言不等于全WCAG认证；目录可用不等于settings row已有transport；Apply立即徽标不等于set已落盘。当前rejected write没有专用错误UI，Mosaic固定light样本，不能用“生命周期恢复”文案掩盖这些限制。
