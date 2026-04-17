/** 搜索来源条目 */
export interface SearchSource {
  title: string
  url: string
  snippet: string
}

/** 一组连续引用标记（如 [1][2][3] 合并为一组） */
export interface CitationGroup {
  type: 'citation'
  /** 该组引用对应的来源列表 */
  sources: SearchSource[]
}

/** 解析结果：纯文本或引用组 */
export type CitationSegment = string | CitationGroup

/** 匹配连续的 [数字] 标记组，如 [1][2][3] */
const CITATION_GROUP_RE = /(\[\d+\])+/g

/** 拆分单个引用组中的各编号 */
const SINGLE_CITATION_RE = /\[(\d+)\]/g

/**
 * 解析文本中的引用标记，返回文本与引用组的混合数组。
 *
 * - 无 sources 时直接返回原文本
 * - 编号超出 sources 范围时降级为纯文本
 */
export function parseCitations(text: string, sources: SearchSource[]): CitationSegment[] {
  if (!sources.length) return [text]

  const segments: CitationSegment[] = []
  let lastIndex = 0

  for (const match of text.matchAll(CITATION_GROUP_RE)) {
    const matchStart = match.index!
    // 添加匹配前的纯文本
    if (matchStart > lastIndex) {
      segments.push(text.slice(lastIndex, matchStart))
    }

    // 提取该组中所有有效引用
    const validSources = extractValidSources(match[0], sources)

    if (validSources.length > 0) {
      segments.push({ type: 'citation', sources: validSources })
    } else {
      // 全部无效，降级为纯文本
      segments.push(match[0])
    }

    lastIndex = matchStart + match[0].length
  }

  // 添加剩余文本
  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex))
  }

  return segments
}

/** 从引用组字符串中提取有效的 sources */
function extractValidSources(group: string, sources: SearchSource[]): SearchSource[] {
  const result: SearchSource[] = []

  for (const m of group.matchAll(SINGLE_CITATION_RE)) {
    const index = parseInt(m[1], 10) - 1
    if (index >= 0 && index < sources.length) {
      result.push(sources[index])
    }
  }

  return result
}
