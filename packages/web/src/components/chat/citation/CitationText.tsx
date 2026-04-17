import React from 'react'

import { useSearchSources } from './CitationContext'
import { CitationTooltip } from './CitationTooltip'
import { parseCitations } from './parseCitations'

import type { CitationSegment } from './parseCitations'

/**
 * 递归处理 React children，将字符串中的 [n] 引用标记替换为 CitationTooltip。
 * 非字符串节点（如 <code>、<a> 等）保持不变。
 */
export function CitationText({ children }: { children: React.ReactNode }) {
  const sources = useSearchSources()

  if (!sources.length) return <>{children}</>

  return <>{processChildren(children, sources)}</>
}

/** 递归处理 children 节点 */
function processChildren(
  children: React.ReactNode,
  sources: { title: string; url: string; snippet: string }[],
): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === 'string') {
      return renderSegments(parseCitations(child, sources))
    }
    return child
  })
}

/** 将解析后的片段渲染为 React 节点 */
function renderSegments(segments: CitationSegment[]): React.ReactNode {
  return segments.map((seg, i) => {
    if (typeof seg === 'string') return seg
    return <CitationTooltip key={i} sources={seg.sources} />
  })
}
