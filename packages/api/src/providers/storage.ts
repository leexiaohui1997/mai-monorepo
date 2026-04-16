import { getProvidersFilePath } from '../config/paths'
import { readFile, writeFile, fileExists } from '../utils/io'
import logger from '../utils/logger'

import type { ProviderConfig } from './types'

export class ProviderStorage {
  private filePath: string

  constructor() {
    this.filePath = getProvidersFilePath()
  }

  /**
   * 读取所有供应商配置
   */
  async readAll(): Promise<ProviderConfig[]> {
    try {
      const filePath = this.filePath
      if (!(await fileExists(filePath))) {
        logger.debug({ filePath }, '供应商配置文件不存在，返回空数组')
        return []
      }

      const text = await readFile(filePath)
      if (!text.trim()) {
        logger.debug({ filePath }, '供应商配置文件为空，返回空数组')
        return []
      }

      const providers = text
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line))

      logger.debug({ count: providers.length, filePath }, '从文件加载供应商配置')
      return providers
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      const stack = error instanceof Error ? error.stack : undefined
      logger.error({ error: msg, stack, filePath: this.filePath }, '读取供应商配置文件失败')
      return []
    }
  }

  /**
   * 根据 ID 查找供应商
   */
  async findById(id: string): Promise<ProviderConfig | null> {
    const providers = await this.readAll()
    return providers.find((p) => p.id === id) || null
  }

  /**
   * 创建新供应商
   */
  async create(
    config: Omit<ProviderConfig, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ProviderConfig> {
    const now = new Date().toISOString()
    const newProvider: ProviderConfig = {
      ...config,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }

    try {
      const content = (await fileExists(this.filePath)) ? await readFile(this.filePath) : ''
      await writeFile(this.filePath, content + JSON.stringify(newProvider) + '\n')
      logger.debug({ id: newProvider.id, filePath: this.filePath }, '供应商已写入文件')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      const stack = error instanceof Error ? error.stack : undefined
      logger.error({ error: msg, stack, filePath: this.filePath }, '写入供应商到文件失败')
      throw error
    }

    return newProvider
  }

  /**
   * 更新供应商
   */
  async update(id: string, updates: Partial<ProviderConfig>): Promise<ProviderConfig | null> {
    const providers = await this.readAll()
    const index = providers.findIndex((p) => p.id === id)

    if (index === -1) {
      logger.debug({ id }, '供应商不存在，无法更新')
      return null
    }

    providers[index] = {
      ...providers[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    try {
      await this._writeAll(providers)
      logger.debug({ id }, '供应商已在文件中更新')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      const stack = error instanceof Error ? error.stack : undefined
      logger.error({ error: msg, stack, id }, '在文件中更新供应商失败')
      throw error
    }

    return providers[index]
  }

  /**
   * 删除供应商
   */
  async delete(id: string): Promise<boolean> {
    const providers = await this.readAll()
    const filtered = providers.filter((p) => p.id !== id)

    if (filtered.length === providers.length) {
      logger.debug({ id }, '供应商不存在，无法删除')
      return false
    }

    try {
      await this._writeAll(filtered)
      logger.debug({ id }, '供应商已从文件中删除')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      const stack = error instanceof Error ? error.stack : undefined
      logger.error({ error: msg, stack, id }, '从文件中删除供应商失败')
      throw error
    }

    return true
  }

  /**
   * 设置默认供应商
   */
  async setDefault(id: string): Promise<ProviderConfig | null> {
    const providers = await this.readAll()
    let targetProvider: ProviderConfig | null = null

    const updated = providers.map((p) => {
      if (p.id === id) {
        const updated = { ...p, isDefault: true, updatedAt: new Date().toISOString() }
        targetProvider = updated
        return updated
      }
      return { ...p, isDefault: false }
    })

    try {
      await this._writeAll(updated)
      logger.debug({ id }, '默认供应商已在文件中更新')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      const stack = error instanceof Error ? error.stack : undefined
      logger.error({ error: msg, stack, id }, '在文件中更新默认供应商失败')
      throw error
    }

    return targetProvider
  }

  /**
   * 内部方法：重写整个文件
   */
  private async _writeAll(providers: ProviderConfig[]): Promise<void> {
    try {
      const content = providers.map((p) => JSON.stringify(p)).join('\n') + '\n'
      await writeFile(this.filePath, content)
      logger.debug({ count: providers.length, filePath: this.filePath }, '所有供应商已写入文件')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      const stack = error instanceof Error ? error.stack : undefined
      logger.error({ error: msg, stack, filePath: this.filePath }, '写入所有供应商到文件失败')
      throw error
    }
  }
}
