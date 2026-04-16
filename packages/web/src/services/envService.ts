import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

/** 环境检测结果 */
export interface EnvCheckResult {
  name: string
  installed: boolean
  version: string | null
}

/** 检测 Bun 是否已安装 */
export function checkBun(): Promise<EnvCheckResult> {
  return invoke<EnvCheckResult>('check_bun')
}

/** 触发 Bun 安装 */
export function installBun(): Promise<string> {
  return invoke<string>('install_bun')
}

/** 监听安装日志事件，返回取消监听函数 */
export function onInstallLog(callback: (line: string) => void): Promise<UnlistenFn> {
  return listen<string>('install-log', (event) => {
    callback(event.payload)
  })
}
