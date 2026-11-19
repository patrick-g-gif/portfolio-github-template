/**
 * ============================================================================
 *  scripts/generate-og-image.mjs — writes public/og-image.png (1200x630)
 * ============================================================================
 *
 *  WHY THIS SCRIPT HAS ZERO DEPENDENCIES
 *  The usual approach is to draw with `sharp` or `canvas`. Neither is
 *  installable in this environment (no network / npm install is not allowed
 *  here), so this script writes the PNG bytes itself using only Node's built-in
 *  `node:zlib`. That is the documented fallback: the file is a real, valid
 *  1200x630 PNG, and regenerating it never needs an npm install.
 *
 *  Regenerate it with:
 *      npm run generate:og
 *
 *  It reads the text straight out of src/data/portfolio.js, so the preview
 *  image says the same thing as the <title> and the Open Graph tags.
 */

import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(HERE, '..')
const OUT_FILE = resolve(PROJECT_ROOT, 'public/og-image.png')
const DATA_MODULE = resolve(PROJECT_ROOT, 'src/data/portfolio.js')

const WIDTH = 1200
const HEIGHT = 630

/* -------------------------------------------------------------------------
 * 1. Text data (single source of truth: src/data/portfolio.js)
 * ---------------------------------------------------------------------- */
const portfolio = await import(pathToFileURL(DATA_MODULE).href)
const name = portfolio.identity?.name ?? 'Your Name'
const title = portfolio.identity?.title ?? portfolio.identity?.shortTitle ?? ''
const siteUrl = String(portfolio.seo?.siteUrl ?? '').replace(/\/+$/, '')

/*
 * OG-only overrides.
 *
 * The share image needs a shorter, scannable tagline and a tighter badge set
 * than the page itself. The hero tagline reads as a sentence for visitors; in a
 * 1200x630 preview it would be truncated mid-word. Likewise the badge row is
 * capped at four short labels here so nothing has to be truncated away.
 *
 * These are deliberately NOT read from identity.tagline / hero.badges, because
 * changing those would also change the live site — the two are different jobs.
 * Keep this table in sync with portfolio.js if the skills ever change.
 */
const OG_TEXT = {
  tagline: 'Jaringan, server, dan fiber optic',
  badges: ['MikroTik', 'Debian Server', 'Proxmox', 'Fiber Optic'],
  footerRight: 'NETWORK PORTFOLIO',
}
const tagline = OG_TEXT.tagline
const badges = OG_TEXT.badges

/* -------------------------------------------------------------------------
 * 2. Tiny raster canvas (RGB, 8 bits per channel)
 * ---------------------------------------------------------------------- */
class Canvas {
  constructor(width, height) {
    this.width = width
    this.height = height
    this.data = new Uint8Array(width * height * 3)
  }

  set(x, y, [r, g, b], alpha = 1) {
    // Round to the nearest pixel centre: sub-pixel coordinates are normal here
    // (lines and circles land on fractional coordinates).
    const px = Math.round(x)
    const py = Math.round(y)
    if (px < 0 || py < 0 || px >= this.width || py >= this.height || alpha <= 0) return
    const i = (py * this.width + px) * 3
    if (alpha >= 1) {
      this.data[i] = r
      this.data[i + 1] = g
      this.data[i + 2] = b
      return
    }
    this.data[i] = Math.round(this.data[i] * (1 - alpha) + r * alpha)
    this.data[i + 1] = Math.round(this.data[i + 1] * (1 - alpha) + g * alpha)
    this.data[i + 2] = Math.round(this.data[i + 2] * (1 - alpha) + b * alpha)
  }

  /** Vertical gradient with an optional diagonal tint. */
  fillGradient(top, bottom) {
    for (let y = 0; y < this.height; y += 1) {
      const t = y / (this.height - 1)
      const r = Math.round(top[0] + (bottom[0] - top[0]) * t)
      const g = Math.round(top[1] + (bottom[1] - top[1]) * t)
      const b = Math.round(top[2] + (bottom[2] - top[2]) * t)
      for (let x = 0; x < this.width; x += 1) {
        this.set(x, y, [r, g, b])
      }
    }
  }

  /** Soft radial glow, used behind the network motif. */
  glow(cx, cy, radius, color, strength = 0.5) {
    for (let y = Math.max(0, cy - radius); y < Math.min(this.height, cy + radius); y += 1) {
      for (let x = Math.max(0, cx - radius); x < Math.min(this.width, cx + radius); x += 1) {
        const d = Math.hypot(x - cx, y - cy)
        if (d > radius) continue
        const falloff = (1 - d / radius) ** 2
        this.set(x, y, color, falloff * strength)
      }
    }
  }

