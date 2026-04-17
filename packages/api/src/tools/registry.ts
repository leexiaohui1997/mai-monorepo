import { readFileTool } from './readFile'

import type { CoreTool } from 'ai'

/**
 * 工具注册表
 *
 * 新增工具只需：
 * 1. 在 tools/ 目录下创建工具定义文件（使用 AI SDK 的 tool() 函数）
 * 2. 在此处 import 并添加到 toolRegistry 对象中
 *
 * toolRegistry 会直接传给 streamText 的 tools 参数
 */
export const toolRegistry: Record<string, CoreTool> = {
  readFile: readFileTool,
}
