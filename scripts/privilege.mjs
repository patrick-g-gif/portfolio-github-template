/**
 * The privilege decision deploy.sh has to make before it touches the server.
 *
 * deploy.sh runs `rsync -a --delete`, `chown -R` and `chmod` against the deploy
 * directory, which normally means escalating with sudo. It used to REQUIRE sudo
 * (`command -v sudo >/dev/null 2>&1 || die "sudo was not found..."`), which broke
 * the deploy on a server where the script is already run as root and the sudo
 * package is simply not installed — common on minimal Debian images and on many
 * VPS control panels. Real observed failure:
 *
 *     ==> Deploying portfolio -> /var/www/html/portfolio
 *     ERROR: sudo was not found. This script needs sudo rights to write to /var/www/html/portfolio.
 *
 * The rule is therefore: escalate only when escalation is actually needed.
 * This function is the pure specification of that rule and is unit-tested in
 * src/test/deploy-guard.test.js; deploy.sh implements the same three branches in
 * bash (`resolve_privilege_prefix`) and prints the result in `--check-only`, so
 * the test can assert that the shell and this file agree.
 */

/**
 * @param {{ euid: number, hasSudo: boolean }} input
 *   euid     — the effective uid the script runs as (0 = root).
 *   hasSudo  — whether sudo is installed AND works non-interactively
 *              (`sudo -n true`); a sudo that prompts for a password is useless
 *              to a non-interactive deploy.
 * @returns {{ prefix: '' | 'sudo', ok: boolean, reason: string }}
 *   prefix — the word every privileged command in deploy.sh is prefixed with.
 *            Empty when no escalation is needed (already root).
 *   ok     — false only when the process cannot possibly write to the target;
 *            the caller must abort with `reason`.
 *   reason — human-readable explanation, safe to print and to log.
 */
export function resolvePrivilegePrefix({ euid, hasSudo }) {
  // Already root: nothing to escalate. Shelling out to sudo here would be a
  // pointless extra process (and on a root-only server sudo often isn't even
  // installed, which is exactly what broke the deploy).
  if (euid === 0) {
    return {
      prefix: '',
      ok: true,
      reason: `already root (euid 0), no privilege escalation needed`,
    }
  }

  // Not root, but sudo is available and works without a password prompt.
  if (hasSudo) {
    return {
      prefix: 'sudo',
      ok: true,
      reason: `not root (euid ${euid}); sudo is installed and works non-interactively, escalating with it`,
    }
  }

  // Not root and no usable sudo: no way to write to /var/www/html/portfolio.
  // Name the missing privilege, not just the missing binary.
  return {
    prefix: '',
    ok: false,
    reason:
      `not root (euid ${euid}) and no usable sudo: neither the current user nor sudo can be ` +
      `used to escalate to the privileges needed to write to the deploy directory. ` +
      `Install sudo (apt-get install sudo) and allow it for this user, or re-run the deploy as root.`,
  }
}