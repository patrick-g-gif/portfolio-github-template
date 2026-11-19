/**
 * ============================================================================
 *  scripts/check-dev-html.mjs — proves the DEV SERVER serves filled-in SEO tags
 * ============================================================================
 *
 *  `vite build` proves the production output. This proves the other half of the
 *  requirement: the dev server must serve a real <title> too, not a token.
 *
 *  It starts Vite in-process (no shell, no background job), fetches `/` over
 *  HTTP, prints the <title> plus the OG tags, and exits non-zero if any
 *  placeholder token survived. Run it with:
 *
 *      npm run verify:dev
 */

import { createServer } from 'vite'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findLeftoverTokens } from '../vite/transformHtml.js'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const URL = 'http://127.0.0.1:5177/'

const server = await createServer({
  root: projectRoot,
  logLevel: 'warn',
  server: { host: '127.0.0.1', port: 5177, strictPort: true },
})

try {
  await server.listen()
  const response = await fetch(URL)
  const html = await response.text()

  console.log(`GET ${URL} -> HTTP ${response.status}`)
  console.log('')

  for (const [label, pattern] of [
    ['title', /<title>([\s\S]*?)<\/title>/],
    ['description', /name="description"[\s\S]*?content="([\s\S]*?)"/],
    ['canonical', /rel="canonical" href="([\s\S]*?)"/],
    ['og:title', /property="og:title" content="([\s\S]*?)"/],
    ['og:image', /property="og:image" content="([\s\S]*?)"/],
    ['twitter:image', /name="twitter:image" content="([\s\S]*?)"/],
  ]) {
    const match = html.match(pattern)
    console.log(`${label.padEnd(14)} ${match ? match[1].trim() : 'NOT FOUND'}`)
  }

  const leftover = findLeftoverTokens(html)
  if (leftover.length > 0) {
    console.error(`\nFAIL: unsubstituted token(s) served by the dev server: ${leftover.join(', ')}`)
    process.exitCode = 1
  } else {
    console.log('\nOK: the dev server served no placeholder tokens.')
  }
} finally {
  await server.close()
}
