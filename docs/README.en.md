# Project Documentation

中文：[README.md](./README.md)

This directory holds Theme Studio's long-term requirements, architecture, decisions, implementation records, and technical references. The documentation system was completed on 2026-10-02 using current code, all reachable commits, and local release tags. Retrospective records do not imply that these documents existed when the work originally took place.

## Documentation Map

| Directory | Purpose | Main entry |
| --- | --- | --- |
| [requirements/](./requirements/README.en.md) | Product requirements, constraints, and acceptance criteria | [Theme Studio requirements](./requirements/theme-studio.md) |
| [architecture/](./architecture/README.en.md) | Current components, data flow, lifecycle, and boundaries | [Theme Studio architecture](./architecture/theme-studio.md) |
| [decisions/](./decisions/README.en.md) | ADR context, alternatives, and consequences | [Decision index](./decisions/README.en.md) |
| [plans/](./plans/README.en.md) | Active roadmap, completed plans, and progress ledger | [Roadmap](./plans/active/2026-10-02-theme-studio-roadmap.md) |
| [development/](./development/README.en.md) | Environment, verification, compatibility, documentation, and releases | [Development workflow](./development/plugin-development-workflow.md) |
| [reference/](./reference/README.en.md) | APIs, settings, tokens, algorithms, and historical facts | [Complete commit history](./reference/repository-history.md) |
| [troubleshooting/](./troubleshooting/README.en.md) | Symptoms, causes, diagnostics, and verified remedies | [Troubleshooting index](./troubleshooting/README.en.md) |

## Current Facts and Sources of Truth

| Information | Source | Role of other documents |
| --- | --- | --- |
| Exact supported DSH releases | `src/compat/dsh-version.ts` | READMEs show the checked list; compatibility documentation preserves evidence |
| Builtin themes, tokens, and labels | `src/client/presets.ts`, `chrome-tokens.ts`, `locales.ts` | The token reference explains the directory, derivations, and roles |
| Overlay behavior | `src/client/runtime.ts` | The runtime reference documents methods and state transitions |
| Public catalog | `src/client/types.ts`, `catalog.ts`, `index.ts` | The catalog reference documents consumers and examples |
| Contrast rules and results | `contrast.ts`, `contrast-colors.ts`, and executed reports | The contrast reference records scope, algorithms, and a dated baseline |
| Progress and release state | [Roadmap ledger](./plans/active/2026-10-02-theme-studio-roadmap.md#进度总账) | READMEs provide entry points; completed plans preserve implementation evidence |
| User-visible release changes | [Changelog](../CHANGELOG.en.md) | History explains commit relationships rather than becoming another release-note source |
| Historical compatibility evidence | [Matrix results](./development/dsh-compatibility-results.json) | Old evidence is not represented as a rerun of new changes |

## Reading Paths

- Users: root [README](../README.en.md) → [settings and package contract](./reference/settings-and-package-contract.md) → [troubleshooting](./troubleshooting/README.en.md).
- Plugin authors: [catalog API](./reference/theme-catalog.md) → [token directory](./reference/theme-tokens.md) → [contrast reports](./reference/theme-contrast.md).
- Developers: [requirements](./requirements/theme-studio.md) → [architecture](./architecture/theme-studio.md) → [development workflow](./development/plugin-development-workflow.md) → relevant ADRs and plans.
- Maintainers: [complete history](./reference/repository-history.md) → [compatibility matrix](./development/dsh-compatibility.md) → [release workflow](./development/release-workflow.md).

## Maintenance Principles

Maintain a fact in its owning document and link to it elsewhere. Clearly separate current, completed, planned, and superseded behavior. Move completed plans into `plans/completed/`; preserve earlier ADR decisions; identify verification dates, environments, passing checks, skips, and uncovered mechanisms.

Every README and formal `.agent/note/` document has a canonical Chinese `.md` and an English `.en.md` counterpart. Resolve disagreements by correcting the English version. Root `README.zh.md` preserves the former Chinese link, while its full content now lives in `README.md`. See the [Documentation Skill](../.agent/skills/documentation/SKILL.md); run `pnpm docs:check` for structural validation.

Durable maintenance notes: [compatibility traps](../.agent/note/dsh-compat-contract.en.md) and [runtime/loader ownership](../.agent/note/runtime-and-loader.en.md). These link to formal sources rather than maintaining another API or release-content record.
