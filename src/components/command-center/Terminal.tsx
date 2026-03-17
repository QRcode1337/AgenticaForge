import { useState, useEffect, useCallback, useRef } from 'react'
import type { TerminalLine, Suggestion } from './types.ts'
import { getSuggestions } from './parse-command.ts'

const TXT = {
  fg:     '#ebdbb2',
  fg2:    '#d5c4a1',
  fg4:    '#a89984',
  gray:   '#928374',
  dim:    '#665c54',
  red:    '#fb4934',
  green:  '#b8bb26',
  yellow: '#fabd2f',
  blue:   '#83a598',
  aqua:   '#8ec07c',
  orange: '#fe8019',
}

const KIND_COLORS: Record<TerminalLine['kind'], string> = {
  input:   TXT.green,
  info:    TXT.fg,
  error:   TXT.red,
  success: TXT.aqua,
  heading: TXT.yellow,
  dim:     TXT.gray,
  data:    TXT.fg2,
}

// ── Collapsible JSON Block ──────────────────────────────────

function CollapsibleJson({ data }: { data: Record<string, unknown> }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="ml-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="font-mono text-[11px] transition-colors hover:underline"
        style={{ color: TXT.blue }}
      >
        {open ? '\u25BC' : '\u25B6'} {open ? 'collapse' : 'expand'} data
      </button>
      {open && (
        <pre
          className="mt-1 overflow-x-auto border p-2 font-mono text-[11px] leading-relaxed"
          style={{ color: TXT.fg2, borderColor: 'rgba(60, 56, 54, 0.3)', backgroundColor: 'rgba(0,0,0,0.2)' }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  )
}

// ── Single Terminal Line ────────────────────────────────────

function TerminalLineRow({
  ln,
  onRunIdClick,
}: {
  ln: TerminalLine
  onRunIdClick: (run_id: string) => void
}) {
  const color = KIND_COLORS[ln.kind]

  // Render clickable run_ids in text
  const renderText = (text: string) => {
    const runIdRegex = /(run_\d+_\d+)/g
    const parts = text.split(runIdRegex)

    return parts.map((part, i) => {
      if (runIdRegex.test(part)) {
        // Reset lastIndex since test advances it
        runIdRegex.lastIndex = 0
        return (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); onRunIdClick(part) }}
            className="font-mono underline transition-colors hover:brightness-125"
            style={{ color: TXT.blue }}
          >
            [{part}]
          </button>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  return (
    <div>
      <div
        className="font-mono text-[13px] leading-relaxed whitespace-pre-wrap"
        style={{ color }}
      >
        {ln.text ? renderText(ln.text) : '\u00a0'}
      </div>
      {ln.data && <CollapsibleJson data={ln.data} />}
    </div>
  )
}

// ── Autocomplete Dropdown ───────────────────────────────────

function AutocompleteDropdown({
  suggestions,
  selectedIdx,
  onSelect,
}: {
  suggestions: Suggestion[]
  selectedIdx: number
  onSelect: (text: string) => void
}) {
  if (suggestions.length === 0) return null

  return (
    <div
      className="absolute bottom-full left-0 mb-1 w-full border font-mono text-[12px]"
      style={{
        backgroundColor: '#0f1117',
        borderColor: 'rgba(60, 56, 54, 0.5)',
        zIndex: 10,
      }}
    >
      {suggestions.map((s, i) => (
        <button
          key={s.text}
          onClick={() => onSelect(s.text)}
          className="flex w-full items-center gap-3 px-3 py-1.5 text-left transition-colors"
          style={{
            backgroundColor: i === selectedIdx ? 'rgba(60, 56, 54, 0.3)' : 'transparent',
            color: i === selectedIdx ? TXT.fg : TXT.fg4,
          }}
        >
          <span
            className="w-12 text-[9px] uppercase tracking-wider"
            style={{
              color: s.kind === 'domain' ? TXT.aqua
                : s.kind === 'verb' ? TXT.green
                : TXT.yellow,
            }}
          >
            {s.kind}
          </span>
          <span className="flex-1 font-bold">{s.text}</span>
          <span className="text-[10px]" style={{ color: TXT.dim }}>{s.description}</span>
        </button>
      ))}
    </div>
  )
}

// ── Terminal Component ──────────────────────────────────────

interface TerminalProps {
  lines: TerminalLine[]
  onSubmit: (raw: string) => void
  onClear: () => void
  onRunIdClick: (run_id: string) => void
}

export default function Terminal({ lines, onSubmit, onClear, onRunIdClick }: TerminalProps) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [lines])

  // Update suggestions on input change
  useEffect(() => {
    if (!input) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    const s = getSuggestions(input)
    setSuggestions(s)
    setSelectedSuggestion(0)
    setShowSuggestions(s.length > 0)
  }, [input])

  const focusInput = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  const acceptSuggestion = useCallback((text: string) => {
    // If it's a domain suggestion (ends with :), keep it editable
    // If it's a verb suggestion, add space
    const newInput = text.endsWith(':') ? text : text + ' '
    setInput(newInput)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }, [])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const cmd = input.trim()
    if (!cmd) return

    setShowSuggestions(false)

    if (cmd.toLowerCase() === 'clear') {
      onClear()
      setInput('')
      return
    }

    onSubmit(cmd)
    setHistory((prev) => [cmd, ...prev].slice(0, 50))
    setInput('')
    setHistoryIdx(-1)
  }, [input, onSubmit, onClear])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Tab: accept suggestion
    if (e.key === 'Tab' && showSuggestions && suggestions.length > 0) {
      e.preventDefault()
      acceptSuggestion(suggestions[selectedSuggestion].text)
      return
    }

    // Escape: dismiss suggestions
    if (e.key === 'Escape') {
      setShowSuggestions(false)
      return
    }

    // Arrow keys in suggestion mode
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedSuggestion((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedSuggestion((i) => (i >= suggestions.length - 1 ? 0 : i + 1))
        return
      }
    }

    // History navigation (only when no suggestions)
    if (!showSuggestions) {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        const nextIdx = Math.min(historyIdx + 1, history.length - 1)
        setHistoryIdx(nextIdx)
        if (history[nextIdx] !== undefined) setInput(history[nextIdx])
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const nextIdx = Math.max(historyIdx - 1, -1)
        setHistoryIdx(nextIdx)
        setInput(nextIdx >= 0 ? history[nextIdx] : '')
      }
    }
  }, [showSuggestions, suggestions, selectedSuggestion, history, historyIdx, acceptSuggestion])

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden"
      style={{ borderRight: '1px solid rgba(60, 56, 54, 0.4)' }}
      onClick={focusInput}
    >
      {/* Header */}
      <header
        className="flex flex-shrink-0 items-center gap-4 px-4 py-2"
        style={{ borderBottom: '1px solid rgba(60, 56, 54, 0.4)' }}
      >
        <span className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: TXT.orange }}>
          COMMAND_CENTER
        </span>
        <span className="font-mono text-[10px]" style={{ color: TXT.dim }}>
          v2.0.0
        </span>
        <div className="flex-1" />
        <span className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: TXT.green }}>
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TXT.green }} />
          ENGINE ONLINE
        </span>
      </header>

      {/* Output area */}
      <div ref={outputRef} className="flex-1 overflow-y-auto px-4 py-2">
        {lines.map((ln) => (
          <TerminalLineRow key={ln.id} ln={ln} onRunIdClick={onRunIdClick} />
        ))}
      </div>

      {/* Command input */}
      <form
        onSubmit={handleSubmit}
        className="relative flex-shrink-0 px-4 py-2"
        style={{ borderTop: '1px solid rgba(60, 56, 54, 0.3)' }}
      >
        {/* Autocomplete dropdown */}
        {showSuggestions && (
          <AutocompleteDropdown
            suggestions={suggestions}
            selectedIdx={selectedSuggestion}
            onSelect={acceptSuggestion}
          />
        )}

        <div className="flex items-center gap-2">
          <span className="flex-shrink-0 font-mono text-[13px]" style={{ color: TXT.green }}>
            root@agentforge:~#
          </span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent font-mono text-[13px] outline-none caret-forge-cta"
            style={{ color: TXT.fg }}
            spellCheck={false}
            autoFocus
          />
          {!input && (
            <span className="inline-block h-4 w-2 animate-blink bg-forge-cta" />
          )}
        </div>
      </form>
    </div>
  )
}
