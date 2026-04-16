import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'

import logger from '../utils/logger'

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = uuidv4()
  const start = Date.now()

  // 附加 requestId 到 request 对象
  ;(req as Request & { requestId: string }).requestId = requestId

  logger.info(
    {
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
    '收到请求',
  )

  // 监听响应完成
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info(
      {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      },
      '请求完成',
    )
  })

  next()
}
