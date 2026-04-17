import CodeBlock from '../markdown/CodeBlock'

import type { ToolRendererProps } from './registry'

/** 推断文件语言（用于语法高亮） */
function inferLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  const extMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    html: 'html',
    css: 'css',
    sql: 'sql',
    sh: 'bash',
  }
  return extMap[ext] ?? 'text'
}

/** 文件查看工具专属渲染组件（作为卡片 Body 渲染） */
export function ReadFileRenderer({ result }: ToolRendererProps) {
  const data = result as
    | {
        success: boolean
        filePath?: string
        content?: string
        error?: string
        truncated?: boolean
        message?: string
      }
    | undefined

  if (!data) return null

  // 错误状态
  if (!data.success) {
    return <div className="px-3 py-2 text-sm text-red-600">❌ {data.error}</div>
  }

  const filePath = data.filePath ?? '未知文件'
  const language = inferLanguage(filePath)

  return (
    <div className="px-3 py-2">
      {data.truncated && <div className="text-xs text-amber-600 mb-1">⚠️ {data.message}</div>}
      <CodeBlock language={language}>{data.content ?? ''}</CodeBlock>
    </div>
  )
}
