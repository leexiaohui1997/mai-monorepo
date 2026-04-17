import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { streamText } from 'ai'
import { Router } from 'express'

import { createConversation, appendMessage, loadAllMessages } from '../conversations/storage'
import { ProviderManager } from '../providers/manager'
import { toolRegistry } from '../tools/registry'
import logger from '../utils/logger'

import type { ChatMessage, MessagePart } from '../conversations/types'
import type { ProviderConfig } from '../providers/types'

const router = Router()
const providerManager = new ProviderManager()

const SYSTEM_PROMPT = '你是一个有帮助的 AI 助手。请用用户使用的语言回复，回答要准确、简洁。'

/** 将 SSE 流中的 "reasoning" 字段名映射为 "reasoning_content"（Ollama 兼容） */
async function reasoningMappedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init)
  if (!response.body) return response

  const reader = response.body.getReader()
  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read()
      if (done) return controller.close()

      const text = new TextDecoder().decode(value)
      const mapped = text.replaceAll('"reasoning":', '"reasoning_content":')
      controller.enqueue(new TextEncoder().encode(mapped))
    },
  })

  return new Response(stream, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}

/** 根据 provider 配置和模型名创建 AI 模型实例 */
function createModel(provider: ProviderConfig, modelName: string) {
  if (provider.type === 'anthropic') {
    const anthropic = createAnthropic({ apiKey: provider.apiKey, baseURL: provider.baseURL })
    return anthropic(modelName)
  }

  const openai = createOpenAICompatible({
    name: provider.id,
    baseURL: provider.baseURL ?? 'https://api.openai.com/v1',
    apiKey: provider.apiKey,
    fetch: reasoningMappedFetch as typeof globalThis.fetch,
  })
  return openai(modelName)
}

/** 解析前端指定的模型，若未指定则使用默认模型 */
async function resolveModel(
  providerId?: string,
  modelId?: string,
): Promise<{ provider: ProviderConfig; modelName: string } | null> {
  // 前端指定了模型
  if (providerId && modelId) {
    const provider = (await providerManager.listProviders()).find((p) => p.id === providerId)
    const model = provider?.models?.find((m) => m.id === modelId)
    if (provider && model) return { provider, modelName: model.name }
    logger.warn({ providerId, modelId }, '前端指定的模型不存在，回退到默认模型')
  }

  // 使用默认模型
  const result = await providerManager.getDefaultModel()
  if (!result) return null
  return { provider: result.provider, modelName: result.model.name }
}

interface StepLike {
  reasoning: string | undefined
  text: string
  toolCalls: Array<{ toolCallId: string; toolName: string; args: unknown }>
  toolResults: Array<{ toolCallId: string; result: unknown }>
}

interface CollectedInvocation {
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
  state: 'result'
  result?: unknown
}

/** 从 AI SDK steps 按时间顺序构建 parts 和 toolInvocations */
function buildPartsFromSteps(steps: StepLike[]) {
  const parts: MessagePart[] = []
  const toolInvocations: CollectedInvocation[] = []

  for (const step of steps) {
    if (step.reasoning) {
      parts.push({ type: 'reasoning', reasoning: step.reasoning })
    }
    for (const call of step.toolCalls) {
      const matched = step.toolResults?.find((r) => r.toolCallId === call.toolCallId)
      const inv: CollectedInvocation = {
        toolCallId: call.toolCallId,
        toolName: call.toolName,
        args: call.args as Record<string, unknown>,
        state: 'result',
        result: matched?.result,
      }
      toolInvocations.push(inv)
      parts.push({ type: 'tool-invocation', toolInvocation: inv })
    }
    if (step.text?.trim()) {
      parts.push({ type: 'text', text: step.text })
    }
  }

  return { parts, toolInvocations }
}

// POST /api/chat — 流式聊天
router.post('/', async (req, res) => {
  try {
    const { conversationId, messages, providerId, modelId } = req.body as {
      conversationId?: string
      messages: Array<{ role: string; content: string }>
      providerId?: string
      modelId?: string
    }

    // 解析模型（前端指定 > 默认模型）
    const resolved = await resolveModel(providerId, modelId)
    if (!resolved) {
      return res.status(400).json({ success: false, error: '请先配置供应商并设置默认模型' })
    }
    const { provider, modelName } = resolved

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
    const model = createModel(provider, modelName)
    const capturedConvId = convId

    const result = streamText({
      model,
      messages: aiMessages,
      tools: toolRegistry,
      maxSteps: 5,
      onFinish: async ({ text, reasoning, steps }) => {
        // 打印原始返回内容，用于调试
        logger.info({ reasoning: reasoning || '(空)', text: text.slice(0, 200) }, 'AI 原始返回内容')

        // 从所有步骤中按时间顺序构建 parts 和 toolInvocations
        const { parts, toolInvocations } = buildPartsFromSteps(steps)

        // 打印工具调用日志
        for (const inv of toolInvocations) {
          logger.info(
            { toolName: inv.toolName, args: inv.args, result: inv.result },
            '工具调用: %s',
            inv.toolName,
          )
        }

        // AI 回复完成后持久化
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: text,
          reasoning: reasoning || undefined,
          toolInvocations: toolInvocations.length > 0 ? toolInvocations : undefined,
          parts: parts.length > 0 ? parts : undefined,
          createdAt: new Date().toISOString(),
        }
        appendMessage(capturedConvId, assistantMsg)
        logger.info({ conversationId: capturedConvId }, 'AI 回复已存储')
      },
    })

    // 在响应头中附带 conversationId（前端可能需要）
    res.setHeader('X-Conversation-Id', convId)

    // 返回 AI SDK Data Stream 格式（toDataStreamResponse 返回同步 Response）
    const streamResponse = result.toDataStreamResponse({ sendReasoning: true })

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
