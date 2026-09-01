# Maintaining Desktop Plus Custom

Desktop Plus Custom is a long-lived product fork of Desktop Plus. Upstream's
goal is minimal divergence from GitHub Desktop, while this fork deliberately
ships a full Catppuccin interface and a CodeMirror 6/Lezer syntax highlighter.
Keeping those goals separate makes future upstream updates predictable.

## Repository model

`main` mirrors the upstream project without local changes. `custom/main` is the
installed product and the fork's default branch. Feature branches remain useful
as provenance, but releases always come from `custom/main`.

Upstream is merged, not rebased, into the custom history. This preserves the
commit IDs recorded by releases and makes each upstream intake an auditable
event. See the root `AGENTS.md` for the exact commands, invariants, conflict
hotspots, and verification matrix.

## Audit before integrating

Run:

```bash
./script/custom/audit-upstream.sh
```

The script fetches `upstream/main`, reports the fork-only and incoming commit
counts, prints the common base, and asks Git's merge machinery whether the two
tips merge cleanly. It does not check out, merge, commit, push, or release
anything.

The same audit can be run manually from the GitHub Actions page with the
`Custom - Audit Upstream` workflow. It has read-only permissions and does not
modify branches.

## Why releases remain manual

Every release builds two native AppImages. Restricting release creation to an
explicit dispatch on `custom/main` prevents feature pushes and routine upstream
checks from consuming build minutes or publishing an unreviewed desktop app.
The workflow verifies both architectures and their checksums before it makes a
draft release public.
