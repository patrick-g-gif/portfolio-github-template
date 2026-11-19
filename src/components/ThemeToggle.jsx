import { useTheme } from './ThemeContext.jsx'

/**
 * Dark / light switch. Dark is the default "cyber NOC" look; the choice is
 * persisted in localStorage (key: noc-theme) and mirrored onto <html>.
 */
export function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-400/25 bg-noc-900/60 text-cyan-300 transition-colors hover:border-cyan-400/60 hover:text-cyan-200 ${className}`}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M20 14.5A8.2 8.2 0 0 1 9.5 4a8.3 8.3 0 1 0 10.5 10.5Z" strokeLinejoin="round" />
        </svg>
      )}
      <span className="sr-only">{label}</span>
    </button>
  )
}
