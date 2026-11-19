/**
 * TDD: the deploy.sh safety guard.
 *
 * `./deploy.sh --check-only DEPLOY_DIR` runs the guard and nothing else: it
 * never builds, never copies, never runs rsync, and never touches the target
 * directory. It exits 0 when the target is safe and 1 when the guard refuses,
 * so it can be asserted on directly from a test.
 *
 * Why this matters: deploy.sh runs `rsync -a --delete`, which removes anything
 * in the destination that is not in ./dist. A one-segment typo such as
 * /var/www would delete /var/www/html and with it every live site on the
 * server, so the guard is unit-tested here rather than trusted.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { resolvePrivilegePrefix } from '../../scripts/privilege.mjs'

const projectRoot = resolve(__dirname, '../..')
const deployScript = resolve(projectRoot, 'deploy.sh')

/**
 * Run the guard only. `dir` may be null to exercise DEPLOY_DIR from the
 * environment instead of the positional argument. Returns { status, stdout, stderr }.
 */
function check(dir, { cwd = projectRoot, env = {} } = {}) {
  const args = [deployScript, '--check-only']
  if (dir !== null && dir !== undefined) args.push(dir)
  const result = spawnSync('bash', args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, DEPLOY_DIR: undefined, ...env },
  })
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' }
}

/**
 * A refusal must be a REAL refusal from the guard (exit 1 + the abort banner),
 * not just any non-zero status — `--check-only` itself is a new flag, and an
 * "Unknown option" exit would otherwise make a refused test pass for the
 * wrong reason.
 */
function expectRefused(run, { reasonContains = [] } = {}) {
  expect(run.status).toBe(1)
  expect(run.stderr).toContain('DEPLOY ABORTED')
  expect(run.stderr).toContain('Reason              :')
  expect(run.stderr).toContain('rsync -a --delete')
  reasonContains.forEach((fragment) => expect(run.stderr).toContain(fragment))
  expect(run.stdout).not.toContain('Safety guard  : PASSED')
}

function expectAllowed(run, expectedDir) {
  expect(run.status).toBe(0)
  expect(run.stderr).not.toContain('DEPLOY ABORTED')
  expect(run.stdout).toContain('Safety guard  : PASSED')
  expect(run.stdout).toContain(`Deploy dir    : ${expectedDir}`)
}

/** The privilege facts of the machine running the tests: am I root, does sudo work? */
function hostPrivileges() {
  const euid = typeof process.getuid === 'function' ? process.getuid() : 0
  const probe = spawnSync('sudo', ['-n', 'true'], { encoding: 'utf8' })
  return { euid, hasSudo: probe.status === 0 }
}

/** The prefix deploy.sh reported in --check-only, or null when it printed none. */
function reportedPrefix(stdout) {
  const match = stdout.match(/Privilege\s+: prefix='([^']*)'/)
  return match ? match[1] : null
}

describe('deploy guard — refuses dangerous targets', () => {
  it('refuses the web root itself', () => {
    // /var/www/html hosts chat-app, edan and game-website.
    expectRefused(check('/var/www/html'), {
      reasonContains: ['/var/www/html already hosts other live sites'],
    })
  })

  it('refuses the filesystem root', () => {
    // The literal "/" branch must keep its more specific message.
    expectRefused(check('/'), {
      reasonContains: ['"/" is the filesystem root'],
    })
  })

  it('refuses an empty directory', () => {
    expectRefused(check(''), {
      reasonContains: ['it is empty'],
    })
  })

  // REGRESSION — this was the bug: /var/www has two path segments and is not
  // string-equal to the web root, so the old guard accepted it.
  // `rsync -a --delete dist/ /var/www/` deletes /var/www/html, which takes out
  // the live sites chat-app, edan and game-website — every site on the server.
  it('refuses /var/www, a parent of the web root', () => {
    expectRefused(check('/var/www'), {
      reasonContains: ['/var/www', 'PARENT', '/var/www/html'],
    })
  })

  // Same class of bug one level up: would delete /var, /var/www and /var/www/html.
  it('refuses /var, a grandparent of the web root', () => {
    expectRefused(check('/var'), {
      reasonContains: ['/var', 'PARENT', '/var/www/html'],
    })
  })

  it('refuses a top-level directory with fewer than two segments', () => {
    expectRefused(check('/srv'), {
      reasonContains: ['fewer than two path segments'],
    })
  })

  it('still refuses a relative path with fewer than two segments', () => {
    // Normalisation turns `.` into an absolute path with many segments, but it
    // must never turn a previously refused target into an accepted one.
    expectRefused(check('.'), {
      reasonContains: ['fewer than two path segments'],
    })
    expectRefused(check('portfolio'), {
      reasonContains: ['fewer than two path segments'],
    })
  })

  it('refuses a path that only resolves to the web root after normalisation', () => {
    // `/var/www/html/.` is not string-equal to WEB_ROOT, but realpath collapses
    // the dot, so the rsync target is the web root.
    expectRefused(check('/var/www/html/.'), {
      reasonContains: ['PARENT', '/var/www/html'],
    })
  })

  it('refuses a relative path that resolves to an ancestor of the web root', () => {
    // Normalisation must happen BEFORE the check, never after: `..` from
    // /var/www/html is /var/www, which must still be refused.
    const run = check('..', { cwd: '/var/www/html' })
    expectRefused(run, { reasonContains: ['PARENT', '/var/www/html'] })
    expect(run.stderr).toContain('resolves to "/var/www"')
  })

  it('refuses an ancestor passed through DEPLOY_DIR instead of an argument', () => {
    const run = check(null, { env: { DEPLOY_DIR: '/var/www' } })
    expectRefused(run, { reasonContains: ['PARENT', '/var/www/html'] })
  })
})

