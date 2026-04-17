import fs from 'fs'
import path from 'path'

import { getDataDir } from './paths'

interface GlobalConfig {
  defaultModelId?: string
}

/**
 * 全局配置管理器
 */
export class GlobalConfigManager {
  private configPath: string

  constructor() {
    this.configPath = path.join(getDataDir(), 'global-config.json')
  }

  /**
   * 读取全局配置
   */
  async read(): Promise<GlobalConfig> {
    try {
      if (!fs.existsSync(this.configPath)) {
        return {}
      }
      const content = await fs.promises.readFile(this.configPath, 'utf-8')
      return JSON.parse(content) as GlobalConfig
    } catch (error) {
      console.warn('Failed to read global config, returning empty config:', error)
      return {}
    }
  }

  /**
   * 写入全局配置
   */
  async write(config: GlobalConfig): Promise<void> {
    try {
      const content = JSON.stringify(config, null, 2)
      await fs.promises.writeFile(this.configPath, content, 'utf-8')
    } catch (error) {
      console.error('Failed to write global config:', error)
      throw error
    }
  }

  /**
   * 设置全局默认模型ID
   */
  async setDefaultModelId(modelId: string | null): Promise<void> {
    const config = await this.read()
    if (modelId === null) {
      delete config.defaultModelId
    } else {
      config.defaultModelId = modelId
    }
    await this.write(config)
  }

  /**
   * 获取全局默认模型ID
   */
  async getDefaultModelId(): Promise<string | null> {
    const config = await this.read()
    return config.defaultModelId || null
  }
}
