import { Component } from 'react'

import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  /** 降级时渲染的内容 */
  fallback: ReactNode
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * 轻量级错误边界
 *
 * 捕获子组件渲染异常，降级为 fallback 内容
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[Markdown 组件渲染异常]', error, info)
  }

  render() {
    if (this.state.hasError) return this.fallback
    return this.props.children
  }

  private get fallback() {
    return this.props.fallback
  }
}
