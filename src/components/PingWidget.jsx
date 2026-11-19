import { useCallback, useEffect, useRef, useState } from 'react'
import { identity } from '../data/portfolio.js'
import { computePingStats, formatLatency, formatPingStatsLine } from '../lib/format.js'
import { usePrefersReducedMotion } from '../hooks/useMedia.js'

const PACKETS = 4
const TTL = 54
// 203.0.113.0/24 is the RFC 5737 TEST-NET-3 documentation range — never a real
// host, which is why it is safe to display. Do not put a real IP here.
const TARGET_IP = '203.0.113.10'
const randomLatency = () => Math.round((6 + Math.random() * 34) * 100) / 100

/**
 * Fake `ping` — no backend, no network calls. Types the command, then prints
 * replies from a made-up host with randomised latency.
 */
export function PingWidget() {
  const host = identity.domain || 'localhost'
  const reducedMotion = usePrefersReducedMotion()
  const [lines, setLines] = useState([])
  const [running, setRunning] = useState(false)
  const timers = useRef([])

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => clearTimeout(id))
    timers.current = []
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  const runPing = () => {
    clearTimers()
    setRunning(true)
    setLines([])

    const scheduled = []
    scheduled.push(
      setTimeout(() => {
        setLines([`PING ${host} (${TARGET_IP}) 56(84) bytes of data.`])
      }, reducedMotion ? 0 : 350),
    )

    // Draw every latency ONCE, up front, so the per-packet lines and the
    // summary are guaranteed to describe the same run. Previously the summary
    // rolled a second, independent set of random numbers that were never shown,
    // which is why min/avg/max never matched the times above them.
    const times = Array.from({ length: PACKETS }, () => randomLatency())

    times.forEach((latency, index) => {
      scheduled.push(
        setTimeout(
          () => {
            setLines((current) => [
              ...current,
              `64 bytes from ${host} (${TARGET_IP}): icmp_seq=${index + 1} ttl=${TTL} time=${formatLatency(
                latency,
              )}`,
            ])
          },
          reducedMotion ? 0 : 700 + index * 380,
        ),
      )
    })

    scheduled.push(
      setTimeout(
        () => {
          setLines((current) => [
            ...current,
            '',
            `--- ${host} ping statistics ---`,
            `${PACKETS} packets transmitted, ${PACKETS} received, 0% packet loss, time 3002ms`,
            formatPingStatsLine(computePingStats(times)),
            'simulated output',
          ])
          setRunning(false)
        },
        reducedMotion ? 0 : 700 + PACKETS * 380,
      ),
    )

    timers.current = scheduled
  }

  return (
    <div className="rounded-2xl border border-lime-400/25 bg-lime-400/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-sm text-lime-700 dark:text-lime-300">ping {host}</p>
        <button
          type="button"
          onClick={runPing}
          disabled={running}
          className="btn-primary border-lime-400/40 bg-lime-400/10 text-lime-700 hover:bg-lime-400/20 disabled:opacity-60 dark:text-lime-300"
        >
          {running ? 'running…' : 'ping'}
        </button>
      </div>

      <div
        role="log"
        aria-label="Ping output"
        aria-live="polite"
        className="mt-4 min-h-[112px] whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-lime-800 sm:text-xs dark:text-lime-200/90"
      >
        {lines.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-500">
            Tap <span className="font-semibold">ping</span> — the reply is simulated locally, nothing leaves your browser.
          </p>
        ) : (
          lines.map((line, index) =>
            line === 'simulated output' ? (
              // Small, dimmed caption under the stats — the run is a local demo,
              // not a measurement of any real host.
              <p key={`${line}-${index}`} className="text-[10px] text-slate-500 dark:text-slate-500">
                {line}
              </p>
            ) : (
              <p key={`${line}-${index}`}>{line}</p>
            ),
          )
        )}
      </div>
    </div>
  )
}

export default PingWidget
