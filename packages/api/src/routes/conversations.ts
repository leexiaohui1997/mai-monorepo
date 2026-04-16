import { Router } from 'express'

import {
  listConversations,
  createConversation,
  getConversation,
  updateConversation,
  deleteConversation,
  getMessages,
} from '../conversations/storage'
import logger from '../utils/logger'

const router = Router()

// GET /api/conversations — 列出所有会话
router.get('/', (_req, res) => {
  try {
    const conversations = listConversations()
    res.json({ success: true, data: conversations })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error({ error: msg }, '获取会话列表失败')
    res.status(500).json({ success: false, error: msg })
  }
})

// POST /api/conversations — 创建新会话
router.post('/', (req, res) => {
  try {
    const { firstMessage } = req.body as { firstMessage: string }
    if (!firstMessage) {
      return res.status(400).json({ success: false, error: '首条消息不能为空' })
    }
    const meta = createConversation(firstMessage)
    res.status(201).json({ success: true, data: meta })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error({ error: msg }, '创建会话失败')
    res.status(500).json({ success: false, error: msg })
  }
})

// GET /api/conversations/:id/messages — 分页获取消息
router.get('/:id/messages', (req, res) => {
  try {
    const { id } = req.params
    const before = req.query.before as string | undefined
    const limit = parseInt(req.query.limit as string) || 50

    const meta = getConversation(id)
    if (!meta) {
      return res.status(404).json({ success: false, error: '会话不存在' })
    }

    const result = getMessages(id, before, limit)
    res.json({ success: true, data: result })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error({ error: msg, id: req.params.id }, '获取消息失败')
    res.status(500).json({ success: false, error: msg })
  }
})

// PUT /api/conversations/:id — 更新会话标题
router.put('/:id', (req, res) => {
  try {
    const { title } = req.body as { title: string }
    const meta = updateConversation(req.params.id, title)
    if (!meta) {
      return res.status(404).json({ success: false, error: '会话不存在' })
    }
    res.json({ success: true, data: meta })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error({ error: msg, id: req.params.id }, '更新会话失败')
    res.status(500).json({ success: false, error: msg })
  }
})

// DELETE /api/conversations/:id — 删除会话
router.delete('/:id', (req, res) => {
  try {
    const deleted = deleteConversation(req.params.id)
    if (!deleted) {
      return res.status(404).json({ success: false, error: '会话不存在' })
    }
    res.json({ success: true, message: '会话已删除' })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error({ error: msg, id: req.params.id }, '删除会话失败')
    res.status(500).json({ success: false, error: msg })
  }
})

export default router
