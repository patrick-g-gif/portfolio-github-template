import { useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { TopologyDiagram } from './TopologyDiagram.jsx'
import { usePrefersReducedMotion } from '../hooks/useMedia.js'

const FOCUSABLE =
  'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'

/**
 * Accessible modal: focus trap, Esc to close, scroll lock and focus restored
 * to whatever opened it.
 */
export function ProjectModal({ project, onClose }) {
  const dialogRef = useRef(null)
  const closeRef = useRef(null)
  const restoreRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    restoreRef.current = document.activeElement
    closeRef.current?.focus()

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const dialog = dialogRef.current
      if (!dialog) return
      const items = [...dialog.querySelectorAll(FOCUSABLE)].filter(
        (node) => node.offsetParent !== null || node === document.activeElement,
      )
      if (items.length === 0) return

      const first = items[0]
      const last = items[items.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = overflow
      const restore = restoreRef.current
      if (restore && typeof restore.focus === 'function') restore.focus()
    }
  }, [onClose])

  const onBackdropClick = useCallback(
    (event) => {
      if (event.target === event.currentTarget) onClose()
    },
    [onClose],
  )

  if (!project) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        data-testid="modal-backdrop"
        onClick={onBackdropClick}
        className="absolute inset-0 bg-noc-950/80 backdrop-blur-sm"
        aria-hidden="true"
      />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={project.title}
        initial={reducedMotion ? false : { opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.28, ease: 'easeOut' }}
        className="panel relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-b-none sm:rounded-2xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200/80 bg-white/90 px-5 py-4 backdrop-blur dark:border-noc-700 dark:bg-noc-900/90">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-400">
              {project.category}
              {project.year ? ` · ${project.year}` : ''}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900 sm:text-xl dark:text-slate-50">
              {project.title}
            </h3>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close project details"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300/80 text-slate-600 transition-colors hover:border-cyan-400/60 hover:text-cyan-700 dark:border-noc-600 dark:text-slate-300 dark:hover:text-cyan-300"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 px-5 py-5">
          <p className="text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-400">
            {project.description}
          </p>

          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Tools</h4>
            <ul className="mt-2 flex flex-wrap gap-2">
              {project.tools.map((tool) => (
                <li key={tool} className="chip">
                  {tool}
                </li>
              ))}
            </ul>
          </div>

          {project.topology ? (
            <div>
              <h4 className="font-mono text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Topology
              </h4>
              <div className="mt-2 text-slate-600 dark:text-slate-400">
                <TopologyDiagram topology={project.topology} title={`${project.title} topology diagram`} />
              </div>
            </div>
          ) : null}

          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Result</h4>
            <p className="mt-2 rounded-xl border border-lime-400/25 bg-lime-400/5 p-4 font-mono text-sm text-lime-700 dark:text-lime-300">
              {project.result}
            </p>
          </div>

          {project.metrics?.length ? (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {project.metrics.map((metric) => (
                <div key={metric.label} className="rounded-xl border border-slate-200/80 p-3 text-center dark:border-noc-700">
                  <dt className="font-mono text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-500">
                    {metric.label}
                  </dt>
                  <dd className="mt-1 font-mono text-lg text-cyan-600 dark:text-cyan-300">{metric.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {project.repoUrl ? (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="btn-ghost inline-flex"
            >
              View repository
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M14 5h5v5M19 5l-8 8M17 14v4.5A1.5 1.5 0 0 1 15.5 20h-9A1.5 1.5 0 0 1 5 18.5v-9A1.5 1.5 0 0 1 6.5 8H11" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          ) : null}
        </div>
      </motion.div>
    </div>
  )
}

export default ProjectModal
