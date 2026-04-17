import api from './api'

import type {
  SearchProviderConfig,
  CreateSearchProviderInput,
  UpdateSearchProviderInput,
} from '../../../api/src/search/types'

export const searchProviderService = {
  /** 获取所有搜索服务配置 */
  list: () =>
    api.get<{ data: SearchProviderConfig[] }>('/search-providers').then((res) => res.data),

  /** 创建搜索服务 */
  create: (data: CreateSearchProviderInput) =>
    api.post<{ data: SearchProviderConfig }>('/search-providers', data).then((res) => res.data),

  /** 更新搜索服务 */
  update: (id: string, data: UpdateSearchProviderInput) =>
    api
      .put<{ data: SearchProviderConfig }>(`/search-providers/${id}`, data)
      .then((res) => res.data),

  /** 删除搜索服务 */
  delete: (id: string) => api.delete(`/search-providers/${id}`).then((res) => res.data),

  /** 测试连接 */
  test: (id: string) =>
    api
      .post<{ success: boolean; message: string }>(`/search-providers/${id}/test`)
      .then((res) => res.data),
}
