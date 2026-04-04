# Usability Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 7 usability enhancements to the AgentForge dashboard — panel persistence, toast notifications, empty states, panel headers, keyboard shortcuts with command palette, cross-panel quick links, and a settings drawer.

**Architecture:** Shared components (`EmptyState`, `PanelHeader`, `ToastContainer`, `CommandPalette`, `SettingsDrawer`) are created independently, then wired into `DashboardPage.tsx` and individual panel components. State management uses the existing `useSyncExternalStore` pattern for the toast store and simple localStorage reads for persistence. A `usePanelNavigation` hook wraps `setActivePanel` with highlight context for cross-panel links.

**Tech Stack:** React 19, TypeScript, Framer Motion, Tailwind CSS with forge theme tokens, localStorage

---

## File Map

| File | Purpose | Task |
|------|---------|------|
| `src/hooks/use-toast.ts` | Toast store + useToast hook | 1 |
| `src/components/shared/ToastContainer.tsx` | Toast stack renderer | 1 |
| `src/components/shared/EmptyState.tsx` | Shared empty state component | 2 |
| `src/components/shared/PanelHeader.tsx` | Section label header component | 3 |
| `src/hooks/use-keyboard-shortcuts.ts` | Global keyboard listener hook | 4 |
| `src/components/shared/CommandPalette.tsx` | Command palette modal | 5 |
| `src/hooks/use-panel-navigation.ts` | Navigation + highlight context | 6 |
| `src/components/shared/SettingsTrigger.tsx` | Gear button for sidebar footer | 7 |
| `src/components/shared/SettingsDrawer.tsx` | Settings slide-over drawer | 7 |
| `src/components/shared/Sidebar.tsx` | Add SettingsTrigger | 8 |
| `src/pages/DashboardPage.tsx` | Wire everything, panel persistence | 9 |
| `src/components/squad-builder/SquadBuilder.tsx` | Add PanelHeader + EmptyState | 10 |
| `src/components/memory-inspector/MemoryInspector.tsx` | Add PanelHeader + EmptyState | 10 |
| `src/components/training-studio/TrainingStudio.tsx` | Add PanelHeader | 10 |
| `src/components/vector-galaxy/VectorGalaxy.tsx` | Add PanelHeader + EmptyState | 10 |
| `src/components/live-feed/LiveFeed.tsx` | Add PanelHeader + EmptyState | 10 |
| `src/components/integration-hub/IntegrationHub.tsx` | Add PanelHeader + EmptyState | 10 |
| `src/components/command-center/CommandCenter.tsx` | Add PanelHeader | 10 |

---

### Task 1: Toast Notification System

**Files:**
- Create: `src/hooks/use-toast.ts`
- Create: `src/components/shared/ToastContainer.tsx`

