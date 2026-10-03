# DSH 兼容契约维护知识

English: [dsh-compat-contract.en.md](./dsh-compat-contract.en.md)

## 范围与来源

2026-10-02 根据提交 f34ab5b、fba048e、bbb0ada、d709754、a42316f 与当前源码整理。此 note 保存容易误套其他 DSH 插件经验的边界；完整版本证据由[兼容矩阵](../../docs/development/dsh-compatibility.md)维护，唯一清单在 src/compat/dsh-version.ts。

## 最容易回归的陷阱

1. **纯分类不等于生产门禁。** classifyInstallation 接受 VersionReader，测试和开发脚本可检查混装；主 Host 不读取 Node package metadata。本包不扩大授权范围，不需要 multi-root 的安全 provider 门禁。bbb0ada 曾明确删除入口 Node probe，不能因兼容检查便利重新加入。
2. **register 的 scope 不是 disposer。** legacy settings provider 返回 namespace 普通对象；return 它会被 Cordis 作为 Invalid effect 拒绝并回滚 registration。provider 自己管理 fiber，适配层必须消费调用但返回 undefined。这是 d709754 真实持久化修复，不是只为 stub 测试的风格选择。
3. **两个 transport callback 的函数身份要独立。** Cordis 把 identity 当 runtime key；仅读实际注入 service，不在 proxy 上探测另一名字。start guard 只由真正拥有启动的 child teardown 释放。
4. **caret peers 会混装。** 历史 0.1.7-alpha.1 的直接 pin 不能锁全部间接 DSH；matrix 会检查 lockfile 并追加 overrides。某一安装版本绿灯前必须实际解析一致。
5. **最新 pin 已是当前约定。** ab0d19c 把开发树改到最新支持基线，旧 release docs 的最老 pin 恢复步骤过时。保留用户 manifest/lockfile，不用 git checkout 覆盖未提交工作。
6. **真实 provider 用例有合法 skip。** 新 Config API 安装缺 legacy register，旧 provider regression 显式 skip；由 configure 契约/客户端测试覆盖，不代表持久化完全未测。仍不能把内存 test 当真实 profile 磁盘旅程。

## 修改时的操作

先读[settings 包契约](../../docs/reference/settings-and-package-contract.md)、[ADR-0002](../../docs/decisions/ADR-0002-settings-adapters-and-effect-ownership.md)、[ADR-0003](../../docs/decisions/ADR-0003-exact-dsh-compatibility-contract.md)。按[开发流程](../../docs/development/plugin-development-workflow.md#dsh-兼容提升)统一候选与 vendor，保留旧 capability 分支，修改 seam 后复验全部精确支持版本。

记录是本机运行、历史 commit message 还是 CI 配置。远端矩阵定义没有执行证明不能写“各 OS 已验证”；生产运行时没有主动分类也不能写“unsupported 安装会由本包 fail-closed”。
