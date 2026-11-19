import { motion } from 'framer-motion'
import { usePrefersReducedMotion } from '../hooks/useMedia.js'

/** Shared section shell: anchor id, heading block and scroll-in animation. */
export function Section({ id, index, title, subtitle, children, className = '' }) {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`relative scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 ${className}`}
    >
      <div className="mx-auto max-w-6xl">
        <motion.header
          initial={reducedMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: reducedMotion ? 0 : 0.5, ease: 'easeOut' }}
          className="mb-10"
        >
          <h2
            id={`${id}-title`}
            className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50"
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-400">
              {subtitle}
            </p>
          ) : null}
        </motion.header>
        {children}
      </div>
    </section>
  )
}

export default Section
