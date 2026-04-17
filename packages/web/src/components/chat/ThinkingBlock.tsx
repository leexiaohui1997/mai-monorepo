import { DownOutlined, RightOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'

interface Props {
  /** 思考内容文本 */
  reasoning: string
  /** 是否正在流式生成中 */
  isStreaming?: boolean
}

/** AI 思考过程可折叠展示组件 */
export const ThinkingBlock: React.FC<Props> = ({ reasoning, isStreaming = false }) => {
  const [expanded, setExpanded] = useState(isStreaming)

  // 思考中自动展开，思考完成自动折叠
  useEffect(() => {
    setExpanded(isStreaming)
  }, [isStreaming])

  const toggle = () => setExpanded((prev) => !prev)

  const label = isStreaming ? '思考中...' : '已深度思考'
  const Icon = expanded ? DownOutlined : RightOutlined

  return (
    <div className="mb-2 border border-gray-200 rounded-lg overflow-hidden">
      {/* head：折叠/展开触发行 */}
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-1.5 w-full px-3 py-2 text-xs text-gray-500 hover:text-gray-700 cursor-pointer bg-gray-50 border-none"
      >
        <Icon style={{ fontSize: 10 }} />
        <span>{label}</span>
      </button>

      {/* body：思考内容 */}
      {expanded && (
        <div className="px-3 py-2 text-xs text-gray-600 leading-relaxed whitespace-pre-wrap border-t border-gray-200">
          {reasoning}
        </div>
      )}
    </div>
  )
}
