import { GlobalConfigManager } from '../config/globalConfig'
import { ProviderStorage } from '../providers/storage'
import logger from '../utils/logger'

import type { ProviderConfig } from '../providers/types'

interface DefaultModelInfo {
  providerId: string
  modelId: string
  modelName: string
}

/** 收集所有供应商中标记为默认的模型 */
function collectDefaultModels(providers: ProviderConfig[]): DefaultModelInfo[] {
  return providers.flatMap((provider) =>
    (provider.models ?? [])
      .filter((model) => model.isDefault)
      .map((model) => ({
        providerId: provider.id,
        modelId: model.id,
        modelName: model.name,
      })),
  )
}

/** 清除多余的默认模型标记 */
async function clearExtraDefaults(
  storage: ProviderStorage,
  extraModels: DefaultModelInfo[],
): Promise<number> {
  let clearedCount = 0
  for (const { providerId, modelId } of extraModels) {
    const provider = await storage.findById(providerId)
    if (!provider?.models) continue

    const updatedModels = provider.models.map((m) => ({
      ...m,
      isDefault: m.id === modelId ? false : m.isDefault,
    }))
    await storage.update(providerId, { models: updatedModels } as Partial<ProviderConfig>)
    clearedCount++
  }
  return clearedCount
}

/**
 * 全局默认模型数据迁移脚本
 * 处理现有多个默认模型的情况，选择第一个找到的默认模型作为全局默认模型
 */
async function migrateGlobalDefaultModel(): Promise<void> {
  logger.info('开始全局默认模型数据迁移')

  const storage = new ProviderStorage()
  const globalConfig = new GlobalConfigManager()

  try {
    const providers = await storage.readAll()
    logger.info({ providerCount: providers.length }, '读取供应商配置')

    const defaultModels = collectDefaultModels(providers)
    logger.info({ defaultModelCount: defaultModels.length }, '找到默认模型')

    if (defaultModels.length === 0) {
      logger.info('没有找到默认模型，无需迁移')
      return
    }

    // 将第一个默认模型设为全局默认
    await globalConfig.setDefaultModelId(defaultModels[0].modelId)

    // 清除多余的默认标记
    const clearedCount = await clearExtraDefaults(storage, defaultModels.slice(1))

    logger.info(
      {
        globalDefaultModelId: defaultModels[0].modelId,
        clearedCount,
        totalDefaultModels: defaultModels.length,
      },
      '全局默认模型迁移完成',
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error({ error: msg }, '全局默认模型迁移失败')
    throw error
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  migrateGlobalDefaultModel()
    .then(() => {
      logger.info('全局默认模型迁移脚本执行完成')
      process.exit(0)
    })
    .catch((error) => {
      logger.error({ error }, '全局默认模型迁移脚本执行失败')
      process.exit(1)
    })
}

export { migrateGlobalDefaultModel }
