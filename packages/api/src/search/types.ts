/** 搜索服务渠道类型 */
export type SearchProviderType = 'tavily' | 'serper'

/** 搜索服务配置 */
export interface SearchProviderConfig {
  id: string
  type: SearchProviderType
  name: string
  apiKey: string
  baseURL: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

/** 创建搜索服务的输入 */
export interface CreateSearchProviderInput {
  type: SearchProviderType
  apiKey: string
}

/** 更新搜索服务的输入 */
export interface UpdateSearchProviderInput {
  apiKey?: string
  enabled?: boolean
}

/** 统一的搜索结果条目 */
export interface SearchResult {
  title: string
  snippet: string
  url: string
}

/** 搜索工具的返回结构 */
export interface SearchResponse {
  success: boolean
  results?: SearchResult[]
  error?: string
}

/** 渠道默认配置 */
export const SEARCH_PROVIDER_DEFAULTS: Record<
  SearchProviderType,
  { name: string; baseURL: string }
> = {
  tavily: { name: 'Tavily', baseURL: 'https://api.tavily.com' },
  serper: { name: 'Serper', baseURL: 'https://google.serper.dev' },
}
