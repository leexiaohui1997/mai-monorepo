import fs from 'fs';
import path from 'path';
import { getDataDir } from '../config/paths';

/**
 * 读取文件内容
 */
export async function readFile(filename: string): Promise<string> {
  // Sidecar 进程拥有完整文件系统权限，直接使用 fs
  const filePath = path.isAbsolute(filename) 
    ? filename 
    : path.join(getDataDir(), filename);
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * 写入文件内容
 */
export async function writeFile(filename: string, content: string): Promise<void> {
  // Sidecar 进程拥有完整文件系统权限，直接使用 fs
  // 如果 filename 是绝对路径，直接使用；否则拼接数据目录
  const filePath = path.isAbsolute(filename) 
    ? filename 
    : path.join(getDataDir(), filename);
  const dir = path.dirname(filePath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * 检查文件是否存在
 */
export async function fileExists(filename: string): Promise<boolean> {
  const filePath = path.isAbsolute(filename) 
    ? filename 
    : path.join(getDataDir(), filename);
  return fs.existsSync(filePath);
}
