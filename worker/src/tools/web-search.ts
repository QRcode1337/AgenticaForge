/**
 * Web Search Tool — Brave Search API
 *
 * Provides web search capability to agents via the Brave Search API.
 */

const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search'

export interface SearchResult {
  title: string
  url: string
  snippet: string
}

export async function webSearch(
  query: string,
  count: number = 5,
): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) {
    throw new Error('BRAVE_SEARCH_API_KEY is not configured')
  }

  const params = new URLSearchParams({ q: query, count: String(count) })

  const response = await fetch(`${BRAVE_API_URL}?${params}`, {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
  })

  if (!response.ok) {
    throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as {
    web?: { results?: Array<{ title?: string; url?: string; description?: string }> }
  }

  const results = data.web?.results ?? []

  return results.map((r) => ({
    title: r.title ?? '',
    url: r.url ?? '',
    snippet: r.description ?? '',
  }))
}
