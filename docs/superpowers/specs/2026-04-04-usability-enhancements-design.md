# AgentForge Usability Enhancements — Design Spec

**Date:** 2026-04-04
**Status:** Approved

## Overview

Seven usability enhancements that make the AgentForge dashboard feel polished and complete. Covers persistence, feedback, guidance, navigation, and configuration.

## 1. Panel State Persistence

### Behavior
- Store active panel ID in `localStorage` key `agentforge-active-panel`
- On `DashboardInner` mount, read the key and use as initial `activePanel` state
- Fall back to `'squad-builder'` if key is missing or contains an invalid PanelId
- Write to localStorage inside the existing `handlePanelChange` callback

### Validation
- Check value against the `PanelId` union type before using it
- Invalid values are silently discarded (use default)

### Files
| File | Change |
|------|--------|
| `src/pages/DashboardPage.tsx` | Read/write localStorage in state init and handlePanelChange |

## 2. Toast Notification System

### Visual Design
- Background: `#0f1117`, border: `1px solid #252830`
- Status labels with color:
  - `CONFIRMED` — `#22C55E` (green)
  - `WARNING` — `#F59E0B` (amber)
  - `ERROR` — `#EF4444` (red)
  - `INFO` — `#3B82F7` (blue)
- Timestamp in `HH:MM:SS` format, right-aligned, `#484c58`
- Message body: `#c0c3cc`, 12px mono
- Scanline gradient at bottom: `linear-gradient(90deg, <status-color>, transparent)`
- Auto-dismiss: 3 seconds default (errors: 5 seconds)
- Click to dismiss immediately
- Position: top-right of main content area, 16px from edges
- Stack: max 3 visible, newest on top, oldest auto-dismissed when exceeded
- Animation: Framer Motion `fadeIn` + `translateX(20px)` on enter, `fadeOut` + `translateX(20px)` on exit, 200ms

### Architecture
- Module-level store using `useSyncExternalStore` pattern (matches `use-integrations.ts` pattern)
- Each toast: `{ id, type, message, timestamp, duration }`
- Store exposes: `addToast(type, message, options?)`, `dismissToast(id)`, `getToasts()`
- `useToast` hook returns `{ success(msg), error(msg), warning(msg), info(msg) }` convenience methods

### Files
| File | Purpose |
|------|---------|
| `src/hooks/use-toast.ts` | Toast store + `useToast` hook |
| `src/components/shared/ToastContainer.tsx` | Renders toast stack with Framer Motion |
| `src/pages/DashboardPage.tsx` | Mount `<ToastContainer />` |

## 3. Empty States

### Visual Design
- Centered in panel content area, vertically and horizontally
- Panel icon: 32px, opacity 0.3
- Status line: `#7a7f8d`, 11px, uppercase, `letter-spacing: 0.15em`
- Copy: `#484c58`, 12px, one sentence max
- CTA button: `border: 1px solid #22C55E44`, `color: #22C55E`, 11px uppercase, `letter-spacing: 0.1em`
- CTA triggers the panel's primary creation action (e.g., add agent, store memory)

### Per-Panel Configuration

| Panel | Icon | Status | Copy | CTA |
|-------|------|--------|------|-----|
| Squad Builder | ⬡ | NO AGENTS DEPLOYED | Your squad is empty. Build your first team. | + CREATE AGENT |
| Memory Inspector | ◈ | NO MEMORIES STORED | Nothing in memory yet. Store your first entry. | + STORE MEMORY |
| Training Studio | ◉ | NO TRAINING RUNS | No experiments running. Start your first session. | + START TRAINING |
| Vector Galaxy | ✦ | NO EMBEDDINGS | The galaxy is empty. Store memories to populate it. | GO TO MEMORY |
| Live Feed | ▣ | NO EVENTS | Waiting for agent activity. Deploy a squad to begin. | GO TO SQUAD |
| Integration Hub | ◎ | NO INTEGRATIONS | No services connected. Add your first integration. | + ADD INTEGRATION |
| Command Center | ▸ | READY | Terminal ready. Type a command or pick a quick action. | (no empty state — always has the prompt) |

### Architecture
- Shared `EmptyState` component accepts: `{ icon, status, copy, ctaLabel, onCtaClick }`
- Each panel checks its data count and conditionally renders `<EmptyState>` or its normal content
- Vector Galaxy and Live Feed CTAs navigate to other panels (cross-panel link)

