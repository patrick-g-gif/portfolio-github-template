/**
 * Regression tests for the count-up stats bug.
 *
 * THE BUG: `useCountUp` called `createCountUp(stat)` on every render without
 * memoising it. The returned object therefore had a fresh identity each render,
 * so the `counter` dependency of the animation effect changed every render, the
 * effect re-ran, the requestAnimationFrame loop was cancelled and the count-up
 * RESTARTED FROM ZERO. On a fast scroll the counter never reached progress 1 and
 * froze on a partial value — this is where the reported "2.80%" and the cards
 * stuck at 0 came from.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { useCountUp } from '../hooks/useAnimation.js'
import { formatStatValue } from '../lib/format.js'

/** Drives useCountUp with a controllable stat and a controllable rAF clock. */
function Counter({ stat, active = true, reducedMotion = false }) {
  const value = useCountUp(stat, { active, reducedMotion, duration: 1000 })
  return <span data-testid="counter">{value}</span>
}

beforeEach(() => {
  // Real rAF via jsdom; each test drives timestamps explicitly.
  vi.useRealTimers()
})

describe('useCountUp — lands on the exact target', () => {
  it('ends at the exact target value, not a partial frame', async () => {
    const stat = { value: 7, suffix: '', decimals: 0 }
    render(<Counter stat={stat} />)

    // Drive the clock past the duration.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1200))
    })

    await waitFor(() => expect(screen.getByTestId('counter')).toHaveTextContent('7'))
    expect(screen.getByTestId('counter').textContent).toBe(formatStatValue(stat))
  })

  it('handles decimals exactly (the old card showed 2.80% for a 99.99% target)', async () => {
    const stat = { value: 99.99, suffix: '%', decimals: 2 }
    render(<Counter stat={stat} />)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1200))
    })

    await waitFor(() => expect(screen.getByTestId('counter')).toHaveTextContent('99.99%'))
    expect(screen.getByTestId('counter').textContent).toBe('99.99%')
  })

  it('does not restart from 0 when re-rendered with an equal-valued stat', async () => {
    // This is the regression: a new stat OBJECT with the same values used to
    // restart the animation, because `counter` was not memoised.
    const stat = { value: 7, suffix: '', decimals: 0 }
    const { rerender } = render(<Counter stat={stat} />)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1200))
    })
    await waitFor(() => expect(screen.getByTestId('counter')).toHaveTextContent('7'))

    // Fresh object, identical values.
    rerender(<Counter stat={{ value: 7, suffix: '', decimals: 0 }} />)
    expect(screen.getByTestId('counter').textContent).toBe('7')

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 120))
    })
    // Still 7 — a re-render must never send the counter back to zero.
    expect(screen.getByTestId('counter').textContent).toBe('7')
  })

  it('renders the final value immediately with reduced motion, never 0', () => {
    const stat = { value: 7, suffix: '', decimals: 0 }
    render(<Counter stat={stat} reducedMotion />)
    expect(screen.getByTestId('counter').textContent).toBe('7')
  })

  it('shows a formatted 0 (never undefined/NaN) before it is activated', () => {
    const stat = { value: 7, suffix: '', decimals: 0 }
    render(<Counter stat={stat} active={false} />)
    expect(screen.getByTestId('counter').textContent).toBe('0')
  })
})
