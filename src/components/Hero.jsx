import { motion } from 'framer-motion'
import { hero, identity } from '../data/portfolio.js'
import { usePrefersReducedMotion } from '../hooks/useMedia.js'
import { useTypewriter } from '../hooks/useAnimation.js'

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: 0.12 * i, ease: 'easeOut' },
  }),
}

export function Hero() {
  const reducedMotion = usePrefersReducedMotion()
  const name = useTypewriter(identity.name, { reducedMotion, speed: 70, startDelay: 200 })
  const title = useTypewriter(identity.title, { reducedMotion, speed: 42, startDelay: 900 })
  const tagline = useTypewriter(identity.tagline, { reducedMotion, speed: 24, startDelay: 2100 })

  // Render hero content visible from the very first paint — no "hidden"
  // opacity state. The initial fade is exactly what made LCP/SI sit at
  // ~14-21s on throttled mobile. The typewriter effect still runs on top.
  const initial = false

  return (
    <section id="hero" aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <div className="mx-auto flex min-h-[92vh] max-w-6xl flex-col justify-center px-4 pb-20 pt-28 sm:px-6 sm:pb-24 sm:pt-32">
        <motion.h1
          id="hero-title"
          variants={fadeUp}
          initial={initial}
          animate="show"
          custom={1}
          className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-slate-900 sm:text-6xl dark:text-slate-50"
        >
          <span className="font-mono text-base font-normal text-cyan-600 sm:text-lg dark:text-cyan-400">
            &gt;_ {name.text}
            {!name.done ? <span className="ml-0.5 inline-block h-5 w-[9px] translate-y-0.5 animate-blink bg-cyan-400" /> : null}
          </span>
          <span className="mt-2 block text-2xl font-semibold text-slate-700 sm:text-4xl dark:text-slate-300">
            {title.text}
            {!title.done ? <span className="ml-0.5 inline-block h-5 w-[9px] translate-y-0.5 animate-blink bg-cyan-400" /> : null}
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial={initial}
          animate="show"
          custom={2}
          className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-400"
        >
          {tagline.text}
        </motion.p>

        <motion.div variants={fadeUp} initial={initial} animate="show" custom={3} className="mt-8 flex flex-wrap items-center gap-3">
          <a href="#projects" className="btn-primary">
            See projects
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <a href="#terminal" className="btn-ghost font-mono">
            open the CLI
          </a>
        </motion.div>

        <motion.ul
          variants={fadeUp}
          initial={initial}
          animate="show"
          custom={4}
          className="mt-10 flex flex-wrap gap-2"
          aria-label="Focus areas"
        >
          {hero.badges.map((badge) => (
            <li key={badge} className="chip">
              {badge}
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}

export default Hero
