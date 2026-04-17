import { Router } from 'express'

import { toolRegistry } from '../tools/registry'
import logger from '../utils/logger'

const router = Router()

/** POST /api/tools/execute — 手动执行指定工具 */
router.post('/execute', async (req, res) => {
  const { toolName, args } = req.body as {
    toolName: string
    args: Record<string, unknown>
  }

  // 验证工具是否存在
  const toolDef = toolRegistry[toolName] as
    | { execute?: (args: Record<string, unknown>) => Promise<unknown> }
    | undefined
  if (!toolDef) {
    return res.status(400).json({ success: false, error: `工具不存在: ${toolName}` })
  }

  if (typeof toolDef.execute !== 'function') {
    return res.status(400).json({ success: false, error: `工具 ${toolName} 没有 execute 函数` })
  }

  try {
    logger.info({ toolName, args }, '手动执行工具: %s', toolName)
    const result = await toolDef.execute(args)
    return res.json({ success: true, result })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error({ error: msg, toolName }, '工具执行失败: %s', toolName)
    return res.json({ success: false, error: msg })
  }
})

export default router
