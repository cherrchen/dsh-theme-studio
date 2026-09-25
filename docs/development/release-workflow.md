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

   The `--tag` form requires a clean worktree. It commits the version as `chore(release): v<version>` and creates an annotated `v<version>` tag. For the first release, keep the initial `0.1.0` version and create `git tag -a v0.1.0 -m v0.1.0` after preparing and committing the changelog. The first-release changelog entry is dated 2026-09-25.

4. Push the commit and tag to GitHub:

   ```sh
   git push origin main --follow-tags
   ```

## npm setup

The package is scoped and `publishConfig.access` is `public`. The first publication requires an npm account with permission to publish under `@dsh-electron`. The GitHub Actions repository secret `NPM_TOKEN` has been configured and the workflow uses it for the first publish. After the package exists, configure npm Trusted Publishing for `cherrchen/dsh-theme-studio` and this `release.yml` workflow, then remove the `NPM_TOKEN` secret; subsequent releases use GitHub Actions OIDC and provenance.

The GitHub Actions `GITHUB_TOKEN` creates the GitHub Release. No workflow publishes unless a matching `v*` tag is pushed.
