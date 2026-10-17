#!/usr/bin/env bash
# Entwicklungs-Branches (Claude-Worktrees unter .claude/worktrees/) in main integrieren.
#
#   werkzeuge/branches.sh                       Übersicht: was ist noch nicht in main?
#   werkzeuge/branches.sh --hook                dasselbe, aber still, wenn nichts offen ist (SessionStart-Hook)
#   werkzeuge/branches.sh integrieren <branch>  Branch mit --no-ff in main mergen (im Haupt-Checkout)
#
# Ablauf und Regeln: CLAUDE.md, Abschnitt „Branches integrieren“.
set -u

GIT_COMMON=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || { echo "Kein Git-Repo." >&2; exit 1; }
HAUPT=$(dirname "$GIT_COMMON")
g() { git -C "$HAUPT" "$@"; }

# Pfad des Worktrees, in dem Branch $1 ausgecheckt ist (leer, wenn keiner)
worktree_von() {
  g worktree list --porcelain | awk -v b="branch refs/heads/$1" '/^worktree /{w=substr($0,10)} $0==b{print w}'
}

# Anzahl uncommitteter Dateien im Worktree $1
offen() {
  git -C "$1" status --porcelain | wc -l | tr -d ' '
}

# admin.enc.js muss aus genau dem Stand von werkzeuge/quelle/ erzeugt sein, der in Commit $1 liegt
verschluesselung_pruefen() {
  local enc
  enc=$(g log -1 --format=%H "$1" -- website/assets/admin.enc.js)
  [ -z "$enc" ] && return 0
  if ! g diff --quiet "$enc" "$1" -- werkzeuge/quelle; then
    echo "WARNUNG: website/assets/admin.enc.js ist älter als werkzeuge/quelle/ (zuletzt verschlüsselt in $(g log -1 --format=%h "$enc"))."
    echo "         admin.html läuft mit altem Stand. Neu verschlüsseln: node werkzeuge/admin-verschluesseln.js \"<Passwort>\""
    echo "         (Passwort von Johann), committen, integrieren."
    return 1
  fi
}

uebersicht() {
  local hook=$1 fertig="" arbeit="" leer="" b n wt dirty hinweis=""
  for b in $(g for-each-ref --format='%(refname:short)' refs/heads); do
    [ "$b" = main ] && continue
    n=$(g rev-list --count "main..$b")
    wt=$(worktree_von "$b")
    dirty=0
    [ -n "$wt" ] && [ -d "$wt" ] && dirty=$(offen "$wt")
    if [ "$n" -gt 0 ] && [ "$dirty" -eq 0 ]; then
      fertig="$fertig  $b – $n Commit(s), alles committet\n"
    elif [ "$n" -gt 0 ] || [ "$dirty" -gt 0 ]; then
      arbeit="$arbeit  $b – $n Commit(s), $dirty Datei(en) uncommittet\n"
    elif [ -n "$wt" ]; then
      leer="$leer  $b – $wt\n"
    fi
  done
  local geaendert f nur_daten=1
  geaendert=$(g diff --name-only HEAD)
  for f in $geaendert; do case " $DATEN_DATEIEN " in *" $f "*) ;; *) nur_daten=0 ;; esac; done
  if [ -n "$geaendert" ] && [ "$nur_daten" = 1 ]; then
    hinweis="Haupt-Checkout: nur Verwaltungsdaten geändert ($(echo $geaendert)) – npm run integrieren übernimmt sie per Merge.\n"
  elif [ -n "$geaendert" ]; then
    hinweis="Haupt-Checkout ($HAUPT) hat uncommittete Änderungen an main.\n"
  fi
  local enc
  enc=$(verschluesselung_pruefen main) || hinweis="$hinweis$enc\n"

  if [ "$hook" = 1 ] && [ -z "$fertig$arbeit$hinweis" ]; then return 0; fi
  echo "Branch-Integration (werkzeuge/branches.sh, Ablauf in CLAUDE.md „Branches integrieren“):"
  [ -n "$fertig" ] && printf "Fertig committet, aber nicht in main – integrieren, wenn die Aufgabe abgeschlossen ist:\n%b" "$fertig"
  [ -n "$arbeit" ] && printf "In Arbeit (uncommittet – fremde nicht anfassen):\n%b" "$arbeit"
  [ "$hook" = 0 ] && [ -n "$leer" ] && printf "Ohne offene Arbeit (integriert oder frisch angelegt):\n%b" "$leer"
  [ -n "$hinweis" ] && printf "%b" "$hinweis"
  [ -z "$fertig$arbeit$hinweis" ] && echo "Alles integriert."
  return 0
}

