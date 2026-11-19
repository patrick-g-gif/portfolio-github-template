import PillNav from './PillNav.jsx'

/** Single source of truth for the section order — used by the nav and the scroller. */
export const SECTIONS = [
  { id: 'hero', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'projects', label: 'Projects' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'contact', label: 'Contact' },
]

const NETWORK_MARK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <rect x="9" y="2.5" width="6" height="6" rx="1.5" />
    <rect x="2" y="15.5" width="6" height="6" rx="1.5" />
    <rect x="16" y="15.5" width="6" height="6" rx="1.5" />
    <path d="M12 8.5v3.5M5 15.5V12h14v3.5" strokeLinecap="round" />
  </svg>
)

const PILL_ITEMS = SECTIONS.map((section) => ({ label: section.label, href: `#${section.id}` }))

export function Navbar({ activeSection = 'hero', onNavigate = () => {} }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex justify-center px-4 py-3 sm:px-6">
      <PillNav
        logo={NETWORK_MARK}
        logoAlt="Alex Rivera"
        logoHref="#hero"
        items={PILL_ITEMS}
        activeHref={`#${activeSection}`}
        layout="split"
        theme="dark"
        surface="glass"
        highlightColor="#22d3ee"
        hoverEffect="fill"
        indicator="dot"
        ariaLabel="Primary"
        className="max-w-6xl"
        onItemClick={(_item, index, event) => {
          event.preventDefault()
          onNavigate(SECTIONS[index].id)
        }}
      />
    </header>
  )
}

export default Navbar
