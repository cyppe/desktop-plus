# Desktop Plus Custom fork instructions

These instructions apply to the entire repository. This fork is the production
source for the two user-installed Desktop Plus Custom applications; it is not a
staging area for upstream pull requests.

## Branch topology

- `main` is a clean, fast-forward-only mirror of `upstream/main`. Never add a
  custom commit to it.
- `custom/main` is the long-lived, deployable branch and the default branch of
  `cyppe/desktop-plus`.
- `feat/*` branches hold independently reviewable custom features.
- `sync/upstream-YYYY-MM-DD` branches are temporary integration branches used
  to merge a newly refreshed `main` into `custom/main`.

The canonical remotes are:

```text
origin    https://github.com/cyppe/desktop-plus.git
upstream  https://github.com/desktop-plus/desktop-plus.git
```

Never rebase or force-push `custom/main`. Its commits are referenced by signed
release assets and by the dotfiles deployment manifest, so upstream updates are
recorded as ordinary merge commits.

## Custom invariants

Preserve these behaviors while resolving upstream conflicts:

1. The product identity is `Desktop Plus Custom`, with the Linux executable,
   desktop file, config directory, and AppImage names kept separate from
   upstream Desktop Plus.
2. Diff highlighting uses the CodeMirror 6/Lezer worker adapter and the released
   `@lezer/php` parser. Do not restore CodeMirror 5 or the retired PHP source
   masking shim.
3. The adaptive Catppuccin palette is enabled by default. It themes the complete
   application and follows Latte in light mode and Mocha in dark mode.
4. Linux releases are manual-only, contain native x86-64 and ARM64 AppImages,
   publish combined checksums, and run only from `custom/main`.
5. Do not open or revive upstream Desktop Plus issues or pull requests for these
   customizations unless the user explicitly asks. Upstream already declined
   the theme and CM6 changes in favor of staying close to GitHub Desktop.

The most likely conflict hotspots are `app/package.json`, `yarn.lock`,
`app/src/highlighter/`, `app/styles/`, `app/src/lib/stores/app-store.ts`,
`app/src/ui/app.tsx`, `script/dist-info.ts`, and the custom release workflow.

## Controlled upstream update

Start with a clean worktree, then audit the incoming delta:

```bash
./script/custom/audit-upstream.sh
git log --left-right --cherry-pick --oneline custom/main...upstream/main
```

Integrate only on a review branch:

```bash
git switch main
git merge --ff-only upstream/main
git push origin main
git switch custom/main
git switch -c sync/upstream-YYYY-MM-DD
git merge --no-ff main
```

Resolve conflicts by preserving the custom invariants and adopting compatible
upstream improvements. Do not resolve `yarn.lock` in isolation: first reconcile
`app/package.json`, then regenerate the lockfile with the pinned toolchain.

After verification, push the sync branch and merge it into `custom/main` with a
merge commit. Delete the temporary sync branch only after the resulting custom
build has been installed and smoke-tested on both architectures.

## Toolchain and verification

Use the versions pinned in `.tool-versions` through mise. Use Corepack so the
repository's Yarn pin wins over any global shim:

```bash
mise exec -- corepack yarn install --frozen-lockfile
mise exec -- corepack yarn test:setup
mise exec -- corepack yarn test:unit \
  app/test/unit/codemirror-6-highlighting-test.ts \
  app/test/unit/diff-theme-test.ts
mise exec -- corepack yarn lint
mise exec -- corepack yarn build:prod
```

For an upstream sync, also test the areas touched by the upstream delta. A clean
production build must still create `dist/desktop-plus-custom-linux-*`, and the
highlighter bundle must not contain `@codemirror/view`, `EditorView`, or
`style-mod`.

Visually inspect at least one uncommitted diff and one history diff in both
light and dark modes. Verify PHP attributes/promoted properties, a modern Lezer
language, and a legacy stream language before releasing.

## Releases and local deployment

Run `.github/workflows/custom-linux-release.yml` manually from `custom/main`.
Never add push, pull-request, or scheduled triggers to the release workflow.
The workflow is intentionally gated to the production branch to prevent an
experimental branch from publishing or consuming two-architecture build time.

The installed versions on beefy and the MacBook are managed by the separate
chezmoi repository. After a release succeeds, update its Desktop Plus release
manifest with the exact tag, asset names, and SHA-256 values; test the live
AppImage before the single final `chezmoi apply` permitted by that repository's
instructions.
