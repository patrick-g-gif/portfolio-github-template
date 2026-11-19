/** TDD: canvas node-count scaling by viewport width + node/packet generation. */
import { describe, it, expect } from 'vitest'
import {
  MOBILE_BREAKPOINT,
  MIN_NODES,
  MAX_NODES,
  getNodeCount,
  getPacketCount,
  getLinkDistance,
  createNodes,
  createPackets,
  createSeededRandom,
  clampNodesToBounds,
} from '../lib/canvasNodes.js'

describe('getNodeCount', () => {
  it('scales up with viewport width', () => {
    const phone = getNodeCount(360, 640)
    const tablet = getNodeCount(768, 1024)
    const desktop = getNodeCount(1280, 800)
    const wide = getNodeCount(1920, 1080)
    expect(phone).toBeLessThan(tablet)
    expect(tablet).toBeLessThan(desktop)
    expect(desktop).toBeLessThanOrEqual(wide)
  })

  it('reduces the count below 768px', () => {
    const mobileWidths = [320, 360, 414, 500, 640, 767]
    mobileWidths.forEach((w) => {
      expect(getNodeCount(w, 800)).toBeLessThanOrEqual(MAX_NODES)
      expect(getNodeCount(w, 800)).toBeGreaterThanOrEqual(MIN_NODES)
    })
    // the step happens exactly at the breakpoint
    expect(getNodeCount(767, 800)).toBeLessThan(getNodeCount(768, 800))
  })

  it('never exceeds the hard bounds for absurd viewports', () => {
    expect(getNodeCount(320, 480)).toBeGreaterThanOrEqual(MIN_NODES)
    expect(getNodeCount(7680, 4320)).toBeLessThanOrEqual(MAX_NODES)
    expect(getNodeCount(0, 0)).toBeGreaterThanOrEqual(MIN_NODES)
    expect(getNodeCount(NaN, NaN)).toBeGreaterThanOrEqual(MIN_NODES)
    expect(getNodeCount(-100, -100)).toBeGreaterThanOrEqual(MIN_NODES)
  })

  it('is deterministic', () => {
    expect(getNodeCount(1280, 800)).toBe(getNodeCount(1280, 800))
  })

  it('is monotonic across widths at a fixed height', () => {
    let previous = 0
    for (let w = 320; w <= 1920; w += 80) {
      const count = getNodeCount(w, 900)
      expect(count).toBeGreaterThanOrEqual(previous)
      previous = count
    }
  })

  it('uses a sane absolute range for a 360px phone', () => {
    const count = getNodeCount(360, 780)
    expect(count).toBeGreaterThanOrEqual(8)
    expect(count).toBeLessThanOrEqual(20)
  })
})

describe('getPacketCount', () => {
  it('scales with the node count and stays bounded', () => {
    expect(getPacketCount(10)).toBeGreaterThan(0)
    expect(getPacketCount(60)).toBeGreaterThan(getPacketCount(20))
    expect(getPacketCount(10)).toBeLessThanOrEqual(MAX_NODES * 2)
    expect(getPacketCount(0)).toBe(0)
  })
})

describe('getLinkDistance', () => {
  it('links closer neighbours on small screens', () => {
    expect(getLinkDistance(360, 640)).toBeLessThan(getLinkDistance(1440, 900))
  })
})

describe('createNodes', () => {
  const random = createSeededRandom(42)

  it('creates exactly the requested number of nodes', () => {
    const nodes = createNodes(1200, 700, 30, random)
    expect(nodes).toHaveLength(30)
    nodes.forEach((node) => {
      expect(node).toMatchObject({
        x: expect.any(Number),
        y: expect.any(Number),
        r: expect.any(Number),
        vx: expect.any(Number),
        vy: expect.any(Number),
        type: expect.any(String),
      })
    })
  })

  it('places every node inside the canvas bounds', () => {
    const nodes = createNodes(800, 600, 40, random)
    nodes.forEach((node) => {
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.x).toBeLessThanOrEqual(800)
      expect(node.y).toBeGreaterThanOrEqual(0)
      expect(node.y).toBeLessThanOrEqual(600)
    })
  })

  it('is reproducible with the same seed and different with another', () => {
    const a = createNodes(500, 500, 10, createSeededRandom(7))
    const b = createNodes(500, 500, 10, createSeededRandom(7))
    const c = createNodes(500, 500, 10, createSeededRandom(8))
    expect(a.map((n) => n.x)).toEqual(b.map((n) => n.x))
    expect(a.map((n) => n.x)).not.toEqual(c.map((n) => n.x))
  })

  it('assigns a mix of device types', () => {
    const nodes = createNodes(1280, 800, 40, createSeededRandom(3))
    const types = new Set(nodes.map((n) => n.type))
    expect(types.size).toBeGreaterThan(1)
    expect([...types].every((t) => ['router', 'switch', 'server', 'firewall', 'internet'].includes(t))).toBe(true)
  })

  it('re-clamps nodes after a resize', () => {
    const nodes = createNodes(1280, 800, 20, createSeededRandom(1))
    const shrunk = clampNodesToBounds(nodes, 400, 300)
    shrunk.forEach((node) => {
      expect(node.x).toBeLessThanOrEqual(400)
      expect(node.y).toBeLessThanOrEqual(300)
    })
  })
})

describe('createPackets', () => {
  it('creates packets that reference existing edges', () => {
    const nodes = createNodes(800, 600, 24, createSeededRandom(11))
    const packets = createPackets(nodes, 10, createSeededRandom(11))
    expect(packets).toHaveLength(10)
    packets.forEach((packet) => {
      const target = nodes.find((n) => n.id === packet.to)
      expect(target).toBeDefined()
      expect(packet.t).toBeGreaterThanOrEqual(0)
      expect(packet.t).toBeLessThanOrEqual(1)
    })
  })

  it('returns an empty list when there are no nodes', () => {
    expect(createPackets([], 8, createSeededRandom(1))).toEqual([])
  })
})
