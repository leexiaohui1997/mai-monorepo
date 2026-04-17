import { ExportOutlined } from '@ant-design/icons'
import { Popover } from 'antd'

import { CitationBadge } from './CitationBadge'

import type { SearchSource } from './parseCitations'

interface Props {
  sources: SearchSource[]
}

/** 单条引用条目 */
function CitationItem({ source }: { source: SearchSource }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-b-0">
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 min-w-0 text-sm text-blue-600 hover:underline truncate"
        title={source.title}
      >
        {source.title}
      </a>
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 text-gray-400 hover:text-gray-600"
      >
        <ExportOutlined style={{ fontSize: 12 }} />
      </a>
    </div>
  )
}

/** 弹层内容：引用列表 */
function TooltipContent({ sources }: Props) {
  return (
    <div className="max-w-xs">
      {sources.map((source, i) => (
        <CitationItem key={i} source={source} />
      ))}
    </div>
  )
}

/**
 * 引用 Tooltip 组件
 *
 * 鼠标 hover Badge 时显示弹层，列出引用条目。
 * 点击标题或图标在新标签页打开 URL。
 */
export function CitationTooltip({ sources }: Props) {
  return (
    <Popover
      content={<TooltipContent sources={sources} />}
      trigger="hover"
      placement="top"
      arrow={false}
    >
      <span>
        <CitationBadge sources={sources} />
      </span>
    </Popover>
  )
}