### Files
| File | Purpose |
|------|---------|
| `src/components/shared/EmptyState.tsx` | Shared empty state component |
| Panel components (6 files) | Add conditional rendering |

## 4. Panel Headers

### Visual Design
- Green panel number: `#22C55E`, 9px, uppercase, `letter-spacing: 0.2em`, format `// PANEL 0N`
- Title: `#e2e4e9`, 14px, uppercase, `letter-spacing: 0.12em`
- Stats: `#484c58`, 10px, inline after title with 12px gap
- Bottom border: `1px solid #252830`
- Padding: `16px 20px 12px`

### Panel Numbers and Stats

| Panel | Number | Default Stats |
|-------|--------|---------------|
| Squad Builder | 01 | `{n} agents deployed` |
| Memory Inspector | 02 | `{n} memories · {tokens} tokens` |
| Training Studio | 03 | `{status}` (idle/running/paused) |
| Vector Galaxy | 04 | `{n} embeddings` |
| Live Feed | 05 | `{n} events` |
| Integration Hub | 06 | `{n} connected` |
| Command Center | 07 | `{n} runs` |

### Architecture
- `PanelHeader` component accepts: `{ panelNumber, title, stats }`
- `stats` is a string — each panel formats its own stats string
- Rendered at the top of each panel component, above existing content

### Files
| File | Purpose |
|------|---------|
| `src/components/shared/PanelHeader.tsx` | Shared header component |
| Panel components (7 files) | Add `<PanelHeader>` at top |

## 5. Keyboard Shortcuts + Command Palette

### Global Shortcuts
| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Toggle command palette |
| `Cmd/Ctrl + 1-7` | Switch to panel 1-7 (in sidebar order) |
| `Cmd/Ctrl + B` | Toggle sidebar expanded/collapsed |
| `Escape` | Close command palette (if open) |

### Command Palette
- **Trigger:** `Cmd/Ctrl + K` or a search icon button (optional)
- **Appearance:** Centered modal overlay with dark backdrop (`rgba(0,0,0,0.5)`)
- **Search input:** Full-width, monospace, placeholder "Type a command..."
- **Results list:** Filtered as user types, arrow keys to navigate, Enter to select
- **Categories:** "Panels" and "Actions" with category headers in the list
- **Max visible results:** 8 with scroll

### Available Commands

**Panels:**
| Command | Action |
|---------|--------|
| Squad Builder | Navigate to squad-builder |
| Memory Inspector | Navigate to memory-inspector |
| Training Studio | Navigate to training-studio |
| Vector Galaxy | Navigate to vector-galaxy |
| Live Feed | Navigate to live-feed |
| Integration Hub | Navigate to integration-hub |
| Command Center | Navigate to command-center |

**Actions:**
| Command | Action |
|---------|--------|
| Create Agent | Navigate to squad-builder (trigger create) |
| Store Memory | Navigate to memory-inspector (trigger store) |
| Start Training | Navigate to training-studio (trigger start) |
| Add Integration | Navigate to integration-hub (trigger add) |
| Replay Tour | Restart walkthrough tour |
| Open Settings | Open settings drawer |

### Fuzzy Matching
- Simple substring match on command label (case-insensitive)
- Results ordered: exact prefix match first, then substring matches

### Architecture
- `useKeyboardShortcuts` hook: registers global `keydown` listeners, calls provided callbacks
- `CommandPalette` component: modal with input, filtered list, keyboard navigation
- Commands defined as static array: `{ id, label, category, icon, action }`
- `action` is a callback — panels call `setActivePanel`, actions call panel-specific functions

### Files
| File | Purpose |
|------|---------|
| `src/hooks/use-keyboard-shortcuts.ts` | Global keyboard listener hook |
| `src/components/shared/CommandPalette.tsx` | Command palette modal |
| `src/pages/DashboardPage.tsx` | Mount palette, wire shortcuts |

## 6. Cross-Panel Quick Links

### Mechanism
- Shared `navigateToPanel` function that calls `setActivePanel` and optionally sets a highlight context
- Highlight context stored in a simple ref/state: `{ panelId, itemId?, source? }`
- Receiving panel can read the highlight context on mount and scroll to / flash the relevant item
- Context is cleared after first read (one-shot)

