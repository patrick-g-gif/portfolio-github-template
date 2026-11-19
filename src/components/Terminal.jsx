import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import * as portfolio from '../data/portfolio.js'
import {
  autocomplete,
  createHistory,
  executeCommand,
  historyDown,
  historyUp,
  pushHistory,
} from '../lib/terminal.js'
import { usePrefersReducedMotion } from '../hooks/useMedia.js'

let entryId = 0
const nextId = () => {
  entryId += 1
  return `entry-${entryId}`
}

/** Reveals a block of CLI output character by character (instantly when reduced motion is on). */
function TypedLines({ lines, reducedMotion }) {
  const text = lines.join('\n')
  const [count, setCount] = useState(reducedMotion ? text.length : 0)

  useEffect(() => {
    if (reducedMotion) {
      setCount(text.length)
      return undefined
    }
    if (!text) {
      setCount(0)
      return undefined
    }

    setCount(0)
    let revealed = 0
    const step = Math.max(2, Math.ceil(text.length / 70))
    const timer = setInterval(() => {
      revealed = Math.min(text.length, revealed + step)
      setCount(revealed)
      if (revealed >= text.length) clearInterval(timer)
    }, 16)

    return () => clearInterval(timer)
  }, [text, reducedMotion])

  const visible = text.slice(0, count)
  const parts = visible.length ? visible.split('\n') : ['']

  return (
    <div className="mt-1 font-mono text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
      {parts.map((part, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={index} className="whitespace-pre-wrap break-words">
          {part}
          {index === parts.length - 1 && count < text.length ? (
            <span className="ml-0.5 inline-block h-3.5 w-[7px] translate-y-[2px] animate-blink bg-cyan-400" />
          ) : null}
        </div>
      ))}
    </div>
  )
}

/**
 * Cisco-style interactive CLI. Fully keyboard operable:
 * Enter runs, Up/Down walk the history, Tab autocompletes.
 */
