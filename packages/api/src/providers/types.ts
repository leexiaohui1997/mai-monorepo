export interface ProviderConfig {
  id: string
  name: string
  type: 'openai' | 'anthropic' | 'custom'
  apiKey: string
  baseURL?: string
  model?: string
  enabled: boolean
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateProviderInput {
  name: string
  type: 'openai' | 'anthropic' | 'custom'
  apiKey: string
  baseURL?: string
  model?: string
}

export interface UpdateProviderInput {
  name?: string
  type?: 'openai' | 'anthropic' | 'custom'
  apiKey?: string
  baseURL?: string
  model?: string
  enabled?: boolean
  isDefault?: boolean
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
