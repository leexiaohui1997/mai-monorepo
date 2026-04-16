export interface ModelConfig {
  id: string
  name: string
  displayName: string
  isDefault: boolean
}

export interface ProviderConfig {
  id: string
  name: string
  type: 'openai' | 'anthropic' | 'custom'
  apiKey: string
  baseURL?: string
  models: ModelConfig[]
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
  models?: ModelConfig[]
}

export interface UpdateProviderInput {
  name?: string
  type?: 'openai' | 'anthropic' | 'custom'
  apiKey?: string
  baseURL?: string
  enabled?: boolean
  isDefault?: boolean
}

export interface CreateModelInput {
  name: string
  displayName: string
}

export interface UpdateModelInput {
  name?: string
  displayName?: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
