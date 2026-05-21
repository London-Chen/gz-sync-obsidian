import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { ArticleMeta, ImageRef, ParsedArticle } from './types.js';
import { loadConfig } from './config.js';
import { normalizePathMaybe, slugify } from './paths.js';

const markdownImagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
const wikiImagePattern = /!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

export function parseArticle(filePathInput: string): ParsedArticle {
  const filePath = path.resolve(filePathInput);
  const baseDir = path.dirname(filePath);
  const config = loadConfig();
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(raw);
  const data = parsed.data as Record<string, unknown>;
  const markdown = parsed.content.trim();
  const firstHeading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const title = stringValue(data.title) || firstHeading || path.basename(filePath, path.extname(filePath));
  const author = normalizeAuthor(stringValue(data.author)) || config.author || '';
  const digest = stringValue(data.digest) || stringValue(data.description) || createDigest(markdown);
  const sourceUrl = stringValue(data.source_url) || stringValue(data.source) || '';
  const coverValue = stringValue(data.cover);
  const images = extractImages(markdown, baseDir);
  const coverPath = coverValue ? normalizePathMaybe(baseDir, coverValue) : undefined;
  const fallbackCover = config.defaultCover ? normalizePathMaybe(baseDir, config.defaultCover) : undefined;
  const cover = coverPath
    ? toImageRef('cover', coverValue, coverPath)
    : images[0] ?? (fallbackCover ? toImageRef('default cover', config.defaultCover ?? fallbackCover, fallbackCover) : undefined);

  const meta: ArticleMeta = {
    title,
    author,
    digest,
    cover: cover?.resolved ?? cover?.raw,
    sourceUrl,
    slug: slugify(title)
  };

  const readiness = collectReadiness({ meta, markdown, images, cover });
  return { filePath, vaultRoot: findVaultRoot(baseDir), meta, markdown, images, cover, readiness };
}

export function extractImages(markdown: string, baseDir: string): ImageRef[] {
  const images: ImageRef[] = [];
  for (const match of markdown.matchAll(markdownImagePattern)) {
    const raw = stripWrapping(match[2].trim());
    images.push(toImageRef(match[1] || '', raw, resolveImagePath(baseDir, raw)));
  }
  for (const match of markdown.matchAll(wikiImagePattern)) {
    const raw = match[1].trim();
    images.push(toImageRef('', raw, resolveImagePath(baseDir, raw)));
  }
  return dedupeImages(images);
}

export function resolveImagePath(baseDir: string, raw: string): string {
  if (/^https?:\/\//i.test(raw)) return raw;
  if (path.isAbsolute(raw)) return raw;
  const direct = path.resolve(baseDir, raw);
  if (fs.existsSync(direct)) return direct;
  const attachment = path.resolve(baseDir, 'attachments', raw);
  if (fs.existsSync(attachment)) return attachment;
  const assets = path.resolve(baseDir, 'assets', raw);
  if (fs.existsSync(assets)) return assets;
  const vault = findVaultRoot(baseDir);
  const found = findByBasename(vault, path.basename(raw));
  return found ?? direct;
}

function toImageRef(alt: string, raw: string, resolved?: string): ImageRef {
  const candidate = resolved ?? raw;
  const isRemote = /^https?:\/\//i.test(candidate);
  return { alt, raw, resolved: candidate, isRemote, exists: isRemote || fs.existsSync(candidate) };
}

function collectReadiness(input: { meta: ArticleMeta; markdown: string; images: ImageRef[]; cover?: ImageRef }): string[] {
  const issues: string[] = [];
  if (!input.meta.title) issues.push('缺少标题。');
  if (input.meta.title.length > 64) issues.push('标题可能超过微信推荐长度，请考虑压缩到 64 字以内。');
  if (!input.markdown) issues.push('正文为空。');
  if (!input.cover) issues.push('缺少封面图：请在 frontmatter 设置 cover，或设置 WECHAT_DEFAULT_COVER。');
  if (input.cover && !input.cover.exists) issues.push(`封面图不存在：${input.cover.resolved ?? input.cover.raw}`);
  for (const image of input.images) {
    if (!image.exists) issues.push(`正文图片不存在：${image.raw}`);
  }
  return issues;
}


function normalizeAuthor(value: string): string {
  const wiki = value.match(/^\[\[([^\]]+)\]\]$/);
  const author = (wiki ? wiki[1] : value).trim();
  if (author.startsWith('@')) return '';
  return [...author].slice(0, 8).join('');
}

function createDigest(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/!\[\[[^\]]+\]\]/g, '')
    .replace(/[#>*_`\-[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function stringValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map((v) => (typeof v === 'string' ? v : '')).filter(Boolean).join(', ');
  return '';
}

function stripWrapping(value: string): string {
  return value.replace(/^<|>$/g, '').replace(/^['"]|['"]$/g, '');
}

function dedupeImages(images: ImageRef[]): ImageRef[] {
  const seen = new Set<string>();
  return images.filter((image) => {
    const key = image.resolved ?? image.raw;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findVaultRoot(start: string): string {
  let current = start;
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, '.obsidian'))) return current;
    current = path.dirname(current);
  }
  return start;
}

function findByBasename(root: string, basename: string): string | undefined {
  const queue = [root];
  let scanned = 0;
  while (queue.length > 0 && scanned < 5000) {
    const dir = queue.shift()!;
    scanned += 1;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.git') || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isFile() && entry.name === basename) return full;
      if (entry.isDirectory()) queue.push(full);
    }
  }
  return undefined;
}
