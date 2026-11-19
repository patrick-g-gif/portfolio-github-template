/**
 * Canvas 2D topology maths — all pure so it can be unit tested without a DOM.
 * The rendering loop lives in src/components/NetworkCanvas.jsx.
 */

export const MOBILE_BREAKPOINT = 768
export const MIN_NODES = 8
export const MAX_NODES = 64

/** Rough target: one node per ~22,000 px² of canvas, then hard bounds. */
const AREA_PER_NODE = 22000
/** Below 768px we cut the count in half so phones stay at 60fps. */
const MOBILE_FACTOR = 0.5

const DEVICE_TYPES = ['router', 'switch', 'server', 'firewall', 'internet']
/** Relative chance of each device type appearing as a node. */
const TYPE_WEIGHTS = [
  ['router', 0.16],
  ['switch', 0.4],
  ['server', 0.26],
  ['firewall', 0.1],
  ['internet', 0.08],
]

/** Deterministic PRNG (mulberry32) — same seed, same layout. */
export function createSeededRandom(seed = 1) {
  let state = seed >>> 0
  return function random() {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * How many nodes to draw for a viewport. Fewer on phones (< 768px),
 * more as the screen grows, always inside [MIN_NODES, MAX_NODES].
 */
export function getNodeCount(width, height = 800) {
  const w = Math.max(1, Number(width) || 1)
  const h = Math.max(1, Number(height) || 1)

  let count = Math.round((w * h) / AREA_PER_NODE)
  count = Math.min(MAX_NODES, Math.max(MIN_NODES, count))

  if (w < MOBILE_BREAKPOINT) {
    count = Math.round(count * MOBILE_FACTOR)
  }

  return Math.min(MAX_NODES, Math.max(MIN_NODES, count))
}

/** Travelling data packets: roughly one per node, capped so it stays readable. */
export function getPacketCount(nodeCount) {
  const n = Math.max(0, Math.round(Number(nodeCount) || 0))
  if (n === 0) return 0
  return Math.min(MAX_NODES * 2, Math.max(6, Math.round(n * 0.8)))
}

/** Nodes connect to neighbours inside this radius; smaller on phones. */
export function getLinkDistance(width, height = 800) {
  const diagonal = Math.hypot(Number(width) || 0, Number(height) || 0) || 1
  return diagonal * (Number(width) < MOBILE_BREAKPOINT ? 0.3 : 0.22)
}

function pickType(random) {
  const roll = random()
  let cumulative = 0
  for (const [type, weight] of TYPE_WEIGHTS) {
    cumulative += weight
    if (roll <= cumulative) return type
  }
  return DEVICE_TYPES[0]
}

/**
 * Build the node list. Coordinates are seeded randomly, then pushed apart with a
 * couple of relaxation passes so the topology does not look like confetti.
 */
export function createNodes(width, height, count, random = createSeededRandom(Date.now())) {
  const w = Math.max(1, Number(width) || 1)
  const h = Math.max(1, Number(height) || 1)
  const total = Math.max(0, Math.round(Number(count) || 0))

  const nodes = Array.from({ length: total }, (_, index) => {
    const isHub = random() < 0.18
    return {
      id: `n${index}`,
      x: random() * w,
      y: random() * h,
      r: (isHub ? 3.4 : 2) + random() * 1.8,
      vx: (random() - 0.5) * 0.18,
      vy: (random() - 0.5) * 0.18,
      type: pickType(random),
      hub: isHub,
    }
  })

  relax(nodes, w, h)
  return nodes
}

/** Nudge overlapping nodes apart (2 passes is enough for a background effect). */
function relax(nodes, width, height, passes = 2) {
  const minGap = Math.max(28, Math.min(width, height) * 0.07)
  for (let pass = 0; pass < passes; pass += 1) {
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i]
        const b = nodes[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const distance = Math.hypot(dx, dy) || 0.01
        if (distance < minGap) {
          const push = (minGap - distance) / 2
          const ux = dx / distance
          const uy = dy / distance
          a.x -= ux * push
          a.y -= uy * push
          b.x += ux * push
          b.y += uy * push
        }
      }
    }
  }
  clampNodesToBounds(nodes, width, height)
}

/** Keep nodes inside the canvas after a resize. */
export function clampNodesToBounds(nodes, width, height) {
  const w = Math.max(1, Number(width) || 1)
  const h = Math.max(1, Number(height) || 1)
  nodes.forEach((node) => {
    node.x = Math.min(Math.max(node.x, node.r), w - node.r)
    node.y = Math.min(Math.max(node.y, node.r), h - node.r)
  })
  return nodes
}

/** Data packets travelling along random node-to-node links. */
export function createPackets(nodes, count, random = createSeededRandom(Date.now())) {
  if (!Array.isArray(nodes) || nodes.length === 0) return []
  const total = Math.max(0, Math.round(Number(count) || 0))

  const packets = []
  let guard = 0
  while (packets.length < total && guard < total * 20) {
    guard += 1
    const from = nodes[Math.floor(random() * nodes.length)]
    const to = nodes[Math.floor(random() * nodes.length)]
    if (!from || !to || from.id === to.id) continue

    packets.push({
      id: `${from.id}->${to.id}-${packets.length}`,
      from: from.id,
      to: to.id,
      t: random(),
      speed: 0.0015 + random() * 0.004,
      size: 1.2 + random() * 1.4,
    })
  }

  return packets
}
