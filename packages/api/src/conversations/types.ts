/** 工具调用信息 */
export interface ToolInvocation {
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
  state: 'call' | 'result'
  result?: unknown
}

/** 消息 parts — 按时间顺序记录消息的各个组成部分 */
export type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'reasoning'; reasoning: string }
  | { type: 'tool-invocation'; toolInvocation: ToolInvocation }

/** 聊天消息 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  /** AI 思考过程（仅 assistant 消息可能存在） */
  reasoning?: string
  /** 工具调用信息（仅 assistant 消息可能存在） */
  toolInvocations?: ToolInvocation[]
  /** 按时间顺序排列的消息组成部分（优先使用，fallback 到 reasoning + toolInvocations + content） */
  parts?: MessagePart[]
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
