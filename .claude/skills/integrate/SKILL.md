---
name: integrate
description: Mandatory end of every task in this repo – commit in the worktree, merge main, encrypt/build if needed, push, CI green, then integrate the branch into main with tools/branches.sh (or, in a cloud session, merge the claude/* branch into origin/main). Also covers conflicts in build output, admin.enc.js and books.js.
---

# Integrating a branch into main

Background: every task runs in its own worktree (`EnterWorktree` → `.claude/worktrees/<name>`, branch `worktree-<name>`).
`.claude/settings.json` links `node_modules` from the main checkout and branches from local `main` (`worktree.baseRef: head`).
`tools/main-guard.cjs` refuses Edit/Write in the main checkout; the shell is not guarded: no `npm run build`, commits or `git -C`
into the main checkout or another session's worktree.

## Steps (local session, Johann's Mac)

1. Commit in the worktree, `git merge main`, resolve conflicts there: built files → `npm run build`; `admin.enc.js` → encrypt
   again; `books.js` → `npm run books`; others by content.
2. `tools/source/*` changed → encrypt again (`npm run encrypt`, password from Johann in chat, never written to a file).
   Push the branch, CI green (suite per CLAUDE.md "CI suites"; one green run must cover ALL changes since `main`).
3. `ExitWorktree` (`keep`), then in the main checkout `npm run integrate -- worktree-<name>`. It takes over admin data in main,
   merges `origin/main`, merges the branch (`--no-ff`, syntax check), pushes `main` and removes worktree + branch (local and on
   origin). Report the merge commit and any warnings.

## Cloud session (claude.ai/code)

The designated `claude/*` branch is the branch: work in a worktree as above, push the result to the `claude/*` branch, CI green,
then merge it into `origin/main` with a merge commit (`--no-ff`). Johann's SessionStart hook (`tools/branches.sh --hook`) takes
`origin/main` over into his local `main`.

## Build output never blocks

`website/{index,admin}.html`, `assets/{head,library,admin}.js`, `assets/style.css`: changed in the main checkout (a running
`dev`/`local`/`tunnel:php` watch build, may contain classes of the worktrees) `integrate`, `sync` and the hook reset it to main; a
conflict ONLY in build output `integrate` resolves itself in the branch worktree (merge `main`, build, commit, push) – that counts
as a clean merge, no extra CI run. Never resolve it by hand, never stop for it.

## Never

- `main` = `origin/main` always; `main` only via merge commits: no rebase, `--force`, `reset --hard`.
- Never touch foreign worktrees with uncommitted changes.
- Overview: `npm run branches` (`-- sync` | `cleanup`). The hook also removes finished worktrees no process uses any more.
