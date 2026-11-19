import { motion } from 'framer-motion'
import { Section } from './Section.jsx'
import { about } from '../data/portfolio.js'
import { usePrefersReducedMotion } from '../hooks/useMedia.js'

export function About() {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <Section
      id="about"
      index={2}
      title="About"
    >
      <div className="grid gap-8">
        <div>
          <div className="space-y-4">
            {about.bio.map((paragraph, index) => (
              <motion.p
                key={paragraph.slice(0, 24)}
                initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: reducedMotion ? 0 : 0.45, delay: reducedMotion ? 0 : index * 0.08 }}
                className="text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-400"
              >
                {paragraph}
              </motion.p>
            ))}
          </div>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {about.highlights.map((highlight, index) => (
              <motion.li
                key={highlight.title}
                initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: reducedMotion ? 0 : 0.45, delay: reducedMotion ? 0 : 0.05 * index }}
                className="rounded-xl border border-slate-200/80 bg-white/60 p-4 dark:border-noc-700 dark:bg-noc-900/60"
              >
                <p className="font-mono text-xs uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                  {highlight.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{highlight.text}</p>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  )
}

export default About
