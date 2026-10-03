# 对比度算法、范围与结果

English: [theme-contrast.en.md](./theme-contrast.en.md)

## Status

Current，Stage 2，实现于 `509b88e`。规则真源是 [contrast.ts](../../src/client/contrast.ts)，sRGB 解析与计算真源是 [contrast-colors.ts](../../src/client/contrast-colors.ts)。本参考保存完整默认范围与有日期的测量结果，不认证实际宿主 UI。

## 默认规则目录

每种模式 48 个配对，每主题两种模式共 96 项。

| 组 | 前景 | 背景 | 数量 | 最低阈值 |
| --- | --- | --- | ---: | ---: |
| 普通文字与语义色 | label-primary、label-secondary、link、state-error-primary、state-success-primary、state-warn-primary | bg-base、bg-layer-1、bg-layer-2、bg-overlay、specific-sidebar-fill | 30 | 4.5:1 |
| 代码语法 | Shiki comment、punctuation、string、string-expression、keyword、constant、function、link、parameter | markdown-code-block | 9 | 4.5:1 |
| Toast | toast-label | toast-bg | 1 | 4.5:1 |
| Tooltip | 静态白色 #ffffff | tooltip-bg | 1 | 4.5:1 |
| 菜单文字 | label-primary、label-secondary | dsw-menu-surface-fill，透明部分叠在 bg-base | 2 | 4.5:1 |
| 焦点指示 | dsw-focus-ring-color | 上述五个 principal surface | 5 | 3:1 |

alias 名自动加 `--dsw-alias-`，specific 名使用 `--dsw-specific-`；Shiki 使用 `--shiki-token-`。check id 可定位角色与表面，例如 `link/bg-base`、`code/keyword`、`focus/specific-sidebar-fill`。tooltip 的静态白色是宿主已知语义，不代表任意缺失 token 都可用白色兜底。

默认配对是期望的语义用途，不是 DOM 使用清单。可能只用于图标的状态色，当前按普通文字保守测试；host 是否实际使用这个配对必须另查。装饰边框、disabled/dimmed 文字不属于规则。caption/tertiary 文字、inline code 背景、按钮文字、渐变、字体大小/粗细、继承宿主 token、真实菜单底色、其他插件覆盖层均未全部覆盖。通过报告只表明被检查配对通过。

## sRGB 计算

RGB 先归一化到 0–1。每通道 `v <= 0.04045` 时 `linear=v/12.92`，否则 `linear=((v+0.055)/1.055)^2.4`。亮度为 `0.2126*R + 0.7152*G + 0.0722*B`；对比度为 `(lighter+0.05)/(darker+0.05)`。最低为 1:1、黑白为 21:1。

普通文字的 4.5:1 依据 [WCAG 2.2 SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)，焦点指示的 3:1 依据 [SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)。比较使用原始浮点比值，不能先格式化：`#777777` 对白色约 4.478089，即使显示为 4.5 仍失败；`#767676` 对白色约 4.542225 才通过普通文字阈值。

## 色值与透明合成

| 输入 | 支持范围 |
| --- | --- |
| Hex | 3/4/6/8 位，含 alpha |
| RGB(A) | 数字或百分比；旧逗号写法与现代空格/斜线写法，合法通道范围 |
| Named | black、white、transparent |
| Token | 精确 token 名、var() 与缺失引用 fallback |
| Mixing | 嵌套 `color-mix(in srgb, …)`，两色、可省略权重与权重归一化 |

混色使用预乘 alpha；权重和小于 100% 时保留额外透明度，超过 100% 时归一化。前景透明度合成到被测背景后计算亮度。透明背景必须提供显式 opaque backdrop，不能假定白色或当前浏览器 canvas。引用检测环并限制嵌套深度，未声明 token 不通过继承宿主样式自动补齐。

缺失/循环引用、畸形或不支持的语法、无法确定透明背景最终颜色都会产生 unknown 与 reason。resolver 不读取 DOM、不调用 computed style、不依赖浏览器 CSS 解析。HSL、OKLab、其他 named colors、currentColor、渐变及更广 CSS 语法目前不支持；这类输入应扩展解析器和独立例子，而不是让 unknown 自动通过。

## API 契约

`contrastRatio(foreground, background, backdrop?, tokens?)` 返回未经四舍五入的 number；无法计算时抛错。操作数可以是支持色值或 token 名，tokens 可提供引用表。

