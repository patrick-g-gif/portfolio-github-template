import { motion } from 'framer-motion'
import { Section } from './Section.jsx'
import { skills } from '../data/portfolio.js'
import { useInViewOnce, useMediaQuery, usePrefersReducedMotion } from '../hooks/useMedia.js'

const ICONS = {
  route: (
    <>
      <circle cx="6" cy="18" r="2.4" />
      <circle cx="18" cy="6" r="2.4" />
      <path d="M8.4 18h5.1a3.5 3.5 0 0 0 0-7H10a3.5 3.5 0 0 1 0-7h5.6" strokeLinecap="round" />
    </>
  ),
  switch: (
    <>
      <rect x="3" y="9" width="18" height="6.5" rx="2" />
      <path d="M7 12.7h.01M10.5 12.7h.01M14 12.7h.01M17.5 12.7h.01" strokeLinecap="round" strokeWidth="2.2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.2 5.5 6v6c0 4.3 2.9 7.4 6.5 8.8 3.6-1.4 6.5-4.5 6.5-8.8V6L12 3.2Z" strokeLinejoin="round" />
      <path d="m9.4 12 1.9 1.9 3.4-3.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  pulse: (
    <>
      <path d="M3 12h3.6l2-5.5 3.2 11 2.2-6 1.6 2.2H21" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  terminal: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.2" />
      <path d="m7.5 10 2.5 2.2-2.5 2.2M12.8 14.8h4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
}

/**
 * Small 3D tilt card. Pointer-only: touch devices and reduced-motion users get
 * the static card so nothing is hover-dependent.
 */
function TiltCard({ children, className = '' }) {
  const canHover = useMediaQuery('(pointer: fine)')
  const reducedMotion = usePrefersReducedMotion()
  const enabled = canHover && !reducedMotion

  return (
    <motion.div
      className={className}
      whileHover={enabled ? { rotateX: 5, rotateY: -5, scale: 1.015 } : undefined}
      transition={{ type: 'spring', stiffness: 220, damping: 20 }}
      style={{ transformPerspective: 900, transformStyle: 'preserve-3d' }}
    >
      {children}
    </motion.div>
  )
}

function SkillGroup({ group, index, reducedMotion }) {
  const [ref, inView] = useInViewOnce({ threshold: 0.2 })

  return (
    <motion.div
      ref={ref}
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : index * 0.07 }}
      className="h-full"
    >
      <TiltCard className="panel h-full p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-cyan-600 dark:text-cyan-300">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              {ICONS[group.icon] ?? ICONS.terminal}
            </svg>
          </span>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{group.title}</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-500">{group.blurb}</p>
          </div>
        </div>

        <ul className="mt-5 space-y-3.5">
          {group.items.map((item, itemIndex) => (
            <li key={item.name}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-[13px] text-slate-700 dark:text-slate-300">{item.name}</span>
                <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-500">
                  {item.level}%
                </span>
              </div>
              <div
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-noc-700"
                role="progressbar"
                aria-valuenow={item.level}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.name} proficiency`}
              >
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-lime-400"
                  initial={reducedMotion ? { width: `${item.level}%` } : { width: 0 }}
                  animate={{ width: inView || reducedMotion ? `${item.level}%` : 0 }}
                  transition={{
                    duration: reducedMotion ? 0 : 0.9,
                    delay: reducedMotion ? 0 : itemIndex * 0.07,
                    ease: 'easeOut',
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </TiltCard>
    </motion.div>
  )
}

export function Skills() {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <Section
      id="skills"
      index={3}
      title="Skills"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {skills.map((group, index) => (
          <SkillGroup key={group.id} group={group} index={index} reducedMotion={reducedMotion} />
        ))}
      </div>
    </Section>
  )
}

export default Skills
