import { useEffect, useMemo, useRef, useState } from 'react'
import { createCountUp } from '../lib/format.js'

/**
 * Count a number up once the element scrolls into view.
 * With reduced motion the final value is rendered immediately.
 *
 * @returns {string} formatted value including any suffix
 */
export function useCountUp(stat, { active = true, reducedMotion = false, duration = 1400 } = {}) {
  // Memoised on the stat's own primitive fields. Without this, `createCountUp`
  // returned a brand-new object on every render, so this effect's `counter`
  // dependency changed each render, the effect re-ran, the rAF was cancelled
  // and the count-up restarted from 0 — which is why a fast scroll left the
  // card stuck on a partial value (e.g. "2.80%") instead of the real number.
  const counter = useMemo(
    () => createCountUp(stat),
    [stat?.value, stat?.decimals, stat?.suffix], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const [value, setValue] = useState(() => (reducedMotion ? counter.format(1) : counter.format(0)))
  const frameRef = useRef(null)
  const startRef = useRef(null)
  // Once the count-up has reached its target it must never animate again, even
  // if the component re-renders with an equal-valued stat object.
  const finishedRef = useRef(false)

  useEffect(() => {
    if (!active) return undefined

    if (reducedMotion || finishedRef.current) {
      setValue(counter.format(1))
      return undefined
    }

    const step = (timestamp) => {
      if (startRef.current === null) startRef.current = timestamp
      const progress = Math.min(1, (timestamp - startRef.current) / duration)
      // Land on the exact target string rather than on an interpolated frame,
      // so the final render is byte-identical to formatStatValue(stat).
      if (progress >= 1) {
        finishedRef.current = true
        setValue(counter.format(1))
        frameRef.current = null
        return
      }
      setValue(counter.format(progress))
      frameRef.current = requestAnimationFrame(step)
    }

    frameRef.current = requestAnimationFrame(step)
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
      startRef.current = null
    }
  }, [active, counter, duration, reducedMotion])

  return value
}

/**
 * Typewriter effect for the hero name/title.
 * @returns {{ text: string, done: boolean }}
 */
export function useTypewriter(text, { reducedMotion = false, speed = 55, startDelay = 260 } = {}) {
  const [output, setOutput] = useState(reducedMotion ? text : '')
  const [done, setDone] = useState(reducedMotion)

  useEffect(() => {
    if (reducedMotion) {
      setOutput(text)
      setDone(true)
      return undefined
    }

    let timeout = null
    let index = 0
    setOutput('')
    setDone(false)

    const type = () => {
      index += 1
      setOutput(text.slice(0, index))
      if (index >= text.length) {
        setDone(true)
        return
      }
      // jitter the speed a little so it feels like a human at the keyboard
      const jitter = text[index - 1] === '.' ? speed * 6 : speed + (index % 3) * 12
      timeout = setTimeout(type, jitter)
    }

    timeout = setTimeout(type, startDelay)
    return () => clearTimeout(timeout)
  }, [text, reducedMotion, speed, startDelay])

  return { text: output, done }
}
