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
 * Serper 搜索适配器
 * POST https://google.serper.dev/search
 * 请求头: X-API-KEY
 * 请求体: { q, num }
 * 返回: { organic: [{ title, link, snippet }] }
 */
export async function searchSerper(
  baseURL: string,
  apiKey: string,
  query: string,
  maxResults: number,
): Promise<SearchResult[]> {
  const { data } = await axios.post(
    `${baseURL}/search`,
    { q: query, num: maxResults },
    { timeout: TIMEOUT, headers: { 'X-API-KEY': apiKey } },
  )

  const results: Array<{ title: string; link: string; snippet: string }> = data.organic ?? []
  return results.map((r) => ({
    title: r.title,
    url: r.link,
    snippet: truncate(r.snippet ?? ''),
  }))
}
