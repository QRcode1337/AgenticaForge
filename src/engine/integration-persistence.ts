// ── Constants ────────────────────────────────────────────────
const DB_NAME = 'agentforge-integrations'
const DB_VERSION = 1
const STORE_NAME = 'configs'
const DEBOUNCE_MS = 500

// ── Types ────────────────────────────────────────────────────

export interface SavedIntegrationConfig {
  id: string
  config: Record<string, string>
  lastConnected: number
}

// ── IntegrationPersistence ───────────────────────────────────

export class IntegrationPersistence {
  private db: IDBDatabase | null = null
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private initialized = false

  async init(): Promise<void> {
    if (this.initialized) return
    this.initialized = true
    this.db = await this.openDatabase()
  }

  async save(id: string, config: Record<string, string>): Promise<void> {
    if (!this.db) return

    const record: SavedIntegrationConfig = {
      id,
      config,
      lastConnected: Date.now(),
    }

    await new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.put(record)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  scheduleSave(id: string, config: Record<string, string>): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer)
    }
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      void this.save(id, config)
    }, DEBOUNCE_MS)
  }

  async loadAll(): Promise<SavedIntegrationConfig[]> {
    if (!this.db) return []

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        resolve((request.result as SavedIntegrationConfig[]) ?? [])
      }
      request.onerror = () => reject(request.error)
    })
  }

  async remove(id: string): Promise<void> {
    if (!this.db) return

    await new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async clear(): Promise<void> {
    if (!this.db) return

    await new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  destroy(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    if (this.db) {
      this.db.close()
      this.db = null
    }
    this.initialized = false
  }

  // ── Private ─────────────────────────────────────────────────

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
}
