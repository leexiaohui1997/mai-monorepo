import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'

import { ensureDataDir, getDataDir } from './config/paths'
import { requestLogger } from './middleware/requestLogger'
import providerRoutes from './routes/providers'
import logger from './utils/logger'

dotenv.config()
ensureDataDir()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())
app.use(requestLogger)

// Routes
app.use('/api/providers', providerRoutes)

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(
    {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    },
    '未处理的错误',
  )
  res.status(500).json({ success: false, error: 'Internal server error' })
})

// Start Server
app.listen(PORT, () => {
  logger.info(`MAI API 运行在 http://localhost:${PORT}`)
  logger.info(`数据目录: ${getDataDir()}`)
})
