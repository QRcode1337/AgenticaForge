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
