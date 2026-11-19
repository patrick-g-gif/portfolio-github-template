/**
 * ============================================================================
 *  vite/transformHtml.js — fills the placeholder tokens in index.html
 * ============================================================================
 *
 *  WHAT THIS SOLVES
 *  index.html ships literal tokens — {NAME}, {TITLE}, {DESCRIPTION}, {SITE_URL},
 *  {OG_IMAGE} and {EMAIL} — in the <title>, the meta description, the canonical
 *  link, the Open Graph tags and the Twitter tags. Nobody edits index.html, so
 *  those tokens have to be filled in by the build, or the page ships with
 *  "{NAME} — {TITLE}" as its document title.
 *
 *  This plugin does that substitution. It works in BOTH modes:
 *    - `vite`       (dev server)  -> transformIndexHtml runs per page load
 *    - `vite build` (production) -> transformIndexHtml runs on index.html
 *
 *  The values come from src/data/portfolio.js, which stays the single file to
 *  edit. Edit the `identity` / `seo` / `contact` blocks there and the dev
 *  server and the built site both follow on the next reload/build.
 *
 *  IT DELIBERATELY DOES NOT
 *    - rewrite asset URLs (Vite owns that; `base: './'` keeps them relative so
 *      the site works at a domain root, in a /portfolio subfolder and on
 *      Vercel with no code changes),
 *    - add new <script>/<link> tags,
 *    - fail the build when it meets an unknown `{TOKEN}` — it warns instead, so
 *      a typo in someone's copy cannot break `npm run build`.
 */

import { stat } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

/** Project root, derived from this file's own location (…/vite/transformHtml.js). */
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const DEFAULT_DATA_MODULE = resolve(PROJECT_ROOT, 'src/data/portfolio.js')

/** Matches an unsubstituted placeholder token, e.g. {NAME} or {OG_IMAGE}. */
const TOKEN_PATTERN = /\{[A-Z][A-Z0-9_]*\}/g

/**
 * Escapes a value so it is safe inside an HTML attribute (all attributes in
 * index.html are double-quoted) and still renders correctly in text nodes such
 * as <title> — &amp; and &quot; are decoded by the HTML parser in both places.
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Strips a trailing slash so `${siteUrl}${path}` never doubles up. */
function trimTrailingSlash(url) {
  return String(url).replace(/\/+$/, '')
}

/** Turns 'a sentence. Another one.' into 'a sentence.' */
export function firstSentence(text, fallback = '') {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (!clean) return fallback
  const match = clean.match(/^.*?[.!?](?=\s|$)/)
  return (match ? match[0] : clean).trim()
}

/**
 * Builds the token -> value map from the exports of src/data/portfolio.js.
 * Exported so it can be unit-tested without spinning up Vite.
 */
export function buildTokens(portfolio = {}) {
  const { identity = {}, seo = {}, contact = {}, about = {} } = portfolio

  const name = identity.name || ''
  const title = identity.title || identity.shortTitle || ''
  const siteUrl = trimTrailingSlash(seo.siteUrl || contact.website || '')
  const ogImagePath = String(seo.ogImage || '/og-image.png')
  // og:image must be an ABSOLUTE url or social platforms will not fetch it.
  const ogImage = /^https?:\/\//i.test(ogImagePath)
    ? ogImagePath
    : `${siteUrl}${ogImagePath.startsWith('/') ? '' : '/'}${ogImagePath}`

  const description =
    seo.description || firstSentence(about.bio?.[0], `${name} — ${title}`.trim()) || `${name} — ${title}`.trim()

  /*
   * Cache-bust the share image.
   *
   * Discord, WhatsApp and Slack cache OG images aggressively — often for weeks —
   * keyed only by URL. Without a version query, a regenerated preview keeps
   * serving the OLD image (which is how the old name survived here). Bumping
   * `ogImageVersion` in portfolio.js changes the URL, so platforms refetch.
   */
  const ogImageVersion = String(seo.ogImageVersion ?? '2').replace(/^\?/, '')
  const versionedOgImage = /[?&]v=/.test(ogImage) ? ogImage : `${ogImage}?v=${ogImageVersion}`

  return {
    '{NAME}': escapeHtml(name),
    '{TITLE}': escapeHtml(title),
    '{DESCRIPTION}': escapeHtml(description),
    '{SITE_URL}': escapeHtml(siteUrl),
    '{OG_IMAGE}': escapeHtml(versionedOgImage),
    '{EMAIL}': escapeHtml(contact.email || ''),
  }
}

