#!/usr/bin/env bash
#
# deploy.sh — build the portfolio locally and publish it to a SUBFOLDER of the
# web root (/var/www/html/portfolio), then reload the web server if one is
# installed.
#
#   ./deploy.sh --dry-run        # print the plan, change nothing
#   ./deploy.sh --check-only DIR # run the safety guard only, change nothing
#   ./deploy.sh                  # build + publish to the default directory
#   ./deploy.sh /srv/www/portfolio
#   DEPLOY_DIR=/srv/www/portfolio ./deploy.sh
#
# WHY A SUBFOLDER: /var/www/html on the target server already hosts other live
# sites. `rsync --delete` removes files that are in the destination but not in
# the source, so it must only ever be pointed at a directory that belongs to
# this project alone. See the safety guard below.
#
# NEVER point Vite's outDir at the server path: this script builds into ./dist
# inside the project and copies the finished files over. That way a broken build
# can never empty a live directory.
#
# PRIVILEGES: sudo is optional. Already running as root means no escalation at
# all; otherwise sudo is used when it is installed and works non-interactively.
# See "Privilege resolution" below.

set -euo pipefail

# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------
readonly DEFAULT_DEPLOY_DIR="/var/www/html/portfolio"
readonly WEB_ROOT="/var/www/html"
readonly PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly DIST_DIR="$PROJECT_DIR/dist"
readonly WEB_USER="www-data"
readonly WEB_GROUP="www-data"

# Overridable: DEPLOY_DIR (env var or first positional argument),
# SERVER_HOST (only used to print the URL in the summary).
# NOTE the deliberate use of ${VAR-default} and not ${VAR:-default}: an
# explicitly EMPTY DEPLOY_DIR must reach the safety guard and abort, not
# silently fall back to the default.
DEPLOY_DIR="${DEPLOY_DIR-$DEFAULT_DEPLOY_DIR}"
SERVER_HOST="${SERVER_HOST:-localhost}"
DRY_RUN=0
CHECK_ONLY=0

# --------------------------------------------------------------------------
# Output helpers
# --------------------------------------------------------------------------
log()  { printf '\n==> %s\n' "$*"; }
info() { printf '    %s\n' "$*"; }
warn() { printf 'WARNING: %s\n' "$*" >&2; }
die()  { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'USAGE'
Usage: ./deploy.sh [--dry-run | --check-only] [DEPLOY_DIR]

  --dry-run, -n   Print the plan (including the exact rsync command) and exit
                  without installing, building, copying or reloading anything.
  --check-only    Run the safety guard and nothing else, then exit 0 (safe) or
                  1 (refused). Never builds, copies, creates the target or runs
                  rsync — safe to run against any path, including a typo.
  DEPLOY_DIR      Target directory. Defaults to /var/www/html/portfolio.
                  Can also be set with the DEPLOY_DIR environment variable.
  --help, -h      Show this help.

Environment:
  DEPLOY_DIR      Same as the positional argument; takes effect if no
                  positional argument is given.
  SERVER_HOST     Hostname or IP used when printing the URL in the summary.

Examples:
  ./deploy.sh --dry-run
  ./deploy.sh --check-only /var/www/html/portfolio
  ./deploy.sh
  ./deploy.sh /srv/www/portfolio
  DEPLOY_DIR=/srv/www/portfolio SERVER_HOST=203.0.113.10 ./deploy.sh
USAGE
}

# --------------------------------------------------------------------------
# Argument parsing
# --------------------------------------------------------------------------
for arg in "$@"; do
  case "$arg" in
    --dry-run|-n) DRY_RUN=1 ;;
    --check-only) CHECK_ONLY=1 ;;
    --help|-h)    usage; exit 0 ;;
    --)           shift; break ;;
    -*)           usage >&2; die "Unknown option: $arg" ;;
    *)            DEPLOY_DIR="$arg" ;;
  esac
done

# --------------------------------------------------------------------------
# SAFETY GUARD — runs before anything destructive. Do not reorder this above
# the build steps and do not weaken it: `rsync --delete` on the wrong directory
# deletes other people's websites.
# --------------------------------------------------------------------------

