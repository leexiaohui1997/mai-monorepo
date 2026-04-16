import { useState, useEffect } from 'react'

import { providerService } from '../services/providerService'

import type { ProviderConfig } from '../../../api/src/providers/types'

export function useProviders() {
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProviders = async () => {
    try {
      setLoading(true)
      const res = await providerService.list()
      setProviders(res.data || [])
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProviders()
  }, [])

  return { providers, loading, error, refresh: fetchProviders }
}
