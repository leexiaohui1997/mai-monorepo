import { LinkOutlined } from '@ant-design/icons'

import type { SearchSource } from './parseCitations'

interface Props {
  sources: SearchSource[]
}

/**
 * 引用 Badge 组件
 *
 * 圆形灰色背景，内联渲染。
 * - 引用数量为 1 时仅展示链接图标
 * - 引用数量 > 1 时图标后展示数量
 *
 * 结构：BadgeWrapper -> [Icon, Count]
 */
export function CitationBadge({ sources }: Props) {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600 text-xs cursor-pointer align-middle mx-0.5 leading-none">
      <LinkOutlined style={{ fontSize: 10 }} />
      {sources.length > 1 && <span>{sources.length}</span>}
    </span>
  )
}
