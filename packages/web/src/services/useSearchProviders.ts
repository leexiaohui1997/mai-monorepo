import { useState, useEffect } from 'react'

import { searchProviderService } from './searchProviderService'

import type { SearchProviderConfig } from '../../../api/src/search/types'

export function useSearchProviders() {
  const [providers, setProviders] = useState<SearchProviderConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProviders = async () => {
    try {
      setLoading(true)
      const res = await searchProviderService.list()
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
