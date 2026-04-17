import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  ReloadOutlined,
  RightOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Button } from 'antd'
import { useState } from 'react'

import { executeToolCall } from '../../../services/toolService'

import { DefaultToolRenderer } from './DefaultToolRenderer'
import { toolRenderers } from './registry'

import type { AddToolResultFn } from '../MessageList'
import type { ToolInvocation } from 'ai'

/** 工具显示名称映射 */
const TOOL_LABELS: Record<string, string> = {
  readFile: '读取文件',
  webSearch: '联网搜索',
}

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

/** 前端本地执行状态 */
type LocalState = 'idle' | 'executing' | 'error'

interface Props {
  invocation: ToolInvocation
  addToolResult: AddToolResultFn
}

/** 解析 result 中的特殊标记 */
function getResultMeta(invocation: ToolInvocation) {
  if (!('result' in invocation)) return { rejected: false, expired: false }
  const r = invocation.result as Record<string, unknown> | undefined
  return {
    rejected: !!r?.rejected,
    expired: !!r?.expired,
  }
}

/** 确认操作按钮区域 */
function ConfirmActions({
  toolCallId,
  toolName,
  args,
  addToolResult,
  localState,
  setLocalState,
  errorMsg,
  setErrorMsg,
}: {
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
  addToolResult: AddToolResultFn
  localState: LocalState
  setLocalState: (s: LocalState) => void
  errorMsg: string
  setErrorMsg: (s: string) => void
}) {
  const handleAllow = async () => {
    setLocalState('executing')
    setErrorMsg('')
    try {
      const res = await executeToolCall(toolName, args)
      const result = res.success ? res.result : { success: false, error: res.error }
      addToolResult({ toolCallId, result })
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : '执行失败')
      setLocalState('error')
    }
  }

  const handleReject = () => {
    addToolResult({ toolCallId, result: { rejected: true, reason: '用户拒绝执行' } })
  }

  if (localState === 'executing') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500">
        <LoadingOutlined spin /> 正在执行...
      </div>
    )
  }

  if (localState === 'error') {
    return (
      <div className="px-3 py-2">
        <div className="text-xs text-red-500 mb-1">
          <ExclamationCircleOutlined className="mr-1" />
          {errorMsg}
        </div>
        <Button size="small" icon={<ReloadOutlined />} onClick={handleAllow}>
          重试
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={handleAllow}>
        允许
      </Button>
      <Button size="small" danger icon={<CloseCircleOutlined />} onClick={handleReject}>
        拒绝
      </Button>
    </div>
  )
}

/** 单个工具调用卡片（Head + Body） */
export function ToolInvocationBlock({ invocation, addToolResult }: Props) {
  const [localState, setLocalState] = useState<LocalState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const args = (invocation.args ?? {}) as Record<string, unknown>
  const toolLabel = getToolLabel(invocation.toolName)
  const Renderer = toolRenderers[invocation.toolName] ?? DefaultToolRenderer

  // 等待确认状态
  if (invocation.state === 'call') {
    return (
      <PendingCard
        invocation={invocation}
        args={args}
        toolLabel={toolLabel}
        addToolResult={addToolResult}
        localState={localState}
        setLocalState={setLocalState}
        errorMsg={errorMsg}
        setErrorMsg={setErrorMsg}
      />
    )
  }

  // 参数流式生成中
  if (invocation.state === 'partial-call') {
    return <StreamingCard toolLabel={toolLabel} args={args} />
  }

  // result 状态 — 区分正常/拒绝/过期
  const { rejected, expired } = getResultMeta(invocation)
  if (rejected) return <RejectedCard toolLabel={toolLabel} args={args} />
  if (expired) return <ExpiredCard toolLabel={toolLabel} args={args} />

  return (
    <CompletedCard invocation={invocation} args={args} toolLabel={toolLabel} Renderer={Renderer} />
  )
}