export function Terminal() {
  const reducedMotion = usePrefersReducedMotion()
  const [mode, setMode] = useState('user')
  const [input, setInput] = useState('')
  const [history, setHistory] = useState(createHistory())
  const [suggestions, setSuggestions] = useState([])
  const [entries, setEntries] = useState([])
  const inputRef = useRef(null)
  const logRef = useRef(null)

  const prompt = `${portfolio.terminal.hostname}${mode === 'privileged' ? '#' : '>'}`
  const quickCommands = useMemo(() => portfolio.terminal.quickCommands, [])

  useEffect(() => {
    const node = logRef.current
    if (node) node.scrollTop = node.scrollHeight
  })

  const submit = useCallback(
    (raw) => {
      const command = raw ?? input
      const trimmed = command.trim()
      if (!trimmed) return

      const result = executeCommand(trimmed, { data: portfolio, mode, now: Date.now() })

      setHistory((current) => pushHistory(current, trimmed))
      setInput('')
      setSuggestions([])
      setMode(result.mode)

      if (result.clear) {
        setEntries([])
        return
      }

      const block = {
        id: nextId(),
        prompt: `${portfolio.terminal.hostname}${mode === 'privileged' ? '#' : '>'}`,
        command: trimmed,
        lines: result.lines,
        status: result.status,
        // announce the new prompt inside the log so the mode change is visible
        promptAfter: result.mode !== mode ? result.prompt : null,
      }

      setEntries((current) => [...current, block])
    },
    [input, mode],
  )

  const onKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      submit()
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const next = historyUp(history)
      setHistory(next)
      setInput(next.entry)
      setSuggestions([])
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const next = historyDown(history)
      setHistory(next)
      setInput(next.entry)
      setSuggestions([])
      return
    }
    if (event.key === 'Tab') {
      event.preventDefault()
      const { completion, suggestions: options } = autocomplete(input)
      setInput(completion)
      setSuggestions(options)
      if (options.length === 1) setSuggestions([])
    }
  }

  return (
    <div className="panel overflow-hidden">
      {/* window chrome */}
      <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-100/60 px-4 py-2 dark:border-noc-700 dark:bg-noc-800/60">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </span>
          <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
            ssh {portfolio.terminal.user}@{portfolio.terminal.site}
          </span>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
          cli — try `help`
        </span>
      </div>

      {/* scrollback */}
      <div
        ref={logRef}
        data-testid="terminal-output"
        role="log"
        aria-label="Terminal output"
        aria-live="polite"
        tabIndex={0}
        className="terminal-scroll h-[320px] overflow-y-auto bg-white/60 px-4 py-3 sm:h-[380px] dark:bg-noc-950/80"
      >
        {entries.length === 0 ? (
          <p className="font-mono text-[13px] text-slate-500 dark:text-slate-500">
            <span className="text-cyan-600 dark:text-cyan-400">Tip:</span> press{' '}
            <kbd className="rounded border border-slate-300 px-1 dark:border-noc-600">Tab</kbd> to autocomplete,{' '}
            <kbd className="rounded border border-slate-300 px-1 dark:border-noc-600">↑</kbd>/{' '}
            <kbd className="rounded border border-slate-300 px-1 dark:border-noc-600">↓</kbd> for history.
          </p>
        ) : null}

        {entries.map((entry) => (
          <div key={entry.id} className="mb-3">
            <div className="font-mono text-[13px]">
              <span className="text-cyan-600 dark:text-cyan-400">{entry.prompt} </span>
              <span className="text-slate-900 dark:text-slate-100">{entry.command}</span>
            </div>
            {entry.lines.length > 0 ? <TypedLines lines={entry.lines} reducedMotion={reducedMotion} /> : null}
            {entry.promptAfter ? (
              <div className="mt-1 font-mono text-[13px] text-cyan-600 dark:text-cyan-400">{entry.promptAfter}</div>
            ) : null}
          </div>
        ))}
      </div>

      {/* prompt + input */}
      <div className="flex items-center gap-2 border-t border-slate-200/80 bg-slate-100/60 px-4 py-3 dark:border-noc-700 dark:bg-noc-800/60">
        <label htmlFor="terminal-input" className="font-mono text-[13px] font-semibold text-cyan-600 dark:text-cyan-400">
          {prompt}
        </label>
        <input
          id="terminal-input"
          ref={inputRef}
          value={input}
          onChange={(event) => {
            setInput(event.target.value)
            setSuggestions([])
          }}
          onKeyDown={onKeyDown}
          type="text"
          role="textbox"
          aria-label="Terminal command input"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={mode === 'user' ? 'show version' : 'show running-config'}
          className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
        />
        <button type="button" className="btn-primary px-3 py-1 font-mono text-xs" onClick={() => submit()}>
          run
        </button>
      </div>

      {suggestions.length > 0 ? (
        <div className="border-t border-slate-200/80 px-4 py-2 font-mono text-xs text-slate-500 dark:border-noc-700 dark:text-slate-400">
          candidates: {suggestions.join('  ·  ')}
        </div>
      ) : null}

      {/* quick commands — the mobile-friendly path */}
      <div
        role="group"
        aria-label="Quick commands"
        className="flex flex-wrap gap-2 border-t border-slate-200/80 bg-slate-50/60 px-4 py-3 dark:border-noc-700 dark:bg-noc-900/70"
      >
        {quickCommands.map((command) => (
          <motion.button
            key={command}
            type="button"
            whileTap={reducedMotion ? undefined : { scale: 0.96 }}
            onClick={() => {
              setInput(command)
              submit(command)
              inputRef.current?.focus()
            }}
            className="rounded-md border border-cyan-400/25 bg-cyan-400/5 px-2.5 py-1.5 font-mono text-[11px] text-cyan-700 transition-colors hover:border-cyan-400/60 hover:bg-cyan-400/15 dark:text-cyan-300"
          >
            {command}
          </motion.button>
        ))}
        <button
          type="button"
          onClick={() => {
            setInput('enable')
            submit('enable')
            inputRef.current?.focus()
          }}
          className="rounded-md border border-lime-400/30 bg-lime-400/5 px-2.5 py-1.5 font-mono text-[11px] text-lime-700 hover:bg-lime-400/15 dark:text-lime-300"
        >
          enable
        </button>
      </div>
    </div>
  )
}

export default Terminal
