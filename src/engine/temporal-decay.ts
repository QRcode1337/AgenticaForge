import type { DecayConfig, MemoryEntry } from './types.ts'

// ── Constants ────────────────────────────────────────────────

export const DEFAULT_DECAY_CONFIG: DecayConfig = {
  hotHalfLife: 5 * 60 * 1000,        // 5 minutes
  warmHalfLife: 60 * 60 * 1000,      // 1 hour
  coldHalfLife: 24 * 60 * 60 * 1000, // 24 hours
  hotThreshold: 0.7,
  warmThreshold: 0.3,
} as const

// ── Pure Functions ───────────────────────────────────────────

/**
 * Returns the half-life in ms for the given tier.
 * Falls back to DEFAULT_DECAY_CONFIG when no config is provided.
 */
export function getHalfLife(
  tier: 'hot' | 'warm' | 'cold',
  config: DecayConfig = DEFAULT_DECAY_CONFIG,
): number {
  switch (tier) {
    case 'hot':
      return config.hotHalfLife
    case 'warm':
      return config.warmHalfLife
    case 'cold':
      return config.coldHalfLife
  }
}

/**
 * Exponential decay with access-count boost.
 *
 * Formula: score * 0.5^(elapsed / halfLife) * (1 + log2(1 + accessCount) * 0.1)
 * Result is clamped to [0, 1].
 */
export function computeDecayedScore(
  entry: MemoryEntry,
  now: number = Date.now(),
  config: DecayConfig = DEFAULT_DECAY_CONFIG,
): number {
  const elapsed = now - entry.lastAccessedAt
  const halfLife = getHalfLife(entry.tier, config)

  const decayed = entry.score * Math.pow(0.5, elapsed / halfLife)
  const accessBoost = 1 + Math.log2(1 + entry.accessCount) * 0.1
  const boosted = decayed * accessBoost

  return Math.max(0, Math.min(1, boosted))
}

/**
 * Determines the tier for a given decayed score based on threshold config.
 */
export function computeTier(
  decayedScore: number,
  config: DecayConfig = DEFAULT_DECAY_CONFIG,
): 'hot' | 'warm' | 'cold' {
  if (decayedScore >= config.hotThreshold) return 'hot'
  if (decayedScore >= config.warmThreshold) return 'warm'
  return 'cold'
}

/**
 * Applies temporal decay to a single entry.
 * Returns a NEW MemoryEntry with updated score and tier (immutable).
 */
export function applyDecay(
  entry: MemoryEntry,
  now: number = Date.now(),
  config: DecayConfig = DEFAULT_DECAY_CONFIG,
): MemoryEntry {
  const decayedScore = computeDecayedScore(entry, now, config)
  const newTier = computeTier(decayedScore, config)

  return {
    ...entry,
    score: decayedScore,
    tier: newTier,
  }
}

/**
 * Applies decay to all entries and tracks tier transitions.
 * Returns the updated entries array and a list of tier change records.
 */
export function batchApplyDecay(
  entries: MemoryEntry[],
  now: number = Date.now(),
  config: DecayConfig = DEFAULT_DECAY_CONFIG,
): {
  updated: MemoryEntry[]
  tierChanges: Array<{ id: string; from: string; to: string }>
} {
  const tierChanges: Array<{ id: string; from: string; to: string }> = []

  const updated = entries.map((entry) => {
    const decayed = applyDecay(entry, now, config)

    if (decayed.tier !== entry.tier) {
      tierChanges.push({
        id: entry.id,
        from: entry.tier,
        to: decayed.tier,
      })
    }

    return decayed
  })

  return { updated, tierChanges }
}
