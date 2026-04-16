import { message as antMessage } from 'antd'
import { useState, useEffect, useCallback, useRef } from 'react'

import { ChatSession } from '../components/chat/ChatSession'
import { ConversationList } from '../components/chat/ConversationList'
import { chatService } from '../services/chatService'

import type { ChatSessionHandle } from '../components/chat/ChatSession'
import type { ConversationMeta } from '../services/chatService'
import type { Message } from 'ai'

const TEMP_ID_PREFIX = 'temp-'
const isTempId = (id: string | null) => id?.startsWith(TEMP_ID_PREFIX)

/** 活跃会话实例的初始化数据 */
interface SessionEntry {
  initialMessages: Message[]
  hasMore: boolean
}

/** 聊天主页面 — 多实例架构 */
export const ChatPage: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationMeta[]>([])
  const [currentConvId, setCurrentConvId] = useState<string | null>(null)

  // 活跃会话池：只有用户交互过的会话才会创建实例
  const [activeSessions, setActiveSessions] = useState<Map<string, SessionEntry>>(new Map())

  // 每个 ChatSession 的 ref，用于调用 stop()
  const sessionRefs = useRef<Map<string, ChatSessionHandle>>(new Map())

  // 加载会话列表
  const refreshConversations = useCallback(async () => {
    try {
      const res = await chatService.listConversations()
      const list = res.data ?? []
      setConversations(list)
      return list
    } catch {
      antMessage.error('加载会话列表失败')
      return []
    }
  }, [])

  // 将会话加入活跃池
  const activateSession = useCallback((id: string, msgs: Message[], hasMore: boolean) => {
    setActiveSessions((prev) => {
      if (prev.has(id)) return prev
      const next = new Map(prev)
      next.set(id, { initialMessages: msgs, hasMore })
      return next
    })
  }, [])

  // 切换会话
  const handleSelectConversation = useCallback(
    async (id: string) => {
      // 切走时清理临时会话（非目标会话）
      if (!isTempId(id)) {
        setConversations((prev) => prev.filter((c) => !isTempId(c.id)))
        setActiveSessions((prev) => {
          const tempKeys = [...prev.keys()].filter((k) => k.startsWith(TEMP_ID_PREFIX))
          if (!tempKeys.length) return prev
          const next = new Map(prev)
          tempKeys.forEach((k) => next.delete(k))
          return next
        })
      }

      // 已在活跃池中，直接切换
      if (activeSessions.has(id)) {
        setCurrentConvId(id)
        return
      }

      // 临时会话无需拉历史
      if (isTempId(id)) {
        activateSession(id, [], false)
        setCurrentConvId(id)
        return
      }

      // 首次进入：拉取历史消息后加入活跃池
      try {
        const res = await chatService.getMessages(id)
        const msgs: Message[] = (res.data?.messages ?? []).map((m) => ({
          id: m.id,
          role: m.role as Message['role'],
          content: m.content,
        }))
        activateSession(id, msgs, res.data?.hasMore ?? false)
        setCurrentConvId(id)
      } catch {
        antMessage.error('加载消息失败')
      }
    },
    [activeSessions, activateSession],
  )

  // 进入页面时加载会话列表并默认选中最近的会话
  useEffect(() => {
    const init = async () => {
      try {
        const res = await chatService.listConversations()
        const list = res.data ?? []
        setConversations(list)
        if (list.length > 0) {
          const first = list[0]
          const msgRes = await chatService.getMessages(first.id)
          const msgs: Message[] = (msgRes.data?.messages ?? []).map((m) => ({
            id: m.id,
            role: m.role as Message['role'],
            content: m.content,
          }))
          activateSession(first.id, msgs, msgRes.data?.hasMore ?? false)
          setCurrentConvId(first.id)
        }
      } catch {
        antMessage.error('初始化失败')
      }
    }
    init()
  }, [activateSession])

  // 新建会话
  const handleNewConversation = useCallback(() => {
    const tempId = `${TEMP_ID_PREFIX}${Date.now()}`
    const now = new Date().toISOString()
    const tempConv: ConversationMeta = {
      id: tempId,
      title: '新会话',
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
      shardCount: 0,
      currentShard: '',
    }
    setConversations((prev) => [tempConv, ...prev])
    activateSession(tempId, [], false)
    setCurrentConvId(tempId)
  }, [activateSession])

  // 临时会话拿到真实 ID 时：迁移活跃池 + 更新会话列表
  const handleConversationCreated = useCallback((tempId: string, realId: string) => {
    setCurrentConvId((prev) => (prev === tempId ? realId : prev))
    setConversations((prev) => prev.map((c) => (c.id === tempId ? { ...c, id: realId } : c)))
    setActiveSessions((prev) => {
      const entry = prev.get(tempId)
      if (!entry) return prev
      const next = new Map(prev)
      next.delete(tempId)
      next.set(realId, entry)
      return next
    })
    // 迁移 ref
    const handle = sessionRefs.current.get(tempId)
    if (handle) {
      sessionRefs.current.delete(tempId)
      sessionRefs.current.set(realId, handle)
    }
  }, [])

  // 用户发送第一条消息时更新临时会话标题
  const handleFirstMessage = useCallback((convId: string, content: string) => {
    const title = content.length > 30 ? `${content.slice(0, 30)}...` : content
    setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, title } : c)))
  }, [])

  // AI 回复完成时刷新会话列表
  const handleFinish = useCallback(() => {
    refreshConversations()
  }, [refreshConversations])

  // 删除会话
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await chatService.deleteConversation(id)
        // 从活跃池移除
        setActiveSessions((prev) => {
          const next = new Map(prev)
          next.delete(id)
          return next
        })
        sessionRefs.current.delete(id)
        const list = await refreshConversations()
        if (id === currentConvId) {
          if (list.length > 0) handleSelectConversation(list[0].id)
          else handleNewConversation()
        }
        antMessage.success('会话已删除')
      } catch {
        antMessage.error('删除失败')
      }
    },
    [currentConvId, handleNewConversation, handleSelectConversation, refreshConversations],
  )

  // 重命名会话
  const handleRename = useCallback(
    async (id: string, title: string) => {
      try {
        await chatService.updateTitle(id, title)
        await refreshConversations()
      } catch {
        antMessage.error('重命名失败')
      }
    },
    [refreshConversations],
  )

  return (
    <div className="flex h-full overflow-hidden">
      <ConversationList
        conversations={conversations}
        currentId={currentConvId}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
        onDelete={handleDelete}
        onRename={handleRename}
      />

      {/* 多实例容器：每个活跃会话一个 ChatSession，display 控制可见性 */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {[...activeSessions.entries()].map(([id, entry]) => (
          <div
            key={id}
            className="absolute inset-0 flex flex-col"
            style={{ display: id === currentConvId ? 'flex' : 'none' }}
          >
            <ChatSession
              ref={(handle) => {
                if (handle) sessionRefs.current.set(id, handle)
                else sessionRefs.current.delete(id)
              }}
              conversationId={id}
              initialMessages={entry.initialMessages}
              isVisible={id === currentConvId}
              hasMore={entry.hasMore}
              onConversationCreated={handleConversationCreated}
              onFinish={handleFinish}
              onFirstMessage={handleFirstMessage}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