# Sind im Haupt-Checkout NUR Datendateien geändert (Verwaltung hat per Ordnerzugriff nach website/ veröffentlicht),
# ist das gewollter Inhalt: über einen eigenen Branch daten-<Zeit> per Merge-Commit nach main (main nur per Merge),
# statt die Integration zu blockieren. Andere Änderungen dabei → nichts tun, integrieren() bricht wie bisher ab.
DATEN_DATEIEN="website/books.js website/empfehlungen.js website/info.js"
daten_uebernehmen() {
  local geaendert f idx baum commit zweig
  geaendert=$(g diff --name-only HEAD)
  [ -z "$geaendert" ] && return 0
  for f in $geaendert; do case " $DATEN_DATEIEN " in *" $f "*) ;; *) return 0 ;; esac; done
  for f in $geaendert; do node --check "$HAUPT/$f" 2>/dev/null || { echo "$f ist kein gültiges JavaScript – nicht übernommen." >&2; return 0; }; done
  idx=$(mktemp)
  GIT_INDEX_FILE=$idx g read-tree HEAD && GIT_INDEX_FILE=$idx g add -- $geaendert &&
    baum=$(GIT_INDEX_FILE=$idx g write-tree) &&
    commit=$(g commit-tree "$baum" -p HEAD -m "Daten aus der Verwaltung: $(echo $geaendert | sed 's#website/##g')") || { rm -f "$idx"; return 0; }
  rm -f "$idx"
  zweig="daten-$(date +%Y%m%d-%H%M%S)"
  g branch "$zweig" "$commit"
  # Inhalt steckt jetzt im Commit; Arbeitskopie auf HEAD zurück, damit der Merge sie wieder herstellt
  g checkout HEAD -- $geaendert
  if g merge --no-ff -q -m "Merge branch '$zweig'" "$zweig"; then
    g branch -d -q "$zweig"
    echo "Verwaltungsdaten übernommen: $(g log -1 --format='%h %s')"
  else
    g merge --abort 2>/dev/null
    echo "Verwaltungsdaten nicht übernommen – Inhalt liegt im Branch $zweig." >&2
  fi
}

integrieren() {
  local b=${1:-} wt n ausgabe konflikte f fehler=0
  [ -z "$b" ] && { echo "Aufruf: werkzeuge/branches.sh integrieren <branch>" >&2; exit 2; }
  [ "$b" = main ] && { echo "main lässt sich nicht in sich selbst integrieren." >&2; exit 2; }
  g rev-parse --verify -q "refs/heads/$b" >/dev/null || { echo "Branch $b gibt es nicht." >&2; exit 1; }
  [ "$(g symbolic-ref --short HEAD)" = main ] || { echo "Haupt-Checkout $HAUPT steht nicht auf main." >&2; exit 1; }
  daten_uebernehmen
  [ -z "$(g status --porcelain --untracked-files=no)" ] || { echo "Haupt-Checkout hat uncommittete Änderungen – erst klären (Johann fragen)." >&2; exit 1; }
  wt=$(worktree_von "$b")
  if [ -n "$wt" ] && [ -d "$wt" ] && [ "$(offen "$wt")" -gt 0 ]; then
    echo "$b hat uncommittete Dateien in $wt – erst dort committen." >&2; exit 1
  fi
  n=$(g rev-list --count "main..$b")
  [ "$n" -eq 0 ] && { echo "$b ist schon vollständig in main."; exit 0; }

  if ! ausgabe=$(g merge --no-ff --no-commit "$b" 2>&1); then
    konflikte=$(g diff --name-only --diff-filter=U)
    g merge --abort 2>/dev/null
    echo "Merge von $b nicht möglich – main unverändert." >&2
    [ -n "$konflikte" ] && printf "Konflikte:\n%s\n" "$konflikte" >&2 || echo "$ausgabe" >&2
    echo "Lösen im Branch-Worktree: dort 'git merge main', Konflikte auflösen, prüfen, committen, dann erneut integrieren." >&2
    exit 1
  fi

  for f in $(g ls-files 'website/*.js' 'werkzeuge/*.js' | grep -v '^website/assets/vendor/'); do
    node --check "$HAUPT/$f" 2>/dev/null || { echo "Syntaxfehler nach dem Merge: $f" >&2; fehler=1; }
  done
  if [ "$fehler" = 1 ]; then
    g merge --abort
    echo "Merge abgebrochen – main unverändert." >&2; exit 1
  fi

  g commit --no-edit -q || { g merge --abort; echo "Commit fehlgeschlagen – main unverändert." >&2; exit 1; }
  echo "$b ($n Commit(s)) in main integriert: $(g log -1 --format='%h %s')"
  verschluesselung_pruefen main
  if [ -n "$wt" ]; then
    echo "Worktree aufräumen, sobald seine Session beendet ist:"
    echo "  git worktree unlock \"$wt\" 2>/dev/null; git worktree remove \"$wt\" && git branch -d $b"
  fi
  return 0
}

case "${1:-}" in
  "")          uebersicht 0 ;;
  --hook)      uebersicht 1 ;;
  integrieren) integrieren "${2:-}" ;;
  *)           sed -n '2,8p' "$0"; exit 2 ;;
esac
