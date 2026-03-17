import { useSyncExternalStore } from 'react'

const query = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : null

function subscribe(callback: () => void) {
  if (!query) return () => {}
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}

function getSnapshot(): boolean {
  return query?.matches ?? false
}

function getServerSnapshot(): boolean {
  return false
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
