import { useEffect, useRef } from 'react'
import { useMediaQuery, usePrefersReducedMotion } from '../hooks/useMedia.js'

/**
 * Neon glow that follows the mouse — desktop pointers only.
 * Uses a single fixed layer moved with transform, so it never triggers layout.
 */
export function CursorGlow() {
  const dotRef = useRef(null)
  const ringRef = useRef(null)
  const isDesktop = useMediaQuery('(pointer: fine) and (min-width: 1024px)')
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (!isDesktop || reducedMotion) return undefined

    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return undefined

    let raf = null
    let target = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    let eased = { ...target }

    const onMove = (event) => {
      target = { x: event.clientX, y: event.clientY }
      if (raf === null) raf = requestAnimationFrame(tick)
    }

    const tick = () => {
      eased.x += (target.x - eased.x) * 0.16
      eased.y += (target.y - eased.y) * 0.16
      dot.style.transform = `translate3d(${eased.x - 3}px, ${eased.y - 3}px, 0)`
      ring.style.transform = `translate3d(${eased.x - 20}px, ${eased.y - 20}px, 0)`
      const distance = Math.hypot(target.x - eased.x, target.y - eased.y)
      raf = distance > 0.4 ? requestAnimationFrame(tick) : null
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      if (raf !== null) cancelAnimationFrame(raf)
      raf = null
    }
  }, [isDesktop, reducedMotion])

  if (!isDesktop || reducedMotion) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-30 hidden lg:block">
      <div
        ref={ringRef}
        className="absolute h-10 w-10 rounded-full border border-cyan-400/40 shadow-[0_0_28px_6px_rgba(34,211,238,0.18)]"
      />
      <div ref={dotRef} className="absolute h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_2px_rgba(34,211,238,0.6)]" />
    </div>
  )
}

export default CursorGlow
