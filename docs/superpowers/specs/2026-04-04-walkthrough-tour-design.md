# AgentForge Walkthrough Tour — Design Spec

**Date:** 2026-04-04
**Status:** Approved

## Overview

A guided tooltip tour that introduces new users to AgentForge's 7 dashboard panels. Auto-starts on first visit, navigable via Next/Back/Skip, replayable anytime. Built with React + Framer Motion, no external tour libraries.

## Visual Design

- **Tooltip style:** Dark background (`#0f1117`), subtle green glow border (`#4ade8066`), scanline accent (green gradient line at top), arrow pointing to target element
- **Backdrop:** None — dashboard stays fully visible. Target element gets a pulsing green glow (`box-shadow: 0 0 12px #4ade8066, 0 0 24px #4ade8033`)
- **Typography:** Monospace, uppercase headings with `letter-spacing: 0.15em`, briefing-style copy
- **Progress:** Horizontal bar of 9 segments below the tooltip, active segment filled green
- **Buttons:** SKIP TOUR (muted, left), BACK (bordered, muted), NEXT → (green bordered, right)

## Tour Steps

| Step | Target Element | Title | Copy |
|------|---------------|-------|------|
| 1 | Sidebar nav container | NAVIGATION | Your command deck. Seven panels, each a different weapon in your arsenal. |
| 2 | Squad Builder sidebar icon | SQUAD BUILDER | Build and connect agents into operational squads. Assign roles, define topology, deploy. |
| 3 | Memory Inspector sidebar icon | MEMORY INSPECTOR | Manage agent memory across hot, warm, and cold tiers. Tag, search, and budget tokens. |
| 4 | Training Studio sidebar icon | TRAINING STUDIO | Train agents with reinforcement learning. Pick an algorithm, tune hyperparameters, watch metrics. |
| 5 | Vector Galaxy sidebar icon | VECTOR GALAXY | Visualize embeddings in 3D space. Explore clusters, spot patterns, navigate the latent space. |
| 6 | Live Feed sidebar icon | LIVE FEED | Real-time event stream from your agents. Filter by type, monitor decisions and errors. |
| 7 | Integration Hub sidebar icon | INTEGRATION HUB | Connect external services — frameworks, models, orchestration tools. Configure and monitor status. |
| 8 | Command Center sidebar icon | COMMAND CENTER | Terminal interface for direct agent commands. Spawn, query, train — all from the command line. |
| 9 | Center of viewport (no target) | TOUR COMPLETE | You're briefed. Start building, or replay this tour anytime from the sidebar. |

## Behavior

### Auto-start
- Tour auto-starts on first dashboard visit
- Tracked via `localStorage` key `agentforge-tour-completed`
- If key is `"true"`, tour does not auto-start

### Navigation
- **Next** advances to the next step and navigates to that panel (steps 2-8 switch the active sidebar panel)
- **Back** returns to the previous step and its panel
- **Skip** dismisses the tour immediately and sets `agentforge-tour-completed` to `"true"`
- Completing step 9 also sets the key to `"true"`
- Keyboard: Right arrow / Enter = Next, Left arrow = Back, Escape = Skip

### Panel navigation
- Steps 2-8 call the existing panel switching mechanism (the `setActive` state in `DashboardPage`) to navigate to the corresponding panel
- Step 1 highlights the sidebar itself without switching panels
- Step 9 is a centered modal-style tooltip with no target element

### Replay
- A "?" button in the sidebar footer allows replaying the tour at any time
- Clicking it sets `agentforge-tour-completed` to `"false"` and restarts from step 1

### Post-tour coach marks
- After tour completion, panels the user hasn't visited get a subtle pulsing green dot (4px circle) on their sidebar icon
- Tracked via `localStorage` key `agentforge-visited-panels` (JSON array of panel IDs)
- Clicking a panel adds it to the visited list; the dot disappears
- Once all 7 panels are visited, no more dots appear

## Tooltip Positioning

- Tooltip positions itself relative to the target element's bounding rect
- Default placement: to the right of sidebar icons (with left-pointing arrow)
- Step 1 (sidebar container): tooltip appears to the right of the sidebar, vertically centered
- Step 9 (no target): tooltip is centered in the viewport
- If tooltip would overflow the viewport, flip to opposite side
- Repositions on window resize

## Animation

- Tooltip enters with Framer Motion `fadeIn` + slight `translateX` (slides in from the direction of the arrow)
- Target element glow pulses with CSS `@keyframes` (opacity oscillates between 0.3 and 0.6)
- Step transitions: tooltip fades out, panel switches, tooltip fades in at new position
- Duration: 200ms transitions

## Files

| File | Purpose |
|------|---------|
| `src/hooks/use-tour.ts` | Tour state management, step navigation, localStorage persistence, keyboard listeners |
| `src/components/walkthrough/WalkthroughTour.tsx` | Tooltip component, positioning logic, glow effect on target, progress bar |
| `src/components/walkthrough/TourTrigger.tsx` | "?" replay button for sidebar footer |
| `src/components/walkthrough/CoachMark.tsx` | Post-tour pulsing dot indicator for unvisited panels |

## Integration Points

- `DashboardPage.tsx` — mount `<WalkthroughTour>` and `<CoachMark>` components, pass `activePanel` and `setActivePanel`
- `Sidebar.tsx` — add `data-tour-step` attributes to sidebar icons for targeting, mount `<TourTrigger>` in footer
- Each sidebar icon gets a `data-tour-step="panel-name"` attribute for the tooltip to locate its target via `document.querySelector`

## Data Flow

```
useTour hook
├── state: { step: number, active: boolean }
├── reads: localStorage (tour-completed, visited-panels)
├── writes: localStorage on skip/complete/panel-visit
├── exposes: next(), back(), skip(), restart(), isActive, currentStep
└── receives: setActivePanel callback from DashboardPage

WalkthroughTour component
├── consumes: useTour hook
├── reads: target element position via data-tour-step attribute + getBoundingClientRect
├── renders: positioned tooltip with Framer Motion
└── renders: glow effect on target element via portal

CoachMark component
├── reads: localStorage visited-panels
├── renders: pulsing dot on unvisited panel icons
└── updates: on panel click via sidebar event
```

## Edge Cases

- **Mobile:** Tour opens the sidebar drawer automatically for steps 1-8. Tooltip is positioned to the right of sidebar icons inside the open drawer, same as desktop. If the user closes the drawer mid-tour, re-open it on next/back.
- **Window resize:** Tooltip repositions via `ResizeObserver` on the target element.
- **Target not found:** If a `data-tour-step` element isn't in the DOM (shouldn't happen), skip to the next step with a console warning.
- **Multiple tabs:** localStorage changes in one tab won't affect an active tour in another (tour state is in React state, localStorage is only read on mount).
