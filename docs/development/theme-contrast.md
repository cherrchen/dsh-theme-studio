# Theme contrast diagnostics

Stage 2 evaluates 48 semantic pairs in each scheme (96 per theme). The formulas use sRGB relative luminance with the 0.04045 transfer-function boundary and `(lighter + 0.05) / (darker + 0.05)`. Comparisons use full precision. A displayed rounded ratio is never used to decide a pass. Normal text uses 4.5:1 from [WCAG 2.2 SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html); focus indicators use 3:1 from [SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

## Coverage and interpretation

- Primary/secondary labels, links, and error/success/warning text on base, layer 1, layer 2, overlay, and sidebar surfaces: 30 pairs.
- Nine Shiki syntax colors on the code-block surface: 9 pairs.
- Toast, tooltip, primary/secondary menu text: 4 pairs. Tooltip foreground is the official static white token, which Theme Studio intentionally leaves unchanged. Translucent menu fill is evaluated over the base surface.
- Focus ring on the five principal surfaces: 5 pairs.

The default pairs represent expected semantic uses, not an inventory of the rendered DOM. A token used as normal text is tested at 4.5:1 even if another host happens to use it only as an icon. Decorative borders and disabled/dimmed labels are excluded. Derived caption/tertiary labels, inline-code surfaces, button copy, gradients, font size/weight, inherited host tokens, actual backdrop placement, and other plugins' layers are not covered. A passing report does not establish WCAG conformance for a theme or host.

Supported color inputs are 3/4/6/8-digit hex, numeric/percentage RGB(A), `black`, `white`, `transparent`, token names, `var()` references (including fallbacks), and nested `color-mix(in srgb, …)`. Mixing uses premultiplied alpha and CSS percentage normalization; foreground alpha is composited onto the evaluated background. A translucent background requires an explicit opaque backdrop. Missing/cyclic references, malformed or unsupported values, and unresolved backgrounds yield `unknown` with a reason; they never pass silently. The resolver does not read the DOM or rely on browser-only color parsing.

`validateThemeContrast(preset, pairs?)` accepts custom `ThemeContrastPair` rules, including 3:1 large-text checks when appropriate. Empty rule sets and thresholds outside 1–21 are rejected. Its immutable report contains `themeId`, `passed`, and every light/dark check (`id`, operands, `minimum`, `scheme`, `status`, `ratio`, and optional `reason`). `passed` requires every check to pass; unknown checks carry `ratio: null`.

## Builtin baseline

Measured 2026-10-02. There are 768 evaluated checks, 188 below their specified threshold, and no unknown results. The palettes keep their established colors. Claude Cream dark and OLED dark pass all default pairs; neither theme passes both schemes. This baseline documents existing failures rather than certifying or repairing them.

| Theme | Scheme | Passed | Below minimum | Unknown | Lowest ratio (rounded) |
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

To reproduce from a checkout:

```sh
pnpm contrast:report
pnpm contrast:report --strict  # currently exits 1 for the known failures
pnpm build:types
node scripts/report-contrast.mjs --json > contrast-report.json
```

Default report mode exits 1 for unknown results, but permits known low ratios. Strict mode exits 1 for either. JSON mode can be combined with `--strict`. Tests exercise independent luminance examples, threshold boundaries, alpha/mix behavior, invalid values, references, and complete evaluation of all builtin pairs. CI runs these tests; it does not treat the current palettes as contrast-certified.

## Public catalog contract

Stage 3 provides `ctx.themeStudio: ThemeStudioService` on the Client Cordis context. Consumer plugins import the package's `/client` declarations and inject `themeStudio`; their bundle metadata includes `@dsh-electron/dsh-theme-studio` in `dsh.client.inject`.

| API | Result |
| --- | --- |
| `catalog.list()` | Stable, deeply immutable `readonly BuiltinThemePreset[]`, in Settings card order |
| `catalog.get(id)` | Same preset object as in `list()`, or `undefined` |
| `catalog.validate(id)` | Immutable default contrast report, or `undefined` |

The catalog excludes Default and the official `light`/`dark`/`system` preferences. Reports and presets are JSON-safe data. The service shares the runtime's catalog; consumers cannot mutate its palettes. All methods are synchronous. Discovery is available before settings readiness and persists across settings-transport replacement. Cordis owns service disposal and restarts injected consumers after reload. A previously obtained readonly snapshot remains data after unload; consumers should use Cordis injection to follow the current provider. The API does not register/import themes or control Appearance, persistence, or presentation.
