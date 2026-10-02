# Runtime, Catalog, and Browser Loader Maintenance

中文：[runtime-and-loader.md](./runtime-and-loader.md)

## Scope

Recorded on 2026-10-02 for ownership relationships that are easy to break and expensive to reconstruct. Full contracts live in [runtime](../../docs/reference/theme-runtime.md), [catalog](../../docs/reference/theme-catalog.md), and [package reference](../../docs/reference/settings-and-package-contract.md); evolution lives in [repository history](../../docs/reference/repository-history.md).

## Invariants and Historical Traps

- **The carrier uses the bare package name.** After faa9b92 removed custom Plugins-page contributions, the official manager and browser scan use installed metadata. Mounting only /client or a fictional invariant subpath loses the graph. Old lib/plugin-page declarations can be stale builds rather than missing source to restore.
- **Disposers are generation-specific.** Official overrideTokens replaces and restacks the same source; an old disposer must not delete its replacement. Previewing Default temporarily hides active while retaining its durable id, and cancel rebuilds the original layer from the catalog.
- **Settings children and the catalog parent have different lifetimes.** 509b88e provides discovery in parent apply and shares its frozen catalog with the runtime. Transport teardown may release row/runtime, but must retain discovery. Cordis manages consumer restarts when the parent provider returns.
- **The store is not another authority.** The Host accepted snapshot eventually owns durable selection. Projection revisions advance rather than regress. persistGeneration prevents stale local settlement adoption; it does not make Host writes transactional or serialized.
- **Discovery has no dynamic write port.** Stable list/get identity and deep immutability are contracts. Do not casually add register/import/activate or treat builtin metadata as a public file schema.
- **Static white has an explicit role.** neutral-00/bluish-00 remain white, while deriveChrome supplies dark bubble fills. Do not replace every neutral static with theme ink in dark mode.
- **Keep diagnostic failures visible.** Strict reporting fails for existing low ratios, unknown never passes, and comparison uses full precision. Reports do not certify a complete host or automatically change locked must-add palette values.

## Review Entry Points

Read [ADR-0001](../../docs/decisions/ADR-0001-portable-token-overlays.md), [ADR-0004](../../docs/decisions/ADR-0004-official-plugin-package-registration.md), [ADR-0006](../../docs/decisions/ADR-0006-contrast-diagnostics-scope.md), and [ADR-0007](../../docs/decisions/ADR-0007-readonly-client-theme-catalog.md) before changing ownership. Cover preview/default/cancel, transport teardown/re-provision, provider/consumer unload/reload, deep freezing, and actual browser exports. Build after cleaning generated lib before packing to avoid stale files.

## Evidence Boundaries

ModuleLoader/official ThemeRuntime tests are not full browser screenshots; jsdom aria assertions are not complete WCAG certification; discovery does not imply a settings transport exists; an immediate Apply badge does not prove persistence. Rejected writes have no dedicated error UI and Mosaic uses the light sample. Lifecycle-recovery wording must preserve those limits.
