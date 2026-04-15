import pino from 'pino';
import { getDataDir } from '../config/paths';
import fs from 'fs';
import path from 'path';
import { writeFile } from './io';

// 根据环境配置 logger
const isDev = process.env.NODE_ENV !== 'production';

let logger: pino.Logger;

if (isDev) {
  // 开发环境：彩色控制台输出
  logger = pino({
    level: 'debug',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
        messageFormat: '{msg}',
      },
    },
  });
} else {
  // 生产环境（含 Tauri Sidecar）：同时输出到文件和控制台
  const dataDir = getDataDir();
  const logDir = path.join(dataDir, 'logs');
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  logger = pino(
    {
      level: 'info',
    },
    pino.multistream([
      {
        stream: pino.destination({
          dest: path.join(logDir, 'api.log'),
          mkdir: true,
          sync: false,
        }),
      },
      {
        stream: pino.destination({
          dest: 1, // stdout
          sync: false,
        }),
      },
    ])
  );
}

export default logger;
