/**
 * TDD: terminal command parsing + output generation.
 * Covers: valid commands, unknown commands, history, tab autocomplete,
 * permission modes and data-driven output.
 */
import { describe, it, expect } from 'vitest'
import {
  COMMANDS,
  COMMAND_NAMES,
  INVALID_INPUT_MESSAGE,
  PERMISSION_DENIED_MESSAGE,
  parseCommand,
  resolveCommand,
  autocomplete,
  executeCommand,
  createHistory,
  pushHistory,
  historyUp,
  historyDown,
} from '../lib/terminal.js'
import * as portfolio from '../data/portfolio.js'

const FIXED_NOW = Date.parse('2025-02-11T14:56:42Z') // bootAt + 1 day 6h 42m

describe('parseCommand', () => {
  it('trims and collapses whitespace, lowercases the verb', () => {
    expect(parseCommand('   Show    IP   Route ')).toEqual({
      raw: '   Show    IP   Route ',
      normalized: 'show ip route',
      name: 'show',
      args: ['ip', 'route'],
      argString: 'ip route',
      empty: false,
    })
  })

  it('flags empty input', () => {
    expect(parseCommand('').empty).toBe(true)
    expect(parseCommand('    ').empty).toBe(true)
    expect(parseCommand(undefined).empty).toBe(true)
    expect(parseCommand(null).empty).toBe(true)
  })
})

describe('command table', () => {
  it('contains every command required by the spec', () => {
    const required = [
      'help',
      'show version',
      'show ip route',
      'show ip interface brief',
      'show running-config',
      'show skills',
      'show projects',
      'show certs',
      'show contact',
      'clear',
    ]
    required.forEach((name) => expect(COMMAND_NAMES).toContain(name))
  })

  it('gives every command a description and a privilege level', () => {
    COMMANDS.forEach((c) => {
      expect(typeof c.name).toBe('string')
      expect(c.description.length).toBeGreaterThan(3)
      expect(['user', 'privileged']).toContain(c.privilege)
    })
  })
})

describe('resolveCommand', () => {
  it('resolves an exact command', () => {
    const result = resolveCommand('show version')
    expect(result.status).toBe('ok')
    expect(result.name).toBe('show version')
    expect(result.args).toEqual([])
  })

  it('resolves Cisco-style unique abbreviations', () => {
    expect(resolveCommand('sh ver').name).toBe('show version')
    expect(resolveCommand('sh ip int br').name).toBe('show ip interface brief')
    expect(resolveCommand('sh run').name).toBe('show running-config')
    expect(resolveCommand('SHOW CERT').name).toBe('show certs')
  })

  it('reports ambiguous prefixes instead of guessing', () => {
    const result = resolveCommand('sh i')
    expect(result.status).toBe('ambiguous')
    expect(result.matches.map((m) => m.name)).toEqual(['show ip interface brief', 'show ip route'])
  })

  it('reports unknown commands as invalid', () => {
    expect(resolveCommand('teleport').status).toBe('invalid')
    expect(resolveCommand('show nothing').status).toBe('invalid')
    expect(resolveCommand('').status).toBe('invalid')
  })
})

describe('autocomplete (Tab key)', () => {
  it('completes a unique prefix', () => {
    expect(autocomplete('show sk')).toEqual({ completion: 'show skills', suggestions: ['show skills'] })
    expect(autocomplete('hel').completion).toBe('help')
  })

  it('completes the shared prefix of an ambiguous input and lists options', () => {
    const result = autocomplete('show ip r')
    expect(result.completion).toBe('show ip route')
    expect(result.suggestions).toEqual(['show ip route'])
  })

  it('keeps typing words when several commands still match', () => {
    const result = autocomplete('show ip ')
    expect(result.completion).toBe('show ip ')
    expect(result.suggestions).toEqual(['show ip interface brief', 'show ip route'])
  })

  it('returns no suggestions for unknown input', () => {
    expect(autocomplete('zzz')).toEqual({ completion: 'zzz', suggestions: [] })
    expect(autocomplete('')).toEqual({ completion: '', suggestions: [] })
  })

  it('keeps trailing arguments when completing an abbreviation', () => {
    expect(autocomplete('sh ver 2').completion).toBe('show version 2')
  })
})