**Context:** The codebase uses `useSyncExternalStore` for external state (see `src/hooks/use-integrations.ts` and `src/hooks/use-reduced-motion.ts` for the pattern). The toast store follows this same approach — a module-level store with subscribe/getSnapshot, no React context needed. Framer Motion is already installed and used throughout (see `src/components/shared/Sidebar.tsx` for `motion` import pattern). The forge theme colors are: `forge-bg` (#080a0f), `forge-surface` (#0f1117), `forge-border` (#252830), `forge-text` (#e2e4e9), `forge-soft` (#c0c3cc), `forge-muted` (#7a7f8d), `forge-dim` (#484c58), `forge-cta` (#22C55E).

- [ ] **Step 1: Create the toast store and hook**

Create `src/hooks/use-toast.ts`:

```typescript
import { useSyncExternalStore } from 'react'

// ── Types ───────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  timestamp: number
  duration: number
}

// ── Store ───────────────────────────────────────────────────

let toasts: Toast[] = []
let nextId = 0
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => { listeners.delete(callback) }
}

function getSnapshot(): Toast[] {
  return toasts
}

function addToast(type: ToastType, message: string, duration?: number) {
  const defaultDuration = type === 'error' ? 5000 : 3000
  const toast: Toast = {
    id: `toast-${++nextId}`,
    type,
    message,
    timestamp: Date.now(),
    duration: duration ?? defaultDuration,
  }
  toasts = [toast, ...toasts].slice(0, 3)
  emit()
  return toast.id
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

// ── Public API (callable from anywhere) ─────────────────────

export const toast = {
  success: (msg: string, duration?: number) => addToast('success', msg, duration),
  error: (msg: string, duration?: number) => addToast('error', msg, duration),
  warning: (msg: string, duration?: number) => addToast('warning', msg, duration),
  info: (msg: string, duration?: number) => addToast('info', msg, duration),
}

// ── Hook ────────────────────────────────────────────────────

export function useToast() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return { toasts: current, dismiss: dismissToast, toast }
}
```

- [ ] **Step 2: Create the ToastContainer component**

Create `src/components/shared/ToastContainer.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast, dismissToast, type Toast, type ToastType } from '../../hooks/use-toast'

const TYPE_CONFIG: Record<ToastType, { label: string; color: string }> = {
  success: { label: 'CONFIRMED', color: '#22C55E' },
  error:   { label: 'ERROR',     color: '#EF4444' },
  warning: { label: 'WARNING',   color: '#F59E0B' },
  info:    { label: 'INFO',      color: '#3B82F7' },
}

function ToastItem({ toast: t }: { toast: Toast }) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const config = TYPE_CONFIG[t.type]
  const time = new Date(t.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  useEffect(() => {
    timerRef.current = setTimeout(() => dismissToast(t.id), t.duration)
    return () => clearTimeout(timerRef.current)
  }, [t.id, t.duration])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      onClick={() => dismissToast(t.id)}
      className="cursor-pointer border border-forge-border bg-[#0f1117] p-3 font-mono min-w-[300px] max-w-[380px]"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="text-[10px] uppercase tracking-[0.15em]"
          style={{ color: config.color }}
        >
          {config.label}
        </span>
        <span className="text-[10px] text-forge-dim ml-auto">{time}</span>
      </div>
      <div className="text-xs text-forge-soft">{t.message}</div>
      <div
        className="h-0.5 mt-2"
        style={{
          background: `linear-gradient(90deg, ${config.color}, transparent)`,
        }}
      />
    </motion.div>
  )
}

export default function ToastContainer() {
  const { toasts } = useToast()

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 3: Verify toast builds**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds (ToastContainer is not mounted yet, but the imports should compile)

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-toast.ts src/components/shared/ToastContainer.tsx
git commit -m "feat: add toast notification system with tactical briefing style"
```

---

### Task 2: Empty State Component

**Files:**
- Create: `src/components/shared/EmptyState.tsx`

**Context:** Each panel will conditionally render this when it has no data. The component is a centered display with an icon, status line, copy text, and CTA button. All styling uses the forge theme: dark background, muted text, green CTA border. The `onCta` callback will either trigger an in-panel action (e.g., open the create agent modal) or navigate to another panel via the panel navigation system (Task 6).

- [ ] **Step 1: Create the EmptyState component**

Create `src/components/shared/EmptyState.tsx`:

```tsx
interface EmptyStateProps {
  icon: string
  status: string
  copy: string
  ctaLabel: string
  onCta: () => void
}

export default function EmptyState({ icon, status, copy, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center">
        <span className="text-[32px] opacity-30 mb-4">{icon}</span>
        <span className="text-forge-muted text-[11px] uppercase tracking-[0.15em] mb-2">
          {status}
        </span>
        <span className="text-forge-dim text-xs mb-5">{copy}</span>
        <button
          onClick={onCta}
          className="border border-forge-cta/25 text-forge-cta px-5 py-2 text-[11px] uppercase tracking-[0.1em] font-mono cursor-pointer hover:border-forge-cta/50 transition-colors"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/EmptyState.tsx
git commit -m "feat: add shared EmptyState component"
```

---

### Task 3: Panel Header Component

**Files:**
- Create: `src/components/shared/PanelHeader.tsx`

**Context:** This is the section label style header that sits at the top of every panel. It shows a green panel number prefix (`// PANEL 01`), an uppercase title, and inline stats. The existing panels each have their own ad-hoc headers (e.g., SquadBuilder has a `<header>` bar at line 615, VectorGalaxy has floating divs). The PanelHeader goes ABOVE these existing headers as a consistent identity bar.

- [ ] **Step 1: Create the PanelHeader component**

Create `src/components/shared/PanelHeader.tsx`:

```tsx
interface PanelHeaderProps {
  panelNumber: number
  title: string
  stats?: string
}

export default function PanelHeader({ panelNumber, title, stats }: PanelHeaderProps) {
  const num = String(panelNumber).padStart(2, '0')

  return (
    <div className="shrink-0 px-5 pt-4 pb-3 border-b border-forge-border">
      <div className="text-forge-cta text-[9px] uppercase tracking-[0.2em] mb-1">
        // PANEL {num}
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-forge-text text-sm uppercase tracking-[0.12em]">
          {title}
        </span>
        {stats && (
          <span className="text-forge-dim text-[10px]">{stats}</span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/PanelHeader.tsx
git commit -m "feat: add shared PanelHeader section label component"
```

---

### Task 4: Keyboard Shortcuts Hook

**Files:**
- Create: `src/hooks/use-keyboard-shortcuts.ts`

**Context:** The existing `useTour` hook (at `src/hooks/use-tour.ts`) already registers global keydown listeners when the tour is active (lines 110-128). The keyboard shortcuts hook must NOT conflict — it should be suppressed while the tour is active. The tour uses ArrowRight/ArrowLeft/Enter/Escape. Our shortcuts use Cmd/Ctrl+K, Cmd/Ctrl+1-7, Cmd/Ctrl+B, and Escape (only for closing the palette). The hook receives a `disabled` flag that DashboardPage sets to `true` when `tour.active` is true.

- [ ] **Step 1: Create the keyboard shortcuts hook**

Create `src/hooks/use-keyboard-shortcuts.ts`:

```typescript
import { useEffect } from 'react'

interface ShortcutHandlers {
  onTogglePalette: () => void
  onPanelSwitch: (index: number) => void
  onToggleSidebar: () => void
  onEscape: () => void
  disabled?: boolean
}

export function useKeyboardShortcuts({
  onTogglePalette,
  onPanelSwitch,
  onToggleSidebar,
  onEscape,
  disabled = false,
}: ShortcutHandlers) {
  useEffect(() => {
    if (disabled) return

    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey

      // Cmd/Ctrl+K — toggle command palette
      if (mod && e.key === 'k') {
        e.preventDefault()
        onTogglePalette()
        return
      }

      // Cmd/Ctrl+B — toggle sidebar
      if (mod && e.key === 'b') {
        e.preventDefault()
        onToggleSidebar()
        return
      }

      // Cmd/Ctrl+1-7 — switch panels
      if (mod && e.key >= '1' && e.key <= '7') {
        e.preventDefault()
        onPanelSwitch(parseInt(e.key, 10) - 1)
        return
      }

      // Escape — close palette (only if not modified)
      if (e.key === 'Escape' && !mod) {
        e.preventDefault()
        onEscape()
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [disabled, onTogglePalette, onPanelSwitch, onToggleSidebar, onEscape])
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-keyboard-shortcuts.ts
git commit -m "feat: add useKeyboardShortcuts hook for global shortcuts"
```

---

### Task 5: Command Palette

**Files:**
- Create: `src/components/shared/CommandPalette.tsx`

**Context:** The command palette is a centered modal overlay that opens with Cmd+K. It shows a search input and a filtered list of commands grouped into "Panels" and "Actions" categories. Results are filtered by case-insensitive substring match on the label. Arrow keys navigate the list, Enter selects. The palette receives a `commands` array and an `onSelect` callback from DashboardPage. The `PanelId` type is defined in `src/types/index.ts` as: `'squad-builder' | 'memory-inspector' | 'training-studio' | 'vector-galaxy' | 'live-feed' | 'integration-hub' | 'command-center'`.

- [ ] **Step 1: Create the CommandPalette component**

Create `src/components/shared/CommandPalette.tsx`:

```tsx
import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface PaletteCommand {
  id: string
  label: string
  category: 'Panels' | 'Actions'
  action: () => void
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  commands: PaletteCommand[]
}

export default function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      // Focus input after mount
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!query) return commands
    const q = query.toLowerCase()
    // Prefix matches first, then substring matches
    const prefix: PaletteCommand[] = []
    const substring: PaletteCommand[] = []
    for (const cmd of commands) {
      const label = cmd.label.toLowerCase()
      if (label.startsWith(q)) prefix.push(cmd)
      else if (label.includes(q)) substring.push(cmd)
    }
    return [...prefix, ...substring]
  }, [query, commands])

  // Group by category
  const groups = useMemo(() => {
    const map = new Map<string, PaletteCommand[]>()
    for (const cmd of filtered) {
      const list = map.get(cmd.category) ?? []
      list.push(cmd)
      map.set(cmd.category, list)
    }
    return map
  }, [filtered])

  // Clamp selected index
  useEffect(() => {
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(Math.max(0, filtered.length - 1))
    }
  }, [filtered.length, selectedIndex])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault()
        filtered[selectedIndex]?.action()
        onClose()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, filtered, selectedIndex, onClose])

  // Build flat index for highlighting
  let flatIndex = 0

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9998] bg-black/50"
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 z-[9998] w-[90vw] max-w-[480px] border border-forge-border bg-[#0f1117] font-mono shadow-2xl"
          >
            {/* Search input */}
            <div className="border-b border-forge-border px-4 py-3 flex items-center gap-3">
              <span className="text-forge-dim text-xs">&gt;</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSelectedIndex(0)
                }}
                placeholder="Type a command..."
                className="flex-1 bg-transparent text-sm text-forge-text placeholder:text-forge-dim outline-none"
              />
              <kbd className="text-[9px] text-forge-dim border border-forge-border px-1.5 py-0.5">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[320px] overflow-y-auto">
              {filtered.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-forge-dim">
                  No matching commands
                </div>
              )}
              {Array.from(groups.entries()).map(([category, cmds]) => (
                <div key={category}>
                  <div className="px-4 pt-3 pb-1 text-[9px] uppercase tracking-[0.2em] text-forge-muted">
                    {category}
                  </div>
                  {cmds.map((cmd) => {
                    const idx = flatIndex++
                    const isSelected = idx === selectedIndex
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => {
                          cmd.action()
                          onClose()
                        }}
                        className={`w-full text-left px-4 py-2 text-xs flex items-center gap-3 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-forge-cta/10 text-forge-text'
                            : 'text-forge-soft hover:bg-forge-surface'
                        }`}
                      >
                        {cmd.label}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/CommandPalette.tsx
git commit -m "feat: add CommandPalette with fuzzy search and keyboard navigation"
```

