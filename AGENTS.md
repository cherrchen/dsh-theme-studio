# Theme Studio plugin development

This directory mirrors the canonical `cherrchen/dsh-theme-studio` repository. Keep it independently installable and publishable: package dependencies use registry semver ranges, never `workspace:`.

The plugin is portable `platform:web`. Never add Electron imports, preload globals, `ctx.desktop`, `node:*`, or a dependency on a Desktop provider. Theme presentation stays with `ctx.theme`; this package only produces token overlays through `overrideTokens`.

## Documentation

Before changing the project, read `docs/README.md` and the relevant requirements,
architecture, reference, ADR, and development documents. Inspect current code
and the worktree rather than assuming a historical plan is current.

Documentation is part of implementation. Follow
`.agent/skills/documentation/SKILL.md` when creating, editing, moving, or deleting
documentation, and run `pnpm docs:check` before completing such changes.

- `docs/requirements/`: requirements and acceptance criteria.
- `docs/architecture/`: current components, boundaries, and data flow.
- `docs/decisions/`: uniquely numbered ADRs and historical alternatives.
- `docs/plans/active/`: roadmap and unfinished implementation plans.
- `docs/plans/completed/`: completed work and verification limits.
- `docs/development/`: workflows, compatibility evidence, builds, and releases.
- `docs/reference/`: public contracts, tokens, algorithms, and commit history.
- `docs/troubleshooting/`: symptoms, causes, and verified remedies.
- `.agent/note/`: durable, non-obvious maintenance knowledge.

Every README uses a canonical Chinese `README.md` and an English `README.en.md`;
formal Agent notes also have `.en.md` counterparts. Synchronize both sides and
resolve conflicts in favor of the Chinese version. Root `README.zh.md` only
preserves the former Chinese link. Re-record `README.i18n.yaml` after reviewing
the root pair's consistency.

Keep each fact in its canonical document and link from other locations. The
roadmap owns progress/release state; bilingual CHANGELOG files own user-visible
release content. Distinguish current behavior from planned work and preserve
accepted ADRs rather than hiding past choices. Retrospective records must name
their reconstruction date and original commits; do not fabricate past tests or
turn a committed feature into a claimed release.

## Maintenance invariants

The Host accepted settings snapshot is durable authority; the UI store is only
a runtime projection. Keep distinct active/preview sources and official
Appearance ownership. Settings transport children own the runtime/UI, while the
parent Client fiber owns the readonly `themeStudio` catalog. Do not return a
legacy namespace scope as a Cordis effect or read uninjected proxy services.

`src/compat/dsh-version.ts` owns exact support. `pnpm compat:check` verifies the
declarations and installed tree; production entry points do not probe packages
through Node. Preserve old settings seams and verify every supported release
when changing them. The development baseline is the newest supported release,
not the obsolete oldest-pin instruction from historical workflow text.

Contrast reports are scoped diagnostics: unknown colors never pass, ratios are
compared without rounding, and known low contrast is not automatically repaired
or blocked from preview/apply. Public catalog data remains deeply immutable.