describe('executeCommand — valid commands', () => {
  const run = (input, mode = 'privileged') =>
    executeCommand(input, { data: portfolio, mode, now: FIXED_NOW })

  it('generates `show version` output from portfolio data', () => {
    const res = run('show version')
    expect(res.status).toBe('ok')
    const text = res.lines.join('\n')
    expect(text).toContain(portfolio.identity.name)
    expect(text).toContain(portfolio.terminal.iosVersion)
    expect(text).toContain(portfolio.terminal.model)
    expect(text).toContain('1 day 6 hours 42 minutes')
  })

  it('generates `show ip route` as an aligned table', () => {
    const res = run('show ip route')
    const text = res.lines.join('\n')
    expect(text).toContain('Codes:')
    expect(text).toContain('Gateway of last resort')
    expect(text).toContain('0.0.0.0/0')
    expect(text).toContain('203.0.113.1')
    expect(text).toContain('192.0.2.0/24')
    // every data route shows up
    portfolio.terminal.routes.forEach((r) => expect(text).toContain(r.prefix))
    // The owner has no dynamic-routing experience: no OSPF/BGP rows may appear.
    expect(text).not.toContain('ospf')
    expect(text).not.toContain('bgp')
  })

  it('generates `show ip interface brief` from the interface list', () => {
    const res = run('show ip interface brief')
    const text = res.lines.join('\n')
    expect(text).toContain('OK?')
    expect(text).toContain('IP-Address')
    expect(text).toMatch(/YES NVRAM\s+up\s+up/)
    expect(text).toMatch(/YES NVRAM\s+admin down\s+down/)
    portfolio.terminal.interfaces.forEach((i) => expect(text).toContain(i.name))
  })

  it('generates `show running-config` from the config array', () => {
    const res = run('show running-config')
    expect(res.lines[0]).toContain('Building configuration')
    expect(res.lines.at(-1)).toBe('end')
    expect(res.lines.join('\n')).toContain(portfolio.terminal.hostname)
    // no raw password-looking secrets beyond the masked placeholders
    expect(res.lines.join('\n')).not.toMatch(/enable password\s+\S/)
  })

  it('generates `show skills` from the skills groups', () => {
    const text = run('show skills').lines.join('\n')
    portfolio.skills.forEach((group) => {
      expect(text).toContain(group.title.toUpperCase())
      group.items.forEach((item) => expect(text).toContain(item.name))
    })
  })

  it('generates `show projects` from the projects array', () => {
    const text = run('show projects').lines.join('\n')
    portfolio.projects.forEach((p) => {
      expect(text).toContain(p.id)
      expect(text).toContain(p.category)
    })
  })

  it('generates `show certs` from certifications', () => {
    const text = run('show certs').lines.join('\n')
    portfolio.certifications.forEach((c) => {
      expect(text).toContain(c.name)
      expect(text).toContain(c.issuer)
    })
  })

  it('says "no certifications yet" when the list is empty', () => {
    // The owner has no certifications, so the honest output is an explicit
    // empty state — not a blank screen and not "undefined".
    expect(portfolio.certifications).toHaveLength(0)
    const text = run('show certs').lines.join('\n')
    expect(text).toContain('no certifications yet')
    expect(text).not.toContain('undefined')
  })

  it('generates `show contact` with mail and github', () => {
    const text = run('show contact').lines.join('\n')
    expect(text).toContain(portfolio.contact.email)
    expect(text).toContain(portfolio.contact.github)
    expect(text).toContain(portfolio.contact.website)
  })

  it('omits the LinkedIn line entirely when there is no profile', () => {
    // There is no LinkedIn account, so the line must be absent — not blank,
    // not "LinkedIn: undefined".
    expect(portfolio.contact.linkedin).toBe('')
    const text = run('show contact').lines.join('\n')
    expect(text).not.toContain('LinkedIn')
    expect(text).not.toContain('undefined')
  })

  it('lists commands in `help` and supports `help <command>`', () => {
    const help = run('help').lines.join('\n')
    COMMANDS.forEach((c) => expect(help).toContain(c.name))
    expect(help.toLowerCase()).toContain('running-config')
    expect(run('help show ip route').lines.join('\n')).toContain('0.0.0.0/0')
  })

  it('clears the buffer', () => {
    const res = run('clear')
    expect(res.status).toBe('ok')
    expect(res.clear).toBe(true)
    expect(res.lines).toEqual([])
  })

  it('switches to the privileged prompt after `enable` and back with `exit`', () => {
    const enabled = run('enable', 'user')
    expect(enabled.mode).toBe('privileged')
    expect(enabled.prompt).toBe(portfolio.terminal.enabledPrompt)
    const exited = run('exit', 'privileged')
    expect(exited.mode).toBe('user')
    expect(exited.prompt).toBe(portfolio.terminal.privilegePrompt)
  })

  it('returns the prompt that matches the resulting mode', () => {
    expect(run('show version', 'user').prompt).toBe(portfolio.terminal.privilegePrompt)
    expect(run('show version', 'privileged').prompt).toBe(portfolio.terminal.enabledPrompt)
  })
})

