import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

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

  constructor() {
    this.storage = new ProviderStorage()
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

  /** 遍历所有供应商，找到默认模型及其所属供应商 */
  async getDefaultModel(): Promise<{ provider: ProviderConfig; model: ModelConfig } | null> {
    const providers = await this.storage.readAll()
    for (const provider of providers) {
      if (!provider.enabled) continue
      const model = provider.models.find((m) => m.isDefault)
      if (model) return { provider, model }
    }
    return null
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
      const modelName = this.resolveModelName(provider, modelId)
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

  private resolveModelName(provider: ProviderConfig, modelId?: string): string {
    if (modelId) {
      const found = provider.models.find((m) => m.id === modelId)
      if (found) return found.name
    }
    const defaultModel = provider.models.find((m) => m.isDefault)
    if (defaultModel) return defaultModel.name
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
}