  rect(x, y, w, h, color, alpha = 1) {
    for (let dy = 0; dy < h; dy += 1) {
      for (let dx = 0; dx < w; dx += 1) this.set(x + dx, y + dy, color, alpha)
    }
  }

  /** Anti-aliased-ish filled circle. */
  circle(cx, cy, radius, color, alpha = 1) {
    const r = Math.ceil(radius)
    for (let y = -r; y <= r; y += 1) {
      for (let x = -r; x <= r; x += 1) {
        const d = Math.hypot(x, y)
        const edge = radius - d
        if (edge <= -1) continue
        const cover = edge >= 0 ? 1 : edge + 1
        this.set(cx + x, cy + y, color, alpha * cover)
      }
    }
  }

  /** Anti-aliased-ish line segment: a 1px core plus two dimmer offset passes. */
  line(x0, y0, x1, y1, color, alpha = 1, width = 2) {
    const dx = x1 - x0
    const dy = y1 - y0
    const steps = Math.ceil(Math.hypot(dx, dy))
    if (steps === 0) {
      this.circle(x0, y0, width / 2, color, alpha)
      return
    }
    // Unit normal, used to widen the stroke.
    const nx = -dy / steps
    const ny = dx / steps
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps
      const x = x0 + dx * t
      const y = y0 + dy * t
      this.circle(x, y, 0.6, color, alpha)
      if (width >= 2) this.circle(x + nx, y + ny, 0.6, color, alpha * 0.7)
      if (width >= 3) this.circle(x - nx, y - ny, 0.6, color, alpha * 0.7)
    }
  }
}

/* -------------------------------------------------------------------------
 * 3. A 5x7 bitmap font (uppercase, lowercase, digits, punctuation)
 *    '#' = ink, '.' = empty. Hand-authored so the script stays dependency-free.
 * ---------------------------------------------------------------------- */
