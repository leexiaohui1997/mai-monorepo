import { ProviderStorage } from './storage';
import type { ProviderConfig, CreateProviderInput, UpdateProviderInput } from './types';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import logger from '../utils/logger';

export class ProviderManager {
  private storage: ProviderStorage;

  constructor() {
    this.storage = new ProviderStorage();
  }

  async listProviders(): Promise<ProviderConfig[]> {
    return this.storage.readAll();
  }

  async createProvider(input: CreateProviderInput): Promise<ProviderConfig> {
    logger.info({ providerType: input.type, name: input.name }, '正在创建供应商');
    
    // 简单校验
    if (!input.apiKey) {
      throw new Error('API Key is required');
    }
    
    const config: Omit<ProviderConfig, 'id' | 'createdAt' | 'updatedAt'> = {
      ...input,
      enabled: true,
      isDefault: false, // 创建时默认不为默认，需手动设置
    };

    const newProvider = await this.storage.create(config);
    logger.info({ id: newProvider.id }, '供应商创建成功');
    return newProvider;
  }

  async updateProvider(id: string, input: UpdateProviderInput): Promise<ProviderConfig | null> {
    logger.info({ id }, '正在更新供应商');
    const result = await this.storage.update(id, input);
    if (result) {
      logger.info({ id }, '供应商更新成功');
    } else {
      logger.warn({ id }, '供应商不存在，无法更新');
    }
    return result;
  }

  async deleteProvider(id: string): Promise<boolean> {
    logger.info({ id }, '正在删除供应商');
    const result = await this.storage.delete(id);
    if (result) {
      logger.info({ id }, '供应商删除成功');
    } else {
      logger.warn({ id }, '供应商不存在，无法删除');
    }
    return result;
  }

  async getDefaultProvider(): Promise<ProviderConfig | null> {
    const providers = await this.storage.readAll();
    return providers.find(p => p.isDefault) || null;
  }

  async setDefaultProvider(id: string): Promise<ProviderConfig | null> {
    logger.info({ id }, '正在设置默认供应商');
    const result = await this.storage.setDefault(id);
    if (result) {
      logger.info({ id }, '默认供应商设置成功');
    } else {
      logger.warn({ id }, '供应商不存在，无法设置为默认');
    }
    return result;
  }

  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    logger.info({ id }, '正在测试供应商连接');
    const provider = await this.storage.findById(id);
    if (!provider) {
      logger.warn({ id }, '供应商不存在，无法测试连接');
      return { success: false, message: 'Provider not found' };
    }

    try {
      let model;
      if (provider.type === 'anthropic') {
        const anthropic = createAnthropic({ apiKey: provider.apiKey, baseURL: provider.baseURL });
        model = anthropic(provider.model || 'claude-3-haiku-20240307');
      } else {
        const openai = createOpenAI({ apiKey: provider.apiKey, baseURL: provider.baseURL });
        model = openai(provider.model || 'gpt-3.5-turbo');
      }

      await generateText({
        model,
        prompt: 'Hi',
        maxTokens: 1,
      });

      logger.info({ id }, '供应商连接测试成功');
      return { success: true, message: 'Connection successful' };
    } catch (error: any) {
      logger.error({ error: error.message, stack: error.stack, id }, '供应商连接测试失败');
      return { success: false, message: error.message || 'Connection failed' };
    }
  }
}
