#!/usr/bin/env bash
# Integrate development branches (Claude worktrees under .claude/worktrees/) into main.
#
#   tools/branches.sh                     overview: what is not in main yet?
#   tools/branches.sh --hook              the same, but silent when nothing is open (SessionStart hook)
#   tools/branches.sh integrate <branch>  merge the branch into main with --no-ff (in the main checkout)
#
# Procedure and rules: CLAUDE.md, section "Integrating branches".
set -u

GIT_COMMON=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || { echo "Not a git repository." >&2; exit 1; }
MAIN=$(dirname "$GIT_COMMON")
g() { git -C "$MAIN" "$@"; }

# Path of the worktree in which branch $1 is checked out (empty if none)
worktree_of() {
  g worktree list --porcelain | awk -v b="branch refs/heads/$1" '/^worktree /{w=substr($0,10)} $0==b{print w}'
}

# Number of uncommitted files in worktree $1
uncommitted() {
  git -C "$1" status --porcelain | wc -l | tr -d ' '
}

# admin.enc.js must be generated from exactly the state of tools/source/ that is in commit $1
check_encryption() {
  local enc
  enc=$(g log -1 --format=%H "$1" -- website/assets/admin.enc.js)
  [ -z "$enc" ] && return 0
  if ! g diff --quiet "$enc" "$1" -- tools/source; then
    echo "WARNING: website/assets/admin.enc.js is older than tools/source/ (last encrypted in $(g log -1 --format=%h "$enc"))."
    echo "         admin.html runs an old state. Encrypt again: node tools/encrypt-admin.js \"<password>\""
    echo "         (password from Johann), commit, integrate."
    return 1
  fi
}

overview() {
  local hook=$1 done_="" work="" empty="" b n wt dirty note=""
  for b in $(g for-each-ref --format='%(refname:short)' refs/heads); do
    [ "$b" = main ] && continue
    n=$(g rev-list --count "main..$b")
    wt=$(worktree_of "$b")
    dirty=0
    [ -n "$wt" ] && [ -d "$wt" ] && dirty=$(uncommitted "$wt")
    if [ "$n" -gt 0 ] && [ "$dirty" -eq 0 ]; then
      done_="$done_  $b – $n commit(s), everything committed\n"
    elif [ "$n" -gt 0 ] || [ "$dirty" -gt 0 ]; then
      work="$work  $b – $n commit(s), $dirty file(s) uncommitted\n"
    elif [ -n "$wt" ]; then
      empty="$empty  $b – $wt\n"
    fi
  done
  local changed f data_only=1
  changed=$(g diff --name-only HEAD)
  for f in $changed; do case " $DATA_FILES " in *" $f "*) ;; *) data_only=0 ;; esac; done
  if [ -n "$changed" ] && [ "$data_only" = 1 ]; then
    note="Main checkout: only admin data changed ($(echo $changed)) – npm run integrate takes it over via a merge.\n"
  elif [ -n "$changed" ]; then
    note="Main checkout ($MAIN) has uncommitted changes on main.\n"
  fi
  local enc
  enc=$(check_encryption main) || note="$note$enc\n"

  if [ "$hook" = 1 ] && [ -z "$done_$work$note" ]; then return 0; fi
  echo "Branch integration (tools/branches.sh, procedure in CLAUDE.md \"Integrating branches\"):"
  [ -n "$done_" ] && printf "Fully committed but not in main – integrate if the task is finished:\n%b" "$done_"
  [ -n "$work" ] && printf "In progress (uncommitted – don't touch other sessions' branches):\n%b" "$work"
  [ "$hook" = 0 ] && [ -n "$empty" ] && printf "Without open work (integrated or freshly created):\n%b" "$empty"
  [ -n "$note" ] && printf "%b" "$note"
  [ -z "$done_$work$note" ] && echo "Everything integrated."
  return 0
}