/**
 * Replaces every token in `html`. split/join rather than a single regex pass so
 * a value that happens to contain a token-looking string is not re-substituted.
 */
export function applyTokens(html, tokens) {
  let output = html
  for (const [token, value] of Object.entries(tokens)) {
    output = output.split(token).join(value)
  }
  return output
}

/** Tokens that survived substitution — always a bug worth shouting about. */
export function findLeftoverTokens(html) {
  return [...new Set(html.match(TOKEN_PATTERN) ?? [])]
}

/**
 * Reads the data module, re-reading it only when the file changed on disk.
 * The `?t=<mtime>` query keeps Node's ESM cache from serving a stale copy
 * after an edit, so editing portfolio.js and reloading in dev is enough.
 */
export function createDataLoader(dataModule = DEFAULT_DATA_MODULE) {
  let cached = null

  return async function loadPortfolio() {
    const { mtimeMs } = await stat(dataModule)
    if (cached && cached.mtimeMs === mtimeMs) return cached.portfolio

    const href = pathToFileURL(dataModule).href
    const portfolio = await import(`${href}?t=${mtimeMs}`)
    cached = { mtimeMs, portfolio }
    return portfolio
  }
}

/**
 * The plugin itself.
 *
 * @param {object} [options]
 * @param {string} [options.dataModule]  override the portfolio data file path
 * @param {boolean} [options.strict]     throw instead of warn on leftover tokens
 */
export function transformHtmlPlugin(options = {}) {
  let loadPortfolio = createDataLoader(options.dataModule)
  const strict = options.strict === true
  let projectRoot = PROJECT_ROOT
  let logger = console

  /** Shared by both the dev and build paths so they can never drift apart. */
  async function render(html, filename) {
    const portfolio = await loadPortfolio()
    const output = applyTokens(html, buildTokens(portfolio))

    const leftover = findLeftoverTokens(output)
    if (leftover.length > 0) {
      const message =
        `[transform-html] unsubstituted token(s) ${leftover.join(', ')} left in ` +
        `${filename}. Add them to buildTokens() in vite/transformHtml.js, or fix the value in src/data/portfolio.js.`
      if (strict) throw new Error(message)
      logger.warn(message)
    }
    return output
  }

  return {
    name: 'portfolio-transform-html',
    // Run before Vite's own HTML pipeline so the tokens are already gone by
    // the time Vite rewrites asset URLs in dev and at build time.
    enforce: 'pre',

    configResolved(config) {
      // config.root is the directory vite was started from — more reliable than
      // a path baked in at config-bundle time.
      projectRoot = config.root ? resolve(config.root) : projectRoot
      if (config.logger) logger = config.logger

      const resolvedDataModule = options.dataModule
        ? resolve(options.dataModule)
        : resolve(projectRoot, 'src/data/portfolio.js')
      // Point the loader at the resolved path when it differs from the default.
      if (resolvedDataModule !== DEFAULT_DATA_MODULE) {
        loadPortfolio = createDataLoader(resolvedDataModule)
      }
    },

    /**
     * Called by Vite for the entry HTML in BOTH `vite` (serve) and `vite build`.
     * Returning the rewritten string is all that is needed; `enforce: 'pre'`
     * means this runs first.
     */
    async transformIndexHtml(html, ctx = {}) {
      const filename = ctx.filename ?? resolve(projectRoot, 'index.html')
      return render(html, filename)
    },

    /** Editing the data file must re-run the HTML transform on the next load. */
    handleHotUpdate(ctx) {
      if (ctx.file === resolve(projectRoot, 'src/data/portfolio.js')) {
        const mod = ctx.server?.moduleGraph?.getModuleById('\0' + ctx.file)
        if (mod) ctx.server.moduleGraph.invalidateModule(mod)
      }
      return undefined
    },
  }
}

export default transformHtmlPlugin
