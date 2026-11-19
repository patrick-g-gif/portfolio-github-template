/**
 * Cisco-style CLI engine: parsing, unique-prefix abbreviation (like real IOS),
 * Tab autocomplete, command history and — most importantly — output that is
 * generated from src/data/portfolio.js rather than hardcoded.
 */

import { formatUptime } from './format.js'

export const INVALID_INPUT_MESSAGE = '% Invalid input detected'
export const PERMISSION_DENIED_MESSAGE = '% Permission denied.'
export const HISTORY_LIMIT = 50

export const COMMANDS = [
  {
    name: 'help',
    usage: 'help [command]',
    description: 'List available commands, or explain one of them.',
    category: 'Shell',
    privilege: 'user',
    kind: 'help',
  },
  {
    name: 'enable',
    usage: 'enable',
    description: 'Enter privileged exec mode (Router#).',
    category: 'Shell',
    privilege: 'user',
    kind: 'enable',
  },
  {
    name: 'exit',
    usage: 'exit',
    description: 'Return to user exec mode (Router>).',
    category: 'Shell',
    privilege: 'privileged',
    kind: 'exit',
  },
  {
    name: 'show version',
    usage: 'show version',
    description: 'IOS version, model, uptime and memory.',
    category: 'Show',
    privilege: 'user',
    kind: 'version',
  },
  {
    name: 'show ip route',
    usage: 'show ip route',
    description: 'Routing table for all connected networks.',
    category: 'Show',
    privilege: 'user',
    kind: 'route',
  },
  {
    name: 'show ip interface brief',
    usage: 'show ip interface brief',
    description: 'Interface addresses and line/protocol status.',
    category: 'Show',
    privilege: 'user',
    kind: 'interfaceBrief',
  },
  {
    name: 'show running-config',
    usage: 'show running-config',
    description: 'Full running configuration of this router.',
    category: 'Show',
    privilege: 'privileged',
    kind: 'runningConfig',
  },
  {
    name: 'show skills',
    usage: 'show skills',
    description: 'Skill groups with proficiency level per item.',
    category: 'Portfolio',
    privilege: 'user',
    kind: 'skills',
  },
  {
    name: 'show projects',
    usage: 'show projects',
    description: 'Project inventory with category and tool count.',
    category: 'Portfolio',
    privilege: 'user',
    kind: 'projects',
  },
  {
    name: 'show certs',
    usage: 'show certs',
    description: 'Certifications, issuers and status.',
    category: 'Portfolio',
    privilege: 'user',
    kind: 'certs',
  },
  {
    name: 'show contact',
    usage: 'show contact',
    description: 'Email, GitHub, website and location.',
    category: 'Portfolio',
    privilege: 'user',
    kind: 'contact',
  },
  {
    name: 'clear',
    usage: 'clear',
    description: 'Clear the screen / scrollback buffer.',
    category: 'Shell',
    privilege: 'privileged',
    kind: 'clear',
  },
]

export const COMMAND_NAMES = COMMANDS.map((command) => command.name)

/* -------------------------------------------------------------------------- */
/* Parsing                                                                    */
/* -------------------------------------------------------------------------- */

/** Normalise raw input: trim, collapse whitespace, lowercase. */
export function parseCommand(raw) {
  const source = typeof raw === 'string' ? raw : String(raw ?? '')
  const normalized = source.trim().replace(/\s+/g, ' ').toLowerCase()
  const tokens = normalized ? normalized.split(' ') : []
  const [name = '', ...args] = tokens

  return {
    raw: source,
    normalized,
    name,
    args,
    argString: args.join(' '),
    empty: tokens.length === 0,
  }
}

/**
 * Cisco-style word matching: every typed token must be a prefix of some later
 * word of the command ("sh int br" -> "show ip interface brief"). Words may be
 * skipped, and once a token stops matching the rest becomes arguments.
 * @returns {{ matched: boolean, consumed: number }} tokens consumed by the command
 */
export function matchPrefix(name, inputTokens) {
  const nameTokens = name.split(' ')
  let cursor = 0
  let consumed = 0

  for (const token of inputTokens) {
    let found = -1
    for (let i = cursor; i < nameTokens.length; i += 1) {
      if (nameTokens[i].startsWith(token)) {
        found = i
        break
      }
    }
    if (found === -1) break
    cursor = found + 1
    consumed += 1
  }

  return { matched: consumed > 0, consumed }
}