### Link Points
| Source | Trigger | Target |
|--------|---------|--------|
| Memory Inspector | "View in Galaxy" link on memory entry | Vector Galaxy (highlight that embedding) |
| Live Feed | "View Agent" link on agent events | Squad Builder (highlight that agent node) |
| Empty State: Vector Galaxy | "GO TO MEMORY" CTA | Memory Inspector |
| Empty State: Live Feed | "GO TO SQUAD" CTA | Squad Builder |
| Command Palette | Panel commands | Target panel |

### Architecture
- `usePanelNavigation` hook in DashboardPage that wraps `setActivePanel` with optional highlight context
- Panels read highlight context from a prop or context on mount
- Highlight effect: brief green border flash (0.5s) on the target item using CSS animation

### Files
| File | Purpose |
|------|---------|
| `src/hooks/use-panel-navigation.ts` | Navigation + highlight context |
| `src/pages/DashboardPage.tsx` | Wire navigation context |
| Panel components (select files) | Add link triggers and highlight receivers |

## 7. Settings Drawer

### Trigger
- Gear icon (⚙) in sidebar footer, next to the tour "?" button
- Same styling as TourTrigger: monospace, muted, shows "SETTINGS" label when sidebar is expanded

### Appearance
- Slide-over drawer from right side
- Width: 320px (full-width on mobile)
- Dark backdrop with click-to-close
- Same forge styling: `#0f1117` background, `#252830` borders
- Close button (✕) top-right
- Framer Motion slide + fade animation

### Sections

**Display**
- Reduce motion toggle (reads/writes `prefers-reduced-motion` override in localStorage)
- Sidebar default state: expanded / collapsed (writes localStorage key)

**Data**
- Clear tour progress — resets `agentforge-tour-completed` and `agentforge-visited-panels`
- Clear all local data — clears all `agentforge-*` localStorage keys with confirmation
- Export state — downloads all `agentforge-*` localStorage keys as JSON file
- Import state — file upload to restore exported JSON

**About**
- App name and version
- Link to GitHub repo
- Link to docs (`#/docs`)

### Architecture
- `SettingsDrawer` component with open/close state
- Reads/writes localStorage directly (no provider needed)
- Mounted in `DashboardPage.tsx`
- Sidebar gets `onSettingsOpen` prop similar to `onTourRestart`

### Files
| File | Purpose |
|------|---------|
| `src/components/shared/SettingsDrawer.tsx` | Settings drawer component |
| `src/components/shared/SettingsTrigger.tsx` | Gear button for sidebar footer |
| `src/components/shared/Sidebar.tsx` | Add SettingsTrigger next to TourTrigger |
| `src/pages/DashboardPage.tsx` | Mount drawer, wire open state |

## Data Flow

```
DashboardPage
├── localStorage: agentforge-active-panel (read on mount, write on change)
├── useToast → ToastContainer (top-right stack)
├── useKeyboardShortcuts (Cmd+K, Cmd+1-7, Cmd+B)
├── CommandPalette (modal overlay)
├── usePanelNavigation → highlight context for cross-panel links
├── SettingsDrawer (right slide-over)
├── WalkthroughTour (existing)
├── Sidebar
│   ├── TourTrigger (existing)
│   └── SettingsTrigger (new)
└── Panel Components
    ├── PanelHeader (top of each)
    ├── EmptyState (conditional, per panel)
    └── Cross-panel links (select panels)
```

## Edge Cases

- **Panel persistence with invalid value:** If localStorage contains a panel ID that doesn't exist (e.g., after a panel is removed), fall back to `'squad-builder'`
- **Toast overflow:** Max 3 visible. When a 4th arrives, the oldest is immediately dismissed
- **Command palette during tour:** Keyboard shortcuts are suppressed while the walkthrough tour is active (tour already uses arrow keys and Escape)
- **Settings clear during tour:** If user clears tour data while tour is active, tour continues (state is in React, localStorage is only read on mount)
- **Cross-panel highlight on empty panel:** If the target panel has no matching item (e.g., agent was deleted), the highlight context is silently cleared
- **Mobile command palette:** Full-width modal, same behavior, Cmd shortcuts unlikely on mobile but palette accessible via optional search icon
- **Settings drawer + command palette:** Only one overlay open at a time. Opening one closes the other
- **Reduced motion:** All Framer Motion animations respect `useReducedMotion` hook (already in codebase). Toast, palette, drawer, and highlight flash all check this.