---

### Task 6: Cross-Panel Navigation Hook

**Files:**
- Create: `src/hooks/use-panel-navigation.ts`

**Context:** This hook wraps `setActivePanel` to add highlight context. When a component calls `navigateTo('memory-inspector', 'some-entry-id')`, the hook switches panels and stores a one-shot highlight context. The target panel reads it on mount and can flash the relevant item. `PanelId` is imported from `src/types/index.ts`. The `markPanelVisited` function from `src/hooks/use-tour.ts` should also be called on navigation (DashboardPage already does this in `handlePanelChange`).

- [ ] **Step 1: Create the panel navigation hook**

Create `src/hooks/use-panel-navigation.ts`:

```typescript
import { useState, useCallback } from 'react'
import type { PanelId } from '../types'

export interface HighlightContext {
  panelId: PanelId
  itemId?: string
  source?: string
}

export function usePanelNavigation(setActivePanel: (panel: PanelId) => void) {
  const [highlight, setHighlight] = useState<HighlightContext | null>(null)

  const navigateTo = useCallback(
    (panelId: PanelId, itemId?: string, source?: string) => {
      setHighlight({ panelId, itemId, source })
      setActivePanel(panelId)
    },
    [setActivePanel],
  )

  // One-shot: consumer reads highlight and it's cleared
  const consumeHighlight = useCallback(
    (panelId: PanelId): HighlightContext | null => {
      if (highlight && highlight.panelId === panelId) {
        const ctx = highlight
        setHighlight(null)
        return ctx
      }
      return null
    },
    [highlight],
  )

  return { navigateTo, consumeHighlight, highlight }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-panel-navigation.ts
git commit -m "feat: add usePanelNavigation hook for cross-panel linking"
```

