import { ReadFileRenderer } from './ReadFileRenderer'
import { WebSearchRenderer } from './WebSearchRenderer'

import type { ComponentType } from 'react'

/** 工具渲染组件的 Props 类型 */
export interface ToolRendererProps {
  /** 工具名称 */
  toolName: string
  /** 工具调用参数 */
  args: Record<string, unknown>
  /** 工具返回结果 */
  result?: unknown
}

/**
 * 工具渲染注册表
 *
 * 新增工具渲染器只需：
 * 1. 在 tools/ 目录下创建渲染组件文件
 * 2. 在此处 import 并注册到 toolRenderers 中
 *
 * 未注册的工具将使用 DefaultToolRenderer 渲染
 */
export const toolRenderers: Record<string, ComponentType<ToolRendererProps>> = {
  readFile: ReadFileRenderer,
  webSearch: WebSearchRenderer,
}
