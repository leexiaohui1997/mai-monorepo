import fs from 'fs'
import path from 'path'

import { tool } from 'ai'
import { z } from 'zod'

const MAX_CONTENT_LENGTH = 10000

/** 常见二进制文件扩展名 */
const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.ico',
  '.webp',
  '.svg',
  '.mp3',
  '.mp4',
  '.avi',
  '.mov',
  '.wav',
  '.flac',
  '.zip',
  '.tar',
  '.gz',
  '.rar',
  '.7z',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.bin',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.otf',
])

/** 检测文件是否为二进制文件 */
function isBinaryFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return BINARY_EXTENSIONS.has(ext)
}

/** 读取文件并处理边界情况 */
function readFileContent(filePath: string): {
  content: string
  truncated: boolean
  totalLength: number
} {
  const raw = fs.readFileSync(filePath, 'utf-8')
  if (raw.length <= MAX_CONTENT_LENGTH) {
    return { content: raw, truncated: false, totalLength: raw.length }
  }
  return {
    content: raw.slice(0, MAX_CONTENT_LENGTH),
    truncated: true,
    totalLength: raw.length,
  }
}

/**
 * 文件内容查看工具
 *
 * 允许 AI 读取本机文件内容，支持：
 * - 文件不存在检测
 * - 二进制文件检测
 * - 大文件截断（>10000 字符）
 */
export const readFileTool = tool({
  description: '读取本机指定路径的文件内容。可用于查看代码文件、配置文件、日志文件等文本文件。',
  parameters: z.object({
    filePath: z.string().describe('要读取的文件的绝对路径或相对路径'),
  }),
  execute: async ({ filePath }) => {
    const resolved = path.resolve(filePath)

    if (!fs.existsSync(resolved)) {
      return { success: false, error: `文件不存在: ${resolved}` }
    }

    const stat = fs.statSync(resolved)
    if (stat.isDirectory()) {
      return { success: false, error: `路径是一个目录而非文件: ${resolved}` }
    }

    if (isBinaryFile(resolved)) {
      return { success: false, error: `该文件是二进制文件，无法展示内容: ${resolved}` }
    }

    const { content, truncated, totalLength } = readFileContent(resolved)
    return {
      success: true,
      filePath: resolved,
      content,
      truncated,
      ...(truncated
        ? {
            totalLength,
            message: `文件内容已截断，总共 ${totalLength} 字符，仅展示前 ${MAX_CONTENT_LENGTH} 字符`,
          }
        : {}),
    }
  },
})
