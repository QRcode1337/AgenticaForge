import type { ParsedCommand, Suggestion, ActionType } from './types.ts'
import { DOMAINS, DOMAIN_VERBS, GRAMMAR_MAP, getFlagsForAction } from './schemas.ts'

// ── Parser ──────────────────────────────────────────────────

export function parseCommand(raw: string): ParsedCommand {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { domain: null, verb: null, flags: {}, content: '', raw: trimmed }
  }

  // Handle utility commands (help, clear) — no domain
  const lowerFirst = trimmed.split(/\s+/)[0].toLowerCase()
  if (lowerFirst === 'help' || lowerFirst === 'clear') {
    return { domain: null, verb: lowerFirst, flags: {}, content: '', raw: trimmed }
  }

  // Split first token on ':'
  const tokens = trimmed.split(/\s+/)
  const firstToken = tokens[0]
  const colonIdx = firstToken.indexOf(':')

  let domain: string | null = null
  let verb: string | null = null

  if (colonIdx > 0) {
    domain = firstToken.slice(0, colonIdx).toLowerCase()
    verb = firstToken.slice(colonIdx + 1).toLowerCase()
  } else {
    domain = firstToken.toLowerCase()
  }

  // Parse flags: --key value or --key "quoted value"
  const flags: Record<string, string> = {}
  const remaining: string[] = []
  let i = 1

  while (i < tokens.length) {
    const token = tokens[i]
    if (token.startsWith('--')) {
      const flagName = token.slice(2)
      // Next token is the value
      if (i + 1 < tokens.length && !tokens[i + 1].startsWith('--')) {
        let val = tokens[i + 1]
        // Handle quoted values
        if (val.startsWith('"') && !val.endsWith('"')) {
          const parts = [val]
          i += 2
          while (i < tokens.length) {
            parts.push(tokens[i])
            if (tokens[i].endsWith('"')) { i++; break }
            i++
          }
          val = parts.join(' ').replace(/^"|"$/g, '')
          flags[flagName] = val
          continue
        }
        val = val.replace(/^"|"$/g, '')
        flags[flagName] = val
        i += 2
        continue
      }
      flags[flagName] = 'true'
      i++
      continue
    }
    remaining.push(token)
    i++
  }

  // Remaining tokens joined as content, strip quotes
  let content = remaining.join(' ')
  if (content.startsWith('"') && content.endsWith('"')) {
    content = content.slice(1, -1)
  }

  return { domain, verb, flags, content, raw: trimmed }
}

// ── Autocomplete ────────────────────────────────────────────

export function getSuggestions(partial: string): Suggestion[] {
  const trimmed = partial.trimStart()
  if (!trimmed) {
    // Suggest all domains + utility commands
    const suggestions: Suggestion[] = [
      ...DOMAINS.map((d) => ({ text: `${d}:`, description: `${d} commands`, kind: 'domain' as const })),
      { text: 'help', description: 'Show available commands', kind: 'verb' },
      { text: 'clear', description: 'Clear terminal', kind: 'verb' },
    ]
    return suggestions
  }

  const tokens = trimmed.split(/\s+/)
  const firstToken = tokens[0]
  const colonIdx = firstToken.indexOf(':')

  // If we're still typing the first token
  if (tokens.length === 1) {
    // No colon yet → suggest matching domains
    if (colonIdx === -1) {
      const lower = firstToken.toLowerCase()
      const matches: Suggestion[] = []

      for (const d of DOMAINS) {
        if (d.startsWith(lower)) {
          matches.push({ text: `${d}:`, description: `${d} commands`, kind: 'domain' })
        }
      }

      // Also check utility commands
      if ('help'.startsWith(lower)) {
        matches.push({ text: 'help', description: 'Show available commands', kind: 'verb' })
      }
      if ('clear'.startsWith(lower)) {
        matches.push({ text: 'clear', description: 'Clear terminal', kind: 'verb' })
      }

      return matches.slice(0, 6)
    }

    // Has colon → suggest verbs for domain
    const domain = firstToken.slice(0, colonIdx).toLowerCase()
    const verbPartial = firstToken.slice(colonIdx + 1).toLowerCase()
    const verbs = DOMAIN_VERBS[domain]

    if (!verbs) return []

    return verbs
      .filter((v) => v.startsWith(verbPartial))
      .map((v) => ({ text: `${domain}:${v}`, description: `${domain}:${v}`, kind: 'verb' as const }))
      .slice(0, 6)
  }

  // After first token — suggest flags
  const domain = colonIdx > 0 ? firstToken.slice(0, colonIdx).toLowerCase() : null
  const verb = colonIdx > 0 ? firstToken.slice(colonIdx + 1).toLowerCase() : null

  if (!domain || !verb) return []

  const key = `${domain}:${verb}`
  const actionType = GRAMMAR_MAP.get(key)
  if (!actionType) return []

  const allFlags = getFlagsForAction(actionType as ActionType)
  const usedFlags = new Set(
    tokens
      .filter((t) => t.startsWith('--'))
      .map((t) => t.slice(2)),
  )

  const lastToken = tokens[tokens.length - 1]
  if (lastToken.startsWith('--')) {
    const flagPartial = lastToken.slice(2).toLowerCase()
    return allFlags
      .filter((f) => f.startsWith(flagPartial) && !usedFlags.has(f))
      .map((f) => ({ text: `--${f}`, description: f, kind: 'flag' as const }))
      .slice(0, 6)
  }

  return []
}