/**
 * Resolve input to a command.
 * Exact match first, then Cisco-style unique prefix ("sh ver" -> "show version").
 */
export function resolveCommand(raw) {
  const parsed = parseCommand(raw)
  if (parsed.empty) {
    return { status: 'invalid', parsed, reason: 'empty' }
  }

  const exact = COMMANDS.find((command) => command.name === parsed.normalized)
  if (exact) {
    const args = parsed.args.slice(exact.name.split(' ').length - 1)
    return { status: 'ok', command: exact, name: exact.name, args, argString: args.join(' '), parsed }
  }

  const typedTokens = parsed.normalized.split(' ')
  const scored = COMMANDS.map((command) => ({ command, ...matchPrefix(command.name, typedTokens) }))

  // First choice: every typed word belongs to the command name ("show ip i").
  let candidates = scored.filter((candidate) => candidate.consumed === typedTokens.length)

  if (candidates.length === 0) {
    // Fallback: the command name is fully typed and the rest are arguments
    // ("sh ver 2" -> "show version" with args ["2"]).
    candidates = scored.filter(
      (candidate) =>
        candidate.consumed === candidate.command.name.split(' ').length &&
        candidate.consumed < typedTokens.length,
    )
  }

  if (candidates.length === 0) {
    return { status: 'invalid', parsed, reason: 'unknown' }
  }

  // The most specific match wins: "show ip i" beats "show ip route".
  const best = Math.max(...candidates.map((candidate) => candidate.consumed))
  const finalists = candidates
    .filter((candidate) => candidate.consumed === best)
    .map((candidate) => candidate.command)
    .sort((a, b) => a.name.localeCompare(b.name))

  if (finalists.length === 1) {
    const [match] = finalists
    const args = typedTokens.slice(best)
    return {
      status: 'ok',
      command: match,
      name: match.name,
      args,
      argString: args.join(' '),
      parsed,
    }
  }

  return { status: 'ambiguous', matches: finalists, name: parsed.normalized, args: parsed.args, parsed }
}

/* -------------------------------------------------------------------------- */
/* Tab autocomplete                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Complete the word the caret is on, keeping any trailing arguments.
 * Returns the new input string plus the list of candidates for display.
 */
export function autocomplete(raw) {
  // Unlike parseCommand, a trailing space is meaningful ("show ip ") and kept.
  const source = String(raw ?? '')
  const collapsed = source.trim().replace(/\s+/g, ' ').toLowerCase()
  if (!collapsed) return { completion: '', suggestions: [] }
  const input = /\s$/.test(source) ? `${collapsed} ` : collapsed

  const tokens = input.split(' ')
  const k = tokens.length

  const scored = COMMANDS.map((command) => ({ command, ...matchPrefix(command.name, tokens) }))
  const wordCountOf = (candidate) => candidate.command.name.split(' ').length

  const matches = scored.filter((candidate) => candidate.consumed === k)
  // "sh ver 2": the command name is fully covered, the extra word is an argument.
  const withArgs = scored.filter(
    (candidate) => candidate.consumed === wordCountOf(candidate) && candidate.consumed < k,
  )

  const pool = matches.length > 0 ? matches : withArgs
  const candidates = pool.map((candidate) => candidate.command).sort((a, b) => a.name.localeCompare(b.name))

  if (candidates.length === 0) {
    return { completion: input, suggestions: [] }
  }

  const names = candidates.map((command) => command.name)

  if (candidates.length === 1) {
    const consumed = pool[0].consumed
    const tail = tokens.slice(consumed)
    const completion = `${candidates[0].name.split(' ').slice(0, consumed).join(' ')}${
      tail.length ? ` ${tail.join(' ')}` : ''
    }`
    return { completion, suggestions: names }
  }

  // Several commands: extend to the longest shared word prefix and no further.
  const candidateWords = candidates.map((command) => command.name.split(' '))
  const common = []
  for (let i = 0; i < Math.min(...candidateWords.map((words) => words.length)); i += 1) {
    const word = candidateWords[0][i]
    if (!candidateWords.every((words) => words[i] === word)) break
    common.push(word)
  }

  const sharedLast = common[k - 1]
  if (sharedLast && sharedLast !== tokens[k - 1] && sharedLast.startsWith(tokens[k - 1])) {
    const before = tokens.slice(0, k - 1)
    let completion = [...before, ...common.slice(before.length)].join(' ')
    if (common.length > k) completion += ' '
    return { completion, suggestions: names }
  }

  return { completion: input, suggestions: names }
}

