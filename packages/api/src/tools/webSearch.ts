import { tool } from 'ai'
import { z } from 'zod'

import { search } from '../search/adapters'
import { SearchProviderStorage } from '../search/storage'
import logger from '../utils/logger'

import type { SearchResponse } from '../search/types'

const storage = new SearchProviderStorage()

/**
 * 联网搜索工具
 *
 * AI 可通过此工具搜索互联网获取实时信息。
 * 自动读取已启用的搜索服务配置，向对应 API 发送请求。
 */
export const webSearchTool = tool({
  description: '搜索互联网获取实时信息。当需要查询最新新闻、技术文档、实时数据等信息时使用此工具。',
  parameters: z.object({
    query: z.string().describe('搜索关键词'),
    maxResults: z.number().optional().default(5).describe('最大结果数，默认 5'),
  }),
  execute: async ({ query, maxResults }): Promise<SearchResponse> => {
    const provider = await storage.findFirstEnabled()
    if (!provider) {
      return { success: false, error: '请先在设置页面配置搜索服务' }
    }

    try {
      logger.info({ query, maxResults, provider: provider.name }, '执行联网搜索')
      const results = await search(provider, query, maxResults)
      return { success: true, results }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.error({ error: msg, query }, '联网搜索失败')
      return { success: false, error: `搜索失败: ${msg}` }
    }
  },
})
