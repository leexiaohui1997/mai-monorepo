#!/usr/bin/env node

/**
 * 构建包装脚本
 * 1. 运行 sidecar 构建
 * 2. 根据当前平台通过 --config 参数注入 bundle.resources
 * 3. 调用 tauri build
 */

import os from 'os'

import spawn from 'cross-spawn'

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

// 调用 tauri build，通过 --config 参数注入配置（Tauri 2.x 不再支持 TAURI_CONFIG 环境变量）
// 注意：不能使用 shell: true，否则 JSON 中的引号会被 shell 吞掉
const configJson = JSON.stringify(tauriConfig)
const child = spawn('pnpm', ['tauri', 'build', '--config', configJson], {
  stdio: 'inherit',
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})

child.on('error', (err) => {
  console.error('[Build] Failed to start tauri build:', err)
  process.exit(1)
})
