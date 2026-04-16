#!/usr/bin/env node

/**
 * Dev 模式启动脚本
 * 同时启动 API 和 Web 服务，并设置正确的数据目录
 */

import { spawn } from 'child_process'
import os from 'os'
import path from 'path'

// 获取用户主目录
const homeDir = os.homedir()

// 设置开发环境数据目录
const devDataDir = path.join(homeDir, '.mai', 'dev')

console.log(`[Dev Launcher] Data directory: ${devDataDir}`)
console.log('[Dev Launcher] Starting API and Web services...\n')

// 启动 API 服务
const apiProcess = spawn('pnpm', ['--filter', 'api', 'dev'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    MAI_DATA_DIR: devDataDir,
  },
  shell: true,
})

// 等待一小段时间确保 API 启动
setTimeout(() => {
  // 启动 Web 服务
  const webProcess = spawn('pnpm', ['--filter', 'web', 'dev'], {
    stdio: 'inherit',
    shell: true,
  })

  webProcess.on('error', (err) => {
    console.error('[Dev Launcher] Failed to start Web service:', err)
  })

  webProcess.on('exit', (code) => {
    console.log(`[Dev Launcher] Web service exited with code ${code}`)
  })
}, 1000)

apiProcess.on('error', (err) => {
  console.error('[Dev Launcher] Failed to start API service:', err)
})

apiProcess.on('exit', (code) => {
  console.log(`[Dev Launcher] API service exited with code ${code}`)
})

// 处理进程退出
process.on('SIGINT', () => {
  console.log('\n[Dev Launcher] Shutting down...')
  apiProcess.kill('SIGINT')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n[Dev Launcher] Shutting down...')
  apiProcess.kill('SIGTERM')
  process.exit(0)
})