describe('deploy guard — allows a dedicated subfolder', () => {
  it('allows /var/www/portfolio', () => {
    expectAllowed(check('/var/www/portfolio'), '/var/www/portfolio')
  })

  it('allows /var/www/html/portfolio', () => {
    expectAllowed(check('/var/www/html/portfolio'), '/var/www/html/portfolio')
  })

  it('allows a trailing slash', () => {
    expectAllowed(check('/var/www/portfolio/'), '/var/www/portfolio')
  })

  it('allows a double slash, which collapses to the same target', () => {
    expectAllowed(check('/var/www/html//portfolio'), '/var/www/html/portfolio')
  })

  it('allows a directory outside the web root', () => {
    expectAllowed(check('/tmp/portfolio'), '/tmp/portfolio')
  })

  it('allows a subfolder below the web root and prints its URL path', () => {
    const run = check('/var/www/html/portfolio')
    expect(run.stdout).toContain('Public URL    : http://localhost/portfolio/')
  })
})

describe('check-only mode never touches the filesystem', () => {
  const tempDirs = []

  afterEach(() => {
    tempDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true }))
    tempDirs.length = 0
  })

  it('does not create the target directory for a passing check', () => {
    const parent = mkdtempSync(join(tmpdir(), 'deploy-guard-'))
    tempDirs.push(parent)
    const target = join(parent, 'portfolio')
    expect(existsSync(target)).toBe(false)
    expectAllowed(check(target), target)
    expect(existsSync(target)).toBe(false)
    expect(existsSync(parent)).toBe(true)
  })

  it('prints the plan-free verdict without building or rsyncing', () => {
    const run = check('/var/www/html/portfolio')
    expect(run.stdout).toContain('CHECK ONLY')
    expect(run.stdout).not.toContain('rsync')
    expect(run.stdout).not.toContain('npm ci')
  })
})

/**
 * THE SUDO REGRESSION.
 *
 * deploy.sh used to abort in preflight with
 *   `command -v sudo >/dev/null 2>&1 || die "sudo was not found. ..."`
 * so it refused to deploy on a server where it is already run as root and the
 * sudo package is not installed at all:
 *
 *     ==> Deploying portfolio -> /var/www/html/portfolio
 *     ERROR: sudo was not found. This script needs sudo rights to write to /var/www/html/portfolio.
 *
 * Escalation is now conditional: root needs none, everyone else uses sudo if it
 * works non-interactively, and only a non-root user with no usable sudo is
 * refused — with a message about the missing privilege.
 */
