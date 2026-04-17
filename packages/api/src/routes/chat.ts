import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { streamText, convertToCoreMessages } from 'ai'
import { Router } from 'express'

import { createConversation, appendMessage } from '../conversations/storage'
import { ProviderManager } from '../providers/manager'
import { toolRegistry, getToolMeta } from '../tools/registry'
import logger from '../utils/logger'

import type { ChatMessage, MessagePart } from '../conversations/types'
import type { ProviderConfig } from '../providers/types'
import type { CoreTool } from 'ai'

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

/** 构建传给 streamText 的工具集：需确认的工具剥离 execute */
function buildStreamTools(): Record<string, CoreTool> {
  const tools: Record<string, CoreTool> = {}
  for (const [name, def] of Object.entries(toolRegistry)) {
    const meta = getToolMeta(name)
    if (meta.confirmation === 'always') {
      // 仅保留 description + parameters，不提供 execute
      const { execute: _exec, ...rest } = def as CoreTool & { execute?: unknown }
      tools[name] = rest as CoreTool
    } else {
      tools[name] = def
    }
  }
  return tools
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
        result: matched ? matched.result : { expired: true, reason: '工具调用未完成（会话中断）' },
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

/** 检测 steps 中是否存在未完成的工具调用（有 call 无 result） */
function checkPendingToolCalls(steps: StepLike[]): boolean {
  return steps.some((step) =>
    step.toolCalls.some((call) => !step.toolResults?.find((r) => r.toolCallId === call.toolCallId)),
  )
}

/** 将前一次的 parts / toolInvocations 合并到当前结果前面，并拼接 reasoning */
function mergePreviousParts(
  parts: MessagePart[],
  toolInvocations: CollectedInvocation[],
  previousParts: MessagePart[],
  previousToolInvocations: CollectedInvocation[],
  currentReasoning: string | undefined,
): string | undefined {
  if (previousParts.length > 0) {
    parts.unshift(...previousParts)
    toolInvocations.unshift(...previousToolInvocations)
  }
  const prevReasonings = previousParts
    .filter(
      (p): p is MessagePart & { reasoning: string } => p.type === 'reasoning' && !!p.reasoning,
    )
    .map((p) => p.reasoning)
  return [...prevReasonings, currentReasoning].filter(Boolean).join('\n\n') || undefined
}

/** 构建 assistant 消息并持久化 */
function persistAssistantMsg(
  convId: string,
  text: string,
  reasoning: string | undefined,
  toolInvocations: CollectedInvocation[],
  parts: MessagePart[],
): void {
  for (const inv of toolInvocations) {
    logger.info(
      { toolName: inv.toolName, args: inv.args, result: inv.result },
      '工具调用: %s',
      inv.toolName,
    )
  }
  const assistantMsg: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: text,
    reasoning,
    toolInvocations: toolInvocations.length > 0 ? toolInvocations : undefined,
    parts: parts.length > 0 ? parts : undefined,
    createdAt: new Date().toISOString(),
  }
  appendMessage(convId, assistantMsg)
  logger.info({ conversationId: convId }, 'AI 回复已存储')
}

/** 解析请求参数，准备会话上下文 */
async function prepareChatContext(req: { body: unknown }) {
  const { conversationId, messages, providerId, modelId } = req.body as {
    conversationId?: string
    messages: Array<{ role: string; content: string; toolInvocations?: unknown[] }>
    providerId?: string
    modelId?: string
  }

  const resolved = await resolveModel(providerId, modelId)
  if (!resolved) return null

  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
  if (!lastUserMsg) return null

  let convId = conversationId
  if (!convId) {
    const meta = createConversation(lastUserMsg.content)
    convId = meta.id
  }

  const isToolResultResume = messages.some(
    (m) => m.role === 'assistant' && m.toolInvocations?.length,
  )

  if (!isToolResultResume) {
    appendMessage(convId, {
      id: crypto.randomUUID(),
      role: 'user',
      content: lastUserMsg.content,
      createdAt: new Date().toISOString(),
    })
  }

  // 从前端 messages 中提取前一次 assistant 消息的完整 parts（含 reasoning + tool-invocation）
  type FrontendMessage = (typeof messages)[number] & { parts?: MessagePart[] }
  const previousParts: MessagePart[] = isToolResultResume
    ? (messages as FrontendMessage[])
        .filter((m) => m.role === 'assistant' && m.toolInvocations?.length)
        .flatMap((m) => m.parts ?? [])
    : []
  const previousToolInvocations: CollectedInvocation[] = isToolResultResume
    ? (messages
        .filter((m) => m.role === 'assistant' && m.toolInvocations?.length)
        .flatMap((m) => m.toolInvocations ?? []) as CollectedInvocation[])
    : []

  const coreMessages = convertToCoreMessages(
    messages as Parameters<typeof convertToCoreMessages>[0],
  )

  return {
    convId,
    provider: resolved.provider,
    modelName: resolved.modelName,
    aiMessages: [{ role: 'system' as const, content: SYSTEM_PROMPT }, ...coreMessages],
    previousParts,
    previousToolInvocations,
  }
}

// POST /api/chat — 流式聊天
router.post('/', async (req, res) => {
  try {
    const ctx = await prepareChatContext(req)
    if (!ctx) {
      return res.status(400).json({ success: false, error: '请先配置供应商并设置默认模型' })
    }
    const { convId, provider, modelName, aiMessages, previousParts, previousToolInvocations } = ctx
    const capturedConvId = convId

    const model = createModel(provider, modelName)
    const result = streamText({
      model,
      messages: aiMessages,
      tools: buildStreamTools(),
      maxSteps: 5,
      onFinish: async ({ text, reasoning, steps }) => {
        logger.info({ reasoning: reasoning || '(空)', text: text.slice(0, 200) }, 'AI 原始返回内容')

        const stepsTyped = steps as StepLike[]
        if (checkPendingToolCalls(stepsTyped)) {
          logger.info(
            { conversationId: capturedConvId },
            '存在待确认的工具调用，跳过存储（等待续传请求）',
          )
          return
        }

        const { parts, toolInvocations } = buildPartsFromSteps(steps)
        const fullReasoning = mergePreviousParts(
          parts,
          toolInvocations,
          previousParts,
          previousToolInvocations,
          reasoning,
        )

        persistAssistantMsg(capturedConvId, text, fullReasoning, toolInvocations, parts)
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
