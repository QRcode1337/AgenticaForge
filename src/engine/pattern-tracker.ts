import type { PatternRecord, CoOccurrence } from './types.ts'

const MAX_HISTORY = 1000

function makePairKey(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`
}

export class PatternTracker {
  private history: PatternRecord[] = []
  private queryFrequency: Map<string, number> = new Map()
  private coOccurrences: Map<string, CoOccurrence> = new Map()

  // ── Record a query + result set ─────────────────────────────
  record(query: string, resultIds: string[]): void {
    const freq = (this.queryFrequency.get(query) ?? 0) + 1
    this.queryFrequency.set(query, freq)

    const boost = Math.min(1, freq / 10)
    const now = Date.now()

    const record: PatternRecord = {
      query,
      resultIds,
      timestamp: now,
      boost,
    }

    this.history.push(record)
    if (this.history.length > MAX_HISTORY) {
      this.history.shift()
    }

    // Update co-occurrences for every pair
    for (let i = 0; i < resultIds.length; i++) {
      for (let j = i + 1; j < resultIds.length; j++) {
        const key = makePairKey(resultIds[i], resultIds[j])
        const existing = this.coOccurrences.get(key)
        if (existing) {
          existing.count += 1
          existing.lastSeen = now
        } else {
          this.coOccurrences.set(key, { pairKey: key, count: 1, lastSeen: now })
        }
      }
    }
  }

  // ── Get boost for a specific result in the context of a query ─
  getBoost(query: string, resultId: string): number {
    const freq = this.queryFrequency.get(query)
    if (freq === undefined) return 0

    const baseBoost = Math.min(1, freq / 10)

    // Check how often resultId appeared in past results for this query
    let appearances = 0
    let totalMatches = 0
    const relatedIds: string[] = []

    for (const record of this.history) {
      if (record.query === query) {
        totalMatches++
        if (record.resultIds.includes(resultId)) {
          appearances++
          for (const id of record.resultIds) {
            if (id !== resultId) {
              relatedIds.push(id)
            }
          }
        }
      }
    }

    if (totalMatches === 0) return 0

    const appearanceBoost = appearances / totalMatches

    // Co-occurrence bonus: average co-occurrence score with related results
    let coBoost = 0
    if (relatedIds.length > 0) {
      let coSum = 0
      for (const relatedId of relatedIds) {
        coSum += this.getCoOccurrenceScore(resultId, relatedId)
      }
      coBoost = coSum / relatedIds.length
    }

    return Math.min(1, baseBoost * 0.4 + appearanceBoost * 0.4 + coBoost * 0.2)
  }

  // ── Co-occurrence score normalized to [0, 1] ────────────────
  getCoOccurrenceScore(idA: string, idB: string): number {
    const key = makePairKey(idA, idB)
    const entry = this.coOccurrences.get(key)
    if (!entry) return 0

    let maxCount = 0
    for (const co of this.coOccurrences.values()) {
      if (co.count > maxCount) maxCount = co.count
    }

    if (maxCount === 0) return 0
    return entry.count / maxCount
  }

  // ── Most recent patterns ────────────────────────────────────
  getTopPatterns(limit: number = 10): PatternRecord[] {
    return this.history.slice(-limit).reverse()
  }

  // ── Total recorded patterns ─────────────────────────────────
  getPatternCount(): number {
    return this.history.length
  }

  // ── Serialization ───────────────────────────────────────────
  getSerializableState(): {
    patterns: PatternRecord[]
    coOccurrences: CoOccurrence[]
  } {
    return {
      patterns: this.history,
      coOccurrences: Array.from(this.coOccurrences.values()),
    }
  }

  loadState(state: {
    patterns: PatternRecord[]
    coOccurrences: CoOccurrence[]
  }): void {
    this.history = state.patterns.slice(-MAX_HISTORY)

    this.coOccurrences.clear()
    for (const co of state.coOccurrences) {
      this.coOccurrences.set(co.pairKey, co)
    }

    // Rebuild queryFrequency from loaded history
    this.queryFrequency.clear()
    for (const record of this.history) {
      const prev = this.queryFrequency.get(record.query) ?? 0
      this.queryFrequency.set(record.query, prev + 1)
    }
  }
}
