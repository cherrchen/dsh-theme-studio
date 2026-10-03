# 文档维护工作流

## 体系与来源

本仓库于 2026-10-02 按 `dsh-plugin-multi-root-workspace` 的文档组织方式补齐：七类 docs 目录、README 导航、中文主文档/英文入口、ADR 与 plan lifecycle、Agent 长期知识、模板及结构检查。参考项目的业务约束不属于本包：没有复制 fs/sandbox replacement、authority lease、koffi、模型指令或 kernel runner 要求。

规范真源为 [Documentation Skill](../../.agent/skills/documentation/SKILL.md)。本文件解释如何在 Theme Studio 应用规范，不建立另一份彼此冲突的规则。

## 修改前

读根 AGENTS.md 与[文档地图](../README.md)，检查工作树，确认当前事实来自代码、历史提交还是计划。找到信息所属文档再修改；requirements 说明要实现/验收什么，architecture 说明组件如何协作，reference 说明可消费契约，ADR 保存为何选择，plan 保存实施与验证过程，changelog 只归档版本用户变更。

## 双语与旧入口

所有 README 使用 `README.md` 中文主版本、`README.en.md` 英文对应；每对互相链接，维护同一信息结构。Agent 正式 note 同样成对。其他类型不机械创建空英文文件；对比度参考保留完整英文版本，因为已有英语报告文档与消费需求。

根旧 `README.zh.md` 仅作为兼容导航，正文全部迁入 README.md，不能再独立更新一份中文事实。package files 已加入 README.en.md。compat checker 同步改为中文 README.md 与英文 README.en.md 的版本节；不是撤销 README一致性门禁。

根 `README.i18n.yaml` 记录最后同步的 git blob hash：

```sh
git hash-object README.md README.en.md README.zh.md
```

两语言完成 semantic review 后才更新各键；不能用重记hash代替翻译一致。root两版的代码块保持相同命令与示例，语言说明写在块外。目录 README 通过 paired navigation 检查，结构检查不能判断翻译自然度。

## 历史追溯

所有 ADR 与 completed 计划明确注明 2026-10-02 追溯整理、原始实现日期和 commit。不能伪称原始开发前有这些计划、原始提交运行 docs:check，或将已经删掉的 plugin-page 当现行功能。

`git log --all` 保留合并与分支提交；CHANGELOG 维护每个发布 tag 的最终用户行为。历史真实 profile验证若只见 commit message，要标明来源；最新 matrixJSON 是本次范围的自动化证据，不能反向覆盖历史。

## ADR 与计划维护

使用 [.agent/templates/adr.md](../../.agent/templates/adr.md)、[design.md](../../.agent/templates/design.md)、[plan.md](../../.agent/templates/plan.md)。ADR 编号唯一；有多个合理选择且长期影响时才记录，不为每个 helper 都造决策。旧选择被取代要写替代关系，不覆盖历史。

长期路线图维护 progress/release state，完成的具体批次在 plans/completed。后续 schema/import/export/Creator 仍未实施，不因为文档补齐移成 completed。具体任务完成后从 active 移到 completed，更新 plansREADME入链，不能两边保留同名计划。

## 检查范围

```sh
pnpm docs:check
git diff --check
```

checker 检查 README/Agent note 配对、语言导航、英文后缀、普通本地 Markdown 链接存在、正文意外开发者绝对路径、Agent临时文件名、active/completed重名、ADR命名/编号与空文档。它忽略 .git/node_modules/lib 等生成树，不能因为遗留生成声明给项目文档配对误报。

checker 不访问远端链接、不判定所有 heading fragments、翻译质量或计划真实完成；需要人工核对这些内容。新增代码/脚本改变了检查路径后还运行 compat/type/test/build/pack相关gate，不把文档结构成功解释为发布制品成功。

Theme Studio 另检查 root README 的已审阅 blob hash 与两版 fenced code 示例一致。`.cursor/.codex/.agents` 是本机工具状态，不作为可发布文档扫描；其中原始计划若有长期价值，将核实后的背景保存进正式 completed 记录，而不复制绝对机器路径或未更新的 pending 状态。

## 完成清单

1. 内容来自当前代码/历史/规划的来源清晰，每项事实有所属真源。
2. 旧地址迁移保留入口或更新所有入链，目录 README 导航完整。
3. README/Agent note与已有需要英文的文档语义同步，rootpairhash重记。
4. Current/Planned/Completed/Superseded与已tag/Unreleased明确。
5. 验证日期、环境、pass/skip/failure、未执行范围如实记录。
6. docs:check、diff检查及受影响的工程gate通过；已知contrast strict非零有解释。
7. 文档在本仓库提交，参考仓库只读；不顺便发布tag/npm/网站。
