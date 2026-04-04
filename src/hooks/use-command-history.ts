/**
 * useCommandHistory — persistent command history with arrow-key nav + search
 *
 * Storage key: 'agentforge-cmd-history'
 * Max entries:  50 (FIFO eviction)
 *
 * Usage:
 *   const { history, push, navigateUp, navigateDown, current,
 *           searchTerm, setSearchTerm, filtered, resetNav } = useCommandHistory();
 */

import { useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_KEY = 'agentforge-cmd-history';
const MAX_ENTRIES = 50;

export interface CommandHistoryEntry {
  command: string;
  timestamp: number;
}

function loadHistory(): CommandHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: CommandHistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // quota exceeded — silently drop oldest
    const trimmed = entries.slice(0, Math.floor(MAX_ENTRIES / 2));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }
}

export function useCommandHistory() {
  const [history, setHistory] = useState<CommandHistoryEntry[]>(loadHistory);
  const [navIndex, setNavIndex] = useState<number>(-1); // -1 = not navigating
  const [searchTerm, setSearchTerm] = useState('');
  const draftRef = useRef(''); // stash the in-progress input when user starts navigating

  // Persist whenever history changes
  useEffect(() => {
    saveHistory(history);
  }, [history]);

  // Filtered list for search
  const filtered = searchTerm
    ? history.filter((e) =>
        e.command.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : history;

  /** Push a new command onto history (dedupes consecutive identical commands) */
  const push = useCallback((command: string) => {
    const trimmed = command.trim();
    if (!trimmed) return;

    setHistory((prev) => {
      // Skip if same as most recent
      if (prev.length > 0 && prev[0].command === trimmed) return prev;
      const entry: CommandHistoryEntry = { command: trimmed, timestamp: Date.now() };
      return [entry, ...prev].slice(0, MAX_ENTRIES);
    });
    setNavIndex(-1);
  }, []);

  /** Navigate up (older). Returns the command string or null if at end. */
  const navigateUp = useCallback(
    (currentInput?: string) => {
      // Stash current input on first up-press
      if (navIndex === -1 && currentInput !== undefined) {
        draftRef.current = currentInput;
      }
      const list = filtered;
      const next = Math.min(navIndex + 1, list.length - 1);
      setNavIndex(next);
      return list[next]?.command ?? null;
    },
    [navIndex, filtered],
  );

  /** Navigate down (newer). Returns command string, or restores draft at bottom. */
  const navigateDown = useCallback(() => {
    if (navIndex <= 0) {
      setNavIndex(-1);
      return draftRef.current; // restore what user was typing
    }
    const next = navIndex - 1;
    setNavIndex(next);
    return filtered[next]?.command ?? draftRef.current;
  }, [navIndex, filtered]);

  /** Currently selected history entry (or null) */
  const current = navIndex >= 0 && navIndex < filtered.length ? filtered[navIndex] : null;

  /** Reset navigation index (call when user submits or clears) */
  const resetNav = useCallback(() => {
    setNavIndex(-1);
    draftRef.current = '';
  }, []);

  /** Clear all history */
  const clearHistory = useCallback(() => {
    setHistory([]);
    setNavIndex(-1);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    history,
    filtered,
    push,
    navigateUp,
    navigateDown,
    current,
    navIndex,
    searchTerm,
    setSearchTerm,
    resetNav,
    clearHistory,
  };
}

/**
 * Keyboard handler factory — wire into your Terminal/CommandCenter's onKeyDown.
 *
 * Example:
 *   const handler = createHistoryKeyHandler(historyHook, inputRef, setInputValue);
 *   <input onKeyDown={handler} ... />
 */
export function createHistoryKeyHandler(
  hook: ReturnType<typeof useCommandHistory>,
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>,
  setInputValue: (v: string) => void,
) {
  return (e: React.KeyboardEvent) => {
    // Up arrow — navigate older
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const cmd = hook.navigateUp(inputRef.current?.value ?? '');
      if (cmd !== null) setInputValue(cmd);
    }

    // Down arrow — navigate newer
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const cmd = hook.navigateDown();
      if (cmd !== null) setInputValue(cmd);
    }

    // Cmd+F / Ctrl+F — toggle search
    if (e.key === 'f' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      // Toggle: if already searching, clear; otherwise focus will be handled by consumer
      hook.setSearchTerm((prev: string) => (prev ? '' : prev));
      // The component should render a search input when searchTerm !== undefined
      // and focus it. We dispatch a custom event so consumers can react.
      window.dispatchEvent(new CustomEvent('agentforge:cmd-search-toggle'));
    }
  };
}
