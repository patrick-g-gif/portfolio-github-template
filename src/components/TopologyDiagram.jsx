import { motion } from 'framer-motion'
import { useInViewOnce, usePrefersReducedMotion } from '../hooks/useMedia.js'

const TYPE_FILL = {
  router: '#22d3ee',
  switch: '#38bdf8',
  server: '#a3e635',
  firewall: '#f472b6',
  internet: '#c4b5fd',
}

/**
 * Simple SVG topology. Lines draw themselves in progressively using
 * stroke-dasharray / stroke-dashoffset, driven by a scroll/enter trigger.
 */
export function TopologyDiagram({ topology, title = 'Topology diagram' }) {
  const reducedMotion = usePrefersReducedMotion()
  const [ref, inView] = useInViewOnce({ threshold: 0.15 })
  const active = inView || reducedMotion

  if (!topology?.nodes?.length) return null

  const byId = new Map(topology.nodes.map((node) => [node.id, node]))

  return (
    <div ref={ref} className="rounded-xl border border-cyan-400/15 bg-noc-950/40 p-3">
      <svg
        viewBox="0 0 100 64"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={title}
        className="h-auto w-full"
      >
        <defs>
          <linearGradient id="edge-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#a3e635" />
          </linearGradient>
        </defs>

        {topology.edges.map((edge, index) => {
          const from = byId.get(edge.from)
          const to = byId.get(edge.to)
          if (!from || !to) return null
          const length = Math.hypot(to.x - from.x, to.y - from.y)
          return (
            <motion.line
              key={`${edge.from}-${edge.to}-${index}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="url(#edge-gradient)"
              strokeWidth="0.45"
              strokeLinecap="round"
              strokeDasharray={length.toFixed(2)}
              initial={reducedMotion ? { strokeDashoffset: 0 } : { strokeDashoffset: length }}
              animate={{ strokeDashoffset: active ? 0 : length }}
              transition={{
                duration: reducedMotion ? 0 : 0.7,
                delay: reducedMotion ? 0 : 0.15 + index * 0.12,
                ease: 'easeInOut',
              }}
            />
          )
        })}

        {topology.nodes.map((node, index) => (
          <motion.g
            key={node.id}
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: active ? 1 : 0, scale: active ? 1 : 0.6 }}
            transition={{
              duration: reducedMotion ? 0 : 0.4,
              delay: reducedMotion ? 0 : 0.25 + index * 0.08,
              ease: 'easeOut',
            }}
            style={{ transformOrigin: `${node.x}px ${node.y}px` }}
          >
            <circle cx={node.x} cy={node.y} r="2.6" fill={TYPE_FILL[node.type] ?? '#22d3ee'} opacity="0.9" />
            <circle cx={node.x} cy={node.y} r="4.4" fill="none" stroke={TYPE_FILL[node.type] ?? '#22d3ee'} opacity="0.28" />
            <text
              x={node.x}
              y={node.y + 7.2}
              textAnchor="middle"
              fontSize="2.7"
              fill="currentColor"
              className="font-mono"
              opacity="0.85"
            >
              {node.label}
            </text>
          </motion.g>
        ))}
      </svg>
    </div>
  )
}

export default TopologyDiagram
