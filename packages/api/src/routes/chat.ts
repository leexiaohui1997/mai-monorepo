import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { Router } from 'express'

import { createConversation, appendMessage, loadAllMessages } from '../conversations/storage'
import { ProviderManager } from '../providers/manager'
import logger from '../utils/logger'

import type { ChatMessage } from '../conversations/types'
import type { ProviderConfig } from '../providers/types'

const router = Router()
const providerManager = new ProviderManager()

const SYSTEM_PROMPT = '你是一个有帮助的 AI 助手。请用用户使用的语言回复，回答要准确、简洁。'

/** 根据 provider 配置和模型名创建 AI 模型实例 */
function createModel(provider: ProviderConfig, modelName: string) {
  if (provider.type === 'anthropic') {
    const anthropic = createAnthropic({ apiKey: provider.apiKey, baseURL: provider.baseURL })
    return anthropic(modelName)
  }

  const openai = createOpenAI({ apiKey: provider.apiKey, baseURL: provider.baseURL })
  return openai(modelName)
}

// POST /api/chat — 流式聊天
router.post('/', async (req, res) => {
  try {
    const { conversationId, messages } = req.body as {
      conversationId?: string
      messages: Array<{ role: string; content: string }>
    }

    // 获取默认模型及其所属供应商
    const defaultResult = await providerManager.getDefaultModel()
    if (!defaultResult) {
      return res.status(400).json({ success: false, error: '请先配置供应商并设置默认模型' })
    }
    const { provider, model: defaultModel } = defaultResult

    // 取最新一条用户消息
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    if (!lastUserMsg) {
      return res.status(400).json({ success: false, error: '缺少用户消息' })
    }

    // 确定会话 ID（无则创建）
    let convId = conversationId
    if (!convId) {
      const meta = createConversation(lastUserMsg.content)
      convId = meta.id
    }

    // 存储用户消息
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: lastUserMsg.content,
      createdAt: new Date().toISOString(),
    }
    appendMessage(convId, userMessage)

    // 从存储加载全部历史（MVP：不做 token 截断）
    const history = loadAllMessages(convId)
    const aiMessages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ]

    // 流式调用 AI
    const model = createModel(provider, defaultModel.name)
    const capturedConvId = convId

    const result = streamText({
      model,
      messages: aiMessages,
      onFinish: async ({ text }) => {
        // AI 回复完成后持久化
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: text,
          createdAt: new Date().toISOString(),
        }
        appendMessage(capturedConvId, assistantMsg)
        logger.info({ conversationId: capturedConvId }, 'AI 回复已存储')
      },
    })

    // 在响应头中附带 conversationId（前端可能需要）
    res.setHeader('X-Conversation-Id', convId)

    // 返回 AI SDK Data Stream 格式（toDataStreamResponse 返回同步 Response）
    const streamResponse = result.toDataStreamResponse({ sendReasoning: false })

    // 复制 headers
    streamResponse.headers.forEach((value, key) => {
      res.setHeader(key, value)
    })
    res.status(streamResponse.status)

    // 管道传输 body
    const reader = streamResponse.body?.getReader()
    if (!reader) {
      return res.end()
    }

    const pump = (): void => {
      reader.read().then(({ done, value }) => {
        if (done) {
          res.end()
          return
        }
        res.write(value)
        pump()
      })
    }
    pump()
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error({ error: msg }, '聊天请求失败')
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: msg })
    }
  }
})

export default router
