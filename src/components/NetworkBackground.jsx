import { NetworkCanvas } from './NetworkCanvas.jsx'

/**
 * Site-wide network topology background.
 *
 * Fixed to the viewport (not the document), sitting behind every section so
 * the animated nodes/links stay visible the whole time the visitor scrolls —
 * Hero, About, Skills, Terminal, Projects, Timeline, Contact, Footer all sit
 * on top of this single layer instead of each section needing its own copy.
 */
export function NetworkBackground() {
  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 bg-slate-50 dark:bg-noc-950">
      <NetworkCanvas />
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" />
    </div>
  )
}

export default NetworkBackground
