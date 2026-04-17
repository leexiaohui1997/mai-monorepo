import { Router } from 'express'

import { ProviderManager } from '../providers/manager'
import logger from '../utils/logger'

const router = Router()
const manager = new ProviderManager()

// GET /api/providers - 列表查询
router.get('/', async (req, res) => {
  try {
    const providers = await manager.listProviders()
    logger.info({ count: providers.length }, '获取供应商列表')
    res.json({ success: true, data: providers })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    logger.error({ error: msg, stack }, '获取供应商列表失败')
    res.status(500).json({ success: false, error: msg })
  }
})

// GET /api/providers/:id - 详情查询
router.get('/:id', async (req, res) => {
  try {
    const provider = await manager['storage'].findById(req.params.id)
    if (!provider) {
      logger.warn({ id: req.params.id }, '供应商不存在')
      return res.status(404).json({ success: false, error: 'Provider not found' })
    }
    logger.info({ id: req.params.id }, '获取供应商详情')
    res.json({ success: true, data: provider })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    logger.error({ error: msg, stack, id: req.params.id }, '获取供应商详情失败')
    res.status(500).json({ success: false, error: msg })
  }
})

// POST /api/providers - 创建供应商
router.post('/', async (req, res) => {
  try {
    const provider = await manager.createProvider(req.body)
    logger.info({ id: provider.id, type: provider.type, name: provider.name }, '创建供应商成功')
    res.status(201).json({ success: true, data: provider })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    logger.error({ error: msg, stack }, '创建供应商失败')
    res.status(400).json({ success: false, error: msg })
  }
})

// PUT /api/providers/:id - 更新供应商
router.put('/:id', async (req, res) => {
  try {
    const provider = await manager.updateProvider(req.params.id, req.body)
    if (!provider) {
      logger.warn({ id: req.params.id }, '供应商不存在，无法更新')
      return res.status(404).json({ success: false, error: 'Provider not found' })
    }
    logger.info({ id: req.params.id }, '更新供应商成功')
    res.json({ success: true, data: provider })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    logger.error({ error: msg, stack, id: req.params.id }, '更新供应商失败')
    res.status(500).json({ success: false, error: msg })
  }
})

// DELETE /api/providers/:id - 删除供应商
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await manager.deleteProvider(req.params.id)
    if (!deleted) {
      logger.warn({ id: req.params.id }, '供应商不存在，无法删除')
      return res.status(404).json({ success: false, error: 'Provider not found' })
    }
    logger.info({ id: req.params.id }, '删除供应商成功')
    res.json({ success: true, message: 'Deleted successfully' })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    logger.error({ error: msg, stack, id: req.params.id }, '删除供应商失败')
    res.status(500).json({ success: false, error: msg })
  }
})

// POST /api/providers/:id/test - 测试连接（支持 modelId 查询参数）
// 优先级：指定modelId > 全局默认模型 > 供应商默认模型 > 内置默认模型
router.post('/:id/test', async (req, res) => {
  try {
    const modelId = req.body.modelId as string | undefined
    const result = await manager.testConnection(req.params.id, modelId)
    logger.info({ id: req.params.id, modelId, success: result.success }, '供应商连接测试完成')
    res.json(result)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    logger.error({ error: msg, stack, id: req.params.id }, '供应商连接测试失败')
    res.status(500).json({ success: false, error: msg })
  }
})

// POST /api/providers/:id/set-default - 设为默认
router.post('/:id/set-default', async (req, res) => {
  try {
    const provider = await manager.setDefaultProvider(req.params.id)
    if (!provider) {
      logger.warn({ id: req.params.id }, '供应商不存在，无法设置为默认')
      return res.status(404).json({ success: false, error: 'Provider not found' })
    }
    logger.info({ id: req.params.id }, '设置默认供应商成功')
    res.json({ success: true, data: provider })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    logger.error({ error: msg, stack, id: req.params.id }, '设置默认供应商失败')
    res.status(500).json({ success: false, error: msg })
  }
})

// ---- 模型管理路由 ----

// POST /api/providers/:id/models - 添加模型
router.post('/:id/models', async (req, res) => {
  try {
    const model = await manager.addModel(req.params.id, req.body)
    if (!model) {
      return res.status(404).json({ success: false, error: 'Provider not found' })
    }
    res.status(201).json({ success: true, data: model })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error({ error: msg, id: req.params.id }, '添加模型失败')
    res.status(500).json({ success: false, error: msg })
  }
})

// PUT /api/providers/:id/models/:modelId - 更新模型
router.put('/:id/models/:modelId', async (req, res) => {
  try {
    const model = await manager.updateModel(req.params.id, req.params.modelId, req.body)
    if (!model) {
      return res.status(404).json({ success: false, error: 'Model not found' })
    }
    res.json({ success: true, data: model })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error({ error: msg, id: req.params.id }, '更新模型失败')
    res.status(500).json({ success: false, error: msg })
  }
})

// DELETE /api/providers/:id/models/:modelId - 删除模型
router.delete('/:id/models/:modelId', async (req, res) => {
  try {
    const deleted = await manager.deleteModel(req.params.id, req.params.modelId)
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Model not found' })
    }
    res.json({ success: true, message: 'Model deleted' })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error({ error: msg, id: req.params.id }, '删除模型失败')
    res.status(500).json({ success: false, error: msg })
  }
})

// POST /api/providers/:id/models/:modelId/set-default - 设置默认模型
// 注意：设置新的默认模型将清除所有其他供应商的默认模型标记，确保全局只有一个默认模型
router.post('/:id/models/:modelId/set-default', async (req, res) => {
  try {
    const model = await manager.setDefaultModel(req.params.id, req.params.modelId)
    if (!model) {
      return res.status(404).json({ success: false, error: 'Model not found' })
    }
    res.json({ success: true, data: model })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error({ error: msg, id: req.params.id }, '设置默认模型失败')
    res.status(500).json({ success: false, error: msg })
  }
})

export default router
