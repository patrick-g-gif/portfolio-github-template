import { useEffect, useRef, useState } from 'react'

/**
 * True while the user (or the OS) asked for less motion.
 * Components use it to skip decorative animation entirely.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (event) => setReduced(event.matches)
    setReduced(query.matches)
    query.addEventListener?.('change', onChange)
    return () => query.removeEventListener?.('change', onChange)
  }, [])

  return reduced
}

/** Generic media-query hook (used for the desktop-only cursor glow). */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const list = window.matchMedia(query)
    const onChange = (event) => setMatches(event.matches)
    setMatches(list.matches)
    list.addEventListener?.('change', onChange)
    return () => list.removeEventListener?.('change', onChange)
  }, [query])

  return matches
}

/**
 * IntersectionObserver helper that flips to `true` the first time an element
 * enters the viewport (used to trigger count-ups and SVG line drawing).
 */
export function useInViewOnce(options = {}) {
  const { threshold = 0.25, rootMargin = '0px 0px -10% 0px' } = options
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element || inView) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [inView, rootMargin, threshold])

  return [ref, inView]
}

/**
 * Tracks which section is in view for the navbar highlight.
 * Picks the entry with the largest intersection ratio.
 */
export function useActiveSection(ids, options = {}) {
  const { rootMargin = '-45% 0px -45% 0px', threshold = [0, 0.01, 0.25, 0.5, 1] } = options
  const [active, setActive] = useState(ids[0] ?? '')

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean)
    if (elements.length === 0 || typeof IntersectionObserver === 'undefined') return undefined

    // Track each section's current ratio, not just the highest ever seen —
    // otherwise a section that once scored high (e.g. a short one that
    // briefly filled the whole observation band) stays "best" forever, even
    // after it scrolls out of view and other sections become current.
    const ratios = new Map()
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0)
        })
        let bestId = null
        let bestRatio = 0
        ratios.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio
            bestId = id
          }
        })
        if (bestId) setActive(bestId)
      },
      { rootMargin, threshold },
    )

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [ids, rootMargin, threshold])

  return active
}
