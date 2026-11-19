/**
 * TDD: the ping summary line must describe the SAME run as the per-packet lines.
 *
 * THE BUG: the widget rolled a second, independent set of random latencies for
 * the `rtt min/avg/max` summary, so those numbers could never match the
 * `time=` values printed on the packets above it. The summary also had no `mdev`
 * and no 3-decimal precision.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { computePingStats, formatPingStatsLine } from '../lib/format.js'
import { PingWidget } from '../components/PingWidget.jsx'
import { identity } from '../data/portfolio.js'

const TARGET_IP = '203.0.113.10'

/** Parse `time=12.34 ms` out of a per-packet line. */
function parseTimes(text) {
  return [...text.matchAll(/time=([\d.]+) ms/g)].map((match) => Number(match[1]))
}

beforeEach(() => {
  globalThis.__setReducedMotion(true)
})

describe('computePingStats', () => {
  it('computes min, avg, max and mdev from the given values', () => {
    const stats = computePingStats([10, 20, 30, 40])
    expect(stats.min).toBe(10)
    expect(stats.max).toBe(40)
    expect(stats.avg).toBe(25)
    // population stddev of [10,20,30,40]
    expect(stats.mdev).toBeCloseTo(11.1803, 3)
  })

  it('rounds avg and mdev to 3 decimals like real ping', () => {
    const stats = computePingStats([8.115, 12.207, 15.884, 12.622])
    expect(String(stats.avg).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(3)
    expect(String(stats.mdev).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(3)
  })

  it('handles an empty list without producing NaN', () => {
    expect(computePingStats([])).toEqual({ min: 0, avg: 0, max: 0, mdev: 0 })
  })
})

describe('formatPingStatsLine', () => {
  it('renders all four values with 3 decimals and the ms suffix', () => {
    expect(formatPingStatsLine(computePingStats([10, 20, 30, 40]))).toBe(
      'rtt min/avg/max/mdev = 10.000/25.000/40.000/11.180 ms',
    )
  })
})

describe('PingWidget', () => {
  it('reports min/avg/max that match the per-packet times it printed', async () => {
    const user = userEvent.setup()
    render(<PingWidget />)
    await user.click(screen.getByRole('button', { name: /^ping$/i }))

    const log = screen.getByRole('log', { name: /ping output/i })
    const text = log.textContent

    const times = parseTimes(text)
    expect(times).toHaveLength(4)

    const stats = computePingStats(times)
    const line = text.match(/rtt min\/avg\/max\/mdev = ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+) ms/)
    expect(line, `summary line missing from:\n${text}`).not.toBeNull()

    const [, min, avg, max, mdev] = line
    // The regression: these must be the numbers the user can actually read
    // on the four packet lines above, not a second roll of the dice.
    expect(Number(min)).toBeCloseTo(stats.min, 2)
    expect(Number(avg)).toBeCloseTo(stats.avg, 2)
    expect(Number(max)).toBeCloseTo(stats.max, 2)
    expect(Number(mdev)).toBeCloseTo(stats.mdev, 2)
  })

  it('keeps 0% packet loss and a consistent ttl', async () => {
    const user = userEvent.setup()
    render(<PingWidget />)
    await user.click(screen.getByRole('button', { name: /^ping$/i }))

    const text = screen.getByRole('log', { name: /ping output/i }).textContent
    expect(text).toContain('4 packets transmitted, 4 received, 0% packet loss')

    const ttls = [...text.matchAll(/ttl=(\d+)/g)].map((match) => match[1])
    expect(ttls).toHaveLength(4)
    expect(new Set(ttls).size).toBe(1)
  })

  it('shows the documentation IP and never a real address', async () => {
    const user = userEvent.setup()
    render(<PingWidget />)
    await user.click(screen.getByRole('button', { name: /^ping$/i }))

    const text = screen.getByRole('log', { name: /ping output/i }).textContent
    expect(text).toContain(TARGET_IP)
    // 203.0.113.0/24 is RFC 5737 TEST-NET-3: safe to show, never routable.
    expect(text).toContain(identity.domain)
  })

  it('labels the output as simulated', async () => {
    const user = userEvent.setup()
    render(<PingWidget />)
    await user.click(screen.getByRole('button', { name: /^ping$/i }))

    expect(screen.getByRole('log', { name: /ping output/i }).textContent).toContain('simulated output')
  })
})