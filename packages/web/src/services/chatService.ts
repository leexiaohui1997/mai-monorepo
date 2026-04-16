import api from './api'

import type {
  ConversationMeta,
  ChatMessage,
  PaginatedMessages,
} from '../../../api/src/conversations/types'

export type { ConversationMeta, ChatMessage, PaginatedMessages }

export const chatService = {
  /** 获取会话列表 */
  listConversations: () =>
    api.get<{ data: ConversationMeta[] }>('/conversations').then((res) => res.data),

  /** 创建会话 */
  createConversation: (firstMessage: string) =>
    api
      .post<{ data: ConversationMeta }>('/conversations', { firstMessage })
      .then((res) => res.data),

  /** 获取会话消息（游标分页） */
  getMessages: (id: string, before?: string, limit = 50) => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (before) params.set('before', before)
    return api
      .get<{ data: PaginatedMessages }>(`/conversations/${id}/messages?${params}`)
      .then((res) => res.data)
  },

  /** 更新会话标题 */
  updateTitle: (id: string, title: string) =>
    api.put<{ data: ConversationMeta }>(`/conversations/${id}`, { title }).then((res) => res.data),

  /** 删除会话 */
  deleteConversation: (id: string) => api.delete(`/conversations/${id}`).then((res) => res.data),
}
