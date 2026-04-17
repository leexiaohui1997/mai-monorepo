/** 聊天消息 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  /** AI 思考过程（仅 assistant 消息可能存在） */
  reasoning?: string
  createdAt: string
}

/** 会话元信息（meta.json） */
export interface ConversationMeta {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
  shardCount: number
  currentShard: string
}

/** 分页消息响应 */
export interface PaginatedMessages {
  messages: ChatMessage[]
  hasMore: boolean
}

/** 分片阈值常量 */
export const SHARD_MAX_LINES = 100
export const SHARD_MAX_BYTES = 512 * 1024
