/**
 * TDD: the interactive CLI terminal must be fully usable with a keyboard alone.
 * Reduced motion is ON in tests, so typed output resolves immediately.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Terminal } from '../components/Terminal.jsx'

const setup = () => {
  const user = userEvent.setup()
  render(<Terminal />)
  const input = screen.getByRole('textbox', { name: /terminal command input/i })
  return { user, input, output: screen.getByTestId('terminal-output') }
}

const run = async (user, input, command) => {
  await user.type(input, `${command}{Enter}`)
}

describe('Terminal', () => {
  beforeEach(() => {
    globalThis.__setReducedMotion(true)
  })

  it('renders a router prompt and the generated command list', () => {
    setup()
    expect(screen.getByRole('textbox', { name: /terminal command input/i })).toBeInTheDocument()
    expect(screen.getAllByText(/DEVBOX-1[>#]/).length).toBeGreaterThan(0)
    expect(screen.getByRole('log', { name: /terminal output/i })).toBeInTheDocument()
  })

  it('runs a command typed with the keyboard and prints generated output', async () => {
    const { user, input, output } = setup()
    await run(user, input, 'show version')
    expect(within(output).getByText(/Cisco IOS Software/)).toBeInTheDocument()
    expect(within(output).getByText(/ISR4331\/K9 uptime is/)).toBeInTheDocument()
  })

  it('accepts a Cisco-style abbreviation', async () => {
    const { user, input, output } = setup()
    await run(user, input, 'sh ip int br')
    expect(within(output).getByText(/IP-Address/)).toBeInTheDocument()
  })

  it('shows % Invalid input detected for an unknown command', async () => {
    const { user, input, output } = setup()
    await run(user, input, 'teleport to the moon')
    expect(within(output).getByText('% Invalid input detected')).toBeInTheDocument()
  })

  it('completes the current word with Tab', async () => {
    const { user, input } = setup()
    await user.type(input, 'show sk')
    await user.tab()
    expect(input).toHaveValue('show skills')
    await user.keyboard('{Enter}')
    // The first skill group is driven by the data, not hardcoded.
    expect(screen.getByTestId('terminal-output')).toHaveTextContent('NETWORKING')
  })

  it('recalls previous commands with the up arrow and walks forward with the down arrow', async () => {
    const { user, input } = setup()
    await run(user, input, 'help')
    await run(user, input, 'show projects')

    await user.click(input)
    await user.keyboard('{ArrowUp}')
    expect(input).toHaveValue('show projects')
    await user.keyboard('{ArrowUp}')
    expect(input).toHaveValue('help')
    await user.keyboard('{ArrowDown}')
    expect(input).toHaveValue('show projects')
    await user.keyboard('{ArrowDown}')
    expect(input).toHaveValue('')
  })

  it('switches to the privileged prompt with enable and blocks privileged commands in user mode', async () => {
    const { user, input, output } = setup()

    await run(user, input, 'show running-config')
    expect(within(output).getByText(/% Permission denied/)).toBeInTheDocument()

    await run(user, input, 'enable')
    expect(within(output).getByText(/DEVBOX-1#/)).toBeInTheDocument()

    await run(user, input, 'show running-config')
    expect(output).toHaveTextContent('Building configuration')
    // only the first attempt was denied
    expect(output.textContent.match(/% Permission denied/g)).toHaveLength(1)
  })

  it('clears the buffer with clear', async () => {
    const { user, input, output } = setup()
    await run(user, input, 'help')
    expect(output).toHaveTextContent('Available commands')
    await run(user, input, 'enable')
    await run(user, input, 'clear')
    // scrollback is empty again and the hint is back
    expect(output.textContent).not.toContain('Available commands')
    expect(output.textContent).not.toContain('DEVBOX-1> help')
    expect(within(output).getByText(/to autocomplete/)).toBeInTheDocument()
  })

  it('runs quick-command buttons (mobile friendly) and keeps focus in the input', async () => {
    const { user, input, output } = setup()
    const quick = screen.getByRole('group', { name: /quick commands/i })
    const button = within(quick).getByRole('button', { name: 'show ip route' })
    await user.click(button)
    expect(output).toHaveTextContent('Gateway of last resort')
    expect(input).toHaveFocus()
  })

  it('keeps the output scrollable and readable for screen readers', async () => {
    const { user, input, output } = setup()
    await run(user, input, 'show skills')
    expect(output).toHaveAttribute('tabindex', '0')
    expect(output).toHaveAccessibleName(/terminal output/i)
    expect(input).toHaveAttribute('autocomplete', 'off')
    expect(input).toHaveAttribute('spellcheck', 'false')
  })
})
