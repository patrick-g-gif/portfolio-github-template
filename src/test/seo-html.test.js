/**
 * SEO token fill: index.html must never reach a browser (or dist/) with a
 * literal {NAME} / {TITLE} / {DESCRIPTION} / {SITE_URL} / {OG_IMAGE} / {EMAIL}
 * token in it. The vite plugin in vite/transformHtml.js fills them from
 * src/data/portfolio.js in dev and at build time.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import {
  applyTokens,
  buildTokens,
  findLeftoverTokens,
  firstSentence,
  transformHtmlPlugin,
} from '../../vite/transformHtml.js'
import { identity, seo, contact } from '../data/portfolio.js'

const projectRoot = resolve(__dirname, '../..')
const indexHtml = readFileSync(join(projectRoot, 'index.html'), 'utf8')

/** Runs the plugin exactly the way vite does: configResolved, then transformIndexHtml. */
async function transform(template = indexHtml) {
  const warnings = []
  const plugin = transformHtmlPlugin()
  plugin.configResolved({
    root: projectRoot,
    logger: { ...console, warn: (msg) => warnings.push(msg) },
  })
  const output = await plugin.transformIndexHtml(template, {
    filename: join(projectRoot, 'index.html'),
  })
  return { output, warnings }
}

describe('seo token helpers', () => {
  it('firstSentence returns the first sentence of the bio', () => {
    expect(firstSentence('Network engineer. Second sentence.')).toBe('Network engineer.')
    expect(firstSentence('No full stop here')).toBe('No full stop here')
    expect(firstSentence('', 'fallback')).toBe('fallback')
    expect(firstSentence(undefined, 'fallback')).toBe('fallback')
  })

  it('buildTokens reads identity/seo/contact and keeps og:image absolute', () => {
    const tokens = buildTokens({ identity, seo, contact })

    expect(tokens['{NAME}']).toBe(identity.name)
    expect(tokens['{TITLE}']).toBe(identity.title)
    expect(tokens['{DESCRIPTION}']).toBe(seo.description)
    expect(tokens['{SITE_URL}']).toBe(seo.siteUrl)
    expect(tokens['{EMAIL}']).toBe(contact.email)
    // og:image must be absolute or social platforms will not fetch it, and it
    // carries a cache-busting version so a regenerated preview is actually
    // refetched instead of served from Discord/WhatsApp's cache.
    const version = String(seo.ogImageVersion ?? '2')
    expect(tokens['{OG_IMAGE}']).toBe(`${seo.siteUrl}${seo.ogImage}?v=${version}`)
    expect(tokens['{OG_IMAGE}']).toMatch(/^https:\/\//)
  })

  it('escapes characters that would break an HTML attribute', () => {
    const tokens = buildTokens({
      identity: { name: 'A & "B"', title: '<script>' },
      seo: { siteUrl: 'https://x.test' },
      contact: { email: 'a@b.test' },
    })
    expect(tokens['{NAME}']).toBe('A &amp; &quot;B&quot;')
    expect(tokens['{TITLE}']).toBe('&lt;script&gt;')
  })

  it('applyTokens replaces every occurrence, not just the first', () => {
    const out = applyTokens('{NAME} and {NAME} and {TITLE}', { '{NAME}': 'X', '{TITLE}': 'Y' })
    expect(out).toBe('X and X and Y')
  })

  it('findLeftoverTokens ignores inline JS braces', () => {
    expect(findLeftoverTokens('function () { return { a: 1 } }')).toEqual([])
    expect(findLeftoverTokens('{NAME}')).toEqual(['{NAME}'])
  })
})

describe('transformHtml plugin', () => {
  it('fills every token in the real index.html', async () => {
    const { output, warnings } = await transform()

    expect(findLeftoverTokens(output)).toEqual([])
    expect(warnings).toEqual([])

    expect(output).toContain(`<title>${identity.name} — ${identity.title}</title>`)
    expect(output).toContain(`content="${seo.description}"`)
    expect(output).toContain(`<link rel="canonical" href="${seo.siteUrl}" />`)
    expect(output).toContain(`property="og:title" content="${identity.name} — ${identity.title}"`)
    expect(output).toContain(`property="og:image" content="${seo.siteUrl}${seo.ogImage}?v=${seo.ogImageVersion ?? '2'}"`)
    expect(output).toContain(`name="twitter:image" content="${seo.siteUrl}${seo.ogImage}?v=${seo.ogImageVersion ?? '2'}"`)
    expect(output).toContain(`mailto:${contact.email}`)
    expect(output).toContain(contact.email)

    // Structure Vite still owns must survive untouched
    expect(output).toContain('<div id="root"></div>')
    expect(output).toContain('href="./favicon.svg"')
    expect(output).toContain('<script type="module" src="/src/main.jsx"></script>')
  })

  it('keeps the placeholder tokens in the template itself (one source of truth)', () => {
    for (const token of ['{NAME}', '{TITLE}', '{DESCRIPTION}', '{SITE_URL}', '{OG_IMAGE}', '{EMAIL}']) {
      expect(indexHtml).toContain(token)
    }
  })

  it('warns instead of throwing on an unknown token', async () => {
    const { output, warnings } = await transform('<title>{NAME} {MYSTERY}</title>')
    expect(output).toContain('{MYSTERY}')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('{MYSTERY}')
  })

  it('throws on an unknown token in strict mode', async () => {
    const plugin = transformHtmlPlugin({ strict: true })
    plugin.configResolved({ root: projectRoot, logger: console })
    await expect(
      plugin.transformIndexHtml('<title>{NOPE}</title>', { filename: 'index.html' }),
    ).rejects.toThrow('{NOPE}')
  })

  it('picks up a change in the data file without restarting', async () => {
    const { output } = await transform('<title>{NAME}</title>')
    expect(output).toBe(`<title>${identity.name}</title>`)
  })

  it('is a vite plugin with the expected shape', () => {
    const plugin = transformHtmlPlugin()
    expect(plugin.name).toBe('portfolio-transform-html')
    expect(plugin.enforce).toBe('pre')
    expect(typeof plugin.transformIndexHtml).toBe('function')
    expect(typeof plugin.configResolved).toBe('function')
  })
})
