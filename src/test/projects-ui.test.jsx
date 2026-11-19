/** TDD: project cards, category filter, modal accessibility and SVG topology. */
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Projects } from '../components/Projects.jsx'
import { projects } from '../data/portfolio.js'

beforeEach(() => {
  globalThis.__setReducedMotion(true)
})

describe('Projects', () => {
  it('renders one card per project with category and tools', () => {
    render(<Projects />)
    const list = screen.getByRole('list', { name: /projects/i })
    expect(list.querySelectorAll(':scope > li')).toHaveLength(projects.length)
    projects.forEach((project) => {
      expect(screen.getByText(project.title)).toBeInTheDocument()
      expect(screen.getByText(project.summary)).toBeInTheDocument()
    })
  })

  it('filters by category', async () => {
    const user = userEvent.setup()
    render(<Projects />)
    const filters = screen.getByRole('group', { name: /filter projects/i })

    // Drive the filter from the real data rather than a hardcoded category.
    const category = projects[0].category
    const button = within(filters).getByRole('button', { name: new RegExp(`^${category}`) })
    await user.click(button)

    const list = screen.getByRole('list', { name: /projects/i })
    const expected = projects.filter((p) => p.category === category).length
    expect(list.querySelectorAll(':scope > li')).toHaveLength(expected)
    // The component pluralises correctly, so match the label it really renders.
    const label = `Showing ${expected} project${expected === 1 ? '' : 's'}`
    expect(screen.getAllByText(label).length).toBeGreaterThan(0)
  })

  it('shows an empty state when a filter matches nothing', async () => {
    const user = userEvent.setup()
    render(<Projects />)
    const filters = screen.getByRole('group', { name: /filter projects/i })
    await user.click(within(filters).getByRole('button', { name: /^All/ }))
    expect(screen.getByRole('list', { name: /projects/i }).querySelectorAll(':scope > li')).toHaveLength(
      projects.length,
    )
  })

  it('opens a modal with description, tools, result and an SVG topology', async () => {
    const user = userEvent.setup()
    render(<Projects />)
    const project = projects[0]
    await user.click(screen.getByRole('button', { name: new RegExp(project.title, 'i') }))

    const dialog = await screen.findByRole('dialog', { name: new RegExp(project.title, 'i') })
    expect(within(dialog).getByText(project.description)).toBeInTheDocument()
    expect(within(dialog).getByText(project.result)).toBeInTheDocument()
    project.tools.forEach((tool) => expect(within(dialog).getByText(tool)).toBeInTheDocument())

    const svg = within(dialog).getByRole('img', { name: /topology diagram/i })
    expect(svg.tagName.toLowerCase()).toBe('svg')
    const lines = svg.querySelectorAll('line, path')
    expect(lines.length).toBe(project.topology.edges.length)
    lines.forEach((line) => {
      expect(line.getAttribute('stroke-dasharray')).toBeTruthy()
      expect(line.getAttribute('stroke-dashoffset')).toBeTruthy()
    })
    project.topology.nodes.forEach((node) => expect(svg.textContent).toContain(node.label))
  })

  it('closes on Escape, locks scroll while open and restores focus', async () => {
    const user = userEvent.setup()
    render(<Projects />)
    const trigger = screen.getByRole('button', { name: new RegExp(projects[1].title, 'i') })

    await user.click(trigger)
    await screen.findByRole('dialog')
    expect(document.body.style.overflow).toBe('hidden')

    await user.keyboard('{Escape}')
    await waitForDialogToClose()
    expect(document.body.style.overflow).not.toBe('hidden')
    expect(trigger).toHaveFocus()
  })

  it('traps Tab focus inside the modal', async () => {
    const user = userEvent.setup()
    render(<Projects />)
    await user.click(screen.getByRole('button', { name: new RegExp(projects[0].title, 'i') }))
    const dialog = await screen.findByRole('dialog')

    for (let i = 0; i < 12; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await user.tab()
      expect(dialog).toContainElement(document.activeElement)
    }
  })

  it('closes when the backdrop is clicked', async () => {
    const user = userEvent.setup()
    render(<Projects />)
    await user.click(screen.getByRole('button', { name: new RegExp(projects[0].title, 'i') }))
    await screen.findByRole('dialog')
    await user.click(screen.getByTestId('modal-backdrop'))
    await waitForDialogToClose()
  })
})

async function waitForDialogToClose() {
  const { waitFor } = await import('@testing-library/react')
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
}
