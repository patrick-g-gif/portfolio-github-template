import { identity } from '../data/portfolio.js'

export function Footer() {
  return (
    <footer className="border-t border-slate-200/70 px-4 py-10 sm:px-6 dark:border-noc-700/80">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-sm text-slate-700 dark:text-slate-300">{identity.name}</p>
        <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-500">{identity.title}</p>
      </div>
    </footer>
  )
}

export default Footer