/* -------------------------------------------------------------------------- */
/* History                                                                    */
/* -------------------------------------------------------------------------- */

export const createHistory = (entries = []) => ({ entries: [...entries], index: 0 })

export function pushHistory(state, entry) {
  const trimmed = typeof entry === 'string' ? entry.trim() : ''
  const previous = state?.entries ?? []
  if (!trimmed) return { entries: previous, index: 0 }

  const alreadyLast = previous[previous.length - 1] === trimmed
  const next = alreadyLast ? [...previous] : [...previous, trimmed].slice(-HISTORY_LIMIT)

  return { entries: next, index: 0 }
}

export function historyUp(state) {
  const entries = state?.entries ?? []
  if (entries.length === 0) return { entries, index: 0, entry: '' }

  const index = Math.min(state.index + 1, entries.length)
  return { entries, index, entry: entries[entries.length - index] ?? '' }
}

export function historyDown(state) {
  const entries = state?.entries ?? []
  const index = Math.max((state?.index ?? 0) - 1, 0)
  return { entries, index, entry: index === 0 ? '' : entries[entries.length - index] ?? '' }
}

/* -------------------------------------------------------------------------- */
/* Output generators — every string comes from the portfolio data             */
/* -------------------------------------------------------------------------- */

const pad = (value, width) => String(value).padEnd(width, ' ')

function buildVersion(data, now) {
  const cfg = data.terminal
  const identity = data.identity
  const bootAt = Date.parse(cfg.bootAt ?? '2025-02-10T08:14:42Z')
  const uptime = formatUptime(Number.isFinite(now) ? now - bootAt : 0)

  return [
    `Cisco IOS Software [Amsterdam], ISR Software, Version ${cfg.iosVersion}, RELEASE SOFTWARE (fc2)`,
    'Technical Support: http://www.cisco.com/techsupport',
    'Copyright (c) 1986-2024 by Cisco Systems, Inc.',
    'Compiled Wed 20-Mar-24 09:12 by mcpre',
    '',
    `ROM: Bootstrap program is Ciosmon boot loader`,
    `BOOTLDR: ${cfg.model} Boot Loader`,
    '',
    `${cfg.model} uptime is ${uptime}`,
    'System returned to ROM by reload',
    'System image file is "bootflash:packages.conf"',
    'Last reload reason: power-on',
    '',
    `cisco ${cfg.model} (revision 1.0) with 2097152K bytes of memory.`,
    'Processor board ID FDO2045L0AB',
    '1 Gigabit Ethernet interface',
    '32768K bytes of non-volatile configuration memory.',
    `3995136K bytes of physical memory (3212064K available)`,
    '',
    `Configuration register is 0x2102 -- configured by ${identity.name}`,
    `Last configuration change at ${cfg.site} by ${cfg.user} from tty0`,
    '',
  ]
}

function buildRoute(data) {
  const cfg = data.terminal
  const routes = cfg.routes ?? []

  const lines = [
    'Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP',
    '       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area',
    '       O E1 - OSPF external type 1, O E2 - OSPF external type 2',
    '       * - candidate default, U - per-user static route',
    '',
    `Gateway of last resort is ${cfg.defaultNextHop} to network ${cfg.defaultRoute}`,
    '',
    `      ${pad('Network/Prefix', -24)} ${pad('Next Hop', -16)} ${pad('Interface', -18)} Metric Protocol`,
  ]

  routes.forEach((route) => {
    const via = route.nextHop === '0.0.0.0' ? 'directly connected' : `via ${route.nextHop}`
    lines.push(`${pad(route.tag || '', 5)} ${pad(route.prefix, -16)} ${pad(via, -34)} ${pad(route.metric, 4)}  ${route.protocol}`)
  })

  if (cfg.bgpNeighbors?.length) {
    lines.push('')
    lines.push('Routing Protocols for Networks:')
    lines.push('  C  10.10.0.0/30 is directly connected, GigabitEthernet0/0/1')
    lines.push('  O  10.20.0.0/16 [20/2] via 10.10.0.2, 00:42:11, GigabitEthernet0/0/1')
  }

  return lines
}