const FONT = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#',
  B: '####.|#...#|#...#|####.|#...#|#...#|####.',
  C: '.###.|#...#|#....|#....|#....|#...#|.###.',
  D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
  E: '#####|#....|#....|####.|#....|#....|#####',
  F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.###.|#...#|#....|#.###|#...#|#...#|.###.',
  H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '.###.|..#..|..#..|..#..|..#..|..#..|.###.',
  J: '..###|...#.|...#.|...#.|...#.|#..#.|.##..',
  K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
  L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#',
  N: '#...#|##..#|#.#.#|#.#.#|#..##|#...#|#...#',
  O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
  P: '####.|#...#|#...#|####.|#....|#....|#....',
  Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',
  R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.',
  T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
  V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
  W: '#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#',
  X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
  Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  a: '.....|.....|.###.|....#|.####|#...#|.####',
  b: '#....|#....|####.|#...#|#...#|#...#|####.',
  c: '.....|.....|.###.|#...#|#....|#...#|.###.',
  d: '....#|....#|.####|#...#|#...#|#...#|.####',
  e: '.....|.....|.###.|#...#|#####|#....|.###.',
  f: '..##.|.#..#|.#...|####.|.#...|.#...|.#...',
  g: '.....|.####|#...#|#...#|.####|....#|.###.',
  h: '#....|#....|####.|#...#|#...#|#...#|#...#',
  i: '..#..|.....|.##..|..#..|..#..|..#..|.###.',
  j: '...#.|.....|...#.|...#.|...#.|#..#.|.##..',
  k: '#....|#....|#..#.|#.#..|##...|#.#..|#..#.',
  l: '.##..|..#..|..#..|..#..|..#..|..#..|.###.',
  m: '.....|.....|##.#.|#.#.#|#.#.#|#.#.#|#.#.#',
  n: '.....|.....|####.|#...#|#...#|#...#|#...#',
  o: '.....|.....|.###.|#...#|#...#|#...#|.###.',
  p: '.....|####.|#...#|#...#|####.|#....|#....',
  q: '.....|.####|#...#|#...#|.####|....#|....#',
  r: '.....|.....|#.##.|##..#|#....|#....|#....',
  s: '.....|.....|.####|#....|.###.|....#|####.',
  t: '.#...|.#...|####.|.#...|.#...|.#..#|..##.',
  u: '.....|.....|#...#|#...#|#...#|#...#|.####',
  v: '.....|.....|#...#|#...#|#...#|.#.#.|..#..',
  w: '.....|.....|#...#|#.#.#|#.#.#|#.#.#|.#.#.',
  x: '.....|.....|#...#|.#.#.|..#..|.#.#.|#...#',
  y: '.....|#...#|#...#|#...#|.####|....#|.###.',
  z: '.....|.....|#####|...#.|..#..|.#...|#####',
  0: '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.',
  1: '..#..|.##..|..#..|..#..|..#..|..#..|.###.',
  2: '.###.|#...#|....#|...#.|..#..|.#...|#####',
  3: '#####|...#.|..#..|...#.|....#|#...#|.###.',
  4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.',
  5: '#####|#....|####.|....#|....#|#...#|.###.',
  6: '..##.|.#...|#....|####.|#...#|#...#|.###.',
  7: '#####|....#|...#.|..#..|.#...|.#...|.#...',
  8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
  9: '.###.|#...#|#...#|.####|....#|...#.|.##..',
  ' ': '.....|.....|.....|.....|.....|.....|.....',
  '.': '.....|.....|.....|.....|.....|.##..|.##..',
  ',': '.....|.....|.....|.....|.##..|.##..|.#...',
  '-': '.....|.....|.....|#####|.....|.....|.....',
  '_': '.....|.....|.....|.....|.....|.....|#####',
  '/': '....#|....#|...#.|..#..|.#...|#....|#....',
  ':': '.....|.##..|.##..|.....|.##..|.##..|.....',
  '·': '.....|.....|.##..|.##..|.....|.....|.....',
  '(': '...#.|..#..|.#...|.#...|.#...|..#..|...#.',
  ')': '.#...|..#..|...#.|...#.|...#.|..#..|.#...',
  '+': '.....|..#..|..#..|#####|..#..|..#..|.....',
  '=': '.....|.....|#####|.....|#####|.....|.....',
  '#': '.#.#.|.#.#.|#####|.#.#.|#####|.#.#.|.#.#.',
  '&': '.##..|#..#.|#.#..|.#...|#.#.#|#..#.|.##.#',
  '@': '.###.|#...#|#.###|#.#.#|#.###|#....|.###.',
  '*': '.....|#.#.#|.###.|#####|.###.|#.#.#|.....',
  "'": '.#...|.#...|.....|.....|.....|.....|.....',
  '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
}

const GLYPH_W = 5
const GLYPH_H = 7

function glyphFor(char) {
  return FONT[char] ?? FONT[char.toUpperCase()] ?? FONT['?']
}

/** Width in pixels a string will occupy at the given scale. */
export function textWidth(text, scale, tracking = 1) {
  return text.length * (GLYPH_W + tracking) * scale - tracking * scale
}

/**
 * Draws `text` with its top-left corner at (x, y). `scale` multiplies the
 * 5x7 cell, `tracking` is the gap between glyphs in cells.
 */
function drawText(canvas, text, x, y, scale, color, alpha = 1, tracking = 1) {
  let cursor = x
  for (const char of text) {
    const rows = glyphFor(char).split('|')
    for (let row = 0; row < GLYPH_H; row += 1) {
      const line = rows[row] ?? ''
      for (let col = 0; col < GLYPH_W; col += 1) {
        if (line[col] !== '#') continue
        canvas.rect(cursor + col * scale, y + row * scale, scale, scale, color, alpha)
      }
    }
    cursor += (GLYPH_W + tracking) * scale
  }
  return cursor - x
}

/* -------------------------------------------------------------------------
 * 4. Palette + drawing
 * ---------------------------------------------------------------------- */
const BG_TOP = [10, 15, 28] // #0a0f1c — the site's near-black
const BG_BOTTOM = [13, 21, 38]
const CYAN = [34, 211, 238] // #22d3ee
const GREEN = [74, 222, 128]
const WHITE = [236, 242, 250]
const MUTED = [148, 163, 184]
const GRID = [18, 32, 58]

const canvas = new Canvas(WIDTH, HEIGHT)
canvas.fillGradient(BG_TOP, BG_BOTTOM)

// Faint grid — the "NOC dashboard" texture.
for (let x = 0; x <= WIDTH; x += 40) canvas.rect(x, 0, 1, HEIGHT, GRID, 0.55)
for (let y = 0; y <= HEIGHT; y += 40) canvas.rect(0, y, WIDTH, 1, GRID, 0.55)

