import { useCallback, useEffect, useRef } from 'react'
import {
  clampNodesToBounds,
  createNodes,
  createPackets,
  createSeededRandom,
  getLinkDistance,
  getNodeCount,
  getPacketCount,
} from '../lib/canvasNodes.js'
import { usePrefersReducedMotion } from '../hooks/useMedia.js'

const COLORS = {
  dark: {
    node: '#22d3ee',
    nodeSoft: '#a3e635',
    link: 'rgba(34, 211, 238, 0.28)',
    linkHot: 'rgba(34, 211, 238, 0.85)',
    packet: '#a3e635',
  },
  light: {
    node: '#0e7490',
    nodeSoft: '#4d7c0f',
    link: 'rgba(14, 116, 144, 0.22)',
    linkHot: 'rgba(14, 116, 144, 0.7)',
    packet: '#4d7c0f',
  },
}

const NODE_COLORS = {
  router: '#22d3ee',
  switch: '#38bdf8',
  server: '#a3e635',
  firewall: '#f472b6',
  internet: '#c4b5fd',
}

/**
 * Interactive network topology drawn on a 2D canvas.
 *
 * - nodes drift slowly, lines connect nearby neighbours
 * - nodes/lines react to the pointer (repel + glow), touch is supported
 * - small packets travel along the links
 * - node count scales with the viewport (fewer below 768px)
 * - one requestAnimationFrame loop with proper cleanup, paused when the tab is
 *   hidden and when the user prefers reduced motion
 */
