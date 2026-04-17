import type { ToolRendererProps } from './registry'

interface SearchResult {
  title: string
  snippet: string
  url: string
}

interface SearchResponse {
  success: boolean
  results?: SearchResult[]
  error?: string
}

/** 错误状态渲染 */
function ErrorView({ error }: { error: string }) {
  return <div className="px-3 py-2 text-sm text-red-600 bg-red-50 rounded">⚠️ {error}</div>
}

/** 空结果渲染 */
function EmptyView() {
  return <div className="px-3 py-2 text-sm text-gray-400">未找到相关结果</div>
}

/** 单条搜索结果 */
function ResultItem({ item }: { item: SearchResult }) {
  return (
    <div className="py-2 border-b border-gray-100 last:border-b-0">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-blue-600 hover:underline"
      >
        {item.title}
      </a>
      <div className="text-xs text-gray-400 mt-0.5 truncate">{item.url}</div>
      <div className="text-xs text-gray-600 mt-1 leading-relaxed">{item.snippet}</div>
    </div>
  )
}

/** 联网搜索结果渲染组件 */
export function WebSearchRenderer({ result }: ToolRendererProps) {
  const data = result as SearchResponse | undefined
  if (!data) return null

  if (!data.success) {
    return <ErrorView error={data.error ?? '未知错误'} />
  }

  const results = data.results ?? []
  if (results.length === 0) {
    return <EmptyView />
  }

  return (
    <div className="px-3 py-1">
      {results.map((item, i) => (
        <ResultItem key={i} item={item} />
      ))}
    </div>
  )
}
