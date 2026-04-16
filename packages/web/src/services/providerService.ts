import api from './api'

import type {
  ProviderConfig,
  ModelConfig,
  CreateProviderInput,
  UpdateProviderInput,
  CreateModelInput,
  UpdateModelInput,
} from '../../../api/src/providers/types'

export const providerService = {
  list: () => api.get<{ data: ProviderConfig[] }>('/providers').then((res) => res.data),
  get: (id: string) =>
    api.get<{ data: ProviderConfig }>(`/providers/${id}`).then((res) => res.data),
  create: (data: CreateProviderInput) =>
    api.post<{ data: ProviderConfig }>('/providers', data).then((res) => res.data),
  update: (id: string, data: UpdateProviderInput) =>
    api.put<{ data: ProviderConfig }>(`/providers/${id}`, data).then((res) => res.data),
  delete: (id: string) => api.delete(`/providers/${id}`).then((res) => res.data),
  test: (id: string, modelId?: string) =>
    api
      .post<{ success: boolean; message: string }>(`/providers/${id}/test`, { modelId })
      .then((res) => res.data),
  setDefault: (id: string) =>
    api.post<{ data: ProviderConfig }>(`/providers/${id}/set-default`).then((res) => res.data),

  // 模型管理
  addModel: (providerId: string, data: CreateModelInput) =>
    api
      .post<{ data: ModelConfig }>(`/providers/${providerId}/models`, data)
      .then((res) => res.data),
  updateModel: (providerId: string, modelId: string, data: UpdateModelInput) =>
    api
      .put<{ data: ModelConfig }>(`/providers/${providerId}/models/${modelId}`, data)
      .then((res) => res.data),
  deleteModel: (providerId: string, modelId: string) =>
    api.delete(`/providers/${providerId}/models/${modelId}`).then((res) => res.data),
  setDefaultModel: (providerId: string, modelId: string) =>
    api
      .post<{ data: ModelConfig }>(`/providers/${providerId}/models/${modelId}/set-default`)
      .then((res) => res.data),
}
