import api from './api'

/** 工具执行结果 */
export interface ToolExecuteResult {
  success: boolean
  result?: unknown
  error?: string
}

/** 调用后端执行指定工具 */
export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
): Promise<ToolExecuteResult> {
  const { data } = await api.post<ToolExecuteResult>('/tools/execute', { toolName, args })
  return data
}
