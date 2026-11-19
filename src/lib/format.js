/**
 * Number formatting + easing helpers shared by the count-up stats, the
 * terminal `show version` uptime line and the contact ping widget.
 * Pure functions only — easy to unit test.
 */

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

export const clamp01 = (value) => clamp(Number.isFinite(value) ? value : 0, 0, 1)

/** Standard ease-out: fast first, slow settle. Progress must be 0..1. */
export const easeOutCubic = (progress) => 1 - Math.pow(1 - clamp01(progress), 3)

const plural = (value, unit) => `${value} ${unit}${value === 1 ? '' : 's'}`

/**
 * Format a number for display: thousands separators + fixed decimals.
 * `decimals` defaults to 0.
 */
export function formatNumber(value, decimals = 0) {
  const safeDecimals = Math.max(0, Math.min(6, Number(decimals) || 0))
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return (0).toFixed(safeDecimals)

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: safeDecimals,
    maximumFractionDigits: safeDecimals,
  }).format(numeric)
}

/**
 * Format one entry of `about.stats` — the value plus its suffix,
 * e.g. `{ value: 99.99, decimals: 2, suffix: '%' }` -> `'99.99%'`.
 */
export function formatStatValue(stat = {}) {
  const decimals = Number.isFinite(Number(stat?.decimals)) ? Number(stat.decimals) : 0
  const suffix = typeof stat?.suffix === 'string' ? stat.suffix : ''
  const value = Number.isFinite(Number(stat?.value)) ? Number(stat.value) : 0
  return `${formatNumber(value, decimals)}${suffix}`
}

/**
 * Build a count-up animation model for a single stat.
 * `valueAt(progress)` maps animation progress (0..1) to the displayed value.
 */
export function createCountUp(stat = {}, options = {}) {
  const from = Number.isFinite(Number(options.from ?? stat?.from)) ? Number(options.from ?? stat.from) : 0
  const target = Number.isFinite(Number(stat?.value)) ? Number(stat.value) : 0
  const decimals = Number.isFinite(Number(stat?.decimals)) ? Number(stat.decimals) : 0
  const suffix = typeof stat?.suffix === 'string' ? stat.suffix : ''

  return {
    from,
    target,
    decimals,
    suffix,
    valueAt: (progress) => from + (target - from) * easeOutCubic(progress),
    format: (progress) => `${formatNumber(from + (target - from) * easeOutCubic(progress), decimals)}${suffix}`,
  }
}

/** "1 day 6 hours 42 minutes 34 seconds" — omits empty leading units. */
export function formatUptime(ms) {
  const totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000))
  if (totalSeconds === 0) return '0 minutes'

  const units = [
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ]

  const parts = []
  let remaining = totalSeconds
  units.forEach(([unit, size]) => {
    const amount = Math.floor(remaining / size)
    if (amount > 0) {
      parts.push(plural(amount, unit))
      remaining -= amount * size
    }
  })

  return parts.length ? parts.join(' ') : '0 minutes'
}

/** "12.34 ms" — ping latency. */
export function formatLatency(ms) {
  return `${formatNumber(ms, 2)} ms`
}

/**
 * Build the real `ping` summary line from the SAME values that were printed on
 * the per-packet lines.
 *
 * Averages the way real ping does: it divides by the count and then rounds to
 * 3 decimals (Linux `ping` keeps 1/1000 ms resolution). `mdev` is the standard
 * deviation of the sample.
 *
 * @param {number[]} times  the exact per-packet latencies shown to the user
 * @returns {{ min: number, avg: number, max: number, mdev: number }}
 */
export function computePingStats(times = []) {
  const values = (Array.isArray(times) ? times : []).map(Number).filter(Number.isFinite)
  if (values.length === 0) return { min: 0, avg: 0, max: 0, mdev: 0 }

  const sum = values.reduce((total, value) => total + value, 0)
  const avg = sum / values.length
  const variance = values.reduce((total, value) => total + (value - avg) ** 2, 0) / values.length

  return {
    min: Math.min(...values),
    avg: Math.round(avg * 1000) / 1000,
    max: Math.max(...values),
    mdev: Math.round(Math.sqrt(variance) * 1000) / 1000,
  }
}

/** `rtt min/avg/max/mdev = 8.115/12.207/15.884/2.941 ms` — 3 decimals, like ping. */
export function formatPingStatsLine(stats = {}) {
  const value = (input) => formatNumber(Math.max(0, Number(input) || 0), 3)
  return `rtt min/avg/max/mdev = ${value(stats.min)}/${value(stats.avg)}/${value(
    stats.max,
  )}/${value(stats.mdev)} ms`
}

/** Plain integer with separators — ping byte counters. */
export function formatBytes(bytes) {
  return formatNumber(bytes, 0)
}
