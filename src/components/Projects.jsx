import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Section } from './Section.jsx'
import { ProjectModal } from './ProjectModal.jsx'
import { projects, projectCategories } from '../data/portfolio.js'
import { usePrefersReducedMotion } from '../hooks/useMedia.js'

function ProjectCard({ project, onOpen, index, reducedMotion }) {
  return (
    <motion.li
      layout={!reducedMotion}
      initial={reducedMotion ? false : { opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? undefined : { opacity: 0, y: -12 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: reducedMotion ? 0 : 0.45, delay: reducedMotion ? 0 : index * 0.08 }}
    >
      <button
        type="button"
        onClick={() => onOpen(project)}
        className="panel group flex h-full w-full flex-col p-5 text-left transition-colors hover:border-cyan-400/50"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="chip">{project.category}</span>
          {/* The year is unknown for these projects, so render nothing at all
              rather than an empty cell. */}
          {project.year ? (
            <span className="font-mono text-xs text-slate-500 dark:text-slate-500">{project.year}</span>
          ) : null}
        </div>

        <h3 className="mt-4 text-lg font-semibold text-slate-900 transition-colors group-hover:text-cyan-700 dark:text-slate-50 dark:group-hover:text-cyan-300">
          {project.title}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{project.summary}</p>

        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label={`Tools used in ${project.title}`}>
          {project.tools.slice(0, 4).map((tool) => (
            <li
              key={tool}
              className="rounded-md border border-slate-200/80 px-2 py-0.5 font-mono text-[11px] text-slate-500 dark:border-noc-700 dark:text-slate-400"
            >
              {tool}
            </li>
          ))}
          {project.tools.length > 4 ? (
            <li className="rounded-md border border-slate-200/80 px-2 py-0.5 font-mono text-[11px] text-slate-400 dark:border-noc-700 dark:text-slate-500">
              +{project.tools.length - 4}
            </li>
          ) : null}
        </ul>

        <p className="mt-4 font-mono text-xs text-lime-700 dark:text-lime-400">
          <span aria-hidden="true">▸ </span>
          {project.result}
        </p>
      </button>
    </motion.li>
  )
}

export function Projects() {
  const [filter, setFilter] = useState('All')
  const [active, setActive] = useState(null)
  const reducedMotion = usePrefersReducedMotion()

  const visible = useMemo(
    () => (filter === 'All' ? projects : projects.filter((project) => project.category === filter)),
    [filter],
  )
  const countLabel = `Showing ${visible.length} project${visible.length === 1 ? '' : 's'}`

  return (
    <Section
      id="projects"
      index={5}
      title="Projects"
    >
      <div
        role="group"
        aria-label="Filter projects"
        className="mb-6 flex flex-wrap gap-2"
      >
        {projectCategories.map((category) => {
          const isActive = filter === category
          const count = category === 'All' ? projects.length : projects.filter((p) => p.category === category).length
          return (
            <button
              key={category}
              type="button"
              onClick={() => setFilter(category)}
              aria-pressed={isActive}
              className={`rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors ${
                isActive
                  ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-700 dark:text-cyan-300'
                  : 'border-slate-200/80 text-slate-600 hover:border-cyan-400/40 hover:text-cyan-700 dark:border-noc-700 dark:text-slate-400 dark:hover:text-cyan-300'
              }`}
            >
              {category} <span className="tabular-nums opacity-60">({count})</span>
            </button>
          )
        })}
      </div>

      <p className="sr-only" aria-live="polite">
        {countLabel}
      </p>

      {visible.length === 0 ? (
        <p className="panel p-6 text-sm text-slate-500">No projects in this category yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Projects">
          {visible.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
              reducedMotion={reducedMotion}
              onOpen={setActive}
            />
          ))}
        </ul>
      )}

      <p className="mt-5 font-mono text-xs text-slate-500 dark:text-slate-500">{countLabel}</p>

      <AnimatePresence>
        {active ? <ProjectModal key={active.id} project={active} onClose={() => setActive(null)} /> : null}
      </AnimatePresence>
    </Section>
  )
}

export default Projects
