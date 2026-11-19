/**
 * Build smoke check: runs the real production build and verifies the output
 * that gets copied to /var/www/html (or Vercel) is complete and self-contained.
 */
import { describe, it, expect, afterAll } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, readdirSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const projectRoot = resolve(__dirname, '../..')
const outDir = mkdtempSync(join(tmpdir(), 'portfolio-build-'))

describe('production build smoke test', () => {
  it('builds with vite and produces a deployable dist', () => {
    expect(existsSync(outDir)).toBe(true)

    const output = execFileSync('npx', ['vite', 'build', '--outDir', outDir, '--emptyOutDir'], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    // index.html must exist and reference hashed assets with relative URLs
    const indexPath = join(outDir, 'index.html')
    expect(existsSync(indexPath)).toBe(true)
    const html = readFileSync(indexPath, 'utf8')

    expect(html).toContain('<title>')
    expect(html).toContain('name="description"')
    expect(html).toContain('property="og:title"')
    expect(html).toContain('rel="icon"')
    expect(html).toMatch(/<script[^>]+src="\.\/assets\//)
    expect(html).toMatch(/<link[^>]+href="\.\/assets\/index-[^"]+\.css"/)
    // no absolute "/assets/..." URLs (they would 404 in a subfolder)
    expect(html).not.toMatch(/(src|href)="\/assets\//)

    const assets = join(outDir, 'assets')
    expect(existsSync(assets)).toBe(true)
    const files = readdirSync(assets)
    expect(files.some((f) => f.endsWith('.js'))).toBe(true)
    expect(files.some((f) => f.endsWith('.css'))).toBe(true)
    files.forEach((file) => expect(statSync(join(assets, file)).size).toBeGreaterThan(0))

    // every referenced asset must exist on disk -> no 404 risk after deploy
    const referenced = [...html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+)"/g)].map((m) => m[1])
    referenced.forEach((relative) => {
      expect(existsSync(join(outDir, relative))).toBe(true)
    })
    expect(referenced.length).toBeGreaterThanOrEqual(2)

    // static files that must be copied verbatim
    expect(existsSync(join(outDir, 'favicon.svg'))).toBe(true)

    // no leftover source maps or empty chunks
    expect(files.some((f) => f.endsWith('.map'))).toBe(false)

    expect(output).toContain('built in')
  })
})

afterAll(() => {
  try {
    rmSync(outDir, { recursive: true, force: true })
  } catch {
    /* best effort */
  }
})
