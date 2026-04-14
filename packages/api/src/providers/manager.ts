import { ProviderStorage } from './storage';
import type { ProviderConfig, CreateProviderInput, UpdateProviderInput } from './types';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

export class ProviderManager {
  private storage: ProviderStorage;

  constructor() {
    this.storage = new ProviderStorage();
  }

  async listProviders(): Promise<ProviderConfig[]> {
    return this.storage.readAll();
  }

  async createProvider(input: CreateProviderInput): Promise<ProviderConfig> {
    // 简单校验
    if (!input.apiKey) {
      throw new Error('API Key is required');
    }
    
    const config: Omit<ProviderConfig, 'id' | 'createdAt' | 'updatedAt'> = {
      ...input,
      enabled: true,
      isDefault: false, // 创建时默认不为默认，需手动设置
    };

    return this.storage.create(config);
  }

  async updateProvider(id: string, input: UpdateProviderInput): Promise<ProviderConfig | null> {
    return this.storage.update(id, input);
  }

  async deleteProvider(id: string): Promise<boolean> {
    return this.storage.delete(id);
  }

  async getDefaultProvider(): Promise<ProviderConfig | null> {
    const providers = await this.storage.readAll();
    return providers.find(p => p.isDefault) || null;
  }

  async setDefaultProvider(id: string): Promise<ProviderConfig | null> {
    return this.storage.setDefault(id);
  }

  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    const provider = await this.storage.findById(id);
    if (!provider) {
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

      return { success: true, message: 'Connection successful' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection failed' };
    }
  }
}
