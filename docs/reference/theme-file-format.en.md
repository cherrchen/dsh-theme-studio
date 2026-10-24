# `dsh-theme.json` file format v1

## Status and Scope

Current, v1. This document is the single source of truth for the theme file format; the parser implementation lives in [theme-file.ts](../../src/client/theme-file.ts) and the packaged JSON Schema in [schemas/dsh-theme.schema.json](../../schemas/dsh-theme.schema.json). One file carries one theme.

## Example

```jsonc
{
  "$schema": "./dsh-theme.schema.json",
  "version": 1,
  "id": "user.ocean",
  "name": "Ocean",
  "description": "Cool blue palette.",
  "author": "optional",
  "palette": {
    "light": {
      "bgBase": "#f4f8fb", "bgLayer1": "#ffffff", "bgLayer2": "#eef3f7",
      "bgOverlay": "#ffffff", "borderL1": "#d7e0e8", "borderL2": "#c3d0da",
      "brand": "#2b6cb0", "labelPrimary": "#1b2a3a", "labelSecondary": "#51606f",
      "error": "#b3282d", "success": "#22793d", "warn": "#975a16",
      "sidebar": "#eef3f7"
    },
    "dark": {
      "bgBase": "#101820", "bgLayer1": "#1a2430", "bgLayer2": "#223040",
      "bgOverlay": "#101820", "borderL1": "#2c3c4e", "borderL2": "#3a4d63",
      "brand": "#63a4d8", "labelPrimary": "#e6edf3", "labelSecondary": "#9fb0bf",
      "error": "#f0838a", "success": "#6cc596", "warn": "#e0b56a",
      "sidebar": "#1a2430"
    }
  },
  "overrides": {
    "light": { "--shiki-token-keyword": "#9a2c9a" },
    "dark": { "--shiki-token-keyword": "#d8a0d8" }
  }
}
```

## Fields

| Field | Required | Rules |
| --- | --- | --- |
| `$schema` | no | Editor hint; non-string values are rejected (`invalid-metadata`), string values are not interpreted |
| `version` | no | Omitted means `1`; an explicit `null` or any other value is rejected (`unsupported-version`) |
| `id` | yes | `^[a-z0-9][a-z0-9.-]{0,63}$`; must not use the `dsh-theme-studio.` prefix; `default`/`light`/`dark`/`system` are reserved |
| `name` | yes | Non-empty string shown verbatim in the menu; not a localization object |
| `description` | no | String shown in the confirmation and management dialogs |
| `author` | no | String stored verbatim |
| `palette` | yes | `light` and `dark` each carry all 13 fields, no more, no fewer |
| `overrides` | no | Sparse token overrides for `light`/`dark`; both schemes must list the same keys |

The 13 `palette` fields are `bgBase`, `bgLayer1`, `bgLayer2`, `bgOverlay`, `borderL1`, `borderL2`, `brand`, `labelPrimary`, `labelSecondary`, `error`, `success`, `warn` and `sidebar`, matching the builtin [ChromePalette](./theme-tokens.md). `deriveChrome()` expands the palette into the full token surface; `overrides` apply on top of the derived result.

Unknown top-level fields are rejected (for example `preview` is refused — the four-color mosaic is resolved from the compiled token map, and a sample that cannot be resolved to a standalone color is recorded as a `null` placeholder). Nested objects likewise reject extra fields.

## Color syntax

Color values are limited to the subset the official resolver supports (source of truth: [contrast-colors.ts](../../src/client/contrast-colors.ts)):

- `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`;
- `rgb()`/`rgba()` in comma or space/slash form;
- `transparent`, `black`, `white`;
- `var(--token[, fallback])` — syntax-checked at parse time; a missing target is reported by contrast diagnostics;
- `color-mix(in srgb, …)`;
- a bare `--token` value is rejected — files must write `var()`.

## `overrides` rules

- Token names must start with `--dsw-`, `--shiki-` or `--dsh-`;
- variables owned by official font settings (`--dsh-font-family-*`, `--dsh-content-font-size`, `--dsh-code-font-size`, `--dsh-terminal-font-size`, `--dsw-font-family`, `--dsw-font-family-brand`) are rejected, the same list as [font-boundary.ts](../../src/client/font-boundary.ts);
- `overrides.light` and `overrides.dark` must contain the same key set.

## File and import constraints

- One theme per file; 128KB size cap; a parse or validation failure rejects the whole file — no partial import.
- Ids colliding with the builtin `dsh-theme-studio.` namespace cannot pass validation; an id already used by an imported theme opens a dialog choosing between overwrite and an automatic `id-N` rename. The base id is shortened as needed before adding the numeric suffix to keep the result within 64 characters, checking each candidate for collisions.
- Import and Manage are enabled only while settings are ready; confirmation, overwrite and keep-both actions follow the same rule so an unloaded catalog cannot replace the durable list.
- Stored source objects live in `theme-studio.importedThemes` (see [settings contract](./settings-and-package-contract.md)); the Host schema is deliberately loose while the Client parses strictly, and unreadable entries are skipped and counted in `droppedImports`.
- Downloads are named `<id>.dsh-theme.json`; imported themes round-trip their stored file verbatim, and builtin exports rewrite the id to `user.<short>` so the file can be imported back.

## Manual creation (current branch, unreleased)

The [manual editor](../decisions/ADR-0011-manual-theme-editor.md) still produces v1 palette+overrides: it copies the base palette, emits symmetric diffs inside the editable surface, and retains existing overrides outside it. There is no new format version or durable field. Saving only appends to the existing `importedThemes` list; an occupied id is never overwritten.

Before saving, the export serialization must be at most `THEME_FILE_MAX_LENGTH` (131072) in both UTF-16 code units and UTF-8 bytes. These cover the `parseThemeFile` character limit and file picker's `File.size` limit respectively; object-shape validation alone does not guarantee re-importability. Draft behavior and acceptance criteria live in the [requirements](../requirements/theme-studio.md).

## Command-line validator

`lib/validate-theme.js` ships with the package (a third build entry, listed in `files` but not in `exports`, consumed by file path) for the Theme Creator skill and manual checks:

```sh
node lib/validate-theme.js <theme.dsh-theme.json>
```

stdout carries a structured JSON report: `format.ok` marks whether the file passes the format validation above (failures carry `error.code` and `error.path`); a valid file also gets a `contrast` report (`passed`, `total`, `failed`, `unknown`, and per-check `issues`). Exit codes: `0` pass; `1` validation failed — including format rejection, read failure, or any `failed`/`unknown` contrast check; `2` usage error. The `ok` field aggregates every conclusion; `ok:false` does not mean "cannot import" — low contrast remains advisory in the client and never blocks import or apply (see [ADR-0006](../decisions/ADR-0006-contrast-diagnostics-scope.md)).

## Versioning

`version` is the file format version, not the plugin version. Only 1 exists; unknown higher versions are rejected instead of guessed at, so the file can be imported once the plugin is updated. A `$schema` string is transparent to the parser (the type is still checked against the published schema); when the format evolves, update this document, `schemas/dsh-theme.schema.json` and the consistency tests together.

## Validation

`tests/client/theme-file.spec.ts` covers positive/negative cases, the color subset, override rules, builtin round-trip export, and two-way JSON Schema agreement; `theme-import.spec.ts` covers duplicate-id decisions and persistence merging.
