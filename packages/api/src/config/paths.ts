import envPaths from 'env-paths';
import fs from 'fs';
import path from 'path';

/**
 * 获取 MAI 应用的数据目录
 * 优先使用环境变量 MAI_DATA_DIR 或 APP_DATA_DIR，否则根据操作系统自动推导
 */
export function getDataDir(): string {
  // 优先使用 MAI_DATA_DIR（开发环境）
  if (process.env.MAI_DATA_DIR) {
    return process.env.MAI_DATA_DIR;
  }

  // 使用 APP_DATA_DIR（Tauri 生产环境）
  if (process.env.APP_DATA_DIR) {
    return process.env.APP_DATA_DIR;
  }

  // 默认使用 env-paths
  const paths = envPaths('mai');
  return paths.data;
}

/**
 * 确保数据目录存在
 */
export function ensureDataDir(): void {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[Config] Created data directory: ${dir}`);
  }
}

/**
 * 获取供应商配置文件的完整路径
 */
export function getProvidersFilePath(): string {
  return path.join(getDataDir(), 'providers.jsonl');
}