---

### Task 7: Settings Trigger + Settings Drawer

**Files:**
- Create: `src/components/shared/SettingsTrigger.tsx`
- Create: `src/components/shared/SettingsDrawer.tsx`

**Context:** The SettingsTrigger is styled identically to the TourTrigger (see `src/components/walkthrough/TourTrigger.tsx` — a small button with an icon and optional label). It goes in the sidebar footer next to the tour "?" button. The SettingsDrawer slides in from the right with Framer Motion, same as the existing modals. It reads/writes localStorage keys directly. The `useReducedMotion` hook is at `src/hooks/use-reduced-motion.ts`. All localStorage keys in the project use the `agentforge-` prefix.

- [ ] **Step 1: Create the SettingsTrigger button**

Create `src/components/shared/SettingsTrigger.tsx`:

```tsx
interface SettingsTriggerProps {
  onOpen: () => void
  expanded: boolean
}

export default function SettingsTrigger({ onOpen, expanded }: SettingsTriggerProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      className="flex items-center gap-2 px-3 py-1.5 text-forge-dim hover:text-forge-cta transition-colors cursor-pointer"
      title="Settings"
      aria-label="Open settings"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="7" cy="7" r="2.5" />
        <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.8 2.8l1.06 1.06M10.14 10.14l1.06 1.06M2.8 11.2l1.06-1.06M10.14 3.86l1.06-1.06" />
      </svg>
      {expanded && (
        <span className="text-[10px] font-mono uppercase tracking-wider whitespace-nowrap overflow-hidden">
          SETTINGS
        </span>
      )}
    </button>
  )
}
```

- [ ] **Step 2: Create the SettingsDrawer component**

Create `src/components/shared/SettingsDrawer.tsx`:

```tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SettingsDrawerProps {
  open: boolean
  onClose: () => void
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer">
      <span className="text-xs text-forge-soft">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-8 h-4 rounded-full transition-colors cursor-pointer ${
          checked ? 'bg-forge-cta/40' : 'bg-forge-border'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full transition-transform ${
            checked ? 'translate-x-4 bg-forge-cta' : 'bg-forge-dim'
          }`}
        />
      </button>
    </label>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="text-[9px] uppercase tracking-[0.2em] text-forge-muted mt-6 mb-3 first:mt-0">
      {children}
    </div>
  )
}

