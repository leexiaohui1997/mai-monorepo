#!/usr/bin/env node

/**
 * 构建包装脚本
 * 1. 运行 sidecar 构建
 * 2. 根据当前平台动态设置 TAURI_CONFIG，注入 bundle.resources
 * 3. 调用 tauri build
 */

import { spawn } from 'child_process'
import os from 'os'

// 确定平台名称
const platformMap = { win32: 'windows', darwin: 'macos', linux: 'linux' }
const platformName = platformMap[os.platform()]

if (!platformName) {
  console.error(`[Build] Unsupported platform: ${os.platform()}`)
  process.exit(1)
}

// 构建 TAURI_CONFIG，仅覆盖 bundle.resources
const tauriConfig = {
  bundle: {
    resources: [`binaries/mai-api-${platformName}/**/*`],
  },
}

console.log(`[Build] Platform: ${platformName}`)
console.log(`[Build] Injecting bundle.resources: binaries/mai-api-${platformName}/**/*`)

// 调用 tauri build，通过环境变量注入配置
const child = spawn('pnpm', ['tauri', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    TAURI_CONFIG: JSON.stringify(tauriConfig),
  },
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})

child.on('error', (err) => {
  console.error('[Build] Failed to start tauri build:', err)
  process.exit(1)
})
