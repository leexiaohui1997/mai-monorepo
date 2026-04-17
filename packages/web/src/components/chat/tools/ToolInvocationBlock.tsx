import { DownOutlined, LoadingOutlined, RightOutlined } from '@ant-design/icons'
import { useState } from 'react'

import { DefaultToolRenderer } from './DefaultToolRenderer'
import { toolRenderers } from './registry'

import type { ToolInvocation } from 'ai'

/** 工具显示名称映射 */
const TOOL_LABELS: Record<string, string> = {
  readFile: '读取文件',
  webSearch: '联网搜索',
}

/** 获取工具显示名称 */
function getToolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] ?? toolName
}

/** 格式化参数摘要（取前 80 字符） */
function formatArgsSummary(args: Record<string, unknown>): string {
  const text = Object.entries(args)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(', ')
  return text.length > 80 ? text.slice(0, 80) + '...' : text
}

/** 判断是否处于调用中状态 */
function isCalling(state: string): boolean {
  return state === 'call' || state === 'partial-call'
}

interface Props {
  invocation: ToolInvocation
}

/** 单个工具调用卡片（Head + Body） */
export function ToolInvocationBlock({ invocation }: Props) {
  const calling = isCalling(invocation.state)
  const [expanded, setExpanded] = useState(calling)

  const label = calling ? '正在调用' : '已调用'
  const toolLabel = getToolLabel(invocation.toolName)
  const args = (invocation.args ?? {}) as Record<string, unknown>

  const Renderer = toolRenderers[invocation.toolName] ?? DefaultToolRenderer
  const Icon = expanded ? DownOutlined : RightOutlined

  return (
    <div className="my-2 border border-gray-200 rounded-lg overflow-hidden">
      {/* Head */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-1.5 w-full px-3 py-2 text-xs text-gray-500 hover:text-gray-700 cursor-pointer bg-gray-50 border-none"
      >
        {calling ? <LoadingOutlined spin /> : <Icon style={{ fontSize: 10 }} />}
        <span>
          {label} <strong className="text-gray-700">{toolLabel}</strong>
        </span>
        <span className="text-gray-400 truncate max-w-75">{formatArgsSummary(args)}</span>
      </button>

      {/* Body：工具结果 */}
      {expanded && !calling && (
        <div className="border-t border-gray-200">
          <Renderer
            toolName={toolLabel}
            args={args}
            result={'result' in invocation ? invocation.result : undefined}
          />
        </div>
      )}
    </div>
  )
}