`validateThemeContrast(preset, pairs=DEFAULT_CONTRAST_PAIRS)` 返回冻结 ThemeContrastReport。每条 ThemeContrastPair 包含 id、foreground、background、minimum 和可选 backdrop。支持自定义 3:1 大字配对；调用方必须确实知道字体语义。空规则集和非有限/超出 1–21 的阈值直接拒绝。

| 字段 | 语义 |
| --- | --- |
| report.themeId | 被测主题 id |
| report.passed | 两种模式每项均 passed 才为 true |
| report.checks | 冻结数组，先 light 后 dark，模式内规则顺序保持 |
| check.id / operands / minimum | 请求规则的只读复制 |
| check.scheme | light 或 dark |
| check.status | passed、failed 或 unknown |
| check.ratio | 全精度值；unknown 为 null |
| check.reason | 无法计算时的解释 |

unknown 不计入 pass，但不会阻止后续 check 继续计算。报告的生成不修改 preset、不阻止预览应用。`catalog.validate(id)` 使用默认配对，对未知 id 返回 undefined，详细语义见 [catalog](./theme-catalog.md)。

## 内置测量基线

测量于 2026-10-02。8 个主题、16 个模式共 768 项：580 passed、188 failed、0 unknown。Claude Cream dark 与 OLED dark 在默认配对范围内全部通过；没有一个内置主题的两种模式都全部通过。此表记录现有不足，配色保持原值。

| 主题 | 模式 | Passed | Failed | Unknown | 最低比值（显示值） |
| --- | --- | ---: | ---: | ---: | ---: |
| Claude | light | 30 | 18 | 0 | 2.687 |
| Claude | dark | 27 | 21 | 0 | 3.411 |
| Codex | light | 33 | 15 | 0 | 2.791 |
| Codex | dark | 44 | 4 | 0 | 3.886 |
| Claude Cream | light | 40 | 8 | 0 | 3.134 |
| Claude Cream | dark | 48 | 0 | 0 | 5.271 |
| Graphite | light | 34 | 14 | 0 | 4.098 |
| Graphite | dark | 42 | 6 | 0 | 3.950 |
| OLED | light | 32 | 16 | 0 | 2.951 |
| OLED | dark | 48 | 0 | 0 | 6.247 |
| Nordic | light | 20 | 28 | 0 | 1.509 |
| Nordic | dark | 33 | 15 | 0 | 1.803 |
| Paper | light | 31 | 17 | 0 | 3.561 |
| Paper | dark | 47 | 1 | 0 | 4.468 |
| Warm | light | 24 | 24 | 0 | 2.402 |
| Warm | dark | 47 | 1 | 0 | 4.367 |

表中最低值对应不同 minimum，不能用全表单一最低值推断 passed；例如 Claude Cream light 最低 focus 比值超过 3，但部分普通文字仍低于 4.5。

## 命令与退出码

```sh
pnpm contrast:report
pnpm contrast:report --strict
pnpm build:types
node scripts/report-contrast.mjs --json > contrast-report.json
node scripts/report-contrast.mjs --json --strict > contrast-report-strict.json
```

pnpm script 先编译纯模块，输出包含编译日志。需要机器读取 JSON 时，在编译后直接执行 node script；不要把整个 pnpm stdout 当 JSON。

默认模式遇到 unknown 退出 1，低于阈值但可计算的报告仍退出 0；strict 对 failed 或 unknown 均退出 1。当前 strict 返回 1 是已知配色结果，不是测试基础设施坏了。不认识的 CLI option 抛错。JSON 与 strict 可组合，仍输出完整结果再根据状态返回退出码。

## 验证与维护

contrast tests 使用独立黑白/灰度例子、线性亮度边界、未舍入阈值、前景/背景 alpha、预乘 mix、权重归一化、嵌套、畸形值、缺失/循环引用与全内置 no-unknown 检查。CI 运行这些测试，未将现有内置主题全部通过作为门禁。

改变 palette、规则或公式时重跑报告，说明变化来自配色还是范围，更新中英文基线；不能把曾有 0 unknown 的表永久当作新版本证据。校验作为诊断的决策见 [ADR-0006](../decisions/ADR-0006-contrast-diagnostics-scope.md)。