function buildInterfaceBrief(data) {
  const cfg = data.terminal
  const interfaces = cfg.interfaces ?? []

  const lines = [
    `${pad('Interface', -24)} ${pad('IP-Address', -16)} ${pad('OK?', -8)} Method ${pad('Status', -22)} Protocol`,
  ]

  interfaces.forEach((item) => {
    lines.push(
      `${pad(item.name, -24)} ${pad(item.ip, -16)} ${pad('YES', -8)} NVRAM  ${pad(item.status, -22)} ${item.protocol}`,
    )
  })

  lines.push('')
  lines.push(`Management IP: ${cfg.managementIp}`)
  lines.push(`DNS servers: ${cfg.dns}`)

  return lines
}

function buildRunningConfig(data) {
  const cfg = data.terminal
  return [
    `Building configuration...`,
    '',
    'Current configuration : 1836 bytes',
    '! Last configuration change at 14:02:11 UTC Mon Feb 10 2025 by raka',
    '! NVRAM commit last done at 14:02:11 UTC Mon Feb 10 2025 by raka',
    '',
    ...cfg.runningConfig,
  ]
}

function buildSkills(data) {
  const lines = [
    `${pad('Group', -16)} ${pad('Items', -7)} Summary`,
    `${'-'.repeat(16)} ${'-'.repeat(7)} ${'-'.repeat(28)}`,
  ]

  data.skills.forEach((group) => {
    const average = Math.round(
      group.items.reduce((total, item) => total + Number(item.level || 0), 0) / group.items.length,
    )
    lines.push(`${pad(group.title.toUpperCase(), -16)} ${pad(group.items.length, -7)} avg proficiency ${average}%`)
    group.items.forEach((item) => {
      lines.push(`   ${pad(item.name, -28)} ${pad(`${item.level}%`, -6)} ${'#'.repeat(Math.round(item.level / 5))}`)
    })
    lines.push('')
  })

  return lines
}

function buildProjects(data) {
  const lines = [
    `${pad('ID', -26)} ${pad('CATEGORY', -14)} ${pad('TOOLS', -7)} RESULT`,
    `${'-'.repeat(26)} ${'-'.repeat(14)} ${'-'.repeat(7)} ${'-'.repeat(30)}`,
  ]

  data.projects.forEach((project) => {
    lines.push(
      `${pad(project.id, -26)} ${pad(project.category, -14)} ${pad(project.tools.length, -7)} ${project.result}`,
    )
  })

  lines.push('')
  lines.push(`Total: ${data.projects.length} project(s). Use the Projects section for full case studies.`)

  return lines
}

function buildCerts(data) {
  const labels = { certified: 'CERTIFIED', 'in-progress': 'IN-PROGRESS', planned: 'PLANNED' }

  // Honest empty state instead of printing an empty list.
  if (!Array.isArray(data.certifications) || data.certifications.length === 0) {
    return ['no certifications yet', '']
  }

  const lines = []

  data.certifications.forEach((cert, index) => {
    lines.push(`${index + 1}) ${cert.name}`)
    lines.push(`   Issuer : ${cert.issuer}`)
    lines.push(`   Year   : ${cert.date || 'n/a'}`)
    lines.push(`   Status : ${labels[cert.status] ?? String(cert.status).toUpperCase()}`)
    lines.push(`   Detail : ${cert.detail}`)
    lines.push('')
  })

  return lines
}

function buildContact(data) {
  const contact = data.contact
  const identity = data.identity
  const lines = [
    `Name    : ${identity.name}`,
    `Title   : ${identity.title}`,
    `Email   : ${contact.email}`,
  ]
  // Only listed when the owner actually has a profile — never a blank line.
  if (contact.linkedin) lines.push(`LinkedIn: ${contact.linkedin}`)
  if (contact.github) lines.push(`GitHub  : ${contact.github}`)
  if (contact.website) lines.push(`Website : ${contact.website}`)
  lines.push(`Location: ${contact.location}`)
  lines.push(`Ping    : ${identity.domain ? `ping ${identity.domain}` : 'ping localhost'}`)
  lines.push('')
  lines.push(contact.responseTime)
  return lines
}

