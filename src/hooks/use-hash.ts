import { useSyncExternalStore, useCallback } from 'react'
import type { Route } from '../types'

function parseHash(): Route {
  const hash = location.hash
  if (hash === '#/docs' || hash.startsWith('#/docs/')) return 'docs'
  if (hash === '#/dashboard' || hash.startsWith('#/dashboard/')) return 'dashboard'
  return 'home'
}

let currentRoute: Route = parseHash()

const listeners = new Set<() => void>()

function subscribe(callback: () => void) {
  listeners.add(callback)

  const onHashChange = () => {
    currentRoute = parseHash()
    listeners.forEach((l) => l())
  }

  window.addEventListener('hashchange', onHashChange)
  return () => {
    listeners.delete(callback)
    window.removeEventListener('hashchange', onHashChange)
  }
}

function getSnapshot(): Route {
  return currentRoute
}

function getServerSnapshot(): Route {
  return 'home'
}

export function useHash() {
  const route = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const navigate = useCallback((r: Route) => {
    const hash = r === 'home' ? '#/' : `#/${r}`
    location.hash = hash
    window.scrollTo(0, 0)
  }, [])

  return { route, navigate }
}
