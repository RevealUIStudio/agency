#!/usr/bin/env bash
# check-client-leaks.sh
#
# Scans the repo for client, prospect, or contact names. The pattern list
# is not stored in this file.
#
# Exit 0 on clean. Exit 1 on any violation. Exit 2 on tool/setup error.
#
# Usage:
#   bash scripts/check-client-leaks.sh                     # scan repo root
#   bash scripts/check-client-leaks.sh <path> [<path>...]  # scan specific paths
#   LEAK_JSON=1 bash scripts/check-client-leaks.sh         # machine-readable
#
# Pattern source, first match wins:
#   1. CLIENT_LEAK_PATTERNS (multiline; one tag|literal|reason line each)
#   2. Local runs only: gitignored .client-name-watchlist.local at the repo root
#
# In CI (CI=true or GITHUB_ACTIONS=true) a missing or empty
# CLIENT_LEAK_PATTERNS exits 2. The local file is not a CI fallback.
# Locally, if neither source is present, print a warning and exit 2.
#
# CI wiring: .github/workflows/check-client-leaks.yml
# The workflow passes the org Actions secret CLIENT_LEAK_PATTERNS.
#
# Adding a client, prospect, or contact:
#   Add one tag|literal|reason line to the CLIENT_LEAK_PATTERNS org secret.
#   Never commit the line to this repo.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCAN_PATHS=("$@")
[[ ${#SCAN_PATHS[@]} -eq 0 ]] && SCAN_PATHS=("$REPO_ROOT")

for _path in "${SCAN_PATHS[@]}"; do
  if [[ ! -e "$_path" ]]; then
    echo "[client-leak] error: scan path not found: $_path" >&2
    exit 2
  fi
done
unset _path

in_ci=0
if [[ "${CI:-}" == "true" || "${GITHUB_ACTIONS:-}" == "true" ]]; then
  in_ci=1
fi

pattern_text=""
pattern_source=""

if [[ -n "${CLIENT_LEAK_PATTERNS+x}" && -n "${CLIENT_LEAK_PATTERNS//[[:space:]]/}" ]]; then
  pattern_text="$CLIENT_LEAK_PATTERNS"
  pattern_source="CLIENT_LEAK_PATTERNS"
elif [[ "$in_ci" -eq 1 ]]; then
  echo "[client-leak] error: CLIENT_LEAK_PATTERNS is empty or unset." >&2
  echo "[client-leak] CI requires the org Actions secret CLIENT_LEAK_PATTERNS to be set and visible to this repo." >&2
  echo "[client-leak] Refusing to report a clean scan with no pattern list." >&2
  exit 2
elif [[ -f "$REPO_ROOT/.client-name-watchlist.local" ]]; then
  if ! pattern_text="$(<"$REPO_ROOT/.client-name-watchlist.local")"; then
    echo "[client-leak] error: could not read .client-name-watchlist.local." >&2
    exit 2
  fi
  pattern_source=".client-name-watchlist.local"
  if [[ -z "${pattern_text//[[:space:]]/}" ]]; then
    echo "[client-leak] warning: .client-name-watchlist.local is empty and CLIENT_LEAK_PATTERNS is unset." >&2
    echo "[client-leak] Scan did not run." >&2
    exit 2
  fi
else
  echo "[client-leak] warning: CLIENT_LEAK_PATTERNS is unset and .client-name-watchlist.local is absent." >&2
  echo "[client-leak] Scan did not run. Add lines to the org secret, or to the gitignored local file." >&2
  exit 2
fi

# --- Patterns: tag | literal-string | reason ---
#
# REGEX-CONFIG-BOUNDARY: literals are consumed by grep -F (fixed strings).
# Lines come from the secret or the gitignored local file, never from git.
PATTERNS=()
line_no=0
while IFS= read -r raw || [[ -n "$raw" ]]; do
  line_no=$((line_no + 1))
  raw="${raw%$'\r'}"
  line="${raw#"${raw%%[![:space:]]*}"}"
  line="${line%"${line##*[![:space:]]}"}"
  [[ -z "$line" ]] && continue
  [[ "$line" == \#* ]] && continue
  if [[ "$line" == '"'*'"' ]]; then
    line="${line:1}"
    line="${line%\"}"
  fi
  tag="${line%%|*}"
  rest="${line#*|}"
  if [[ "$rest" == "$line" || -z "$tag" ]]; then
    echo "[client-leak] error: $pattern_source line $line_no is not tag|literal|reason." >&2
    exit 2
  fi
  literal="${rest%%|*}"
  reason="${rest#*|}"
  if [[ "$reason" == "$rest" || -z "$literal" || -z "$reason" ]]; then
    echo "[client-leak] error: $pattern_source line $line_no is not tag|literal|reason." >&2
    exit 2
  fi
  PATTERNS+=("$tag|$literal|$reason")
done <<< "$pattern_text"

if [[ ${#PATTERNS[@]} -eq 0 ]]; then
  echo "[client-leak] error: $pattern_source produced no patterns." >&2
  exit 2
fi

# Directories / file globs to skip
EXCLUDE_DIRS=(node_modules .git dist build .next .turbo .pnpm coverage target .direnv .nyc_output playwright-report test-results)
EXCLUDE_FILES=(
  pnpm-lock.yaml package-lock.json yarn.lock Cargo.lock
  CHANGELOG.md
  '*.png' '*.jpg' '*.jpeg' '*.gif' '*.webp' '*.pdf' '*.zip' '*.tar.gz' '*.tgz'
  '*.ico' '*.woff' '*.woff2' '*.ttf' '*.otf'
  '*.har' '*.snap'
)

if ! command -v grep >/dev/null 2>&1; then
  echo "[client-leak] error: grep not found on PATH" >&2
  exit 2
fi

grep_excludes=()
for d in "${EXCLUDE_DIRS[@]}"; do
  grep_excludes+=(--exclude-dir="$d")
done
for f in "${EXCLUDE_FILES[@]}"; do
  grep_excludes+=(--exclude="$f")
done

# The gitignored watchlist is the local pattern source. Skip it when it is
# not tracked. A tracked copy is public and must still fail the scan.
skip_untracked_watchlist() {
  local path="$1"
  [[ "$(basename "$path")" == ".client-name-watchlist.local" ]] || return 1
  if command -v git >/dev/null 2>&1 && git -C "$REPO_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    if git -C "$REPO_ROOT" ls-files --error-unmatch -- "$path" >/dev/null 2>&1; then
      return 1
    fi
  fi
  return 0
}

violations=0
json_entries=()

for entry in "${PATTERNS[@]}"; do
  tag="${entry%%|*}"
  rest="${entry#*|}"
  pattern="${rest%%|*}"
  reason="${rest#*|}"

  while IFS= read -r hit; do
    [[ -z "$hit" ]] && continue
    file="${hit%%:*}"
    rest_="${hit#*:}"
    line="${rest_%%:*}"
    content="${rest_#*:}"

    if skip_untracked_watchlist "$file"; then
      continue
    fi

    if [[ -n "${LEAK_JSON:-}" ]]; then
      if command -v jq >/dev/null 2>&1; then
        json_entries+=("$(jq -cn --arg tag "$tag" --arg file "$file" --arg line "$line" --arg reason "$reason" --arg content "$content" \
          '{tag:$tag, file:$file, line:($line|tonumber), reason:$reason, content:$content}')")
      else
        safe="${content//\\/\\\\}"
        safe="${safe//\"/\\\"}"
        safe="${safe//$'\n'/\\n}"
        safe="${safe//$'\t'/\\t}"
        sreason="${reason//\\/\\\\}"
        sreason="${sreason//\"/\\\"}"
        json_entries+=("{\"tag\":\"$tag\",\"file\":\"$file\",\"line\":$line,\"reason\":\"$sreason\",\"content\":\"$safe\"}")
      fi
    else
      printf '[CLIENT-LEAK:%s] %s:%s - %s\n  -> %s\n' "$tag" "$file" "$line" "$reason" "$content"
    fi
    violations=$((violations + 1))
  done < <(grep -rFIn "${grep_excludes[@]}" -- "$pattern" "${SCAN_PATHS[@]}" 2>/dev/null || true)
done

if [[ -n "${LEAK_JSON:-}" ]]; then
  printf '{"violations":%d,"entries":[%s]}\n' "$violations" "$(IFS=,; echo "${json_entries[*]:-}")"
fi

if (( violations > 0 )); then
  if [[ -z "${LEAK_JSON:-}" ]]; then
    echo "" >&2
    echo "[client-leak] FAIL: $violations violation(s)." >&2
    echo "" >&2
    echo "Customer / prospect names must not appear in this public-facing repo." >&2
    echo "Move the content to the private internal repo, or genericize it." >&2
    echo "" >&2
    echo "To cover a new client, add the pattern line to the CLIENT_LEAK_PATTERNS org secret." >&2
    echo "Never commit that line to this repo." >&2
  fi
  exit 1
fi

[[ -z "${LEAK_JSON:-}" ]] && echo "[client-leak] OK: no client/prospect names detected across: ${SCAN_PATHS[*]}"
exit 0
