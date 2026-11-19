import { motion } from 'framer-motion'
import { Section } from './Section.jsx'
import { certifications, experience, education } from '../data/portfolio.js'
import { useInViewOnce, usePrefersReducedMotion } from '../hooks/useMedia.js'

const STATUS_STYLES = {
  certified: 'border-lime-400/50 bg-lime-400/10 text-lime-700 dark:text-lime-300',
  'in-progress': 'border-cyan-400/50 bg-cyan-400/10 text-cyan-700 dark:text-cyan-300',
  planned: 'border-slate-300/70 bg-slate-200/60 text-slate-600 dark:border-noc-600 dark:bg-noc-800 dark:text-slate-400',
}

const STATUS_LABELS = {
  certified: 'Certified',
  'in-progress': 'In progress',
  planned: 'Planned',
}

export function Timeline() {
  const reducedMotion = usePrefersReducedMotion()
  const [experienceSpineRef, experienceSpineInView] = useInViewOnce({ threshold: 0.05 })
  const [educationSpineRef, educationSpineInView] = useInViewOnce({ threshold: 0.05 })

  return (
    <Section
      id="timeline"
      index={6}
      title="Experience & Education"
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* certifications — hidden entirely when there are none */}
        {certifications.length > 0 && (
        <div>
          <h3 className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400">
            Certifications
          </h3>
          <ul className="mt-4 space-y-3">
            {certifications.map((cert, index) => (
              <motion.li
                key={cert.id}
                initial={reducedMotion ? false : { opacity: 0, x: -14 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : index * 0.07 }}
                className="panel p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-50">{cert.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-500">
                      {cert.issuer} {cert.date ? `· ${cert.date}` : ''}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${
                      STATUS_STYLES[cert.status] ?? STATUS_STYLES.planned
                    }`}
                  >
                    {STATUS_LABELS[cert.status] ?? cert.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{cert.detail}</p>
              </motion.li>
            ))}
          </ul>
        </div>
        )}

        {/* experience timeline with a spine that grows on scroll */}
        <div className="space-y-10">
          <TimelineGroup
            heading="Experience"
            items={experience}
            spineRef={experienceSpineRef}
            spineInView={experienceSpineInView}
            reducedMotion={reducedMotion}
          />
          <TimelineGroup
            heading="Education"
            items={education}
            spineRef={educationSpineRef}
            spineInView={educationSpineInView}
            reducedMotion={reducedMotion}
          />
        </div>
      </div>
    </Section>
  )
}

function TimelineGroup({ heading, items, spineRef, spineInView, reducedMotion }) {
  if (items.length === 0) return null

  return (
    <div>
      <h3 className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400">
        {heading}
      </h3>

      <div ref={spineRef} className="relative mt-6 pl-7">
        {/* static track */}
        <span
          aria-hidden="true"
          className="absolute left-[9px] top-1 h-full w-px bg-slate-200 dark:bg-noc-700"
        />
        {/* growing spine */}
        <motion.span
          aria-hidden="true"
          className="absolute left-[9px] top-1 w-px origin-top bg-gradient-to-b from-cyan-400 to-lime-400"
          initial={reducedMotion ? { height: '100%' } : { height: 0 }}
          animate={{ height: spineInView || reducedMotion ? '100%' : 0 }}
          transition={{ duration: reducedMotion ? 0 : 1.4, ease: 'easeInOut' }}
          style={{ bottom: 0 }}
        />

        <ul className="space-y-8">
          {items.map((item, index) => (
            <motion.li
              key={item.id}
              initial={reducedMotion ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : index * 0.08 }}
              className="relative"
            >
              <span
                aria-hidden="true"
                className={`absolute -left-[26px] top-1.5 grid h-[18px] w-[18px] place-items-center rounded-full border-2 bg-noc-950 dark:bg-noc-950 ${
                  item.type === 'work'
                    ? 'border-cyan-400'
                    : 'border-lime-400'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current text-cyan-400 dark:text-cyan-300" />
              </span>

              <div className="panel p-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h4 className="text-base font-semibold text-slate-900 dark:text-slate-50">{item.role}</h4>
                  <span className="chip">{item.type === 'work' ? 'Work' : 'Education'}</span>
                </div>
                <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-500">
                  {/* `period` is empty when the year is unknown — join only what
                      actually exists so there is no dangling separator. */}
                  {[item.org, item.location, item.period].filter(Boolean).join(' · ')}
                </p>
                <ul className="mt-3 space-y-2">
                  {item.points.map((point) => (
                    <li key={point} className="flex gap-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-400" aria-hidden="true" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default Timeline
