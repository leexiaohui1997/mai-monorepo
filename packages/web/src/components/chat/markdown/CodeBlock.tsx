import { CheckOutlined, CopyOutlined } from '@ant-design/icons'
import { useCallback, useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

/** 语言标识 → 显示名称映射 */
const LANGUAGE_LABELS: Record<string, string> = {
  js: 'JavaScript',
  jsx: 'JavaScript (JSX)',
  ts: 'TypeScript',
  tsx: 'TypeScript (TSX)',
  py: 'Python',
  rb: 'Ruby',
  go: 'Go',
  rs: 'Rust',
  sh: 'Shell',
  bash: 'Bash',
  zsh: 'Zsh',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  md: 'Markdown',
  html: 'HTML',
  css: 'CSS',
  sql: 'SQL',
}

/** 获取语言显示名称 */
function getLanguageLabel(lang: string): string {
  return LANGUAGE_LABELS[lang] ?? lang.toUpperCase()
}

interface CodeBlockProps {
  /** 编程语言 */
  language: string
  /** 代码文本 */
  children: string
}

/** 代码块渲染组件（语法高亮 + 头部栏 + 复制） */
export default function CodeBlock({ language, children }: CodeBlockProps) {
  const label = getLanguageLabel(language)
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(children)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {
        /* 静默处理 */
      })
  }, [children])

  return (
    <div className="rounded-lg overflow-hidden my-3">
      {/* head：语言标签 + 复制按钮 */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e2e] text-gray-300 text-xs">
        <span>{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-gray-400 hover:text-gray-200 cursor-pointer bg-transparent border-none text-xs"
        >
          {copied ? <CheckOutlined /> : <CopyOutlined />}
          <span>{copied ? '已复制' : '复制'}</span>
        </button>
      </div>

      {/* body：代码内容 */}
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        customStyle={{ margin: 0, borderRadius: 0 }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  )
}
