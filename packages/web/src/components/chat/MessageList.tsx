import { Spin } from 'antd'
import { useEffect, useRef, useCallback } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { markdownComponents } from './markdown/registry'
import { ThinkingBlock } from './ThinkingBlock'

import type { Message } from 'ai'

interface Props {
  messages: Message[]
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
}

/** 系统消息气泡（居中、特殊样式） */
function SystemBubble({ message }: { message: Message }) {
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

/** 单条消息气泡 */
function MessageBubble({ message, isStreaming }: { message: Message; isStreaming?: boolean }) {
  const reasoning = message.reasoning
  const hasContent = !!message.content?.trim()
  const hasReasoning = !!reasoning

  // 跳过既无内容也无思考的消息
  if (!hasContent && !hasReasoning) return null

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
          <>
            {hasReasoning && (
              <ThinkingBlock reasoning={reasoning} isStreaming={isStreaming && !hasContent} />
            )}
            <div className="prose prose-sm max-w-none md-prose">
              <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {message.content}
              </Markdown>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** 消息列表（含上滑加载更多） */
export const MessageList: React.FC<Props> = ({ messages, isLoading, hasMore, onLoadMore }) => {
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
