import { useState, useEffect, useCallback, useRef } from 'react'
import type { TerminalLine, Suggestion } from './types.ts'
import { getSuggestions } from './parse-command.ts'

const STORAGE_KEY = 'agentforge-cmd-history'
const MAX_HISTORY = 50

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

// -- Persistent History Helpers --

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : []
  } catch {
    return []
  }
}

function saveHistory(entries: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)))
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 25)))
  }
}

// -- Collapsible JSON Block --

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

// -- Single Terminal Line --

function TerminalLineRow({
  ln,
  onRunIdClick,
}: {
  ln: TerminalLine
  onRunIdClick: (run_id: string) => void
}) {
  const color = KIND_COLORS[ln.kind]

  const renderText = (text: string) => {
    const runIdRegex = /(run_\d+_\d+)/g
    const parts = text.split(runIdRegex)

    return parts.map((part, i) => {
      if (runIdRegex.test(part)) {
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

// -- Autocomplete Dropdown --

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

// -- History Search Overlay --

function HistorySearchOverlay({
  history,
  searchTerm,
  onSearchChange,
  onSelect,
  onClose,
}: {
  history: string[]
  searchTerm: string
  onSearchChange: (v: string) => void
  onSelect: (cmd: string) => void
  onClose: () => void
}) {
  const searchRef = useRef<HTMLInputElement>(null)
  const filtered = searchTerm
    ? history.filter((cmd) => cmd.toLowerCase().includes(searchTerm.toLowerCase()))
    : history

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col"
      style={{ backgroundColor: 'rgba(8, 10, 15, 0.95)' }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(60, 56, 54, 0.4)' }}
      >
        <span className="font-mono text-xs" style={{ color: TXT.yellow }}>SEARCH:</span>
        <input
          ref={searchRef}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'Enter' && filtered.length > 0) {
              onSelect(filtered[0])
              onClose()
            }
          }}
          className="flex-1 bg-transparent font-mono text-[13px] outline-none caret-forge-cta"
          style={{ color: TXT.fg }}
          placeholder="Filter command history..."
          spellCheck={false}
        />
        <span className="font-mono text-[10px]" style={{ color: TXT.dim }}>
          {filtered.length}/{history.length}
        </span>
        <button
          onClick={onClose}
          className="font-mono text-xs px-2 py-0.5 transition-colors"
          style={{ color: TXT.gray }}
        >
          ESC
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {filtered.length === 0 ? (
          <p className="font-mono text-xs mt-4 text-center" style={{ color: TXT.dim }}>
            No matching commands
          </p>
        ) : (
          filtered.map((cmd, i) => (
            <button
              key={`${cmd}-${i}`}
              onClick={() => { onSelect(cmd); onClose() }}
              className="block w-full text-left font-mono text-[13px] py-1 px-2 transition-colors hover:bg-white/5"
              style={{ color: TXT.fg2 }}
            >
              <span style={{ color: TXT.dim }} className="mr-2 text-[10px]">{i + 1}.</span>
              {cmd}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

// -- Terminal Component --

interface TerminalProps {
  lines: TerminalLine[]
  onSubmit: (raw: string) => void
  onClear: () => void
  onRunIdClick: (run_id: string) => void
}

export default function Terminal({ lines, onSubmit, onClear, onRunIdClick }: TerminalProps) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>(loadHistory)
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [draftInput, setDraftInput] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showHistorySearch, setShowHistorySearch] = useState(false)
  const [historySearchTerm, setHistorySearchTerm] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  // Persist history to localStorage on change
  useEffect(() => {
    saveHistory(history)
  }, [history])

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
    setHistory((prev) => {
      if (prev.length > 0 && prev[0] === cmd) return prev
      return [cmd, ...prev].slice(0, MAX_HISTORY)
    })
    setInput('')
    setHistoryIdx(-1)
    setDraftInput('')
  }, [input, onSubmit, onClear])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Cmd+F / Ctrl+F: toggle history search
    if (e.key === 'f' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      setShowHistorySearch((prev) => !prev)
      setHistorySearchTerm('')
      return
    }

    // Tab: accept suggestion
    if (e.key === 'Tab' && showSuggestions && suggestions.length > 0) {
      e.preventDefault()
      acceptSuggestion(suggestions[selectedSuggestion].text)
      return
    }

    // Escape: dismiss suggestions or history search
    if (e.key === 'Escape') {
      if (showHistorySearch) {
        setShowHistorySearch(false)
        return
      }
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
        if (historyIdx === -1) {
          setDraftInput(input)
        }
        const nextIdx = Math.min(historyIdx + 1, history.length - 1)
        setHistoryIdx(nextIdx)
        if (history[nextIdx] !== undefined) setInput(history[nextIdx])
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const nextIdx = Math.max(historyIdx - 1, -1)
        setHistoryIdx(nextIdx)
        if (nextIdx >= 0) {
          setInput(history[nextIdx])
        } else {
          setInput(draftInput)
        }
      }
    }
  }, [showSuggestions, suggestions, selectedSuggestion, history, historyIdx, acceptSuggestion, input, draftInput, showHistorySearch])

  const handleHistorySelect = useCallback((cmd: string) => {
    setInput(cmd)
    setShowHistorySearch(false)
    inputRef.current?.focus()
  }, [])

  return (
    <div
      className="relative flex flex-1 flex-col overflow-hidden"
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
        <button
          onClick={(e) => { e.stopPropagation(); setShowHistorySearch(true); setHistorySearchTerm('') }}
          className="font-mono text-[10px] transition-colors hover:opacity-80"
          style={{ color: TXT.dim }}
          title="Search history (Cmd+F)"
        >
          [{history.length} cmds]
        </button>
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

      {/* History search overlay */}
      {showHistorySearch && (
        <HistorySearchOverlay
          history={history}
          searchTerm={historySearchTerm}
          onSearchChange={setHistorySearchTerm}
          onSelect={handleHistorySelect}
          onClose={() => setShowHistorySearch(false)}
        />
      )}

      {/* Command input */}
      <form
        onSubmit={handleSubmit}
        className="relative flex-shrink-0 px-4 py-2"
        style={{ borderTop: '1px solid rgba(60, 56, 54, 0.3)' }}
      >
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
