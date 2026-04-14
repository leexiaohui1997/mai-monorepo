import { getProvidersFilePath } from '../config/paths';
import type { ProviderConfig } from './types';

export class ProviderStorage {
  private filePath: string;

  constructor() {
    this.filePath = getProvidersFilePath();
  }

  /**
   * 读取所有供应商配置
   */
  async readAll(): Promise<ProviderConfig[]> {
    try {
      const file = Bun.file(this.filePath);
      if (!(await file.exists())) {
        return [];
      }
      
      const text = await file.text();
      if (!text.trim()) {
        return [];
      }

      return text
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } catch (error) {
      console.error('[Storage] Error reading providers:', error);
      return [];
    }
  }

  /**
   * 根据 ID 查找供应商
   */
  async findById(id: string): Promise<ProviderConfig | null> {
    const providers = await this.readAll();
    return providers.find(p => p.id === id) || null;
  }

  /**
   * 创建新供应商
   */
  async create(config: Omit<ProviderConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProviderConfig> {
    const now = new Date().toISOString();
    const newProvider: ProviderConfig = {
      ...config,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const file = Bun.file(this.filePath);
    const content = (await file.exists()) ? await file.text() : '';
    await Bun.write(this.filePath, content + JSON.stringify(newProvider) + '\n');

    return newProvider;
  }

  /**
   * 更新供应商
   */
  async update(id: string, updates: Partial<ProviderConfig>): Promise<ProviderConfig | null> {
    const providers = await this.readAll();
    const index = providers.findIndex(p => p.id === id);
    
    if (index === -1) {
      return null;
    }

    providers[index] = {
      ...providers[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this._writeAll(providers);
    return providers[index];
  }

  /**
   * 删除供应商
   */
  async delete(id: string): Promise<boolean> {
    const providers = await this.readAll();
    const filtered = providers.filter(p => p.id !== id);
    
    if (filtered.length === providers.length) {
      return false;
    }

    await this._writeAll(filtered);
    return true;
  }

  /**
   * 设置默认供应商
   */
  async setDefault(id: string): Promise<ProviderConfig | null> {
    const providers = await this.readAll();
    let targetProvider: ProviderConfig | null = null;

    const updated = providers.map(p => {
      if (p.id === id) {
        const updated = { ...p, isDefault: true, updatedAt: new Date().toISOString() };
        targetProvider = updated;
        return updated;
      }
      return { ...p, isDefault: false };
    });

    await this._writeAll(updated);
    return targetProvider;
  }

  /**
   * 内部方法：重写整个文件
   */
  private async _writeAll(providers: ProviderConfig[]): Promise<void> {
    const content = providers.map(p => JSON.stringify(p)).join('\n') + '\n';
    await Bun.write(this.filePath, content);
  }
}