# Resolve the candidate to its canonical absolute path WITHOUT requiring it to
# exist: `realpath -m` (coreutils) collapses `//`, `.` and `..` and keeps going
# through components that do not exist yet, so `/var/www/html/.` and `../..`
# are checked as what they really are instead of as the strings they look like.
# Falls back to the already-cleaned string when realpath is unavailable.
normalise_deploy_dir() {
  local dir="$1"
  local resolved=""
  if command -v realpath >/dev/null 2>&1; then
    # realpath fails (and prints to stderr) on an empty string, hence the guard.
    resolved="$(realpath -m -- "$dir" 2>/dev/null || true)"
  fi
  [[ -n "$resolved" ]] || resolved="$dir"
  printf '%s' "$resolved"
}

# Number of non-empty path segments: strip the leading slashes, then count the
# parts. Used by the top-level-directory check below.
count_path_segments() {
  local stripped="${1#/}"
  local segments=0
  local part
  while [[ -n "$stripped" ]]; do
    part="${stripped%%/*}"
    [[ -n "$part" ]] && segments=$((segments + 1))
    if [[ "$stripped" == */* ]]; then stripped="${stripped#*/}"; else stripped=""; fi
  done
  printf '%s' "$segments"
}

assert_safe_deploy_dir() {
  local dir="${1-}"
  local reason=""
  local normalised

  # Collapse repeated slashes so /var/www/html// and /var/www/html compare equal.
  while [[ "$dir" == *"//"* ]]; do dir="${dir//\/\//\/}"; done
  # Drop a single trailing slash (but keep a bare "/").
  if [[ ${#dir} -gt 1 && "$dir" == */ ]]; then dir="${dir%/}"; fi

  # NORMALISE FIRST, ALWAYS BEFORE THE DESTRUCTIVE STEP — never after. The
  # ancestor test below is only sound on the resolved path: a relative path or
  # one containing `..` can point at a parent of $WEB_ROOT without looking like
  # one, so the canonical form must exist before rsync is ever considered.
  normalised="$(normalise_deploy_dir "$dir")"

  if [[ -z "${dir//[[:space:]]/}" ]]; then
    reason="it is empty. An empty DEPLOY_DIR would make rsync --delete target the current directory."
  elif [[ "$dir" == "/" || "$normalised" == "/" ]]; then
    reason='"/" is the filesystem root. rsync --delete there would wipe the entire server.'
  elif [[ "$dir" == "$WEB_ROOT" ]]; then
    reason="$WEB_ROOT already hosts other live sites. rsync --delete would delete all of them. Use a dedicated subfolder such as $WEB_ROOT/portfolio."
  elif [[ "$normalised" == "$WEB_ROOT" || "$WEB_ROOT" == "$normalised/"* ]]; then
    # ANCESTOR REJECTION — this branch used to be missing, and it was the most
    # dangerous gap in the guard: /var/www has two path segments and is not
    # string-equal to $WEB_ROOT, so it sailed through every check above. But
    # `rsync -a --delete dist/ /var/www/` deletes /var/www/html and with it
    # every live site on the server. Any parent of the web root is equally
    # fatal, so refuse the whole ancestor chain instead of the leaf only.
    reason="\"$dir\" is a PARENT of $WEB_ROOT, or the web root itself (it resolves to \"$normalised\"). rsync --delete there would delete $WEB_ROOT and every live site inside it. A deploy target must be a subfolder of $WEB_ROOT, never the web root or one of its parents; try $WEB_ROOT/portfolio."
  else
    # Count path segments. Check the path as given AND the normalised one: the
    # normalised path is what rsync would really target, while the as-given path
    # is what the operator typed — normalising must never turn a previously
    # refused target such as `.` or `portfolio` into an accepted one.
    local segments_normalised segments_as_given
    segments_normalised="$(count_path_segments "$normalised")"
    segments_as_given="$(count_path_segments "$dir")"
    if [[ "$segments_normalised" -lt 2 || "$segments_as_given" -lt 2 ]]; then
      reason="\"$dir\" has fewer than two path segments. A deploy target must be a dedicated subfolder (for example $WEB_ROOT/portfolio), never a top-level directory."
    fi
  fi

  if [[ -n "$reason" ]]; then
    printf '\n' >&2
    printf '========================================================\n' >&2
    printf ' DEPLOY ABORTED — refusing to touch the filesystem\n' >&2
    printf '========================================================\n' >&2
    printf ' Requested DEPLOY_DIR : %s\n' "${1-<empty>}" >&2
    printf ' Reason              : %s\n' "$reason" >&2
    printf '\n' >&2
    printf ' This script runs `rsync -a --delete`, which DELETES files in the\n' >&2
    printf ' target that are not in ./dist. The guard above is the only thing\n' >&2
    printf ' standing between a typo and a dead website, so it aborts instead\n' >&2
    printf ' of guessing.\n' >&2
printf '\n' >&2
    printf ' To deploy this portfolio, use a dedicated subfolder:\n' >&2
    printf '   ./deploy.sh %s\n' "$WEB_ROOT/portfolio" >&2
    printf '   DEPLOY_DIR=%s/portfolio ./deploy.sh\n' "$WEB_ROOT" >&2
    printf '========================================================\n' >&2
    exit 1

  fi

  printf '%s' "$normalised"
}

# Guard returns the normalised (canonical) directory on stdout.
DEPLOY_DIR="$(assert_safe_deploy_dir "$DEPLOY_DIR")"

# The URL path this directory will be served at, e.g. /portfolio/
web_path() {
  local dir="$1"
  if [[ "$dir" == "$WEB_ROOT"/* ]]; then
    printf '/%s/' "${dir#"$WEB_ROOT"/}"
  else
    printf '/'
  fi
}

readonly SITE_PATH="$(web_path "$DEPLOY_DIR")"

# --------------------------------------------------------------------------
# Privilege resolution — sudo is OPTIONAL, not mandatory. Resolved ONCE, here,
# and every privileged command below is prefixed with the result.
# --------------------------------------------------------------------------
# THIS WAS THE BUG. The preflight used to hard-require sudo:
#   command -v sudo >/dev/null 2>&1 || die "sudo was not found. ..."
# so the deploy aborted even when it was already running as root, on a server
# where the sudo package is simply not installed (very common on minimal Debian
# images and on many VPS control panels). Real observed output:
#
#   ==> Deploying portfolio -> /var/www/html/portfolio
#   ERROR: sudo was not found. This script needs sudo rights to write to /var/www/html/portfolio.
#
# Rule: escalate only when escalation is actually needed.
#   1. euid 0            -> prefix '' : root needs no escalation at all.
#   2. sudo works -n     -> prefix 'sudo' : used, but only because it is needed.
#   3. neither           -> abort naming the MISSING PRIVILEGE, not just a missing binary.
#
# This mirrors resolvePrivilegePrefix() in scripts/privilege.mjs, which
# src/test/deploy-guard.test.js unit-tests and compares with the prefix
# `--check-only` prints below. If you change one branch, change both: the test
# fails as soon as the shell and the pure function disagree.
PRIV_PREFIX=""
PRIV_REASON=""

resolve_privilege_prefix() {
  local euid="${1:-$EUID}"
  local has_sudo="${2:-}"

  if [[ "$euid" -eq 0 ]]; then
    PRIV_PREFIX=""
    PRIV_REASON="already root (euid 0), no privilege escalation needed"
    return 0
  fi

  if [[ -z "$has_sudo" ]]; then
    # Probed, never assumed from `command -v`: a sudo that prompts for a
    # password is useless to a non-interactive deploy, so require `sudo -n true`.
    has_sudo="false"
    if command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1; then
      has_sudo="true"
    fi
  fi

  if [[ "$has_sudo" == "true" ]]; then
    PRIV_PREFIX="sudo"
    PRIV_REASON="not root (euid $euid); sudo is installed and works non-interactively, escalating with it"
    return 0
  fi

  PRIV_PREFIX=""
  PRIV_REASON="not root (euid $euid) and no usable sudo: neither the current user nor sudo can be used to escalate to the privileges needed to write to $DEPLOY_DIR. Install sudo (apt-get install sudo) and allow it for this user, or re-run the deploy as root."
  return 1
}

if ! resolve_privilege_prefix "$EUID"; then
  die "Insufficient privileges to deploy to $DEPLOY_DIR. $PRIV_REASON"
fi
readonly PRIV_PREFIX PRIV_REASON
# '' or 'sudo ' — the printable form, so the dry-run plan shows exactly what
# would run on THIS machine instead of a plan it could not execute.
readonly PRIV_CMD="${PRIV_PREFIX:+$PRIV_PREFIX }"

# Run a command with exactly the escalation this host needs: nothing as root,
# `sudo <cmd>` otherwise. Never call sudo directly anywhere else in this file.
as_privileged() {
  if [[ -n "$PRIV_PREFIX" ]]; then
    "$PRIV_PREFIX" "$@"
  else
    "$@"
  fi
}

# --------------------------------------------------------------------------
# Check only — the guard has already run and passed (a refusal exited 1 above).
# Print the verdict and leave: no build, no mkdir, no rsync, no chown, no
# reload. This is the mode the tests and the README use to prove a target is
# safe without going anywhere near the filesystem.
# --------------------------------------------------------------------------
if [[ "$CHECK_ONLY" -eq 1 ]]; then
  log "CHECK ONLY — the safety guard ran; nothing else is executed."
  printf '\n'
  info "Safety guard  : PASSED (dedicated subfolder, --delete is contained)"
  info "Project dir   : $PROJECT_DIR"
  info "Deploy dir    : $DEPLOY_DIR"
  info "Web root      : $WEB_ROOT (a parent of the deploy dir would be refused)"
  info "Privilege     : prefix='$PRIV_PREFIX' — $PRIV_REASON"
  info "Public URL    : http://$SERVER_HOST$SITE_PATH"
  printf '\n'
  info "Nothing was built, created, copied or deleted."
  exit 0
fi

# --------------------------------------------------------------------------
# Dry run
# --------------------------------------------------------------------------
if [[ "$DRY_RUN" -eq 1 ]]; then
  log "DRY RUN — nothing below will be executed."
  printf '\n'
  info "Safety guard  : PASSED (dedicated subfolder, --delete is contained)"
  info "Project dir   : $PROJECT_DIR"
  info "Deploy dir    : $DEPLOY_DIR"
  info "Privilege     : prefix='$PRIV_PREFIX' — $PRIV_REASON"
  info "Public URL    : http://$SERVER_HOST$SITE_PATH"
  printf '\n'
  printf 'Plan:\n'
  printf '  1. cd %s\n' "$PROJECT_DIR"
  if [[ -f "$PROJECT_DIR/package-lock.json" ]]; then
    printf '  2. npm ci                 # lockfile present\n'
  else
    printf '  2. npm install            # no package-lock.json found\n'
  fi
  printf '  3. npm run build          # writes ./dist only, never the server path\n'
  printf '  4. verify ./dist/index.html exists\n'
  printf '  5. %srsync -a --delete dist/ "%s"/\n' "$PRIV_CMD" "$DEPLOY_DIR"
  printf '  6. %schown -R %s:%s "%s"\n' "$PRIV_CMD" "$WEB_USER" "$WEB_GROUP" "$DEPLOY_DIR"
  printf '  7. %sfind "%s" -type d -exec chmod 755 {} +\n' "$PRIV_CMD" "$DEPLOY_DIR"
  printf '  8. %sfind "%s" -type f -exec chmod 644 {} +\n' "$PRIV_CMD" "$DEPLOY_DIR"
  printf '  9. reload nginx or apache2 if installed, otherwise skip\n'
  printf '\n'
  printf 'The rsync that WOULD run (it only ever runs after a successful build\n'
  printf 'and a dist/index.html sanity check):\n'
  printf '  %srsync -a --delete dist/ "%s"/\n' "$PRIV_CMD" "$DEPLOY_DIR"
  printf '\n'
  if [[ -z "$PRIV_PREFIX" ]]; then
    printf 'No escalation word appears above: this run is already root, so every\n'
    printf 'command is printed exactly as it would really run.\n\n'
  fi
  log "Dry run complete. Re-run without --dry-run to deploy."
  exit 0
fi

# --------------------------------------------------------------------------
# Preflight
# --------------------------------------------------------------------------
log "Deploying portfolio -> $DEPLOY_DIR"

info "Privileges     : prefix='$PRIV_PREFIX' — $PRIV_REASON"
command -v npm >/dev/null 2>&1 || die "npm was not found on PATH. Install Node.js 18.18+ first."
command -v rsync >/dev/null 2>&1 || die "rsync was not found. Install it: ${PRIV_CMD}apt-get install -y rsync"
[[ -d "$PROJECT_DIR" ]] || die "Project directory not found: $PROJECT_DIR"

# --------------------------------------------------------------------------
# Step 1 — dependencies
# --------------------------------------------------------------------------
cd "$PROJECT_DIR"

log "Step 1/8  Installing dependencies"
if [[ -f package-lock.json ]]; then
  info "package-lock.json found — using npm ci (reproducible install)"
  npm ci
else
  info "no package-lock.json found — falling back to npm install"
  npm install
fi

# --------------------------------------------------------------------------
# Step 2 — build into the LOCAL dist directory
# --------------------------------------------------------------------------
log "Step 2/8  Building into ./dist (never the server path)"
npm run build

# --------------------------------------------------------------------------
# Step 3 — sanity check the build output
# `set -e` already aborts here if the build failed; the explicit check below
# catches a build that "succeeds" but produced nothing usable.
# --------------------------------------------------------------------------
log "Step 3/8  Verifying the build output"
if [[ ! -d "$DIST_DIR" ]]; then
  die "Build directory $DIST_DIR does not exist. Nothing was copied; the live site is untouched."
fi
if [[ ! -f "$DIST_DIR/index.html" ]]; then
  die "$DIST_DIR/index.html is missing, so the build did not produce a usable site. Nothing was copied; the live site is untouched."
fi
if ! grep -q '<div id="root">' "$DIST_DIR/index.html"; then
  die "$DIST_DIR/index.html does not look like the portfolio (no #root element). Refusing to publish it."
fi
if grep -qE '\{(NAME|TITLE|DESCRIPTION|SITE_URL|OG_IMAGE|EMAIL)\}' "$DIST_DIR/index.html"; then
  die "Built index.html still contains placeholder tokens. Check vite/transformHtml.js is active in vite.config.js."
fi
info "dist/index.html looks good ($(wc -c < "$DIST_DIR/index.html") bytes)"

# --------------------------------------------------------------------------
# Step 4 — rsync to the server. CRITICAL ORDERING:
# everything above this line is build + verification. rsync --delete runs ONLY
# after the build exited 0 AND dist/index.html passed the sanity check, so a
# failed build can never empty a live deploy directory. If you ever move the
# rsync block, keep that guarantee.
# --------------------------------------------------------------------------
log "Step 4/8  Copying ./dist -> $DEPLOY_DIR"
info "${PRIV_CMD}rsync -a --delete dist/ \"$DEPLOY_DIR\"/"
as_privileged rsync -a --delete "$DIST_DIR/" "$DEPLOY_DIR"/

# --------------------------------------------------------------------------
# Step 5 — ownership
# --------------------------------------------------------------------------
log "Step 5/8  Setting ownership to $WEB_USER:$WEB_GROUP"
as_privileged chown -R "$WEB_USER:$WEB_GROUP" "$DEPLOY_DIR"

# --------------------------------------------------------------------------
# Step 6 — permissions
# --------------------------------------------------------------------------
log "Step 6/8  Setting permissions (755 directories, 644 files)"
as_privileged find "$DEPLOY_DIR" -type d -exec chmod 755 {} +
as_privileged find "$DEPLOY_DIR" -type f -exec chmod 644 {} +

# --------------------------------------------------------------------------
# Step 7 — reload the web server, if there is one
# --------------------------------------------------------------------------
log "Step 7/8  Reloading the web server (if installed)"
if command -v nginx >/dev/null 2>&1; then
  info "nginx found — checking the configuration"
  if as_privileged nginx -t && as_privileged systemctl reload nginx; then
    info "nginx reloaded"
  else
    warn "nginx config test or reload failed. The files are deployed; check: ${PRIV_CMD}nginx -t"
  fi
elif command -v apache2 >/dev/null 2>&1; then
  info "apache2 found — reloading"
  if as_privileged apache2ctl configtest && as_privileged systemctl reload apache2; then
    info "apache2 reloaded"
  else
    warn "apache2 config test or reload failed. The files are deployed; check: ${PRIV_CMD}apache2ctl configtest"
  fi
elif command -v httpd >/dev/null 2>&1; then
  info "httpd found — reloading"
  if as_privileged httpd -t && as_privileged systemctl reload httpd; then
    info "httpd reloaded"
  else
    warn "httpd config test or reload failed. The files are deployed; check: ${PRIV_CMD}httpd -t"
  fi
else
  info "no nginx, apache2 or httpd binary found — nothing to reload (fine on a build-only machine)"
fi

# --------------------------------------------------------------------------
# Step 8 — summary
# --------------------------------------------------------------------------
log "Deploy complete"
printf '\n'
printf '  Deploy dir : %s\n' "$DEPLOY_DIR"
printf '  Files      : %s\n' "$(find "$DIST_DIR" -type f | wc -l | tr -d ' ') copied from %s\n" "$DIST_DIR"
printf '  Size       : %s\n' "$(du -sh "$DIST_DIR" | cut -f1)"
printf '  URL        : http://%s%s\n' "$SERVER_HOST" "$SITE_PATH"
printf '\n'
printf '  Verify with:\n'
printf '    curl -I http://%s%s\n' "$SERVER_HOST" "$SITE_PATH"
printf '    SERVER_HOST=<server-ip> ./deploy.sh   # to print the real IP instead of localhost\n'
printf '\n'