describe('executeCommand — unknown + permission handling', () => {
  const run = (input, mode = 'privileged') =>
    executeCommand(input, { data: portfolio, mode, now: FIXED_NOW })

  it('prints "% Invalid input detected" for unknown commands', () => {
    const res = run('teleport to moon')
    expect(res.status).toBe('invalid')
    expect(res.lines).toEqual([INVALID_INPUT_MESSAGE])
    expect(INVALID_INPUT_MESSAGE).toBe('% Invalid input detected')
  })

  it('prints "% Invalid input detected" for a bad sub-command', () => {
    expect(run('show ip nothing').status).toBe('invalid')
  })

  it('prints "% Ambiguous command" with the candidates', () => {
    const res = run('sh i')
    expect(res.status).toBe('ambiguous')
    expect(res.lines[0]).toContain('% Ambiguous command')
    expect(res.lines.join('\n')).toContain('show ip route')
  })

  it('blocks privileged commands in user mode and teaches the fix', () => {
    const res = run('show running-config', 'user')
    expect(res.status).toBe('permission')
    expect(res.lines[0]).toContain('% Permission denied')
    expect(res.lines.join('\n')).toContain('enable')
    expect(PERMISSION_DENIED_MESSAGE).toContain('% Permission denied')
  })

  it('allows read-only commands in user mode', () => {
    expect(run('show ip route', 'user').status).toBe('ok')
    expect(run('help', 'user').status).toBe('ok')
  })

  it('is case-insensitive and tolerates extra spaces', () => {
    expect(run('  SHOW   IP   ROUTE  ').status).toBe('ok')
  })
})

describe('command history', () => {
  it('starts empty with index 0', () => {
    const h = createHistory()
    expect(h.entries).toEqual([])
    expect(h.index).toBe(0)
  })

  it('ignores empty and duplicate consecutive entries', () => {
    let h = createHistory()
    h = pushHistory(h, 'show version')
    h = pushHistory(h, '   ')
    h = pushHistory(h, 'show version')
    h = pushHistory(h, 'show ip route')
    expect(h.entries).toEqual(['show version', 'show ip route'])
  })

  it('walks backwards with historyUp and forwards with historyDown', () => {
    let h = createHistory()
    ;['help', 'show version', 'show ip route'].forEach((c) => (h = pushHistory(h, c)))

    expect(historyUp(h).entry).toBe('show ip route')
    let state = historyUp(h)
    state = historyUp(state)
    expect(state.entry).toBe('show version')
    state = historyUp(state)
    expect(state.entry).toBe('help')
    // stays pinned on the oldest entry
    state = historyUp(state)
    expect(state.entry).toBe('help')
  })

  it('walks forward again and past the newest entry returns the draft', () => {
    let h = createHistory()
    ;['help', 'show version'].forEach((c) => (h = pushHistory(h, c)))

    let state = historyUp(h)
    expect(state.entry).toBe('show version')
    state = historyUp(state)
    expect(state.entry).toBe('help')
    state = historyDown(state)
    expect(state.entry).toBe('show version')
    state = historyDown(state)
    expect(state.entry).toBe('') // back to the empty draft
  })

  it('resets the cursor when a new command is pushed', () => {
    let h = createHistory()
    h = pushHistory(h, 'help')
    h = historyUp(h)
    expect(h.index).toBe(1)
    h = pushHistory(h, 'show version')
    expect(h.index).toBe(0)
  })
})

describe('typed output helper', () => {
  it('splits generated lines into a printable string', () => {
    const res = executeCommand('show version', { data: portfolio, mode: 'privileged', now: FIXED_NOW })
    expect(res.lines.length).toBeGreaterThan(5)
    res.lines.forEach((line) => expect(typeof line).toBe('string'))
  })
})