describe('privilege resolution — sudo is optional, not mandatory', () => {
  it('uses an empty prefix when already root and sudo is absent (the regression)', () => {
    // Exactly this server: euid 0, no sudo package. Must deploy, not abort.
    expect(resolvePrivilegePrefix({ euid: 0, hasSudo: false })).toEqual({
      prefix: '',
      ok: true,
      reason: expect.stringContaining('already root'),
    })
  })

  it('still uses an empty prefix when root even if sudo is installed', () => {
    // Root must not shell out to sudo: pointless, and it can prompt/fail.
    expect(resolvePrivilegePrefix({ euid: 0, hasSudo: true })).toEqual({
      prefix: '',
      ok: true,
      reason: expect.stringContaining('already root'),
    })
  })

  it('escalates with sudo when not root and sudo works', () => {
    expect(resolvePrivilegePrefix({ euid: 1000, hasSudo: true })).toEqual({
      prefix: 'sudo',
      ok: true,
      reason: expect.stringContaining('sudo'),
    })
  })

  it('refuses a non-root user with no usable sudo, naming the missing privilege', () => {
    const decision = resolvePrivilegePrefix({ euid: 1000, hasSudo: false })
    expect(decision.ok).toBe(false)
    expect(decision.prefix).toBe('')
    // Not merely "sudo not found": say what privilege is missing and what to do.
    expect(decision.reason).toMatch(/privileg/i)
    expect(decision.reason).toContain('euid 1000')
    expect(decision.reason).toMatch(/apt-get install sudo|as root/)
  })

  it('treats a sudo that needs a password prompt as unusable', () => {
    // `hasSudo` must be probed with `sudo -n true`, never assumed from `command -v`.
    expect(resolvePrivilegePrefix({ euid: 1000, hasSudo: false }).ok).toBe(false)
  })
})

describe('deploy.sh privilege prefix — bash and the pure function agree', () => {
  it('--check-only reports the same prefix the pure function resolves', () => {
    const host = hostPrivileges()
    const run = check('/var/www/html/portfolio')
    expectAllowed(run, '/var/www/html/portfolio')
    expect(reportedPrefix(run.stdout)).toBe(resolvePrivilegePrefix(host).prefix)
  })

  it('--check-only prints a reason, and never the word rsync', () => {
    const run = check('/var/www/html/portfolio')
    expect(run.stdout).toMatch(/Privilege\s+: prefix='[^']*' — .+/)
    expect(run.stdout).not.toContain('rsync')
  })

  it('runs without sudo when the host is root, so the plan cannot contain sudo', () => {
    const host = hostPrivileges()
    const plan = spawnSync('bash', [deployScript, '--dry-run', '/var/www/html/portfolio'], {
      cwd: projectRoot,
      encoding: 'utf8',
      env: { ...process.env, DEPLOY_DIR: undefined },
    })
    expect(plan.status).toBe(0)
    expect(plan.stdout).toContain('rsync -a --delete') // the plan is still printed
    if (host.euid === 0) {
      expect(reportedPrefix(plan.stdout)).toBe('')
      expect(plan.stdout).not.toContain('sudo')
    }
  })

  it('no privileged command is hardcoded to sudo any more', () => {
    // Every sudo invocation must go through the resolved prefix, so the dry-run
    // plan reflects what would really run on this machine.
    const source = readFileSync(deployScript, 'utf8').split('\n')
    const code = source
      .map((line, index) => ({ line: line.replace(/^\s*#.*$/, ''), number: index + 1 }))
      .filter((entry) => entry.line.trim() !== '')

    const hardcoded = code.filter((entry) =>
      /\bsudo\s+(rsync|chown|chmod|find|nginx|apache2ctl|httpd|systemctl|apt-get|npm|bash|sh)\b/.test(
        entry.line,
      ),
    )
    expect(hardcoded).toEqual([])

    // sudo may only be mentioned inside the resolver itself (the probe), never
    // as a hard requirement somewhere else in the script.
    const resolverStart = code.findIndex((entry) => /resolve_privilege_prefix\(\)/.test(entry.line))
    expect(resolverStart).toBeGreaterThan(-1)
    const resolverEnd = code.findIndex((entry, index) => index > resolverStart && entry.line.trim() === '}')
    expect(resolverEnd).toBeGreaterThan(resolverStart)
    const mentioning = code.filter(
      (entry, index) =>
        (index <= resolverStart || index > resolverEnd) && /\bsudo\b/.test(entry.line),
    )
    expect(mentioning).toEqual([])
  })

  it('the preflight no longer aborts on a root host with no sudo', () => {
    const host = hostPrivileges()
    if (host.euid !== 0) return // the assertion below only means something as root
    const run = check('/var/www/html/portfolio')
    expect(run.status).toBe(0)
    expect(run.stderr).not.toContain('sudo was not found')
  })
})