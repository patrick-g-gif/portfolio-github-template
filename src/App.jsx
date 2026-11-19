import { useCallback, lazy, Suspense } from 'react'
import { ThemeProvider } from './components/ThemeContext.jsx'
import { Navbar, SECTIONS } from './components/Navbar.jsx'
import { CursorGlow } from './components/CursorGlow.jsx'
import { NetworkBackground } from './components/NetworkBackground.jsx'
import { Hero } from './components/Hero.jsx'
import { About } from './components/About.jsx'
import { Footer } from './components/Footer.jsx'
import { useActiveSection } from './hooks/useMedia.js'
import { identity } from './data/portfolio.js'

// Sections below the fold are lazy-loaded so the main thread stays free at
// startup (the source of the ~1.1 s long task / TBT). The rendered result is
// identical — they simply mount when the browser has spare time, not all at
// once during initial load.
const Skills = lazy(() => import('./components/Skills.jsx').then((m) => ({ default: m.Skills })))
const Terminal = lazy(() => import('./components/Terminal.jsx').then((m) => ({ default: m.Terminal })))
const Projects = lazy(() => import('./components/Projects.jsx').then((m) => ({ default: m.Projects })))
const Timeline = lazy(() => import('./components/Timeline.jsx').then((m) => ({ default: m.Timeline })))
const Contact = lazy(() => import('./components/Contact.jsx').then((m) => ({ default: m.Contact })))

const SECTION_IDS = SECTIONS.map((section) => section.id)

export function App() {
  const activeSection = useActiveSection(SECTION_IDS)

  const handleNavigate = useCallback((id) => {
    const target = document.getElementById(id)
    if (!target) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    // move keyboard focus with the viewport
    target.setAttribute('tabindex', '-1')
    target.focus({ preventScroll: true })
  }, [])

  return (
    <ThemeProvider>
      <a
        href="#hero"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-cyan-400 focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:text-noc-950"
      >
        Skip to content
      </a>

      <NetworkBackground />
      <CursorGlow />
      <Navbar activeSection={activeSection} onNavigate={handleNavigate} />

      <main>
        <Hero />
        <About />
        <Suspense fallback={null}>
          <Skills />

          <section id="terminal" aria-labelledby="terminal-title" className="relative scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-4xl">
              <div className="mb-8">
                <h2 id="terminal-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50">
                  Try the CLI
                </h2>
              </div>
              <Terminal />
            </div>
          </section>

          <Projects />
          <Timeline />
          <Contact />
        </Suspense>
      </main>

      <Footer />
    </ThemeProvider>
  )
}

export { identity }
export default App
