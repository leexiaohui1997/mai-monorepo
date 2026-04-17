import { CitationText } from '../citation/CitationText'

import CodeBlock from './CodeBlock'
import { ErrorBoundary } from './ErrorBoundary'

import type { Components } from 'react-markdown'
import type { ExtraProps } from 'react-markdown'

/**
 * Markdown 自定义组件注册表
 *
 * 新增组件只需：
 * 1. 在 markdown/ 目录下创建组件文件
 * 2. 在此处导入并注册到 markdownComponents 中
 *
 * 所有自定义组件均由 ErrorBoundary 包裹，渲染异常时自动降级为默认元素
 */
export const markdownComponents: Partial<Components> = {
  // 段落：对文本子节点做引用标记替换
  p({ children }) {
    return (
      <p>
        <CitationText>{children}</CitationText>
      </p>
    )
  },
  // 列表项：对文本子节点做引用标记替换
  li({ children }) {
    return (
      <li>
        <CitationText>{children}</CitationText>
      </li>
    )
  },
  // 重置 react-markdown 默认 <pre> 标签的样式，避免代码块外多余间距
  pre({ children }) {
    return <pre style={{ margin: 0, padding: 0 }}>{children}</pre>
  },
  code({ className, children, ...props }: React.HTMLAttributes<HTMLElement> & ExtraProps) {
    const match = /language-(\w+)/.exec(className || '')
    const codeStr = String(children).replace(/\n$/, '')

    if (match) {
      const rendered = <CodeBlock language={match[1]}>{codeStr}</CodeBlock>
      const fallback = (
        <code className={className} {...props}>
          {children}
        </code>
      )
      return <ErrorBoundary fallback={fallback}>{rendered}</ErrorBoundary>
    }

    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },
}
