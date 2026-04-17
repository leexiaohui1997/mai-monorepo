import type { ToolRendererProps } from './registry'

/** 通用默认工具渲染组件 — 以 JSON 格式展示工具参数和结果 */
export function DefaultToolRenderer({ args, result }: ToolRendererProps) {
  return (
    <div className="px-3 py-2 space-y-2 text-sm">
      <div>
        <span className="text-gray-500 text-xs">参数：</span>
        <pre className="mt-1 text-xs bg-white rounded p-2 overflow-x-auto">
          {JSON.stringify(args, null, 2)}
        </pre>
      </div>
      {result !== undefined && (
        <div>
          <span className="text-gray-500 text-xs">结果：</span>
          <pre className="mt-1 text-xs bg-white rounded p-2 overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
