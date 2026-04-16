#!/usr/bin/env node

/**
 * 构建 API sidecar
 * 使用 bun build 将 API 源码构建为 JS bundle，运行时使用系统安装的 Node.js/Bun
 */

import { execSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const platform = os.platform()

console.log(`[Sidecar Builder] Platform: ${platform}`)

// 确定平台名称
let platformName
if (platform === 'win32') {
  platformName = 'windows'
} else if (platform === 'darwin') {
  platformName = 'macos'
} else if (platform === 'linux') {
  platformName = 'linux'
} else {
  console.error('[Sidecar Builder] Unsupported platform:', platform)
  process.exit(1)
}

// 创建目标目录
const targetDir = join(__dirname, '..', 'src-tauri', 'binaries', `mai-api-${platformName}`)

console.log(`[Sidecar Builder] Preparing API package for ${platformName}...`)

try {
  // 清理旧目录（Windows 上目录可能被文件监视器锁定，改为清空内容）
  if (fs.existsSync(targetDir)) {
    for (const entry of fs.readdirSync(targetDir)) {
      const entryPath = join(targetDir, entry)
      fs.rmSync(entryPath, { recursive: true, force: true })
    }
  } else {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  const apiRoot = join(__dirname, '..', '..', '..', 'packages', 'api')

  // 使用 bun build 构建 API 为单文件 JS bundle
  // pino 和 pino-pretty 必须标记为 external，因为 pino 的 transport 机制依赖运行时动态加载模块
  // 必须设置 NODE_ENV=production，否则 bun build 会将 process.env.NODE_ENV 内联为开发环境值
  console.log('[Sidecar Builder] Building API with bun build...')
  execSync(
    `bun build src/index.ts --outdir "${targetDir}" --target bun --minify --external pino --external pino-pretty`,
    {
      cwd: apiRoot,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' },
    },
  )

  // 复制 package.json（用于运行时安装外部依赖）
  console.log('[Sidecar Builder] Copying package.json...')
  fs.copyFileSync(join(apiRoot, 'package.json'), join(targetDir, 'package.json'))

  // 创建启动脚本
  console.log('[Sidecar Builder] Creating startup script...')
  const startupScript =
    platform === 'win32' ? join(targetDir, 'start.bat') : join(targetDir, 'start.sh')

  const scriptContent = platform === 'win32' ? createWindowsScript() : createUnixScript()

  fs.writeFileSync(startupScript, scriptContent)

  if (platform !== 'win32') {
    fs.chmodSync(startupScript, 0o755)
  }

  // 预安装运行时依赖（仅 production），确保打包产物中包含 node_modules
  console.log('[Sidecar Builder] Installing runtime dependencies...')
  execSync('bun install --production', {
    cwd: targetDir,
    stdio: 'inherit',
  })

  console.log(`[Sidecar Builder] API package created at: ${targetDir}`)
  console.log('[Sidecar Builder] Note: User needs to have Bun or Node.js installed')
  console.log('[Sidecar Builder] Done!')
} catch (error) {
  console.error('[Sidecar Builder] Failed to build sidecar:', error.message)
  process.exit(1)
}

/** 生成 Windows 启动脚本（使用 goto 避免嵌套 if-else 的括号解析问题） */
function createWindowsScript() {
  const lines = [
    '@echo off',
    'echo [API] Checking dependencies...',
    'if exist "node_modules" goto :start_server',
    '',
    'echo [API] Installing dependencies...',
    'where bun >nul 2>&1',
    'if %errorlevel% equ 0 (',
    '  bun install',
    '  goto :start_server',
    ')',
    'where pnpm >nul 2>&1',
    'if %errorlevel% equ 0 (',
    '  pnpm install',
    '  goto :start_server',
    ')',
    'npm install',
    '',
    ':start_server',
    'echo [API] Starting server...',
    'where bun >nul 2>&1',
    'if %errorlevel% equ 0 (',
    '  bun run index.js',
    '  goto :eof',
    ')',
    'where node >nul 2>&1',
    'if %errorlevel% equ 0 (',
    '  node index.js',
    '  goto :eof',
    ')',
    'echo [ERROR] Neither Bun nor Node.js found!',
    'echo Please install Bun or Node.js',
    'pause',
    'exit /b 1',
  ]
  return lines.join('\r\n') + '\r\n'
}

/** 生成 Unix 启动脚本 */
function createUnixScript() {
  const lines = [
    '#!/bin/bash',
    'echo "[API] Checking dependencies..."',
    'if [ ! -d "node_modules" ]; then',
    '  echo "[API] Installing dependencies..."',
    '  if command -v bun &> /dev/null; then',
    '    bun install',
    '  elif command -v pnpm &> /dev/null; then',
    '    pnpm install',
    '  else',
    '    npm install',
    '  fi',
    'fi',
    'echo "[API] Starting server..."',
    'if command -v bun &> /dev/null; then',
    '  bun run index.js',
    'elif command -v node &> /dev/null; then',
    '  node index.js',
    'else',
    '  echo "[ERROR] Neither Bun nor Node.js found!"',
    '  echo "Please install Bun (https://bun.sh) or Node.js (https://nodejs.org)"',
    '  exit 1',
    'fi',
  ]
  return lines.join('\n') + '\n'
}