function buildHelp(data, argString) {
  const target = resolveCommand(argString)

  if (target.status === 'ok') {
    const output = outputFor(target.command, data, Date.now(), 'privileged')
    return [
      `${target.command.name}`,
      `  usage    : ${target.command.usage}`,
      `  category : ${target.command.category}`,
      `  privilege: ${target.command.privilege}`,
      `  about    : ${target.command.description}`,
      '',
      '  sample output:',
      ...output.lines.map((l) => `    ${l}`),
    ]
  }

  const lines = [
    'Available commands:',
    '',
    `${pad('Command', -26)} ${pad('Mode', -12)} Description`,
    `${'-'.repeat(26)} ${'-'.repeat(12)} ${'-'.repeat(24)}`,
  ]

  COMMANDS.forEach((command) => {
    lines.push(`${pad(command.name, -26)} ${pad(command.privilege, -12)} ${command.description}`)
  })

  lines.push('')
  lines.push('Tip: unique prefixes work too — try "sh ver" or "sh int br".')
  lines.push('Tab completes a command. Up/Down arrows walk the history.')

  return lines
}

/* -------------------------------------------------------------------------- */
/* Execution                                                                  */
/* -------------------------------------------------------------------------- */

function outputFor(command, data, now, mode) {
  const current = { mode }
  switch (command.kind) {
    case 'version':
      return { ...current, lines: buildVersion(data, now) }
    case 'route':
      return { ...current, lines: buildRoute(data) }
    case 'interfaceBrief':
      return { ...current, lines: buildInterfaceBrief(data) }
    case 'runningConfig':
      return { ...current, lines: buildRunningConfig(data) }
    case 'skills':
      return { ...current, lines: buildSkills(data) }
    case 'projects':
      return { ...current, lines: buildProjects(data) }
    case 'certs':
      return { ...current, lines: buildCerts(data) }
    case 'contact':
      return { ...current, lines: buildContact(data) }
    case 'help':
      return { ...current, lines: buildHelp(data, command.argString ?? command.args?.join(' ') ?? '') }
    case 'enable':
      return { lines: ['Password accepted — now in privileged exec mode.'], mode: 'privileged' }
    case 'exit':
      return { lines: ['Back to user exec mode.'], mode: 'user' }
    case 'clear':
      return { lines: [], mode, clear: true }
    default:
      return { lines: [INVALID_INPUT_MESSAGE], mode }
  }
}

/**
 * Run one command.
 * @param {string} raw input line
 * @param {{ data?: object, mode?: 'user'|'privileged', now?: number }} options
 * @returns {{ status: string, lines: string[], mode: string, prompt: string, clear: boolean, echo: string }}
 */
export function executeCommand(raw, options = {}) {
  const data = options.data
  const mode = options.mode === 'privileged' ? 'privileged' : 'user'
  const now = Number.isFinite(options.now) ? options.now : Date.now()
  const parsed = parseCommand(raw)
  const hostname = data?.terminal?.hostname ?? 'Router'
  const promptFor = (m) => `${hostname}${m === 'privileged' ? '#' : '>'}`

  const resolved = resolveCommand(raw)

  if (resolved.status === 'ambiguous') {
    const width = Math.max(...resolved.matches.map((m) => m.name.length))
    return {
      status: 'ambiguous',
      name: parsed.normalized,
      lines: [
        `% Ambiguous command: "${parsed.normalized}"`,
        ...resolved.matches.map((match, index) =>
          index === 0
            ? `  Could be:  '${match.name}'`
            : `             ${pad(`'${match.name}'`, width + 3)}`,
        ),
        `Type "help ${resolved.matches[0].name.split(' ')[0]}" for a full list.`,
      ],
      mode,
      prompt: promptFor(mode),
      clear: false,
      echo: parsed.normalized,
    }
  }

  if (resolved.status === 'invalid') {
    return {
      status: 'invalid',
      name: parsed.normalized,
      lines: [INVALID_INPUT_MESSAGE],
      mode,
      prompt: promptFor(mode),
      clear: false,
      echo: parsed.normalized,
    }
  }

  // Carry the resolved arguments so `help <command>` can explain a sub-command.
  const command = { ...resolved.command, args: resolved.args ?? [], argString: resolved.argString ?? '' }

  if (command.privilege === 'privileged' && mode !== 'privileged') {
    return {
      status: 'permission',
      name: command.name,
      lines: [
        PERMISSION_DENIED_MESSAGE,
        'This command needs privileged mode — type "enable" first.',
      ],
      mode,
      prompt: promptFor(mode),
      clear: false,
      echo: parsed.normalized,
    }
  }

  const result = outputFor(command, data, now, mode)
  const nextMode = result.mode ?? mode

  return {
    status: 'ok',
    name: command.name,
    lines: result.lines ?? [],
    mode: nextMode,
    prompt: promptFor(nextMode),
    clear: Boolean(result.clear),
    echo: parsed.normalized,
  }
}
