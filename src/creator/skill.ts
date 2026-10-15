/**
 * Theme Creator skill body. The registration lives in `register.ts`; this
 * module only shapes the model-facing text so it stays reviewable and testable
 * without a Cordis context.
 */

/** Catalog routing line; also what a user sees behind `/dsh-theme-creator`. */
export const THEME_CREATOR_SKILL_DESCRIPTION =
  'Design a custom color theme and deliver it as a dsh-theme.json file the user can import from Settings → General → Themes.'

/** Extra routing hint for catalogs that show `whenToUse`. */
export const THEME_CREATOR_SKILL_WHEN_TO_USE =
  'Use when the user wants to create, design, or customize a color theme or palette for this application.'

/**
 * Build the skill body with the packaged validator command baked in.
 * @param validatorCommand - the command that validates one theme file,
 * already quoted for shell use (e.g. `node "/abs/path/lib/validate-theme.js"`).
 * @returns the full skill content.
 */
export function creatorSkillContent(validatorCommand: string): string {
  return `# DSH Theme Creator

Design a custom color theme for this application and deliver it as a \`dsh-theme.json\` file that the user imports themselves.

## Workflow

1. Ask what the user wants: the overall mood, a reference product or favorite color, and whether the light or dark scheme matters more. One or two questions are enough.
2. Write the theme file into the workspace as \`<id>.dsh-theme.json\` (format below).
3. Validate it by running \`${validatorCommand} <file>\` in the workspace shell. It prints a JSON report; iterate until \`ok\` is true.
4. Hand off: tell the user to open Settings → General → Themes → Import theme…, choose the file, preview it, and confirm. The settings UI re-validates the file, so nothing applies before the user accepts it.

## File format (version 1)

\`\`\`json
{
  "version": 1,
  "id": "user.dusk",
  "name": "Dusk",
  "description": "optional",
  "author": "optional",
  "palette": {
    "light": { "…": "13 fields" },
    "dark": { "…": "13 fields" }
  },
  "overrides": {
    "light": { "--token": "#aabbcc" },
    "dark": { "--token": "#aabbcc" }
  }
}
\`\`\`

- \`id\`: matches \`^[a-z0-9][a-z0-9.-]{0,63}$\`; must not be \`default\`, \`light\`, \`dark\`, or \`system\`, and must not start with \`dsh-theme-studio.\`. Prefer a \`user.\` prefix.
- \`palette.light\` and \`palette.dark\` each require all 13 fields:

| field | role |
| --- | --- |
| bgBase | deepest background |
| bgLayer1 | raised surface such as cards and panels |
| bgLayer2 | further raised surface |
| bgOverlay | floating surface; may be translucent |
| borderL1 | subtlest border |
| borderL2 | stronger border |
| brand | primary accent |
| labelPrimary | primary text |
| labelSecondary | secondary text |
| error | error state |
| success | success state |
| warn | warning state |
| sidebar | sidebar fill |

- Color values: \`#rgb\`, \`#rgba\`, \`#rrggbb\`, \`#rrggbbaa\`, \`rgb()\`/\`rgba()\`, \`transparent\`, \`black\`, \`white\`, \`color-mix(in srgb, …)\`, or \`var(--token, fallback)\`. Prefer \`#rrggbb\` hex so every check resolves exactly.
- \`overrides\` is optional: sparse \`--dsw-*\`, \`--shiki-*\`, or \`--dsh-*\` values layered over the tokens derived from the palette. A token name must appear in both \`overrides.light\` and \`overrides.dark\`. Never override the font tokens (\`--dsh-font-family-*\`, \`--dsh-content-font-size\`, \`--dsh-code-font-size\`, \`--dsh-terminal-font-size\`, \`--ds-font-family-code\`, \`--dsw-font-family\`, \`--dsw-font-family-brand\`); they belong to the user's font settings.
- Unknown top-level fields are rejected; add nothing outside the documented keys.

## Contrast expectations

The validator expands the palette into the full token set and checks every text/background pair it knows: primary and secondary text on all surfaces (backgrounds, overlays, sidebar, menus) at 4.5 or better, code syntax colors on the code-block surface at 4.5 or better, toast and tooltip text at 4.5 or better, and the focus ring at 3 or better on every surface. Fix every \`failed\` check. An \`unknown\` check means a color could not be resolved; keep those rare and mention the reason to the user.

## Palette guidance

- Pick \`brand\` first; derive the neutral surfaces as grays tinted slightly toward or away from it.
- In the dark scheme raise surfaces by lightening (\`bgBase\` darkest); keep \`brand\` saturated but light enough to read on dark surfaces wherever it carries text.
- Keep \`labelSecondary\` visibly between \`labelPrimary\` and the surfaces (roughly 60–75% of the primary color's luminance distance from the background).
- Keep \`borderL1\` subtle and \`borderL2\` one clear step stronger.
- \`sidebar\` usually matches \`bgBase\`, a touch lighter in the dark scheme or a touch darker in the light scheme.
- \`bgOverlay\` may carry alpha (for example \`#0f1218cc\`); the validator composites it over \`bgBase\`.
- Status colors keep their hue family (red, green, amber) and shift lightness per scheme so their text variants reach 4.5.
`
}
