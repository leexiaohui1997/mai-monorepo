import { getDataDir } from '../config/paths'
import { readFile, writeFile, fileExists } from '../utils/io'
import logger from '../utils/logger'

import { SEARCH_PROVIDER_DEFAULTS } from './types'

import type {
  SearchProviderConfig,
  CreateSearchProviderInput,
  UpdateSearchProviderInput,
} from './types'

function getFilePath(): string {
  return `${getDataDir()}/search-providers.json`
}

export class SearchProviderStorage {
  /** 读取所有搜索服务配置 */
  async readAll(): Promise<SearchProviderConfig[]> {
    const filePath = getFilePath()
    if (!(await fileExists(filePath))) return []

    const text = await readFile(filePath)
    if (!text.trim()) return []

    return text
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line))
  }

  /** 根据 ID 查找 */
  async findById(id: string): Promise<SearchProviderConfig | null> {
    const all = await this.readAll()
    return all.find((p) => p.id === id) ?? null
  }

  /** 获取第一个已启用的搜索服务 */
  async findFirstEnabled(): Promise<SearchProviderConfig | null> {
    const all = await this.readAll()
    return all.find((p) => p.enabled) ?? null
  }

  /** 创建搜索服务配置 */
  async create(input: CreateSearchProviderInput): Promise<SearchProviderConfig> {
    const defaults = SEARCH_PROVIDER_DEFAULTS[input.type]
    const now = new Date().toISOString()

    const config: SearchProviderConfig = {
      id: crypto.randomUUID(),
      type: input.type,
      name: defaults.name,
      apiKey: input.apiKey,
      baseURL: defaults.baseURL,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    }

    const filePath = getFilePath()
    const content = (await fileExists(filePath)) ? await readFile(filePath) : ''
    await writeFile(filePath, content + JSON.stringify(config) + '\n')
    logger.debug({ id: config.id, type: config.type }, '搜索服务已创建')
    return config
  }

  /** 更新搜索服务配置 */
  async update(
    id: string,
    updates: UpdateSearchProviderInput,
  ): Promise<SearchProviderConfig | null> {
    const all = await this.readAll()
    const index = all.findIndex((p) => p.id === id)
    if (index === -1) return null

    all[index] = { ...all[index], ...updates, updatedAt: new Date().toISOString() }
    await this.writeAll(all)
    logger.debug({ id }, '搜索服务已更新')
    return all[index]
  }

  /** 删除搜索服务配置 */
  async delete(id: string): Promise<boolean> {
    const all = await this.readAll()
    const filtered = all.filter((p) => p.id !== id)
    if (filtered.length === all.length) return false

    await this.writeAll(filtered)
    logger.debug({ id }, '搜索服务已删除')
    return true
  }

  /** 重写整个文件 */
  private async writeAll(configs: SearchProviderConfig[]): Promise<void> {
    const content = configs.map((c) => JSON.stringify(c)).join('\n') + '\n'
    await writeFile(getFilePath(), content)
  }
}
