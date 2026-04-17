import { Router } from 'express'

import { search } from '../search/adapters'
import { SearchProviderStorage } from '../search/storage'
import logger from '../utils/logger'

const router = Router()
const storage = new SearchProviderStorage()

// GET / — 列表
router.get('/', async (_req, res) => {
  try {
    const list = await storage.readAll()
    res.json({ success: true, data: list })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error({ error: msg }, '获取搜索服务列表失败')
    res.status(500).json({ success: false, error: msg })
  }
})

// POST / — 创建
router.post('/', async (req, res) => {
  try {
    const config = await storage.create(req.body)
    logger.info({ id: config.id, type: config.type }, '创建搜索服务成功')
    res.status(201).json({ success: true, data: config })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error({ error: msg }, '创建搜索服务失败')
    res.status(400).json({ success: false, error: msg })
  }
})

// PUT /:id — 更新
router.put('/:id', async (req, res) => {
  try {
    const config = await storage.update(req.params.id, req.body)
    if (!config) {
      return res.status(404).json({ success: false, error: '搜索服务不存在' })
    }
    logger.info({ id: req.params.id }, '更新搜索服务成功')
    res.json({ success: true, data: config })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error({ error: msg, id: req.params.id }, '更新搜索服务失败')
    res.status(500).json({ success: false, error: msg })
  }
})

// DELETE /:id — 删除
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await storage.delete(req.params.id)
    if (!deleted) {
      return res.status(404).json({ success: false, error: '搜索服务不存在' })
    }
    logger.info({ id: req.params.id }, '删除搜索服务成功')
    res.json({ success: true, message: '删除成功' })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error({ error: msg, id: req.params.id }, '删除搜索服务失败')
    res.status(500).json({ success: false, error: msg })
  }
})

// POST /:id/test — 测试连接
router.post('/:id/test', async (req, res) => {
  try {
    const config = await storage.findById(req.params.id)
    if (!config) {
      return res.status(404).json({ success: false, message: '搜索服务不存在' })
    }
    await search(config, 'test', 1)
    res.json({ success: true, message: '连接成功' })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error({ error: msg, id: req.params.id }, '搜索服务测试失败')
    res.json({ success: false, message: `连接失败: ${msg}` })
  }
})

export default router