/** 等待确认卡片 — 橙色强调 */
function PendingCard({
  invocation,
  args,
  toolLabel,
  addToolResult,
  localState,
  setLocalState,
  errorMsg,
  setErrorMsg,
}: {
  invocation: ToolInvocation
  args: Record<string, unknown>
  toolLabel: string
  addToolResult: AddToolResultFn
  localState: LocalState
  setLocalState: (s: LocalState) => void
  errorMsg: string
  setErrorMsg: (s: string) => void
}) {
  return (
    <div className="my-2 border-l-3 border-l-orange-400 border border-orange-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 text-xs bg-orange-50">
        <WarningOutlined className="text-orange-500" />
        <span className="text-orange-600 font-medium">请求执行</span>
        <strong className="text-gray-700">{toolLabel}</strong>
        <span className="text-gray-400 truncate max-w-75">{formatArgsSummary(args)}</span>
      </div>
      <div className="border-t border-orange-200 px-3 py-2 text-xs text-gray-600">
        <div className="mb-2">
          <pre className="whitespace-pre-wrap break-all bg-gray-50 rounded p-2 text-xs">
            {JSON.stringify(args, null, 2)}
          </pre>
        </div>
        <ConfirmActions
          toolCallId={invocation.toolCallId}
          toolName={invocation.toolName}
          args={args}
          addToolResult={addToolResult}
          localState={localState}
          setLocalState={setLocalState}
          errorMsg={errorMsg}
          setErrorMsg={setErrorMsg}
        />
      </div>
    </div>
  )
}

/** 参数流式生成中卡片 */
function StreamingCard({ toolLabel, args }: { toolLabel: string; args: Record<string, unknown> }) {
  return (
    <div className="my-2 border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 bg-gray-50">
        <LoadingOutlined spin />
        <span>
          正在调用 <strong className="text-gray-700">{toolLabel}</strong>
        </span>
        <span className="text-gray-400 truncate max-w-75">{formatArgsSummary(args)}</span>
      </div>
    </div>
  )
}

/** 已拒绝卡片 — 灰色弱化 */
function RejectedCard({ toolLabel, args }: { toolLabel: string; args: Record<string, unknown> }) {
  return (
    <div className="my-2 border border-gray-200 rounded-lg overflow-hidden opacity-60">
      <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 bg-gray-50">
        <CloseCircleOutlined />
        <span>
          已拒绝 <strong>{toolLabel}</strong>
        </span>
        <span className="truncate max-w-75">{formatArgsSummary(args)}</span>
      </div>
      <div className="border-t border-gray-200 px-3 py-2 text-xs text-gray-400">用户拒绝执行</div>
    </div>
  )
}

/** 已过期卡片 — 灰色弱化 */
function ExpiredCard({ toolLabel, args }: { toolLabel: string; args: Record<string, unknown> }) {
  return (
    <div className="my-2 border border-gray-200 rounded-lg overflow-hidden opacity-60">
      <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 bg-gray-50">
        <ExclamationCircleOutlined />
        <span>
          已过期 <strong>{toolLabel}</strong>
        </span>
        <span className="truncate max-w-75">{formatArgsSummary(args)}</span>
      </div>
      <div className="border-t border-gray-200 px-3 py-2 text-xs text-gray-400">
        该工具调用未完成（会话中断）
      </div>
    </div>
  )
}

/** 已完成卡片 — 可折叠展示结果 */
function CompletedCard({
  invocation,
  args,
  toolLabel,
  Renderer,
}: {
  invocation: ToolInvocation
  args: Record<string, unknown>
  toolLabel: string
  Renderer: React.ComponentType<{
    toolName: string
    args: Record<string, unknown>
    result?: unknown
  }>
}) {
  const [expanded, setExpanded] = useState(false)
  const Icon = expanded ? DownOutlined : RightOutlined

  return (
    <div className="my-2 border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-1.5 w-full px-3 py-2 text-xs text-gray-500 hover:text-gray-700 cursor-pointer bg-gray-50 border-none"
      >
        <Icon style={{ fontSize: 10 }} />
        <span>
          已调用 <strong className="text-gray-700">{toolLabel}</strong>
        </span>
        <span className="text-gray-400 truncate max-w-75">{formatArgsSummary(args)}</span>
      </button>
      {expanded && (
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
