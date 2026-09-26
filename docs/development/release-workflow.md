# Release workflow

Releases are triggered by pushing an annotated `v<version>` tag. The tag must match `package.json` exactly. The release workflow installs dependencies, runs the compatibility, type, and test checks, builds the standalone Host and Client artifacts, checks the packed files, publishes the tarball to npm with provenance, and attaches that tarball and generated notes to a GitHub Release.

## Prepare a release

1. Update both `CHANGELOG.md` and `CHANGELOG.en.md` with the user-visible changes and comparison link for the release.
2. Run the same checks used by the release workflow:

   ```sh
   pnpm install --frozen-lockfile
   pnpm compat:check
   pnpm typecheck
   pnpm test
   pnpm build
   pnpm pack --dry-run
   ```

3. Bump the version and create a tag:

   ```sh
   pnpm release patch --tag
   # or: pnpm release minor --tag
   # or: pnpm release 1.2.3 --tag
   ```

   The `--tag` form requires a clean worktree. It commits the version as `chore(release): v<version>` and creates an annotated `v<version>` tag. When the changelog edit is not committed yet, bump without `--tag`, commit the changelog and `package.json` together as `chore(release): v<version>`, and create the annotated tag on that commit.

4. Push the commit and tag to GitHub:

   ```sh
   git push origin main --follow-tags
   ```

## DSH compatibility bump

`src/compat/dsh-version.ts` is the only support list. `pnpm compat:check` reads it and fails when any of these disagree: the `@deepseek-ai/dsh*` peer ranges in `package.json`, the single development pin, the `pnpm-workspace.yaml` overrides and `minimumReleaseAgeExclude` entries, the resolved `pnpm-lock.yaml`, and the compatibility section of both READMEs. It runs in CI before the typecheck, tests, and build, so drift fails first.

Peers are not advisory from DSH 0.1.7-rc.1 on. A profile install or boot disables a plugin whose declared `@deepseek-ai/dsh*` peers do not cover the running release, so a release missing from `SUPPORTED_DSH_RELEASES` no longer mounts at all.

1. Record the candidate's exact version and the cordis and schemastery versions that release ships.
2. Append the release to `SUPPORTED_DSH_RELEASES`, rerun `pnpm compat:check`, and let it drive the peer ranges, the README sections, and the changelog.
3. Pin the development tree to the candidate (dev pin, overrides, `minimumReleaseAgeExclude`) and run the full gate: `compat:check`, `typecheck`, `test`, `build`, `pack --dry-run`. A release whose published packages range their siblings by caret (0.1.7-alpha.1 does; later releases pin them) also needs an override per transitive `@deepseek-ai/dsh*` package, or the tree mixes releases.
4. Verify the packed tarball in a real profile: `dsh plugin --profile <name> add <tarball>` must succeed, `dsh --profile <name> --dump-config` must list the plugin row, and stderr must stay empty. Apply a theme and reload to confirm the durable write.
5. Rebuild a uniform install tree for every release already on the list and rerun the gate on each; a failure there means the bump broke an older host.
6. Restore the pin to the oldest supported release, rerun the gate, and commit only the version list, ranges, lockfile, and documentation.

## npm setup

The package is scoped and `publishConfig.access` is `public`. The first publication requires an npm account with permission to publish under `@dsh-electron`. The GitHub Actions repository secret `NPM_TOKEN` has been configured and the workflow uses it for the first publish. After the package exists, configure npm Trusted Publishing for `cherrchen/dsh-theme-studio` and this `release.yml` workflow, then remove the `NPM_TOKEN` secret; subsequent releases use GitHub Actions OIDC and provenance.

The GitHub Actions `GITHUB_TOKEN` creates the GitHub Release. No workflow publishes unless a matching `v*` tag is pushed.
