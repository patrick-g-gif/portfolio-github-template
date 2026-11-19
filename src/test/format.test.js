/** TDD: count-up stat formatting + the easing used by the scroll animation. */
import { describe, it, expect } from 'vitest'
import {
  formatStatValue,
  formatNumber,
  clamp,
  clamp01,
  easeOutCubic,
  createCountUp,
  formatUptime,
  formatLatency,
  formatBytes,
} from '../lib/format.js'

describe('formatNumber', () => {
  it('formats integers with thousands separators', () => {
    expect(formatNumber(12, 0)).toBe('12')
    expect(formatNumber(1200, 0)).toBe('1,200')
    expect(formatNumber(1_250_000, 0)).toBe('1,250,000')
  })

  it('respects the decimals argument', () => {
    expect(formatNumber(99.994, 2)).toBe('99.99')
    expect(formatNumber(99.994, 0)).toBe('100')
    expect(formatNumber(99.994, 1)).toBe('100.0')
    expect(formatNumber(5, 2)).toBe('5.00')
  })

  it('handles negative values and zero', () => {
    expect(formatNumber(0, 0)).toBe('0')
    expect(formatNumber(-1234, 0)).toBe('-1,234')
  })
})

describe('formatStatValue', () => {
  it('appends the suffix used by the stats', () => {
    expect(formatStatValue({ value: 12, suffix: '' })).toBe('12')
    expect(formatStatValue({ value: 5, suffix: '+' })).toBe('5+')
    expect(formatStatValue({ value: 99.99, decimals: 2, suffix: '%' })).toBe('99.99%')
    expect(formatStatValue({ value: 1200, suffix: 'ms' })).toBe('1,200ms')
  })

  it('never shows NaN or Infinity for missing data', () => {
    expect(formatStatValue({})).toBe('0')
    expect(formatStatValue({ value: undefined, suffix: '%' })).toBe('0%')
  })
})

describe('clamp helpers', () => {
  it('clamps into range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-2, 0, 10)).toBe(0)
    expect(clamp(42, 0, 10)).toBe(10)
    expect(clamp01(-1)).toBe(0)
    expect(clamp01(2)).toBe(1)
    expect(clamp01(0.25)).toBe(0.25)
  })
})

describe('createCountUp', () => {
  it('starts at the `from` value and ends exactly on target', () => {
    const counter = createCountUp({ value: 12 })
    expect(counter.valueAt(0)).toBe(0)
    expect(counter.valueAt(1)).toBe(12)
    expect(counter.valueAt(0.5)).toBeCloseTo(12 * 0.875, 5)
  })

  it('supports decimals and a non-zero start value', () => {
    const counter = createCountUp({ value: 99.99, decimals: 2, from: 90 })
    expect(counter.valueAt(0)).toBe(90)
    expect(counter.valueAt(1)).toBe(99.99)
    expect(counter.format(1)).toBe('99.99')
  })

  it('clamps out-of-range progress', () => {
    const counter = createCountUp({ value: 10 })
    expect(counter.valueAt(-5)).toBe(0)
    expect(counter.valueAt(5)).toBe(10)
  })

  it('formats progress values the way the stat cards display them', () => {
    const counter = createCountUp({ value: 1200, suffix: 'ms', decimals: 0 })
    expect(counter.format(0)).toBe('0ms')
    expect(counter.format(1)).toBe('1,200ms')
  })

  it('decelerates (value at 25% is ahead of linear)', () => {
    const counter = createCountUp({ value: 100 })
    expect(counter.valueAt(0.25)).toBeGreaterThan(25)
    expect(easeOutCubic(0.25)).toBeCloseTo(0.578125, 6)
  })
})

describe('formatUptime', () => {
  it('renders weeks/days/hours/minutes', () => {
    expect(formatUptime(0)).toBe('0 minutes')
    expect(formatUptime(60 * 1000)).toBe('1 minute')
    expect(formatUptime(90 * 1000)).toBe('1 minute 30 seconds')
    const ms = (10 * 24 * 3600 + 5 * 3600 + 12 * 60 + 34) * 1000
    expect(formatUptime(ms)).toContain('1 week')
    expect(formatUptime(ms)).toContain('3 days')
    expect(formatUptime(ms)).toContain('5 hours')
    expect(formatUptime(ms)).toContain('12 minutes')
  })
})

describe('ping helpers', () => {
  it('formats latency with two decimals and the unit', () => {
    expect(formatLatency(12)).toBe('12.00 ms')
    expect(formatLatency(3.456)).toBe('3.46 ms')
    expect(formatLatency(0)).toBe('0.00 ms')
  })

  it('formats byte counters', () => {
    expect(formatBytes(84)).toBe('84')
    expect(formatBytes(1234)).toBe('1,234')
  })
})
