import { readFileTool } from './readFile'
import { webSearchTool } from './webSearch'

import type { CoreTool } from 'ai'

/** 工具确认策略 */
export type ToolConfirmation = 'always' | 'never'

/** 工具元信息 */
export interface ToolMeta {
  /** 是否需要用户确认，默认 'always' */
  confirmation: ToolConfirmation
}

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
  webSearch: webSearchTool,
}

/**
 * 工具元信息映射表
 *
 * 声明每个工具的确认策略等元信息，
 * 未在此处声明的工具默认视为 confirmation: 'always'
 */
export const toolMeta: Record<string, ToolMeta> = {
  readFile: { confirmation: 'always' },
  webSearch: { confirmation: 'always' },
}

/** 获取工具元信息，未声明时默认 confirmation: 'always' */
export function getToolMeta(toolName: string): ToolMeta {
  return toolMeta[toolName] ?? { confirmation: 'always' }
}
