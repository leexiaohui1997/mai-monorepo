import fs from 'fs'
import path from 'path'

import { getConversationsDir } from '../config/paths'
import logger from '../utils/logger'

import { SHARD_MAX_LINES, SHARD_MAX_BYTES } from './types'

import type { ChatMessage, ConversationMeta, MessagePart, PaginatedMessages } from './types'

// ─── 辅助函数 ───

/** 生成分片文件名 */
function shardName(index: number): string {
  return `messages-${String(index).padStart(4, '0')}.jsonl`
}

/** 获取会话目录路径 */
function convDir(id: string): string {
  return path.join(getConversationsDir(), id)
}

/** 读取 meta.json */
function readMeta(id: string): ConversationMeta | null {
  const metaPath = path.join(convDir(id), 'meta.json')
  if (!fs.existsSync(metaPath)) return null
  return JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
}

/** 写入 meta.json */
function writeMeta(id: string, meta: ConversationMeta): void {
  const dir = convDir(id)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8')
}

/** 为缺少 parts 的旧 assistant 消息补建 */
function ensureParts(msg: ChatMessage): ChatMessage {
  if (msg.parts || msg.role !== 'assistant') return msg

  const parts: MessagePart[] = []
  if (msg.reasoning) {
    parts.push({ type: 'reasoning', reasoning: msg.reasoning })
  }
  if (msg.toolInvocations) {
    for (const inv of msg.toolInvocations) {
      parts.push({ type: 'tool-invocation', toolInvocation: inv })
    }
  }
  if (msg.content?.trim()) {
    parts.push({ type: 'text', text: msg.content })
  }
  return parts.length > 0 ? { ...msg, parts } : msg
}

/** 读取分片文件的所有消息 */
function readShard(id: string, shard: string): ChatMessage[] {
  const filePath = path.join(convDir(id), shard)
  if (!fs.existsSync(filePath)) return []
  const text = fs.readFileSync(filePath, 'utf-8').trim()
  if (!text) return []
  return text.split('\n').map((line) => ensureParts(JSON.parse(line)))
}

/** 获取分片文件的行数和字节数 */
function shardStats(id: string, shard: string): { lines: number; bytes: number } {
  const filePath = path.join(convDir(id), shard)
  if (!fs.existsSync(filePath)) return { lines: 0, bytes: 0 }
  const stat = fs.statSync(filePath)
  const text = fs.readFileSync(filePath, 'utf-8').trim()
  const lines = text ? text.split('\n').length : 0
  return { lines, bytes: stat.size }
}

// ─── 会话 CRUD ───

/** 创建会话（首条消息触发） */
export function createConversation(firstMessage: string): ConversationMeta {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const title = firstMessage.length > 30 ? firstMessage.slice(0, 30) + '...' : firstMessage

  const meta: ConversationMeta = {
    id,
    title,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
    shardCount: 1,
    currentShard: shardName(1),
  }

  writeMeta(id, meta)
  // 创建空的第一个分片文件
  fs.writeFileSync(path.join(convDir(id), shardName(1)), '', 'utf-8')
  logger.info({ id, title }, '会话已创建')
  return meta
}

/** 列出所有会话，按 updatedAt 降序 */
export function listConversations(): ConversationMeta[] {
  const baseDir = getConversationsDir()
  if (!fs.existsSync(baseDir)) return []

  const entries = fs.readdirSync(baseDir, { withFileTypes: true })
  const metas: ConversationMeta[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const meta = readMeta(entry.name)
    if (meta) metas.push(meta)
  }

  return metas.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/** 获取单个会话元信息 */
export function getConversation(id: string): ConversationMeta | null {
  return readMeta(id)
}

/** 更新会话标题 */
export function updateConversation(id: string, title: string): ConversationMeta | null {
  const meta = readMeta(id)
  if (!meta) return null
  meta.title = title
  writeMeta(id, meta)
  return meta
}

/** 删除会话（整个文件夹） */
export function deleteConversation(id: string): boolean {
  const dir = convDir(id)
  if (!fs.existsSync(dir)) return false
  fs.rmSync(dir, { recursive: true, force: true })
  logger.info({ id }, '会话已删除')
  return true
}

// ─── 消息分片写入 ───

/** 追加消息到当前分片，必要时触发新分片 */
export function appendMessage(id: string, message: ChatMessage): void {
  const meta = readMeta(id)
  if (!meta) throw new Error(`会话 ${id} 不存在`)

  const stats = shardStats(id, meta.currentShard)
  const needNewShard = stats.lines > SHARD_MAX_LINES || stats.bytes > SHARD_MAX_BYTES

  if (needNewShard) {
    meta.shardCount += 1
    meta.currentShard = shardName(meta.shardCount)
    // 创建新分片文件
    fs.writeFileSync(path.join(convDir(id), meta.currentShard), '', 'utf-8')
  }

  const line = JSON.stringify(message) + '\n'
  fs.appendFileSync(path.join(convDir(id), meta.currentShard), line, 'utf-8')

  meta.messageCount += 1
  meta.updatedAt = new Date().toISOString()
  writeMeta(id, meta)
}

// ─── 加载全部消息（MVP：发给 AI 用） ───

/** 加载会话的全部消息 */
export function loadAllMessages(id: string): ChatMessage[] {
  const meta = readMeta(id)
  if (!meta) return []

  const all: ChatMessage[] = []
  for (let i = 1; i <= meta.shardCount; i++) {
    all.push(...readShard(id, shardName(i)))
  }
  return all
}

// ─── 消息游标分页读取 ───

/** 从最新消息往前分页读取 */
export function getMessages(id: string, before?: string, limit = 50): PaginatedMessages {
  const meta = readMeta(id)
  if (!meta) return { messages: [], hasMore: false }

  // 从最新分片往前收集所有消息
  const allMessages = collectMessagesReverse(id, meta)

  // 无游标：返回最新 limit 条
  if (!before) {
    const sliced = allMessages.slice(0, limit)
    return { messages: sliced.reverse(), hasMore: allMessages.length > limit }
  }

  // 有游标：找到 before 位置，返回其之前的 limit 条
  const idx = allMessages.findIndex((m) => m.id === before)
  if (idx === -1) {
    return { messages: [], hasMore: false }
  }

  const afterCursor = allMessages.slice(idx + 1, idx + 1 + limit)
  const hasMore = idx + 1 + limit < allMessages.length
  return { messages: afterCursor.reverse(), hasMore }
}

/** 从最新分片往前收集消息（倒序：最新在前） */
function collectMessagesReverse(id: string, meta: ConversationMeta): ChatMessage[] {
  const result: ChatMessage[] = []
  for (let i = meta.shardCount; i >= 1; i--) {
    const msgs = readShard(id, shardName(i))
    // 倒序追加
    for (let j = msgs.length - 1; j >= 0; j--) {
      result.push(msgs[j])
    }
  }
  return result
}