export function NetworkCanvas({ className = '' }) {
  const canvasRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()

  const state = useRef({
    nodes: [],
    packets: [],
    links: [],
    width: 0,
    height: 0,
    dpr: 1,
    pointer: { x: -9999, y: -9999, active: false },
    dark: true,
    frame: null,
    running: false,
  })

  /** Recreate the layout for a new size. */
  const buildScene = useCallback((width, height) => {
    const ctxState = state.current
    const random = createSeededRandom(Math.round(width * 31 + height))
    const count = getNodeCount(width, height)

    ctxState.nodes = ctxState.nodes.length === count ? ctxState.nodes : createNodes(width, height, count, random)
    clampNodesToBounds(ctxState.nodes, width, height)
    ctxState.packets = createPackets(ctxState.nodes, getPacketCount(count), random)
    ctxState.width = width
    ctxState.height = height
  }, [])

  /** One frame: move nodes, compute links, draw everything. */
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return // jsdom / no canvas support: render nothing, no crash

    const s = state.current
    const { width, height, dpr } = s
    if (!width || !height) return

    const colors = s.dark ? COLORS.dark : COLORS.light
    const pointer = s.pointer

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    // --- drift + pointer repulsion -----------------------------------------
    const links = []
    for (const node of s.nodes) {
      if (!s.reduced) {
        node.x += node.vx
        node.y += node.vy
        if (node.x < node.r || node.x > width - node.r) node.vx *= -1
        if (node.y < node.r || node.y > height - node.r) node.vy *= -1
      }

      if (pointer.active) {
        const dx = node.x - pointer.x
        const dy = node.y - pointer.y
        const distance = Math.hypot(dx, dy)
        if (distance < 140 && distance > 0.001) {
          const force = (140 - distance) / 140
          node.x += (dx / distance) * force * 2.4
          node.y += (dy / distance) * force * 2.4
          node.hot = force
        } else {
          node.hot *= 0.9
        }
      } else {
        node.hot *= 0.9
      }
      clampNodesToBounds([node], width, height)
    }

    // --- links between near neighbours --------------------------------------
    const maxDistance = getLinkDistance(width, height)
    for (let i = 0; i < s.nodes.length; i += 1) {
      for (let j = i + 1; j < s.nodes.length; j += 1) {
        const a = s.nodes[i]
        const b = s.nodes[j]
        const distance = Math.hypot(a.x - b.x, a.y - b.y)
        if (distance > maxDistance) continue
        const nearPointer =
          pointer.active &&
          Math.hypot((a.x + b.x) / 2 - pointer.x, (a.y + b.y) / 2 - pointer.y) < 130
        links.push({ a, b, distance, hot: nearPointer })
      }
    }
    s.links = links

    ctx.lineWidth = 1
    for (const link of links) {
      const strength = 1 - link.distance / maxDistance
      ctx.strokeStyle = link.hot ? colors.linkHot : colors.link
      ctx.globalAlpha = 0.25 + strength * 0.5
      ctx.beginPath()
      ctx.moveTo(link.a.x, link.a.y)
      ctx.lineTo(link.b.x, link.b.y)
      ctx.stroke()

      if (link.hot) {
        ctx.globalAlpha = 0.5
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.moveTo(link.a.x, link.a.y)
        ctx.lineTo(link.b.x, link.b.y)
        ctx.stroke()
        ctx.lineWidth = 1
      }
    }

    // --- travelling packets --------------------------------------------------
    ctx.globalAlpha = 1
    ctx.fillStyle = colors.packet
    for (const packet of s.packets) {
      const from = s.nodes.find((node) => node.id === packet.from)
      const to = s.nodes.find((node) => node.id === packet.to)
      if (!from || !to) continue
      if (!s.reduced) packet.t += packet.speed
      if (packet.t > 1) packet.t -= 1

      const x = from.x + (to.x - from.x) * packet.t
      const y = from.y + (to.y - from.y) * packet.t
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      ctx.arc(x, y, packet.size, 0, Math.PI * 2)
      ctx.fill()
    }

    // --- nodes ---------------------------------------------------------------
    for (const node of s.nodes) {
      const hot = node.hot || 0
      const base = s.dark ? COLORS.dark.nodeSoft : COLORS.light.nodeSoft
      const color = node.type === 'router' || node.type === 'firewall' ? base : NODE_COLORS[node.type]
      const radius = node.r + hot * 3

      if (hot > 0.02) {
        ctx.globalAlpha = 0.18 + hot * 0.4
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(node.x, node.y, radius + 8 * hot, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 0.65 + hot * 0.35
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
      ctx.fill()

      if (node.hub) {
        ctx.globalAlpha = 0.55 + hot * 0.45
        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(node.x, node.y, radius + 4, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    ctx.globalAlpha = 1
  }, [])

  /** Size the backing store to the container (device-pixel aware). */
  const resize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    const rect = parent.getBoundingClientRect()
    const width = Math.max(1, Math.round(rect.width || window.innerWidth))
    const height = Math.max(1, Math.round(rect.height || window.innerHeight))
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    state.current.width = width
    state.current.height = height
    state.current.dpr = dpr
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    buildScene(width, height)
  }, [buildScene])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const s = state.current
    s.reduced = reducedMotion
    s.dark = document.documentElement.classList.contains('dark')

    resize()

    const tick = () => {
      draw()
      s.frame = requestAnimationFrame(tick)
    }

    if (reducedMotion) {
      // No animation at all: render one static frame.
      draw()
      s.frame = null
    } else {
      s.frame = requestAnimationFrame(tick)
      s.running = true
    }

    // --- pause while the tab is hidden ---------------------------------------
    const onVisibility = () => {
      if (reducedMotion) return
      if (document.hidden) {
        if (s.frame !== null) cancelAnimationFrame(s.frame)
        s.frame = null
      } else if (s.frame === null) {
        s.frame = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    // --- resize (debounced) ---------------------------------------------------
    let resizeTimer = null
    const onResize = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        resize()
        if (reducedMotion) draw()
      }, 180)
    }
    window.addEventListener('resize', onResize)

    // --- pointer (mouse + touch) ---------------------------------------------
    const updatePointer = (event) => {
      const rect = canvas.getBoundingClientRect()
      const point = event.touches?.[0] ?? event.changedTouches?.[0] ?? event
      s.pointer = {
        x: (point.clientX ?? 0) - rect.left,
        y: (point.clientY ?? 0) - rect.top,
        active: true,
      }
    }
    const clearPointer = () => {
      s.pointer = { x: -9999, y: -9999, active: false }
    }

    canvas.addEventListener('pointermove', updatePointer, { passive: true })
    canvas.addEventListener('pointerdown', updatePointer, { passive: true })
    canvas.addEventListener('pointerleave', clearPointer, { passive: true })
    window.addEventListener('pointerup', clearPointer, { passive: true })
    canvas.addEventListener('touchmove', updatePointer, { passive: true })

    // Keep the palette in sync when the theme changes.
    const themeObserver = new MutationObserver(() => {
      s.dark = document.documentElement.classList.contains('dark')
      draw()
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointerup', clearPointer)
      canvas.removeEventListener('pointermove', updatePointer)
      canvas.removeEventListener('pointerdown', updatePointer)
      canvas.removeEventListener('pointerleave', clearPointer)
      canvas.removeEventListener('touchmove', updatePointer)
      themeObserver.disconnect()
      window.clearTimeout(resizeTimer)
      if (s.frame !== null) cancelAnimationFrame(s.frame)
      s.frame = null
      s.running = false
    }
  }, [draw, reducedMotion, resize])

  return (
    <canvas
      ref={canvasRef}
      data-testid="network-canvas"
      aria-hidden="true"
      role="presentation"
      className={`absolute inset-0 h-full w-full ${className}`}
    />
  )
}

export default NetworkCanvas
