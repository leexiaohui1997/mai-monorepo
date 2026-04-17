import axios from 'axios'

import type { SearchResult } from '../types'

const TIMEOUT = 10_000
const MAX_SNIPPET_LENGTH = 500

/** 截断摘要文本 */
function truncate(text: string): string {
  if (text.length <= MAX_SNIPPET_LENGTH) return text
  return text.slice(0, MAX_SNIPPET_LENGTH) + '...'
}

/**
 * Tavily 搜索适配器
 * POST https://api.tavily.com/search
 * 请求体: { query, max_results, api_key }
 * 返回: { results: [{ title, url, content }] }
 */
export async function searchTavily(
  baseURL: string,
  apiKey: string,
  query: string,
  maxResults: number,
): Promise<SearchResult[]> {
  const { data } = await axios.post(
    `${baseURL}/search`,
    { query, max_results: maxResults, api_key: apiKey },
    { timeout: TIMEOUT },
  )

  const results: Array<{ title: string; url: string; content: string }> = data.results ?? []
  return results.map((r) => ({
    title: r.title,
    url: r.url,
    snippet: truncate(r.content ?? ''),
  }))
}
