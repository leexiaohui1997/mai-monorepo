import { createContext, useContext } from 'react'

import type { SearchSource } from './parseCitations'

/** 引用上下文：向 Markdown 渲染管道传递搜索来源 */
const CitationContext = createContext<SearchSource[]>([])

export const CitationProvider = CitationContext.Provider

export function useSearchSources(): SearchSource[] {
  return useContext(CitationContext)
}
