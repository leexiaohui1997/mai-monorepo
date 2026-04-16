import { useChat } from 'ai/react'
import { message as antMessage } from 'antd'
import { useCallback, useState, useImperativeHandle, forwardRef, useEffect } from 'react'

import { chatService } from '../../services/chatService'

import { ChatInput } from './ChatInput'
import { MessageList } from './MessageList'

import type { Message } from 'ai'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
const TEMP_ID_PREFIX = 'temp-'
const isTempId = (id: string) => id.startsWith(TEMP_ID_PREFIX)

export interface ChatSessionHandle {
  stop: () => void
}

interface Props {
  /** 会话 ID */
  conversationId: string
  /** 首次加载的历史消息 */
  initialMessages: Message[]
  /** 是否可见（当前选中） */
  isVisible: boolean
  /** 是否有更多历史消息 */
  hasMore: boolean
  /** 临时会话拿到真实 ID 时回调 */
  onConversationCreated: (tempId: string, realId: string) => void
  /** AI 回复完成时回调（用于刷新会话列表） */
  onFinish: () => void
  /** 用户发送第一条消息时回调（用于更新临时会话标题） */
  onFirstMessage: (convId: string, content: string) => void
}

/** 独立会话实例 — 每个会话拥有自己的 useChat、abortController */
export const ChatSession = forwardRef<ChatSessionHandle, Props>(
  (
    {
      conversationId,
      initialMessages,
      isVisible,
      hasMore: initialHasMore,
      onConversationCreated,
      onFinish,
      onFirstMessage,
    },
    ref,
  ) => {
    const [convId, setConvId] = useState(conversationId)
    const [hasMoreState, setHasMoreState] = useState(initialHasMore)

    // 同步外部 conversationId 变化
    useEffect(() => {
      setConvId(conversationId)
    }, [conversationId])

    const { messages, isLoading, append, setMessages, stop } = useChat({
      api: `${API_BASE}/chat`,
      id: conversationId,
      initialMessages,
      body: { conversationId: isTempId(convId) ? null : convId },
      onError: (err) => antMessage.error(err.message || '聊天请求失败'),
      onResponse: (response) => {
        const newConvId = response.headers.get('X-Conversation-Id')
        if (newConvId && isTempId(convId)) {
          onConversationCreated(convId, newConvId)
          setConvId(newConvId)
        }
      },
      onFinish: () => onFinish(),
    })

    // 暴露 stop 给父组件
    useImperativeHandle(ref, () => ({ stop }), [stop])

    // 发送消息
    const handleSend = useCallback(
      (content: string) => {
        if (isTempId(convId)) {
          onFirstMessage(convId, content)
        }
        append({ role: 'user', content })
      },
      [append, onFirstMessage, convId],
    )

    // 加载更多历史消息
    const handleLoadMore = useCallback(async () => {
      if (!convId || isTempId(convId) || !messages.length) return
      try {
        const res = await chatService.getMessages(convId, messages[0]?.id)
        const older: Message[] = (res.data?.messages ?? []).map((m) => ({
          id: m.id,
          role: m.role as Message['role'],
          content: m.content,
        }))
        setMessages([...older, ...messages])
        setHasMoreState(res.data?.hasMore ?? false)
      } catch {
        antMessage.error('加载更多消息失败')
      }
    }, [convId, messages, setMessages])

    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          hasMore={hasMoreState}
          onLoadMore={handleLoadMore}
        />
        {isVisible && <ChatInput onSend={handleSend} isLoading={isLoading} />}
      </div>
    )
  },
)

ChatSession.displayName = 'ChatSession'
