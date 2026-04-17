import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

import { GlobalConfigManager } from '../config/globalConfig'
import logger from '../utils/logger'

import { ProviderStorage } from './storage'

import type {
  ProviderConfig,
  CreateProviderInput,
  UpdateProviderInput,
  CreateModelInput,
  UpdateModelInput,
  ModelConfig,
} from './types'

export class ProviderManager {
  private storage: ProviderStorage
  private globalConfig: GlobalConfigManager

  constructor() {
    this.storage = new ProviderStorage()
    this.globalConfig = new GlobalConfigManager()
    // 异步初始化，但不阻塞构造函数
    this.initialize().catch((error) => {
      logger.warn({ error }, 'ProviderManager初始化失败，但不影响正常使用')
    })
  }

  async listProviders(): Promise<ProviderConfig[]> {
    return this.storage.readAll()
  }

  async createProvider(input: CreateProviderInput): Promise<ProviderConfig> {
    logger.info({ providerType: input.type, name: input.name }, '正在创建供应商')

    if (!input.apiKey) {
      throw new Error('API Key is required')
    }

    const config: Omit<ProviderConfig, 'id' | 'createdAt' | 'updatedAt'> = {
      ...input,
      models: input.models ?? [],
      enabled: true,
      isDefault: false,
    }

    const newProvider = await this.storage.create(config)
    logger.info({ id: newProvider.id }, '供应商创建成功')
    return newProvider
  }

  async updateProvider(id: string, input: UpdateProviderInput): Promise<ProviderConfig | null> {
    logger.info({ id }, '正在更新供应商')
    const result = await this.storage.update(id, input)
    if (result) {
      logger.info({ id }, '供应商更新成功')
    } else {
      logger.warn({ id }, '供应商不存在，无法更新')
    }
    return result
  }

  async deleteProvider(id: string): Promise<boolean> {
    logger.info({ id }, '正在删除供应商')
    const result = await this.storage.delete(id)
    if (result) {
      logger.info({ id }, '供应商删除成功')
    } else {
      logger.warn({ id }, '供应商不存在，无法删除')
    }
    return result
  }

  async getDefaultProvider(): Promise<ProviderConfig | null> {
    const providers = await this.storage.readAll()
    return providers.find((p) => p.isDefault) || null
  }

  /**
   * 获取默认模型
   * 1. 有设置全局默认模型，且供应商启用 → 返回全局默认模型
   * 2. 否则 → 所有启用供应商的模型按名称排序取第一个
   */
  async getDefaultModel(): Promise<{ provider: ProviderConfig; model: ModelConfig } | null> {
    const providers = await this.storage.readAll()
    const enabledProviders = providers.filter((p) => p.enabled && p.models?.length)

    // 优先：全局默认模型 + 供应商启用
    const result = await this.findGlobalDefault(enabledProviders)
    if (result) return result

    // 兜底：所有模型按名称排序取第一个
    return this.findFirstModelByName(enabledProviders)
  }

  /** 查找全局默认模型（供应商需启用） */
  private async findGlobalDefault(
    enabledProviders: ProviderConfig[],
  ): Promise<{ provider: ProviderConfig; model: ModelConfig } | null> {
    const globalDefaultModelId = await this.globalConfig.getDefaultModelId()
    if (!globalDefaultModelId) return null

    for (const provider of enabledProviders) {
      const model = provider.models.find((m) => m.id === globalDefaultModelId)
      if (model) return { provider, model }
    }
    logger.warn({ globalDefaultModelId }, '全局默认模型不存在或其供应商已禁用，将使用兜底策略')
    return null
  }

  /** 从所有启用供应商中按模型名称排序取第一个 */
  private findFirstModelByName(
    enabledProviders: ProviderConfig[],
  ): { provider: ProviderConfig; model: ModelConfig } | null {
    const allModels = enabledProviders.flatMap((p) =>
      p.models.map((m) => ({ provider: p, model: m })),
    )
    if (allModels.length === 0) return null

    allModels.sort((a, b) => a.model.name.localeCompare(b.model.name))
    return allModels[0]
  }

  async setDefaultProvider(id: string): Promise<ProviderConfig | null> {
    logger.info({ id }, '正在设置默认供应商')
    const result = await this.storage.setDefault(id)
    if (result) {
      logger.info({ id }, '默认供应商设置成功')
    } else {
      logger.warn({ id }, '供应商不存在，无法设置为默认')
    }
    return result
  }

  // ---- 模型管理方法 ----

  async addModel(providerId: string, input: CreateModelInput): Promise<ModelConfig | null> {
    logger.info({ providerId }, '正在添加模型')
    const provider = await this.storage.findById(providerId)
    if (!provider) {
      return null
    }

    const newModel: ModelConfig = {
      id: crypto.randomUUID(),
      name: input.name,
      displayName: input.displayName,
      isDefault: false,
    }
    provider.models.push(newModel)
    await this.storage.update(providerId, { models: provider.models } as Partial<ProviderConfig>)
    logger.info({ providerId, modelId: newModel.id }, '模型添加成功')
    return newModel
  }

