import { useState, useEffect } from 'react'

import { providerService } from '../services/providerService'

import type { ModelOption } from './types'

// 重新导出类型，方便外部使用
export type { ModelOption } from './types'

export function useModels() {
  const [models, setModels] = useState<ModelOption[]>([])
  const [defaultModelKey, setDefaultModelKey] = useState<string>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true)
        const res = await providerService.listModels()
        const list = res.data || []
        setModels(list)
        const defaultItem = list.find((m) => m.isDefault)
        setDefaultModelKey(defaultItem?.key || list[0]?.key)
      } catch {
        setModels([])
        setDefaultModelKey(undefined)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  return { models, defaultModelKey, loading }
}
