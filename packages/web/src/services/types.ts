/** 扁平化后的模型项 */
export interface ModelOption {
  /** 组合键：providerId:modelId */
  key: string
  providerId: string
  modelId: string
  modelName: string
  displayName: string
  providerName: string
  isDefault?: boolean
}
