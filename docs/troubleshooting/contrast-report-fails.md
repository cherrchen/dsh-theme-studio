# 对比度严格模式失败、配对 unknown 或 JSON 无法读取

## Status

2026-10-02，根据当前实现与已记录历史修复整理。诊断步骤是复现指南，不暗示本轮已经在完整宿主中执行。

## Symptoms

pnpm contrast:report --strict 非零；一些比值显示为 4.5 仍 failed；透明色/var 配对 unknown；把 pnpm stdout 喂给 JSON parser 后报错。

## Root Cause

strict 对实际低于 minimum 返回 1，是当前 builtin 的预期。显示值经过格式化，决策使用完整比值。unknown 表示不支持色值、missing/cyclic token、畸形输入或透明背景没有 opaque backdrop，不等于低对比度。pnpm report 先编译，stdout 除报告还有 build 日志。

## Diagnosis

```sh
pnpm contrast:report
pnpm contrast:report --strict
pnpm build:types
node scripts/report-contrast.mjs --json > contrast-report.json
```

按 scheme/id 查看 ratio/minimum/status/reason，确认规则 operands 与真实 surface。known builtin baseline 在 canonical reference，别在排查页复制另一份数表。

## Verified Solution

JSON 消费直接运行 node script；known failed需决定具体 palette/角色是否应该调整，不能为了全绿改成跳过。unknown 需修正 token/backdrop 或扩展受支持解析器及独立数值测试；currentColor/gradient/HSL/OKLab目前没有自动浏览器 fallback。不要将缺失 token 统一换白色，不要对四舍五入值判断。

## Validation

contrast.spec 检查#777/#767676 threshold、black-white、alpha/mix、invalid/cycles与全builtin无unknown。修改 palette/规则后重算基线，同时更新中英文文档，清楚说明不代表完整 WCAG audit。

## History and Related Documents

历史依据：509b88e；策略见 ADR-0006。 [详细契约](../reference/theme-contrast.md)、[完整提交历史](../reference/repository-history.md)、[开发工作流](../development/plugin-development-workflow.md)。
