import { searchSerper } from './serper'
import { searchTavily } from './tavily'

import type { SearchProviderConfig, SearchResult } from '../types'

/**
 * 统一搜索入口 — 根据渠道类型分发到对应适配器
 */
export async function search(
  provider: SearchProviderConfig,
  query: string,
  maxResults: number,
): Promise<SearchResult[]> {
  const { type, baseURL, apiKey } = provider

  if (type === 'tavily') {
    return searchTavily(baseURL, apiKey, query, maxResults)
  }
  return searchSerper(baseURL, apiKey, query, maxResults)
}