  async updateModel(
    providerId: string,
    modelId: string,
    input: UpdateModelInput,
  ): Promise<ModelConfig | null> {
    logger.info({ providerId, modelId }, '正在更新模型')
    const provider = await this.storage.findById(providerId)
    if (!provider) {
      return null
    }

    const model = provider.models.find((m) => m.id === modelId)
    if (!model) {
      return null
    }

    Object.assign(model, input)
    await this.storage.update(providerId, { models: provider.models } as Partial<ProviderConfig>)
    logger.info({ providerId, modelId }, '模型更新成功')
    return model
  }

  async deleteModel(providerId: string, modelId: string): Promise<boolean> {
    logger.info({ providerId, modelId }, '正在删除模型')
    const provider = await this.storage.findById(providerId)
    if (!provider) {
      return false
    }

    const index = provider.models.findIndex((m) => m.id === modelId)
    if (index === -1) {
      return false
    }

    provider.models.splice(index, 1)
    await this.storage.update(providerId, { models: provider.models } as Partial<ProviderConfig>)
    logger.info({ providerId, modelId }, '模型删除成功')
    return true
  }

  async setDefaultModel(providerId: string, modelId: string): Promise<ModelConfig | null> {
    logger.info({ providerId, modelId }, '正在设置默认模型')
    const provider = await this.storage.findById(providerId)
    if (!provider) {
      return null
    }

    // 清除所有供应商的默认模型标记
    const allProviders = await this.storage.readAll()
    for (const p of allProviders) {
      if (p.models) {
        p.models.forEach((m) => {
          m.isDefault = false
        })
        await this.storage.update(p.id, { models: p.models } as Partial<ProviderConfig>)
      }
    }

    // 设置当前模型为默认
    let target: ModelConfig | null = null
    provider.models.forEach((m) => {
      m.isDefault = m.id === modelId
      if (m.isDefault) {
        target = m
      }
    })

    if (!target) {
      return null
    }

    await this.storage.update(providerId, { models: provider.models } as Partial<ProviderConfig>)

    // 设置全局默认模型ID
    await this.globalConfig.setDefaultModelId(modelId)

    logger.info({ providerId, modelId }, '默认模型设置成功')
    return target
  }

  // ---- 连接测试 ----

  async testConnection(
    id: string,
    modelId?: string,
  ): Promise<{ success: boolean; message: string }> {
    logger.info({ id, modelId }, '正在测试供应商连接')
    const provider = await this.storage.findById(id)
    if (!provider) {
      return { success: false, message: 'Provider not found' }
    }

    try {
      const modelName = await this.resolveModelName(provider, modelId)
      const aiModel = this.createAiModel(provider, modelName)
      await generateText({ model: aiModel, prompt: 'Hi', maxTokens: 1 })
      logger.info({ id, modelName }, '供应商连接测试成功')
      return { success: true, message: 'Connection successful' }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Connection failed'
      logger.error({ error: msg, id }, '供应商连接测试失败')
      return { success: false, message: msg }
    }
  }

  private async resolveModelName(provider: ProviderConfig, modelId?: string): Promise<string> {
    // 如果指定了modelId，使用指定模型
    if (modelId) {
      const found = provider.models.find((m) => m.id === modelId)
      if (found) return found.name
    }

    // 复用 getDefaultModel 的 fallback 逻辑
    const defaultResult = await this.getDefaultModel()
    if (defaultResult) return defaultResult.model.name

    // 兜底：使用内置默认模型
    return provider.type === 'anthropic' ? 'claude-3-haiku-20240307' : 'gpt-3.5-turbo'
  }

  private createAiModel(provider: ProviderConfig, modelName: string) {
    if (provider.type === 'anthropic') {
      const anthropic = createAnthropic({ apiKey: provider.apiKey, baseURL: provider.baseURL })
      return anthropic(modelName)
    }
    const openai = createOpenAI({ apiKey: provider.apiKey, baseURL: provider.baseURL })
    return openai(modelName)
  }

  /**
   * 初始化时运行数据迁移
   */
  async initialize(): Promise<void> {
    try {
      // 检查是否需要迁移
      const providers = await this.storage.readAll()
      const defaultModels = providers.flatMap(
        (p) =>
          p.models?.filter((m) => m.isDefault).map((m) => ({ provider: p.name, model: m.name })) ||
          [],
      )

      if (defaultModels.length > 1) {
        logger.info({ count: defaultModels.length }, '检测到多个默认模型，建议运行迁移脚本')
      }
    } catch (error: unknown) {
      logger.warn({ error }, '初始化检查失败，但不影响正常启动')
    }
  }
}
