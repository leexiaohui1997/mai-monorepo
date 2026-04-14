import api from './api';
import type { ProviderConfig, CreateProviderInput, UpdateProviderInput } from '../../../api/src/providers/types';

export const providerService = {
  list: () => api.get<{ data: ProviderConfig[] }>('/providers').then(res => res.data),
  get: (id: string) => api.get<{ data: ProviderConfig }>(`/providers/${id}`).then(res => res.data),
  create: (data: CreateProviderInput) => api.post<{ data: ProviderConfig }>('/providers', data).then(res => res.data),
  update: (id: string, data: UpdateProviderInput) => api.put<{ data: ProviderConfig }>(`/providers/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/providers/${id}`).then(res => res.data),
  test: (id: string) => api.post<{ success: boolean; message: string }>(`/providers/${id}/test`).then(res => res.data),
  setDefault: (id: string) => api.post<{ data: ProviderConfig }>(`/providers/${id}/set-default`).then(res => res.data),
};
