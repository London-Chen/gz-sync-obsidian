import path from 'node:path';
import fs from 'node:fs';

export const projectRoot = process.cwd();

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function slugify(input: string): string {
  const cleaned = input
    .trim()
    .replace(/[\\/:*?"<>|#%&{}$!'@+`=]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned.slice(0, 80) || 'article';
}

export function normalizePathMaybe(baseDir: string, value?: string): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return path.isAbsolute(value) ? value : path.resolve(baseDir, value);
}