function ActionButton({ label, onClick, variant = 'default' }: { label: string; onClick: () => void; variant?: 'default' | 'danger' }) {
  const colors = variant === 'danger'
    ? 'border-red-500/25 text-red-400 hover:border-red-500/50'
    : 'border-forge-border text-forge-soft hover:border-forge-cta/50 hover:text-forge-text'
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-xs font-mono border ${colors} transition-colors cursor-pointer mb-2`}
    >
      {label}
    </button>
  )
}

export default function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const [reduceMotion, setReduceMotion] = useState(() => {
    return localStorage.getItem('agentforge-reduce-motion') === 'true'
  })
  const [sidebarDefault, setSidebarDefault] = useState(() => {
    return localStorage.getItem('agentforge-sidebar-default') ?? 'collapsed'
  })
  const [confirmClear, setConfirmClear] = useState(false)

  const handleReduceMotion = (val: boolean) => {
    setReduceMotion(val)
    localStorage.setItem('agentforge-reduce-motion', String(val))
  }

  const handleSidebarDefault = (val: string) => {
    setSidebarDefault(val)
    localStorage.setItem('agentforge-sidebar-default', val)
  }

  const handleClearTour = () => {
    localStorage.removeItem('agentforge-tour-completed')
    localStorage.removeItem('agentforge-visited-panels')
  }

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('agentforge-'))
    for (const key of keys) localStorage.removeItem(key)
    setConfirmClear(false)
  }

  const handleExport = () => {
    const data: Record<string, string> = {}
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('agentforge-')) {
        data[key] = localStorage.getItem(key) ?? ''
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agentforge-settings-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string)
          for (const [key, value] of Object.entries(data)) {
            if (key.startsWith('agentforge-') && typeof value === 'string') {
              localStorage.setItem(key, value)
            }
          }
        } catch { /* invalid json */ }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9997] bg-black/40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="fixed top-0 right-0 bottom-0 z-[9997] w-80 max-w-full bg-[#0f1117] border-l border-forge-border font-mono overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-forge-border">
              <span className="text-xs uppercase tracking-[0.15em] text-forge-text">SETTINGS</span>
              <button
                onClick={onClose}
                className="text-forge-dim hover:text-forge-text transition-colors cursor-pointer"
                aria-label="Close settings"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 3l8 8M11 3l-8 8" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-4">
              <SectionLabel>Display</SectionLabel>
              <Toggle
                checked={reduceMotion}
                onChange={handleReduceMotion}
                label="Reduce motion"
              />
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-forge-soft">Sidebar default</span>
                <div className="flex gap-1">
                  {['collapsed', 'expanded'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleSidebarDefault(opt)}
                      className={`px-2 py-1 text-[10px] uppercase tracking-wider cursor-pointer transition-colors ${
                        sidebarDefault === opt
                          ? 'bg-forge-cta/15 text-forge-cta border border-forge-cta/25'
                          : 'text-forge-dim border border-forge-border hover:text-forge-soft'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <SectionLabel>Data</SectionLabel>
              <ActionButton label="Clear tour progress" onClick={handleClearTour} />
              <ActionButton
                label={confirmClear ? 'Confirm: clear ALL local data' : 'Clear all local data'}
                onClick={handleClearAll}
                variant={confirmClear ? 'danger' : 'default'}
              />
              <ActionButton label="Export state as JSON" onClick={handleExport} />
              <ActionButton label="Import state from JSON" onClick={handleImport} />

              <SectionLabel>About</SectionLabel>
              <div className="space-y-2 text-xs text-forge-dim">
                <div>AgentForge <span className="text-forge-soft">v0.1.0</span></div>
                <a
                  href="https://github.com/QRcode1337/AgenticaForge"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-forge-muted hover:text-forge-cta transition-colors"
                >
                  GitHub →
                </a>
                <button
                  onClick={() => { location.hash = '#/docs'; onClose() }}
                  className="block text-forge-muted hover:text-forge-cta transition-colors cursor-pointer"
                >
                  Documentation →
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/SettingsTrigger.tsx src/components/shared/SettingsDrawer.tsx
git commit -m "feat: add SettingsTrigger and SettingsDrawer components"
```

---

### Task 8: Sidebar Integration

**Files:**
- Modify: `src/components/shared/Sidebar.tsx`

**Context:** The Sidebar component is at `src/components/shared/Sidebar.tsx` (391 lines). It already has `tourActive` and `onTourRestart` props added in a previous feature. We need to add `onSettingsOpen` prop and render `SettingsTrigger` in the footer next to `TourTrigger`, in both the mobile layout (line 291-297) and the desktop layout (line 376-386). The Sidebar also needs a `sidebarRef` or method for the keyboard shortcut `Cmd+B` to toggle — we'll expose this via a new `onToggleSidebar` prop. The `SettingsTrigger` import follows the same pattern as `TourTrigger` (line 4).

- [ ] **Step 1: Add SettingsTrigger import and props**

In `src/components/shared/Sidebar.tsx`, add the import after the TourTrigger import (line 4):

```typescript
// Add after line 4:
import SettingsTrigger from './SettingsTrigger'
```

Add `onSettingsOpen` to the `SidebarProps` interface and the function signature:

```typescript
// SidebarProps interface — add after onTourRestart line:
  onSettingsOpen?: () => void

// Function signature — add after onTourRestart default:
  onSettingsOpen = () => {},
```

- [ ] **Step 2: Add SettingsTrigger to mobile footer**

In the mobile layout, the footer is at lines 291-297. Replace the status section to include both triggers:

Find the mobile footer section (around line 291):
```tsx
          <div className="flex items-center justify-between h-12 px-4 border-t border-forge-border shrink-0">
            <TourTrigger onRestart={onTourRestart} expanded={true} />
            <div className="flex items-center gap-2">
              <span className="text-forge-cta font-mono text-sm animate-pulse shrink-0">_</span>
              <span className="text-[10px] text-forge-dim font-mono uppercase tracking-wider">SYSTEM ONLINE</span>
            </div>
          </div>
```

Replace with:
```tsx
          <div className="flex items-center justify-between h-12 px-4 border-t border-forge-border shrink-0">
            <div className="flex items-center">
              <TourTrigger onRestart={onTourRestart} expanded={true} />
              <SettingsTrigger onOpen={onSettingsOpen} expanded={true} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-forge-cta font-mono text-sm animate-pulse shrink-0">_</span>
              <span className="text-[10px] text-forge-dim font-mono uppercase tracking-wider">SYSTEM ONLINE</span>
            </div>
          </div>
```

- [ ] **Step 3: Add SettingsTrigger to desktop footer**

In the desktop layout, the footer is at lines 376-386. Find:
```tsx
      <div className="flex items-center gap-2 h-12 px-4 border-t border-forge-border shrink-0 overflow-hidden">
        <TourTrigger onRestart={onTourRestart} expanded={expanded} />
        <span className="text-forge-cta font-mono text-sm animate-pulse shrink-0">_</span>
```

Replace with:
```tsx
      <div className="flex items-center gap-2 h-12 px-4 border-t border-forge-border shrink-0 overflow-hidden">
        <TourTrigger onRestart={onTourRestart} expanded={expanded} />
        <SettingsTrigger onOpen={onSettingsOpen} expanded={expanded} />
        <span className="text-forge-cta font-mono text-sm animate-pulse shrink-0">_</span>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/Sidebar.tsx
git commit -m "feat: add SettingsTrigger to Sidebar footer"
```

---

### Task 9: DashboardPage Wiring

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

**Context:** `DashboardPage.tsx` is the main orchestrator (92 lines). It already imports `useTour`, `markPanelVisited`, `WalkthroughTour`, `Sidebar`, and manages `activePanel` state. We need to: (1) add panel persistence via localStorage, (2) mount `ToastContainer`, `CommandPalette`, `SettingsDrawer`, (3) wire `useKeyboardShortcuts`, (4) wire `usePanelNavigation`, (5) define the command list, (6) pass new props to Sidebar. The `PanelId` type is already imported (line 11). The panel order matches `navItems` in Sidebar: squad-builder, memory-inspector, training-studio, vector-galaxy, live-feed, integration-hub, command-center.

- [ ] **Step 1: Add all new imports**

At the top of `DashboardPage.tsx`, after the existing imports (lines 1-11), add:

```typescript
import ToastContainer from '../components/shared/ToastContainer'
import CommandPalette, { type PaletteCommand } from '../components/shared/CommandPalette'
import SettingsDrawer from '../components/shared/SettingsDrawer'
import { useKeyboardShortcuts } from '../hooks/use-keyboard-shortcuts'
import { usePanelNavigation } from '../hooks/use-panel-navigation'
import { toast } from '../hooks/use-toast'
```

- [ ] **Step 2: Add panel persistence**

Replace the `useState<PanelId>('squad-builder')` (line 36) with a localStorage-backed initializer:

```typescript
  const PANEL_IDS: PanelId[] = ['squad-builder', 'memory-inspector', 'training-studio', 'vector-galaxy', 'live-feed', 'integration-hub', 'command-center']

  const [activePanel, setActivePanel] = useState<PanelId>(() => {
    try {
      const saved = localStorage.getItem('agentforge-active-panel') as PanelId | null
      if (saved && PANEL_IDS.includes(saved)) return saved
    } catch { /* noop */ }
    return 'squad-builder'
  })
```

Update `handlePanelChange` to also persist:

```typescript
  const handlePanelChange = useCallback((panel: PanelId) => {
    setActivePanel(panel)
    markPanelVisited(panel)
    try { localStorage.setItem('agentforge-active-panel', panel) } catch { /* noop */ }
  }, [])
```

- [ ] **Step 3: Add state for palette and settings**

After the `handlePanelChange` callback, add:

```typescript
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { navigateTo } = usePanelNavigation(handlePanelChange)
```

- [ ] **Step 4: Define command list**

After the state declarations, add:

```typescript
  const commands: PaletteCommand[] = useMemo(() => [
    // Panels
    { id: 'panel-squad', label: 'Squad Builder', category: 'Panels', action: () => handlePanelChange('squad-builder') },
    { id: 'panel-memory', label: 'Memory Inspector', category: 'Panels', action: () => handlePanelChange('memory-inspector') },
    { id: 'panel-training', label: 'Training Studio', category: 'Panels', action: () => handlePanelChange('training-studio') },
    { id: 'panel-vector', label: 'Vector Galaxy', category: 'Panels', action: () => handlePanelChange('vector-galaxy') },
    { id: 'panel-feed', label: 'Live Feed', category: 'Panels', action: () => handlePanelChange('live-feed') },
    { id: 'panel-integration', label: 'Integration Hub', category: 'Panels', action: () => handlePanelChange('integration-hub') },
    { id: 'panel-command', label: 'Command Center', category: 'Panels', action: () => handlePanelChange('command-center') },
    // Actions
    { id: 'action-create-agent', label: 'Create Agent', category: 'Actions', action: () => handlePanelChange('squad-builder') },
    { id: 'action-store-memory', label: 'Store Memory', category: 'Actions', action: () => handlePanelChange('memory-inspector') },
    { id: 'action-start-training', label: 'Start Training', category: 'Actions', action: () => handlePanelChange('training-studio') },
    { id: 'action-add-integration', label: 'Add Integration', category: 'Actions', action: () => handlePanelChange('integration-hub') },
    { id: 'action-replay-tour', label: 'Replay Tour', category: 'Actions', action: () => tour.restart() },
    { id: 'action-settings', label: 'Open Settings', category: 'Actions', action: () => setSettingsOpen(true) },
  ], [handlePanelChange, tour])
```

- [ ] **Step 5: Wire keyboard shortcuts**

After the commands definition, add:

```typescript
  useKeyboardShortcuts({
    onTogglePalette: useCallback(() => {
      setPaletteOpen((prev) => !prev)
      if (settingsOpen) setSettingsOpen(false)
    }, [settingsOpen]),
    onPanelSwitch: useCallback((index: number) => {
      if (index >= 0 && index < PANEL_IDS.length) {
        handlePanelChange(PANEL_IDS[index])
      }
    }, [handlePanelChange]),
    onToggleSidebar: useCallback(() => {
      // Will be handled by sidebar's own state; for now just a placeholder
    }, []),
    onEscape: useCallback(() => {
      if (paletteOpen) setPaletteOpen(false)
      else if (settingsOpen) setSettingsOpen(false)
    }, [paletteOpen, settingsOpen]),
    disabled: tour.active,
  })
```

- [ ] **Step 6: Update JSX to mount new components and pass new Sidebar props**

In the return statement, update the Sidebar to include `onSettingsOpen`:

```tsx
            <Sidebar
              activePanel={activePanel}
              onPanelChange={handlePanelChange}
              tourActive={tour.active}
              onTourRestart={tour.restart}
              onSettingsOpen={() => setSettingsOpen(true)}
            />
```

After the `<WalkthroughTour>` component (line 77), add the new components:

```tsx
            <ToastContainer />
            <CommandPalette
              open={paletteOpen}
              onClose={() => setPaletteOpen(false)}
              commands={commands}
            />
            <SettingsDrawer
              open={settingsOpen}
              onClose={() => setSettingsOpen(false)}
            />
```

- [ ] **Step 7: Add useMemo import**

Make sure `useMemo` is in the React import (line 1). Update:

```typescript
import React, { useState, useCallback, useMemo, Suspense } from 'react'
```

- [ ] **Step 8: Verify build**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 9: Commit**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat: wire panel persistence, command palette, settings, keyboard shortcuts, and toast container into DashboardPage"
```

---

### Task 10: Panel Headers + Empty States Integration

**Files:**
- Modify: `src/components/squad-builder/SquadBuilder.tsx`
- Modify: `src/components/memory-inspector/MemoryInspector.tsx`
- Modify: `src/components/training-studio/TrainingStudio.tsx`
- Modify: `src/components/vector-galaxy/VectorGalaxy.tsx`
- Modify: `src/components/live-feed/LiveFeed.tsx`
- Modify: `src/components/integration-hub/IntegrationHub.tsx`
- Modify: `src/components/command-center/CommandCenter.tsx`

**Context:** Each panel gets a `PanelHeader` at the top and (where applicable) an `EmptyState` conditional. The PanelHeader goes INSIDE each panel's root `<div>` as the first child, ABOVE the panel's existing header/content. EmptyState replaces the panel's main content when there's no data. Panel numbers follow sidebar order: Squad Builder=01, Memory Inspector=02, Training Studio=03, Vector Galaxy=04, Live Feed=05, Integration Hub=06, Command Center=07.

**Important existing patterns:**
- SquadBuilder root (line 612-613): `<div className="flex h-full w-full flex-col bg-forge-bg font-mono">`
- SquadBuilder already has its own `<header>` at line 615 — PanelHeader goes ABOVE it
- MemoryInspector root (line ~428): returns a div with flex-col layout
- VectorGalaxy root (line 484): `<div className="relative h-full w-full bg-[#050310]">` — needs special handling since it's a Canvas
- CommandCenter root (line ~32): has Terminal component — no empty state needed
- Each panel uses `useMemory()` or similar hooks for data counts

**NOTE:** Because this task modifies 7 files and each modification is independent, the implementer should make all changes and then commit once at the end. Do NOT commit per-file.

- [ ] **Step 1: Add PanelHeader to SquadBuilder**

In `src/components/squad-builder/SquadBuilder.tsx`, add import at top:
```typescript
import PanelHeader from '../shared/PanelHeader'
```

Inside the `SquadBuilder` component's return (line 612), insert PanelHeader as the first child of the root div, before the existing `<header>`:
```tsx
  return (
    <div className="flex h-full w-full flex-col bg-forge-bg font-mono">
      <PanelHeader panelNumber={1} title="Squad Builder" stats={`${nodes.length} agents · ${edges.length} links`} />
      {/* ---- Header bar ---- */}
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-forge-border bg-forge-surface px-4 py-2.5">
```

- [ ] **Step 2: Add PanelHeader to MemoryInspector**

In `src/components/memory-inspector/MemoryInspector.tsx`, add import at top:
```typescript
import PanelHeader from '../shared/PanelHeader'
```

Inside the `MemoryInspector` component's return, insert PanelHeader as the first child. The stats should show total memory count. The total is `tierBreakdown.hot.length + tierBreakdown.warm.length + tierBreakdown.cold.length`:
```tsx
  const totalMemories = tierBreakdown.hot.length + tierBreakdown.warm.length + tierBreakdown.cold.length
```
Add this line right before the return statement, then insert PanelHeader:
```tsx
      <PanelHeader panelNumber={2} title="Memory Inspector" stats={`${totalMemories} memories`} />
```

- [ ] **Step 3: Add PanelHeader to TrainingStudio**

In `src/components/training-studio/TrainingStudio.tsx`, add import at top:
```typescript
import PanelHeader from '../shared/PanelHeader'
```

Inside the return, add as first child of the root div. The status text maps `trainingStatus`:
```tsx
      <PanelHeader panelNumber={3} title="Training Studio" stats={trainingStatus} />
```

- [ ] **Step 4: Add PanelHeader to VectorGalaxy**

In `src/components/vector-galaxy/VectorGalaxy.tsx`, add import at top:
```typescript
import PanelHeader from '../shared/PanelHeader'
```

VectorGalaxy uses absolute positioning for its overlays. Wrap in a flex-col container and put PanelHeader above the existing relative div:
```tsx
  return (
    <div className="flex h-full w-full flex-col">
      <PanelHeader panelNumber={4} title="Vector Galaxy" stats={`${points.length} embeddings`} />
      <div className="relative flex-1 bg-[#050310]">
```
And close the new wrapper div at the end:
```tsx
      </div>
    </div>
  )
```

- [ ] **Step 5: Add PanelHeader to LiveFeed**

In `src/components/live-feed/LiveFeed.tsx`, add import at top:
```typescript
import PanelHeader from '../shared/PanelHeader'
```

The LiveFeed return needs to be found (starts around line 534 based on structure). Add PanelHeader as first child, with event count stat. The combined events array is used for display — use `allEvents.length` or derive from the component's filtered display. The simplest stat is `mappedEvents.length + localEvents.length`:
```tsx
      <PanelHeader panelNumber={5} title="Live Feed" stats={`${mappedEvents.length + localEvents.length} events`} />
```

- [ ] **Step 6: Add PanelHeader to IntegrationHub**

In `src/components/integration-hub/IntegrationHub.tsx`, add import at top:
```typescript
import PanelHeader from '../shared/PanelHeader'
```

Inside the return (line 628), add as first child:
```tsx
      <PanelHeader panelNumber={6} title="Integration Hub" stats={`${liveIntegrations.filter(i => i.status === 'connected').length} connected`} />
```

- [ ] **Step 7: Add PanelHeader to CommandCenter**

In `src/components/command-center/CommandCenter.tsx`, add import at top:
```typescript
import PanelHeader from '../shared/PanelHeader'
```

Inside the return, add as first child of the root div:
```tsx
      <PanelHeader panelNumber={7} title="Command Center" stats={`${lines.length} lines`} />
```

- [ ] **Step 8: Add EmptyState to SquadBuilder**

In `src/components/squad-builder/SquadBuilder.tsx`, add import:
```typescript
import EmptyState from '../shared/EmptyState'
```

After the PanelHeader insertion, wrap the rest of the panel content in a conditional. If `nodes.length === 0`, show EmptyState instead. Find the area after PanelHeader and before `<header>` (the existing toolbar), and wrap everything from `<header>` to the end in a conditional:
```tsx
      <PanelHeader panelNumber={1} title="Squad Builder" stats={`${nodes.length} agents · ${edges.length} links`} />
      {nodes.length === 0 ? (
        <EmptyState
          icon="⬡"
          status="NO AGENTS DEPLOYED"
          copy="Your squad is empty. Build your first team."
          ctaLabel="+ CREATE AGENT"
          onCta={() => {
            const id = `agent-${Date.now()}`
            setNodes((nds) => [...nds, {
              id,
              type: 'agent',
              position: { x: 250, y: 150 },
              data: { label: 'New Agent', role: 'worker', status: 'idle', memorySlots: 0, maxMemorySlots: 4 },
            }])
          }}
        />
      ) : (
        <>
          {/* existing header and ReactFlow content */}
```
And close the fragment and conditional at the end:
```tsx
        </>
      )}
```

- [ ] **Step 9: Add EmptyState to MemoryInspector**

In `src/components/memory-inspector/MemoryInspector.tsx`, add import:
```typescript
import EmptyState from '../shared/EmptyState'
```

After PanelHeader, add conditional. Use `totalMemories === 0`:
```tsx
      {totalMemories === 0 ? (
        <EmptyState
          icon="◈"
          status="NO MEMORIES STORED"
          copy="Nothing in memory yet. Store your first entry."
          ctaLabel="+ STORE MEMORY"
          onCta={() => {}}
        />
      ) : (
        <>
          {/* existing tier cards and content */}
        </>
      )}
```

Note: The `onCta` is a no-op for now because MemoryInspector doesn't have a "store" modal — it stores through the Command Center or Integration Hub. The button signals intent; users can use the Command Center.

- [ ] **Step 10: Add EmptyState to VectorGalaxy**

In `src/components/vector-galaxy/VectorGalaxy.tsx`, add import:
```typescript
import EmptyState from '../shared/EmptyState'
```

VectorGalaxy already shows mock data when `vectorPoints.length < 4`. Add an empty state only when the memory engine has zero real points. After PanelHeader, conditionally show EmptyState when `vectorPoints.length === 0`:
```tsx
      {vectorPoints.length === 0 ? (
        <EmptyState
          icon="✦"
          status="NO EMBEDDINGS"
          copy="The galaxy is empty. Store memories to populate it."
          ctaLabel="GO TO MEMORY"
          onCta={() => { /* Will be wired to navigateTo in a future iteration */ }}
        />
      ) : (
        <div className="relative flex-1 bg-[#050310]">
          {/* existing Canvas and overlays */}
        </div>
      )}
```

- [ ] **Step 11: Add EmptyState to LiveFeed**

In `src/components/live-feed/LiveFeed.tsx`, add import:
```typescript
import EmptyState from '../shared/EmptyState'
```

LiveFeed generates initial events, so the empty state only shows in backend mode when there are truly no events. After PanelHeader, add conditional on `mappedEvents.length + localEvents.length === 0`:
```tsx
      {mappedEvents.length + localEvents.length === 0 ? (
        <EmptyState
          icon="▣"
          status="NO EVENTS"
          copy="Waiting for agent activity. Deploy a squad to begin."
          ctaLabel="GO TO SQUAD"
          onCta={() => { /* Will be wired to navigateTo in a future iteration */ }}
        />
      ) : (
        <>
          {/* existing feed content */}
        </>
      )}
```

- [ ] **Step 12: Add EmptyState to IntegrationHub**

In `src/components/integration-hub/IntegrationHub.tsx`, add import:
```typescript
import EmptyState from '../shared/EmptyState'
```

IntegrationHub seeds with default integrations, so empty state is unlikely but still good to have. After PanelHeader, add conditional on `liveIntegrations.length === 0`:
```tsx
      {liveIntegrations.length === 0 ? (
        <EmptyState
          icon="◎"
          status="NO INTEGRATIONS"
          copy="No services connected. Add your first integration."
          ctaLabel="+ ADD INTEGRATION"
          onCta={() => setShowAddModal(true)}
        />
      ) : (
        <>
          {/* existing tabs and content */}
        </>
      )}
```

- [ ] **Step 13: Verify build**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 14: Commit**

```bash
git add src/components/squad-builder/SquadBuilder.tsx src/components/memory-inspector/MemoryInspector.tsx src/components/training-studio/TrainingStudio.tsx src/components/vector-galaxy/VectorGalaxy.tsx src/components/live-feed/LiveFeed.tsx src/components/integration-hub/IntegrationHub.tsx src/components/command-center/CommandCenter.tsx
git commit -m "feat: add PanelHeader and EmptyState to all dashboard panels"
```

---

### Task 11: Build Verification + Dev Server Smoke Test

**Files:** None (verification only)

- [ ] **Step 1: Full build**

Run: `npx vite build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Start dev server and verify**

Run: `npx vite --port 3000 &` then `sleep 3 && curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/`
Expected: Returns `200`

- [ ] **Step 3: Kill dev server**

Run: `kill %1 2>/dev/null || true`
