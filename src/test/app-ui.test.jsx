/** TDD: theme toggle persistence, navbar active section, canvas pause/cleanup, about, ping. */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '../components/ThemeContext.jsx'
import { ThemeToggle } from '../components/ThemeToggle.jsx'
import { Navbar, SECTIONS } from '../components/Navbar.jsx'
import { useActiveSection } from '../hooks/useMedia.js'
import { NetworkCanvas } from '../components/NetworkCanvas.jsx'
import { PingWidget } from '../components/PingWidget.jsx'
import { About } from '../components/About.jsx'
import { identity, about } from '../data/portfolio.js'

beforeEach(() => {
  globalThis.__setReducedMotion(true)
  document.documentElement.classList.add('dark')
})

const renderToggle = () =>
  render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  )

describe('ThemeToggle', () => {
  it('defaults to dark and persists the choice', async () => {
    const user = userEvent.setup()
    renderToggle()

    const button = screen.getByRole('button', { name: /switch to light mode/i })
    expect(document.documentElement).toHaveClass('dark')

    await user.click(button)

    expect(document.documentElement).not.toHaveClass('dark')
    expect(document.documentElement).toHaveClass('light')
    expect(window.localStorage.getItem('noc-theme')).toBe('light')
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument()
  })

  it('exposes the state to assistive tech', async () => {
    const user = userEvent.setup()
    renderToggle()
    const button = screen.getByRole('button', { name: /switch to light mode/i })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    await user.click(button)
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('Navbar', () => {
  // PillNav (third-party, copied in from React Bits) decides whether to show
  // the links inline or fold them behind a menu button by measuring real
  // pixel widths via ResizeObserver. jsdom has no layout engine, so every
  // element measures 0px and PillNav always folds — there is no way to see
  // the inline pill bar from a jsdom test. So these tests open the folded
  // menu first and assert against the links it reveals; the same items,
  // hrefs and active-state logic drive both presentations. The fold/unfold
  // mechanism itself is real-browser behaviour, not exercised here.
  const openPanel = async (user) => {
    await user.click(screen.getByRole('button', { name: /open menu/i }))
  }

  it('links to every section', async () => {
    const user = userEvent.setup()
    render(<Navbar activeSection="hero" onNavigate={() => {}} />)
    const nav = screen.getByRole('navigation', { name: /primary/i })
    expect(within(nav).getByRole('link', { name: new RegExp(identity.name, 'i') })).toHaveAttribute('href', '#hero')

    await openPanel(user)
    SECTIONS.forEach((section) => {
      const link = within(nav).getByRole('link', { name: new RegExp(`^${section.label}$`, 'i') })
      expect(link).toHaveAttribute('href', `#${section.id}`)
    })
  })

  it('marks the active section for screen readers', async () => {
    const user = userEvent.setup()
    render(<Navbar activeSection="projects" onNavigate={() => {}} />)
    await openPanel(user)
    expect(screen.getByRole('link', { name: /^projects$/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /^about$/i })).not.toHaveAttribute('aria-current')
  })

  it('calls onNavigate with the section id when a link is clicked', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<Navbar activeSection="hero" onNavigate={onNavigate} />)
    await openPanel(user)

    await user.click(screen.getByRole('link', { name: /^about$/i }))
    expect(onNavigate).toHaveBeenCalledWith('about')
  })

  it('highlights the section reported by IntersectionObserver', async () => {
    const user = userEvent.setup()
    // the section must exist before the navbar mounts — that is what it observes
    const section = document.createElement('section')
    section.id = 'contact'
    document.body.appendChild(section)

    // same wiring as App.jsx: the hook owns the state, the navbar renders it
    function Harness() {
      const active = useActiveSection(SECTIONS.map((item) => item.id))
      return <Navbar activeSection={active} onNavigate={() => {}} />
    }

    render(<Harness />)

    act(() => {
      globalThis.__fireIntersection([{ target: section, isIntersecting: true, intersectionRatio: 0.9 }])
    })

    await openPanel(user)
    expect(screen.getByRole('link', { name: /^contact$/i })).toHaveAttribute('aria-current', 'page')
    section.remove()
  })
})

describe('NetworkCanvas', () => {
  it('renders an accessible canvas fallback', () => {
    render(<NetworkCanvas />)
    const canvas = screen.getByTestId('network-canvas')
    expect(canvas.tagName.toLowerCase()).toBe('canvas')
    expect(canvas).toHaveAttribute('aria-hidden', 'true')
  })

  it('draws a single static frame when reduced motion is on (no animation loop)', () => {
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame')
    render(<NetworkCanvas />)
    expect(raf).not.toHaveBeenCalled()
    raf.mockRestore()
  })

  it('starts a rAF loop otherwise and cancels it on unmount', () => {
    globalThis.__setReducedMotion(false)
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame')
    const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame')

    const { unmount } = render(<NetworkCanvas />)
    expect(raf).toHaveBeenCalled()

    const frameId = raf.mock.results[raf.mock.results.length - 1].value
    unmount()
    expect(cancel).toHaveBeenCalledWith(frameId)

    raf.mockRestore()
    cancel.mockRestore()
    globalThis.__setReducedMotion(true)
  })
})

describe('About', () => {
  it('renders the bio, with no stat cards', () => {
    render(<About />)
    about.bio.forEach((paragraph) => expect(screen.getByText(paragraph)).toBeInTheDocument())
    // The Projects/Skills stat cards were removed — About no longer renders them.
    expect(screen.queryByText('Projects')).not.toBeInTheDocument()
    expect(screen.queryByText('Skills')).not.toBeInTheDocument()
    expect(screen.queryByText('Certifications')).not.toBeInTheDocument()
  })

  it('still renders every highlight from the data file', () => {
    render(<About />)
    about.highlights.forEach((highlight) => {
      expect(screen.getByText(highlight.title)).toBeInTheDocument()
      expect(screen.getByText(highlight.text)).toBeInTheDocument()
    })
  })
})

describe('PingWidget', () => {
  it('pings the configured domain and reports a reply with latency', async () => {
    const user = userEvent.setup()
    render(<PingWidget />)

    expect(screen.getByText(`ping ${identity.domain}`)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^ping$/i }))

    const log = await screen.findByRole('log', { name: /ping output/i })
    expect(await within(log).findByText(/icmp_seq=1/)).toBeInTheDocument()
    expect(within(log).getAllByText(/time=\d+\.\d+ ms/)).toHaveLength(4)
    expect(within(log).getByText(/4 packets transmitted, 4 received, 0% packet loss/i)).toBeInTheDocument()
    expect(within(log).getByText(/rtt min\/avg\/max/)).toBeInTheDocument()
  })
})