canvas.glow(1010, 300, 430, CYAN, 0.16)
canvas.glow(180, 600, 400, [70, 60, 200], 0.1)

/* --- network motif: kept in the right-hand column, clear of the text --- */
const nodes = [
  { x: 985, y: 96, r: 11 },
  { x: 1120, y: 172, r: 8 },
  { x: 952, y: 236, r: 9 },
  { x: 1152, y: 326, r: 12 },
  { x: 1002, y: 330, r: 8 },
  { x: 1092, y: 442, r: 10 },
  { x: 962, y: 498, r: 7 },
  { x: 1142, y: 540, r: 9 },
]
const edges = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 4],
  [4, 3],
  [4, 5],
  [5, 3],
  [5, 6],
  [5, 7],
  [6, 7],
]
for (const [a, b] of edges) {
  canvas.line(nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y, CYAN, 0.5, 2)
}
nodes.forEach((node, index) => {
  const color = index % 3 === 0 ? GREEN : CYAN
  canvas.circle(node.x, node.y, node.r + 7, color, 0.14)
  canvas.circle(node.x, node.y, node.r + 2, color, 0.35)
  canvas.circle(node.x, node.y, node.r, color, 0.98)
})

/* --- left: cyan accent bar + name + title + tagline ----------------- */
const MARGIN = 80
canvas.rect(MARGIN, 176, 6, 74, CYAN, 1)

const NAME_SCALE = 9
const nameY = 168
drawText(canvas, name, MARGIN + 26, nameY, NAME_SCALE, WHITE, 1, 1)

const TITLE_SCALE = 3
const titleY = 288
drawText(canvas, title.toUpperCase(), MARGIN, titleY, TITLE_SCALE, CYAN, 0.95, 1)

// Tagline, wrapped to two short lines.
const TAGLINE_SCALE = 2
const taglineText = tagline.length > 62 ? `${tagline.slice(0, 60)}` : tagline
drawText(canvas, taglineText, MARGIN, 330, TAGLINE_SCALE, MUTED, 0.9, 1)

// Thin divider.
canvas.rect(MARGIN, 372, 520, 1, GRID, 1)

// Badges: "MIKROTIK · DEBIAN SERVER · PROXMOX · FIBER OPTIC" (the '·' is in the font table).
if (badges.length > 0) {
  const badgeText = badges.join(' · ')
  drawText(canvas, badgeText.toUpperCase(), MARGIN, 400, TAGLINE_SCALE, GREEN, 0.9, 1)
}

// Footer: site url on the left, role summary on the right.
canvas.rect(MARGIN, HEIGHT - 78, WIDTH - MARGIN * 2, 1, GRID, 1)
const host = siteUrl.replace(/^https?:\/\//, '')
drawText(canvas, host.toUpperCase(), MARGIN, HEIGHT - 54, 3, WHITE, 0.95, 1)
const footerRight = OG_TEXT.footerRight
drawText(
  canvas,
  footerRight,
  WIDTH - MARGIN - textWidth(footerRight, 2, 1),
  HEIGHT - 52,
  2,
  MUTED,
  0.85,
  1,
)

/* -------------------------------------------------------------------------
 * 5. PNG encoder (8-bit RGB, no interlace) — PNG spec: IHDR + IDAT + IEND
 * ---------------------------------------------------------------------- */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buffer) {
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, payload) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(payload.length, 0)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), payload])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData), 0)
  return Buffer.concat([length, typeAndData, crc])
}

function encodePng(width, height, rgb) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr.writeUInt8(8, 8) // bit depth
  ihdr.writeUInt8(2, 9) // colour type 2 = truecolour RGB
  ihdr.writeUInt8(0, 10) // deflate
  ihdr.writeUInt8(0, 11) // adaptive filtering
  ihdr.writeUInt8(0, 12) // no interlace

  // Each scanline is prefixed with its filter byte (0 = None).
  const raw = Buffer.alloc(height * (width * 3 + 1))
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 3 + 1)
    raw[rowStart] = 0
    Buffer.from(rgb.buffer, rgb.byteOffset + y * width * 3, width * 3).copy(raw, rowStart + 1)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const png = encodePng(WIDTH, HEIGHT, canvas.data)
writeFileSync(OUT_FILE, png)

console.log(
  `Wrote ${OUT_FILE} (${WIDTH}x${HEIGHT}, ${(png.length / 1024).toFixed(1)} kB, ${name} / ${host})`,
)
