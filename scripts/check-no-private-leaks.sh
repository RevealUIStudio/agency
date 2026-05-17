#!/usr/bin/env bash
# check-no-private-leaks.sh
#
# Scans the agency repo for references to private filesystem paths,
# private repos, customer/prospect names, internal IDs, or machine-local
# user homes that must not appear in this public-facing repo.
#
# Exit 0 on clean. Exit 1 on any violation. Exit 2 on tool/setup error.
#
# Usage:
#   bash scripts/check-no-private-leaks.sh                     # scan default (repo root)
#   bash scripts/check-no-private-leaks.sh <path> [<path>...]  # scan explicit paths
#   LEAK_JSON=1 bash scripts/check-no-private-leaks.sh         # machine-readable output
#
# Uses POSIX grep -rE so it runs anywhere (CI, pre-push, bare shells).
# Safe to rerun; read-only.
#
# Ported from RevealUIStudio/revskills/scripts/check-no-private-leaks.sh
# 2026-05-16. Adds patterns for customer/prospect leakage and Vercel-
# operator-catalog disclosure that the revskills canonical scanner does
# not need to enforce (revskills has no Vercel link and no customer
# references).

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCAN_PATHS=("$@")
[[ ${#SCAN_PATHS[@]} -eq 0 ]] && SCAN_PATHS=("$REPO_ROOT")

# Validate scan paths up front. grep silently treats a missing path as
# "no matches" and the script would otherwise exit 0 on a typo'd path,
# silently skipping the requested scan.
for _path in "${SCAN_PATHS[@]}"; do
  if [[ ! -e "$_path" ]]; then
    echo "[leak-check] error: scan path not found: $_path" >&2
    exit 2
  fi
done
unset _path

# --- Patterns that must never appear in public content ---
#
# Each entry: tag|ERE_regex|reason
# Anchored where possible to keep false-positive noise low.
#
# REGEX-CONFIG-BOUNDARY: the regex strings below are config, not authored
# predicates. The bash code that consumes them uses grep -E. Customer
# names are literal-string patterns (no metacharacters) to keep the
# false-positive rate low; the scanner's job is detection, not parsing.
PATTERNS=(
  # --- Canonical-scanner patterns (inherited from revskills) ---
  "abs-home-path|/home/[a-z][a-z0-9_-]+|absolute user home path (/home/<username>/...)"
  "abs-windows-user|[Cc]:[\\\\/]Users[\\\\/][A-Za-z0-9_-]+|absolute Windows user path (C:\\\\Users\\\\<name>)"
  "private-jv-repo|/?revfleet/\\.jv|private repo path (~/revfleet/.jv/...)"
  "private-jv-name|revealui-jv|private repo name (revealui-jv)"
  "lts-drive|/mnt/e/|LTS drive mount path"
  "forge-drive|/mnt/forge/|Forge drive mount path"
  "sandbox-drive|/mnt/sandbox/|Sandbox drive mount path"
  "devbox-host|j""oshu-devbox|internal hostname"
  "license-key|RVUI-[a-z]+-[a-f0-9]{16,}|RevealUI license key (looks like a real issued key)"
  "vercel-org-id|team_[A-Za-z0-9]{16,}|Vercel org/team identifier"
  "vercel-project-id|prj_[A-Za-z0-9]{16,}|Vercel project identifier"
  # --- Agency-specific additions (T0-15 leakage scan, 2026-05-16) ---
  "personal-email|joshua\\.v\\.dev@gmail|personal email (should be founder@revealui.com)"
  # Customer/prospect names are literal strings (no regex alternation —
  # the simple parser splits the entry on the FIRST `|`, so embedded `|`
  # in a regex truncates the pattern). Multi-form names get one entry each.
  "customer-allevia|Allevia|customer name (Allevia) — release only with written customer sign-off"
  "customer-alleviafleet|AlleviaFleet|stamped-customer brand (AlleviaFleet)"
  "prospect-stefan|Stefan Wilson|prospect contact (Stefan Wilson, Allevia CEO)"
  "prospect-djones-name|Daniel B\\. Jones|prospect warm-intro contact (Daniel B. Jones)"
  "prospect-djones-email|dbjones23|prospect warm-intro contact (Daniel B. Jones email handle)"
  "venture-biotix|[Bb]iotix|paused internal venture (Biotix Wellness) — not a public reference"
  "bank-mercury|MercuryBank|operator bank disclosure (Mercury)"
  "anthropic-partner|Anthropic Partner Network|undisclosed partnership reference"
  "revvault-path-prod|revvault/prod/|revvault prod credential path"
  "revvault-path-dev|revvault/dev/|revvault dev credential path"
  "revvault-path-forge|revvault/forge/|revvault forge credential path"
  "age-identity|\\.age-identity|age identity key reference"
  "stripe-account|acct_[A-Za-z0-9]{14,}|Stripe account identifier"
  "stripe-product|prod_[A-Za-z0-9]{14,}|Stripe product identifier"
  "stripe-portal-config|bpc_[A-Za-z0-9]{14,}|Stripe billing portal config identifier"
  "coord-paths|\\.claude/coordination/|coordination directory path"
  "coord-workboard|/\\.claude/workboard\\.md|workboard.md path reference"
  "coord-beacon|context-beacon\\.json|context-beacon.json path reference"
  "internal-handoff|/HANDOFF-[0-9]{4}-[0-9]{2}-[0-9]{2}|internal handoff doc reference"
  "internal-gap-id|GAP-[0-9]{3,}|internal gap/work-item identifier (private surface)"
  "internal-master-plan|MASTER_PLAN\\.md|master plan doc reference"
)

# Directories / file globs to exclude from the scan.
EXCLUDE_DIRS=(node_modules .git dist build .next .turbo .pnpm coverage target .direnv .nyc_output)
EXCLUDE_FILES=(
  pnpm-lock.yaml package-lock.json yarn.lock Cargo.lock
  check-no-private-leaks.sh
  .git
  '*.png' '*.jpg' '*.jpeg' '*.gif' '*.webp' '*.pdf' '*.zip' '*.tar.gz' '*.tgz'
  '*.ico' '*.woff' '*.woff2' '*.ttf' '*.otf'
)

# Note: `settings.local.json` and `.leakignore` are intentionally NOT in
# EXCLUDE_FILES — see canonical scanner comments for full rationale.

if ! command -v grep >/dev/null 2>&1; then
  echo "[leak-check] error: grep not found on PATH" >&2
  exit 2
fi

# Build grep excludes
grep_excludes=()
for d in "${EXCLUDE_DIRS[@]}"; do
  grep_excludes+=(--exclude-dir="$d")
done
for f in "${EXCLUDE_FILES[@]}"; do
  grep_excludes+=(--exclude="$f")
done

# --- Load .leakignore allowlist (optional) ---
IGNORE_FILE="$REPO_ROOT/.leakignore"
declare -a IGNORE_GLOBS=()
declare -a IGNORE_TAGS=()
if [[ -f "$IGNORE_FILE" ]]; then
  while IFS= read -r raw; do
    line="${raw%%#*}"
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -z "$line" ]] && continue
    glob="${line%%[[:space:]]*}"
    tags="${line#*[[:space:]]}"
    tags="${tags#"${tags%%[![:space:]]*}"}"
    [[ -z "$tags" || "$tags" = "$glob" ]] && continue
    IGNORE_GLOBS+=("$glob")
    IGNORE_TAGS+=("$tags")
  done < "$IGNORE_FILE"
fi

is_ignored() {
  local rel_path="$1" tag="$2"
  local i glob tagspec t
  for i in "${!IGNORE_GLOBS[@]}"; do
    glob="${IGNORE_GLOBS[$i]}"
    tagspec="${IGNORE_TAGS[$i]}"
    # shellcheck disable=SC2053
    if [[ "$rel_path" == $glob ]]; then
      IFS=',' read -ra tagarr <<< "$tagspec"
      for t in "${tagarr[@]}"; do
        t="${t//[[:space:]]/}"
        [[ "$t" = "$tag" ]] && return 0
      done
    fi
  done
  return 1
}

violations=0
json_entries=()

for entry in "${PATTERNS[@]}"; do
  tag="${entry%%|*}"
  rest="${entry#*|}"
  regex="${rest%%|*}"
  reason="${rest#*|}"

  while IFS= read -r hit; do
    [[ -z "$hit" ]] && continue
    file="${hit%%:*}"
    rest_="${hit#*:}"
    line="${rest_%%:*}"
    content="${rest_#*:}"

    rel_path="${file#$REPO_ROOT/}"
    rel_path="${rel_path#./}"
    if is_ignored "$rel_path" "$tag"; then
      continue
    fi

    if [[ -n "${LEAK_JSON:-}" ]]; then
      if command -v jq >/dev/null 2>&1; then
        json_entries+=("$(jq -cn --arg tag "$tag" --arg file "$file" --arg line "$line" --arg reason "$reason" --arg content "$content" \
          '{tag:$tag, file:$file, line:($line|tonumber), reason:$reason, content:$content}')")
      else
        safe_content="${content//\\/\\\\}"
        safe_content="${safe_content//\"/\\\"}"
        safe_content="${safe_content//$'\n'/\\n}"
        safe_content="${safe_content//$'\t'/\\t}"
        safe_reason="${reason//\\/\\\\}"
        safe_reason="${safe_reason//\"/\\\"}"
        json_entries+=("{\"tag\":\"$tag\",\"file\":\"$file\",\"line\":$line,\"reason\":\"$safe_reason\",\"content\":\"$safe_content\"}")
      fi
    else
      printf '[LEAK:%s] %s:%s — %s\n  → %s\n' "$tag" "$file" "$line" "$reason" "$content"
    fi
    violations=$((violations+1))
  done < <(grep -rEIn "${grep_excludes[@]}" -- "$regex" "${SCAN_PATHS[@]}" 2>/dev/null || true)
done

if [[ -n "${LEAK_JSON:-}" ]]; then
  printf '{"violations":%d,"entries":[%s]}\n' "$violations" "$(IFS=,; echo "${json_entries[*]:-}")"
fi

if (( violations > 0 )); then
  [[ -z "${LEAK_JSON:-}" ]] && echo "[leak-check] FAIL — $violations violation(s). Fix before publishing." >&2
  exit 1
fi

[[ -z "${LEAK_JSON:-}" ]] && echo "[leak-check] OK — no private paths detected across: ${SCAN_PATHS[*]}"
exit 0