# If ONLY data files are changed in the main checkout (the admin page published into website/ via folder access),
# that is intended content: via its own branch data-<time> into main as a merge commit (main only via merges),
# instead of blocking the integration. Other changes alongside → do nothing, integrate() aborts as before.
DATA_FILES="website/books.js website/recommendations.js website/info.js"
take_over_data() {
  local changed f idx tree commit branch
  changed=$(g diff --name-only HEAD)
  [ -z "$changed" ] && return 0
  for f in $changed; do case " $DATA_FILES " in *" $f "*) ;; *) return 0 ;; esac; done
  for f in $changed; do node --check "$MAIN/$f" 2>/dev/null || { echo "$f is not valid JavaScript – not taken over." >&2; return 0; }; done
  idx=$(mktemp)
  GIT_INDEX_FILE=$idx g read-tree HEAD && GIT_INDEX_FILE=$idx g add -- $changed &&
    tree=$(GIT_INDEX_FILE=$idx g write-tree) &&
    commit=$(g commit-tree "$tree" -p HEAD -m "Data from the admin page: $(echo $changed | sed 's#website/##g')") || { rm -f "$idx"; return 0; }
  rm -f "$idx"
  branch="data-$(date +%Y%m%d-%H%M%S)"
  g branch "$branch" "$commit"
  # the content is now in the commit; working copy back to HEAD so the merge restores it
  g checkout HEAD -- $changed
  if g merge --no-ff -q -m "Merge branch '$branch'" "$branch"; then
    g branch -d -q "$branch"
    echo "Admin data taken over: $(g log -1 --format='%h %s')"
  else
    g merge --abort 2>/dev/null
    echo "Admin data not taken over – the content is in branch $branch." >&2
  fi
}

integrate() {
  local b=${1:-} wt n output conflicts f failed=0
  [ -z "$b" ] && { echo "Usage: tools/branches.sh integrate <branch>" >&2; exit 2; }
  [ "$b" = main ] && { echo "main cannot be integrated into itself." >&2; exit 2; }
  g rev-parse --verify -q "refs/heads/$b" >/dev/null || { echo "Branch $b does not exist." >&2; exit 1; }
  [ "$(g symbolic-ref --short HEAD)" = main ] || { echo "Main checkout $MAIN is not on main." >&2; exit 1; }
  take_over_data
  [ -z "$(g status --porcelain --untracked-files=no)" ] || { echo "Main checkout has uncommitted changes – clear that up first (ask Johann)." >&2; exit 1; }
  wt=$(worktree_of "$b")
  if [ -n "$wt" ] && [ -d "$wt" ] && [ "$(uncommitted "$wt")" -gt 0 ]; then
    echo "$b has uncommitted files in $wt – commit them there first." >&2; exit 1
  fi
  n=$(g rev-list --count "main..$b")
  [ "$n" -eq 0 ] && { echo "$b is already fully in main."; exit 0; }

  if ! output=$(g merge --no-ff --no-commit "$b" 2>&1); then
    conflicts=$(g diff --name-only --diff-filter=U)
    g merge --abort 2>/dev/null
    echo "Merging $b is not possible – main unchanged." >&2
    [ -n "$conflicts" ] && printf "Conflicts:\n%s\n" "$conflicts" >&2 || echo "$output" >&2
    echo "Resolve in the branch worktree: 'git merge main' there, resolve the conflicts, check, commit, then integrate again." >&2
    exit 1
  fi

  for f in $(g ls-files 'website/*.js' 'tools/*.js' | grep -v '^website/assets/vendor/'); do
    node --check "$MAIN/$f" 2>/dev/null || { echo "Syntax error after the merge: $f" >&2; failed=1; }
  done
  if [ "$failed" = 1 ]; then
    g merge --abort
    echo "Merge aborted – main unchanged." >&2; exit 1
  fi

  g commit --no-edit -q || { g merge --abort; echo "Commit failed – main unchanged." >&2; exit 1; }
  echo "$b ($n commit(s)) integrated into main: $(g log -1 --format='%h %s')"
  check_encryption main
  if [ -n "$wt" ]; then
    echo "Clean up the worktree as soon as its session has ended:"
    echo "  git worktree unlock \"$wt\" 2>/dev/null; git worktree remove \"$wt\" && git branch -d $b"
  fi
  return 0
}

case "${1:-}" in
  "")        overview 0 ;;
  --hook)    overview 1 ;;
  integrate) integrate "${2:-}" ;;
  *)         sed -n '2,8p' "$0"; exit 2 ;;
esac
