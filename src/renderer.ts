import fs from 'node:fs';
import path from 'node:path';
import { marked, Renderer } from 'marked';
import { ParsedArticle, RenderedArticle, StyleProfile } from './types.js';
import { ensureDir, projectRoot } from './paths.js';
import { resolveImagePath } from './article.js';

function style(entries: Record<string, string | undefined>): string {
  return Object.entries(entries)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}:${value}`)
    .join(';');
}

export function loadStyleProfile(): StyleProfile {
  const file = path.resolve(projectRoot, 'style.profile.json');
  return JSON.parse(fs.readFileSync(file, 'utf8')) as StyleProfile;
}

export function renderArticle(article: ParsedArticle, profile = loadStyleProfile(), imageMap = new Map<string, string>()): RenderedArticle {
  const renderer = new Renderer();
  const paragraphStyle = style({
    'font-size': profile.body.fontSize,
    color: profile.body.color,
    'letter-spacing': profile.body.letterSpacing,
    'line-height': profile.body.lineHeight,
    'margin': `0 0 ${profile.body.paragraphMarginBottom}`,
    'text-align': profile.body.textAlign,
    'text-indent': '0'
  });
  const headingBase = {
    color: profile.body.color,
    'font-weight': '700',
    'letter-spacing': profile.body.letterSpacing,
    'line-height': '1.45',
    'margin': '28px 0 14px',
    'text-align': 'left'
  };

  renderer.heading = ({ tokens, depth }) => {
    const text = marked.parseInline(tokensToMarkdown(tokens), { renderer }) as string;
    const fontSize = depth === 1 ? profile.headings.h1 : depth === 2 ? profile.headings.h2 : profile.headings.h3;
    const tag = depth <= 1 ? 'h1' : depth === 2 ? 'h2' : 'h3';
    return `<${tag} style="${style({ ...headingBase, 'font-size': fontSize })}">${text}</${tag}>`;
  };
  renderer.paragraph = ({ tokens }) => `<p style="${paragraphStyle}">${marked.parseInline(tokensToMarkdown(tokens), { renderer }) as string}</p>`;
  renderer.blockquote = ({ tokens }) => `<blockquote style="${style({ 'border-left': `4px solid ${profile.colors.accent}`, 'background': profile.colors.background, 'padding': '12px 14px', 'margin': `0 0 ${profile.body.paragraphMarginBottom}`, color: profile.body.color })}">${marked.parser(tokens)}</blockquote>`;
  renderer.list = ({ items, ordered }) => {
    const tag = ordered ? 'ol' : 'ul';
    const body = items.map((item) => `<li style="${style({ 'margin-bottom': '8px', 'line-height': profile.body.lineHeight })}">${renderInlineMarkdown(item.text, renderer)}</li>`).join('');
    return `<${tag} style="${style({ 'font-size': profile.body.fontSize, color: profile.body.color, 'letter-spacing': profile.body.letterSpacing, 'line-height': profile.body.lineHeight, 'margin': `0 0 ${profile.body.paragraphMarginBottom}`, 'padding-left': '1.4em' })}">${body}</${tag}>`;
  };
  renderer.code = ({ text, lang }) => `<pre style="${style({ 'font-size': '13px', 'line-height': '1.65', 'background': '#F6F8FA', 'border-radius': '8px', padding: '12px', margin: `0 0 ${profile.body.paragraphMarginBottom}`, overflow: 'auto' })}"><code data-lang="${escapeAttr(lang ?? '')}">${escapeHtml(text)}</code></pre>`;
  renderer.codespan = ({ text }) => `<code style="${style({ 'font-size': '0.92em', 'background': '#F6F8FA', padding: '2px 5px', 'border-radius': '4px' })}">${escapeHtml(text)}</code>`;
  renderer.hr = () => `<hr style="${style({ border: 'none', 'border-top': `1px solid ${profile.colors.border}`, margin: '28px 0' })}" />`;
  renderer.link = ({ href, title, tokens }) => `<a href="${escapeAttr(href)}" title="${escapeAttr(title ?? '')}" style="${style({ color: profile.colors.accent, 'text-decoration': 'none' })}">${marked.parseInline(tokensToMarkdown(tokens), { renderer }) as string}</a>`;
  renderer.image = ({ href, title, text }) => {
    const src = resolveMappedImage(article, href, imageMap);
    return `<img src="${escapeAttr(src)}" alt="${escapeAttr(text)}" title="${escapeAttr(title ?? '')}" style="${style({ display: 'block', width: '100%', height: 'auto', 'border-radius': '8px', margin: `4px 0 ${profile.body.paragraphMarginBottom}` })}" />`;
  };
  renderer.table = ({ header, rows }) => {
    const renderCell = (cell: { text: string }, headerCell = false) => {
      const tag = headerCell ? 'th' : 'td';
      return `<${tag} style="${style({ border: `1px solid ${profile.colors.border}`, padding: '8px', 'font-size': headerCell ? '14px' : '13px', 'line-height': '1.55', 'text-align': 'left' })}">${cell.text}</${tag}>`;
    };
    const head = `<thead><tr>${header.map((cell) => renderCell(cell, true)).join('')}</tr></thead>`;
    const body = `<tbody>${rows.map((row) => `<tr>${row.map((cell) => renderCell(cell)).join('')}</tr>`).join('')}</tbody>`;
    return `<table style="${style({ width: '100%', 'border-collapse': 'collapse', margin: `0 0 ${profile.body.paragraphMarginBottom}`, color: profile.body.color })}">${head}${body}</table>`;
  };

  const normalizedMarkdown = normalizeWikiImages(article.markdown);
  const contentHtml = `<section style="${style({ padding: `0 ${profile.body.sidePadding}`, color: profile.body.color, 'font-size': profile.body.fontSize, 'line-height': profile.body.lineHeight, 'letter-spacing': profile.body.letterSpacing, 'text-align': profile.body.textAlign })}">\n${marked(normalizedMarkdown, { renderer, gfm: true })}\n</section>`;
  const previewHtml = wrapPreview(article.meta.title, contentHtml, profile);
  return { contentHtml, previewHtml, imageMap };
}

export function writeRendered(article: ParsedArticle, rendered: RenderedArticle): { previewPath: string; outputPath: string } {
  const previewDir = path.resolve(projectRoot, 'dist/preview');
  const outputDir = path.resolve(projectRoot, 'dist/output');
  ensureDir(previewDir);
  ensureDir(outputDir);
  const previewPath = path.join(previewDir, `${article.meta.slug}.html`);
  const outputPath = path.join(outputDir, `${article.meta.slug}.wechat.html`);
  fs.writeFileSync(previewPath, rendered.previewHtml, 'utf8');
  fs.writeFileSync(outputPath, rendered.contentHtml, 'utf8');
  return { previewPath, outputPath };
}


function renderInlineMarkdown(text: string, renderer: Renderer): string {
  return marked.parseInline(text, { renderer }) as string;
}

function tokensToMarkdown(tokens: Array<{ raw?: string; text?: string }>): string {
  return tokens.map((token) => token.raw ?? token.text ?? '').join('');
}

function normalizeWikiImages(markdown: string): string {
  return markdown.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, file, alt) => `![${alt ?? ''}](${file})`);
}

function resolveMappedImage(article: ParsedArticle, href: string, imageMap: Map<string, string>): string {
  const resolved = resolveImagePath(path.dirname(article.filePath), href);
  return imageMap.get(href) ?? imageMap.get(resolved) ?? resolved;
}

function wrapPreview(title: string, content: string, profile: StyleProfile): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;background:#f2f3f5;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;">
  <main style="max-width:680px;margin:0 auto;background:#fff;min-height:100vh;padding:32px 0;">
    <div style="padding:0 ${profile.body.sidePadding};margin-bottom:24px;color:${profile.colors.muted};font-size:${profile.note.fontSize};">本地预览：最终以微信公众号后台渲染为准</div>
    ${content}
  </main>
</body>
</html>
`;
}

function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
}

function escapeAttr(input: string): string {
  return escapeHtml(input);
}
