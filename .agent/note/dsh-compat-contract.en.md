# DSH Compatibility Maintenance Knowledge

中文：[dsh-compat-contract.md](./dsh-compat-contract.md)

## Scope and Sources

Recorded on 2026-10-02 from f34ab5b, fba048e, bbb0ada, d709754, a42316f, and current code. This note preserves boundaries that are easy to confuse with other DSH plugins. Full evidence lives in the [compatibility matrix](../../docs/development/dsh-compatibility.md); src/compat/dsh-version.ts owns the sole support list.

## Common Regression Traps

1. **Pure classification is not a production gate.** classifyInstallation accepts a VersionReader. Tests and development scripts inspect installations, while the Host entry does not resolve Node package metadata. Theme Studio does not widen authority and does not need multi-root's security-provider gate. bbb0ada explicitly removed production Node probing; do not reintroduce it for convenience.
2. **The register scope is not a disposer.** Legacy settings returns a plain namespace object. Returning it to Cordis causes Invalid effect and rolls registration back. The provider owns the fiber lifecycle, so the adapter calls register but returns undefined. This was d709754's real persistence fix rather than a stub-specific style choice.
3. **Keep distinct callback identities for the two transports.** Cordis keys runtimes by function identity. Read only the injected service and never probe the other name through the proxy. Only the child that actually owns startup releases the start guard on teardown.
4. **Caret peers can mix releases.** The historical 0.1.7-alpha.1 direct pin does not lock every transitive DSH peer. The matrix inspects the lockfile and adds overrides. A green candidate requires consistent actual resolution.
5. **The newest supported pin is current policy.** ab0d19c promoted the development baseline; the old release instruction to restore the oldest pin is obsolete. Preserve users' manifest/lockfile changes rather than reverting them with git checkout.
6. **Legacy-provider tests may legitimately skip.** A Config-based installation lacks legacy register, so that regression test skips while configure and client tests cover the newer path. This does not imply persistence is wholly untested, but an in-memory test is still not a real-profile disk journey.
7. **0.2.1 vendors are prereleases.** alpha.1/alpha.2 pair with Cordis 4.0.5-alpha.1 and Schemastery 3.18.5-alpha.1, while alpha.3 pairs with 4.0.5-alpha.2 and 3.18.5-alpha.2; exact prereleases do not satisfy ranges that omit a prerelease tag. Name each release's exact prereleases in the peer and dependency, and override the matching Cordis plugins and cosmokit. `dsh-invariants` has no 0.2.1 alpha publication, so it cannot be pinned to that line. The matrix now derives those pins from the tested release's published dependency metadata and fails when one package does not have a single satisfying version. There is no handwritten vendor table to maintain.
8. **A candidate probe does not widen the allowlist.** `run-dsh-matrix.mjs --candidate` and the weekly upgrade workflow relax peer admission only in an isolated copy or a disposable checkout. Promotion is still a human edit to `SUPPORTED_DSH_RELEASES`. Production entries still do not probe Node package versions.

## Before Editing

Read the [settings/package contract](../../docs/reference/settings-and-package-contract.md), [ADR-0002](../../docs/decisions/ADR-0002-settings-adapters-and-effect-ownership.md), and [ADR-0003](../../docs/decisions/ADR-0003-exact-dsh-compatibility-contract.md). Follow the [upgrade workflow](../../docs/development/plugin-development-workflow.md#dsh-兼容提升) to align candidate and vendor versions, retain older capability paths, and rerun every supported exact release after seam changes.

Identify evidence as a local execution, historical commit message, or CI definition. A configured remote matrix is not proof that every OS ran. Production has no active classification gate, so do not claim Theme Studio itself fails closed on unsupported installations.
