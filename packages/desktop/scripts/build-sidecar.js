#!/usr/bin/env node

/**
 * 构建 API sidecar
 * 打包 API 源代码，运行时使用系统安装的 Node.js/Bun
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const platform = os.platform();

console.log(`[Sidecar Builder] Platform: ${platform}`);

// 确定平台名称
let platformName;
if (platform === 'win32') {
  platformName = 'windows';
} else if (platform === 'darwin') {
  platformName = 'macos';
} else if (platform === 'linux') {
  platformName = 'linux';
} else {
  console.error('[Sidecar Builder] Unsupported platform:', platform);
  process.exit(1);
}

// 创建目标目录
const targetDir = join(__dirname, '..', 'src-tauri', 'binaries', `mai-api-${platformName}`);

console.log(`[Sidecar Builder] Preparing API package for ${platformName}...`);

try {
  // 清理旧目录
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  
  // 创建目标目录
  fs.mkdirSync(targetDir, { recursive: true });
  
  const apiRoot = join(__dirname, '..', '..', '..', 'packages', 'api');
  
  // 复制 API 源代码
  console.log('[Sidecar Builder] Copying API source code...');
  const srcDir = join(apiRoot, 'src');
  const targetSrcDir = join(targetDir, 'src');
  fs.cpSync(srcDir, targetSrcDir, { recursive: true });
  
  // 复制 package.json
  console.log('[Sidecar Builder] Copying package.json...');
  fs.copyFileSync(
    join(apiRoot, 'package.json'),
    join(targetDir, 'package.json')
  );
  
  // 复制 tsconfig.json（如需要）
  const tsconfigPath = join(apiRoot, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    fs.copyFileSync(tsconfigPath, join(targetDir, 'tsconfig.json'));
  }
  
  // 创建启动脚本
  console.log('[Sidecar Builder] Creating startup script...');
  const startupScript = platform === 'win32' 
    ? join(targetDir, 'start.bat')
    : join(targetDir, 'start.sh');
  
  // 优先使用 Bun，如果没有则使用 Node.js + tsx
  const scriptContent = platform === 'win32'
    ? `@echo off\r\necho [API] Checking dependencies...\r\nif not exist "node_modules" (\r\n  echo [API] Installing dependencies...\r\n  where bun >nul 2>&1\r\n  if %errorlevel% equ 0 (\r\n    bun install\r\n  ) else (\r\n    where pnpm >nul 2>&1\r\n    if %errorlevel% equ 0 (\r\n      pnpm install\r\n    ) else (\r\n      npm install\r\n    )\r\n  )\r\n)\r\necho [API] Starting server...\r\nwhere bun >nul 2>&1\r\nif %errorlevel% equ 0 (\r\n  bun run src/index.ts\r\n) else (\r\n  where node >nul 2>&1\r\n  if %errorlevel% equ 0 (\r\n    npx tsx src/index.ts\r\n  ) else (\r\n    echo [ERROR] Neither Bun nor Node.js found!\r\n    echo Please install Bun (https://bun.sh) or Node.js (https://nodejs.org)\r\n    pause\r\n    exit /b 1\r\n  )\r\n)\r\n`
    : `#!/bin/bash\necho "[API] Checking dependencies..."\nif [ ! -d "node_modules" ]; then\n  echo "[API] Installing dependencies..."\n  if command -v bun &> /dev/null; then\n    bun install\n  elif command -v pnpm &> /dev/null; then\n    pnpm install\n  else\n    npm install\n  fi\nfi\necho "[API] Starting server..."\nif command -v bun &> /dev/null; then\n  bun run src/index.ts\nelif command -v node &> /dev/null; then\n  npx tsx src/index.ts\nelse\n  echo "[ERROR] Neither Bun nor Node.js found!"\n  echo "Please install Bun (https://bun.sh) or Node.js (https://nodejs.org)"\n  exit 1\nfi\n`;
  
  fs.writeFileSync(startupScript, scriptContent);
  
  if (platform !== 'win32') {
    fs.chmodSync(startupScript, 0o755);
  }
  
  console.log(`[Sidecar Builder] API package created at: ${targetDir}`);
  console.log('[Sidecar Builder] Note: User needs to have Bun or Node.js installed');
  console.log('[Sidecar Builder] Done!');
} catch (error) {
  console.error('[Sidecar Builder] Failed to build sidecar:', error.message);
  process.exit(1);
}
