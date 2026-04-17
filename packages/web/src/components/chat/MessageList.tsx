import { Spin } from 'antd'
import { useEffect, useRef, useCallback } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { CitationProvider } from './citation/CitationContext'
import { markdownComponents } from './markdown/registry'
import { ThinkingBlock } from './ThinkingBlock'
import { ToolInvocationBlock } from './tools/ToolInvocationBlock'

import type { SearchSource } from './citation/parseCitations'
import type { UIMessage } from 'ai'

/** addToolResult 的函数签名 */
export type AddToolResultFn = (params: { toolCallId: string; result: unknown }) => void

interface Props {
  messages: UIMessage[]
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
  addToolResult: AddToolResultFn
}

/** 系统消息气泡（居中、特殊样式） */
function SystemBubble({ message }: { message: UIMessage }) {
  return (
    <div className="flex justify-center mb-4">
      <div className="max-w-[80%] rounded-lg px-4 py-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm text-center">
        <span className="mr-1">⚙️</span>
        <span className="font-medium">系统消息：</span>
        <span>{message.content}</span>
      </div>
    </div>
  )
}

/** 从 message parts 中提取搜索结果来源列表 */
function extractSearchSources(parts: UIMessage['parts']): SearchSource[] {
  const sources: SearchSource[] = []

  for (const part of parts) {
    if (part.type !== 'tool-invocation') continue
    if (part.toolInvocation.toolName !== 'webSearch') continue
    if (!('result' in part.toolInvocation)) continue

    const result = part.toolInvocation.result as { success?: boolean; results?: SearchSource[] }
    if (result?.success && result.results) {
      sources.push(...result.results)
    }
  }

  return sources
}

/** 渲染 assistant 消息的 parts（按时间顺序交错展示） */
function AssistantParts({
  message,
  isStreaming,
  addToolResult,
}: {
  message: UIMessage
  isStreaming?: boolean
  addToolResult: AddToolResultFn
}) {
  const { parts } = message

  // 判断是否有文本内容（用于控制 ThinkingBlock 的流式状态）
  const hasTextPart = parts.some((p) => p.type === 'text' && p.text.trim())

  // 提取搜索结果来源，供引用标记使用
  const searchSources = extractSearchSources(parts)

  return (
    <CitationProvider value={searchSources}>
      {parts.map((part, index) => {
        const key = `${message.id}-part-${index}`

        if (part.type === 'reasoning') {
          // 最后一个 reasoning part 且无文本内容时视为流式中
          const isLastReasoning = !parts.slice(index + 1).some((p) => p.type === 'reasoning')
          const streaming = isStreaming && isLastReasoning && !hasTextPart
          return <ThinkingBlock key={key} reasoning={part.reasoning} isStreaming={streaming} />
        }

        if (part.type === 'tool-invocation') {
          return (
            <ToolInvocationBlock
              key={key}
              invocation={part.toolInvocation}
              addToolResult={addToolResult}
            />
          )
        }

        if (part.type === 'text' && part.text.trim()) {
          return (
            <div key={key} className="prose prose-sm max-w-none md-prose">
              <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {part.text}
              </Markdown>
            </div>
          )
        }

        // step-start、source、file 等暂不渲染
        return null
      })}
    </CitationProvider>
  )
}

/** 单条消息气泡 */
function MessageBubble({
  message,
  isStreaming,
  addToolResult,
}: {
  message: UIMessage
  isStreaming?: boolean
  addToolResult: AddToolResultFn
}) {
  const hasParts = message.parts?.length > 0
  const hasContent = !!message.content?.trim()

  if (!hasParts && !hasContent) return null
  if (message.role === 'system') return <SystemBubble message={message} />

  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`rounded-lg px-3 py-2 ${
          isUser ? 'max-w-[80%] bg-blue-500 text-white' : 'w-full text-gray-900'
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap leading-normal">{message.content}</span>
        ) : (
          <AssistantParts
            message={message}
            isStreaming={isStreaming}
            addToolResult={addToolResult}
          />
        )}
      </div>
    </div>
  )
}

/** 消息列表（含上滑加载更多） */
export const MessageList: React.FC<Props> = ({
  messages,
  isLoading,
  hasMore,
  onLoadMore,
  addToolResult,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // IntersectionObserver 监听顶部哨兵
  const topSentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || !hasMore) return
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) onLoadMore()
        },
        { threshold: 0.1 },
      )
      observer.observe(node)
      return () => observer.disconnect()
    },
    [hasMore, onLoadMore],
  )

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* 顶部哨兵 */}
      {hasMore && (
        <div ref={topSentinelRef} className="flex justify-center py-2">
          <Spin size="small" />
        </div>
      )}

      {messages.map((msg, idx) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isStreaming={isLoading && idx === messages.length - 1}
          addToolResult={addToolResult}
        />
      ))}

      {/* 流式加载指示器 */}
      {isLoading && (
        <div className="flex justify-start mb-4">
          <div className="bg-gray-100 rounded-lg px-4 py-3">
            <Spin size="small" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
