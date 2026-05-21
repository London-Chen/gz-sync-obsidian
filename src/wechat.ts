import fs from 'node:fs';
import path from 'node:path';
import { File } from 'node:buffer';
import { fileTypeFromBuffer } from 'file-type';
import { lookup as mimeLookup } from 'mime-types';
import { request, fetch, FormData } from 'undici';
import { AppConfig, DraftResult, ImageRef, ParsedArticle } from './types.js';
import { UserFacingError } from './errors.js';
import { ensureDir, projectRoot } from './paths.js';
import { renderArticle, writeRendered } from './renderer.js';

interface AccessTokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
  [key: string]: unknown;
}

interface WechatErrorResponse {
  errcode?: number;
  errmsg?: string;
  [key: string]: unknown;
}

export async function createDraft(article: ParsedArticle, config: Required<Pick<AppConfig, 'appid' | 'secret'>> & AppConfig): Promise<DraftResult> {
  if (!article.cover) {
    throw new UserFacingError('缺少封面图。', '在 frontmatter 添加 cover，或设置 WECHAT_DEFAULT_COVER。');
  }
  if (article.cover && !article.cover.exists) {
    throw new UserFacingError(`封面图不存在：${article.cover.resolved ?? article.cover.raw}`, '请修正 cover 路径，或设置可用的 WECHAT_DEFAULT_COVER。');
  }
  for (const image of article.images) {
    if (!image.exists) throw new UserFacingError(`正文图片不存在：${image.raw}`, '请修正 Markdown 图片路径或 Obsidian 附件链接。');
  }

  const token = await getAccessToken(config);
  const imageMap = await uploadArticleImages(token, article.images);
  const rendered = renderArticle(article, undefined, imageMap);
  if (!rendered.contentHtml.trim()) {
    throw new UserFacingError('生成的正文 HTML 为空。', '请确认 Markdown 正文不为空。');
  }
  const paths = writeRendered(article, rendered);
  const thumbMediaId = await uploadPermanentImage(token, article.cover);
  const draftPayload = {
    articles: [
      {
        title: article.meta.title,
        author: article.meta.author || config.author,
        digest: truncateForWechat(article.meta.digest, 120),
        content: rendered.contentHtml,
        content_source_url: article.meta.sourceUrl || '',
        thumb_media_id: thumbMediaId,
        need_open_comment: 0,
        only_fans_can_comment: 0
      }
    ]
  };
  const raw = await postJson(`https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${encodeURIComponent(token)}`, draftPayload);
  const mediaId = typeof raw.media_id === 'string' ? raw.media_id : undefined;
  return {
    mediaId,
    title: article.meta.title,
    thumbMediaId,
    uploadedImages: imageMap.size,
    previewPath: paths.previewPath,
    outputPath: paths.outputPath,
    raw
  };
}

async function getAccessToken(config: Required<Pick<AppConfig, 'appid' | 'secret'>>): Promise<string> {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(config.appid)}&secret=${encodeURIComponent(config.secret)}`;
  const res = await request(url, { method: 'GET' });
  const data = (await res.body.json()) as AccessTokenResponse;
  if (!data.access_token) {
    throw wechatError('获取 access_token 失败', data, '请确认 AppID/Secret 正确，且当前公网 IP 已加入微信后台 IP 白名单。');
  }
  return data.access_token;
}

async function uploadArticleImages(token: string, images: ImageRef[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (const image of images) {
    const uploadUrl = await uploadArticleImage(token, image);
    result.set(image.raw, uploadUrl);
    if (image.resolved) result.set(image.resolved, uploadUrl);
  }
  writeImageCache(result);
  return result;
}

async function uploadArticleImage(token: string, image: ImageRef): Promise<string> {
  const file = await materializeImage(image);
  const form = new FormData();
  form.append('media', new File([fs.readFileSync(file.path)], file.filename, { type: file.mime }));
  const data = await postForm(`https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${encodeURIComponent(token)}`, form);
  const url = typeof data.url === 'string' ? data.url : undefined;
  if (!url) throw wechatError(`上传正文图片失败：${image.raw}`, data, '请确认图片格式为 jpg/png/gif，且微信公众号接口权限正常。');
  return url;
}

async function uploadPermanentImage(token: string, image: ImageRef): Promise<string> {
  const file = await materializeImage(image);
  const form = new FormData();
  form.append('media', new File([fs.readFileSync(file.path)], file.filename, { type: file.mime }));
  const data = await postForm(`https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${encodeURIComponent(token)}&type=image`, form);
  const mediaId = typeof data.media_id === 'string' ? data.media_id : undefined;
  if (!mediaId) throw wechatError(`上传封面素材失败：${image.raw}`, data, '请确认封面是微信支持的图片格式，并检查公众号素材接口权限。');
  return mediaId;
}

async function materializeImage(image: ImageRef): Promise<{ path: string; filename: string; mime: string }> {
  if (!image.resolved) throw new UserFacingError(`无法解析图片：${image.raw}`);
  if (/^https?:\/\//i.test(image.resolved)) {
    const res = await request(image.resolved, { method: 'GET' });
    if (res.statusCode >= 400) throw new UserFacingError(`下载远程图片失败：${image.resolved}`, '请确认图片 URL 可以公网访问。');
    const bytes = Buffer.from(await res.body.arrayBuffer());
    const detected = await fileTypeFromBuffer(bytes);
    const ext = detected?.ext ?? 'jpg';
    const cacheDir = path.resolve(projectRoot, 'dist/cache/remote-images');
    ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `${safeFilename(path.basename(image.resolved)) || 'remote'}.${ext}`);
    fs.writeFileSync(filePath, bytes);
    return { path: filePath, filename: path.basename(filePath), mime: detected?.mime ?? 'image/jpeg' };
  }
  const mime = (mimeLookup(image.resolved) || 'application/octet-stream').toString();
  return { path: image.resolved, filename: path.basename(image.resolved), mime };
}

async function postJson(url: string, payload: unknown): Promise<WechatErrorResponse> {
  const res = await request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = (await res.body.json()) as WechatErrorResponse;
  if (typeof data.errcode === 'number' && data.errcode !== 0) {
    throw wechatError('微信草稿接口返回错误', data, '请按 errcode 检查凭证、IP 白名单、封面素材和正文 HTML。');
  }
  return data;
}

async function postForm(url: string, form: FormData): Promise<WechatErrorResponse> {
  const res = await fetch(url, {
    method: 'POST',
    body: form
  });
  const text = await res.text();
  if (!text.trim()) {
    throw new UserFacingError('微信素材接口返回空响应。', '请稍后重试；如果持续出现，请检查网络、图片格式和微信公众号接口权限。');
  }
  let data: WechatErrorResponse;
  try {
    data = JSON.parse(text) as WechatErrorResponse;
  } catch {
    throw new UserFacingError(`微信素材接口返回非 JSON 响应：${text.slice(0, 200)}`, '请检查网络代理、微信接口可用性和图片上传请求。');
  }
  if (typeof data.errcode === 'number' && data.errcode !== 0) {
    throw wechatError('微信素材接口返回错误', data, '请确认凭证、IP 白名单、图片格式和素材接口权限。');
  }
  return data;
}


function truncateForWechat(input: string, maxChars: number): string {
  const text = input.replace(/\s+/g, ' ').trim();
  return [...text].slice(0, maxChars).join('');
}

function wechatError(prefix: string, data: WechatErrorResponse, fix: string): UserFacingError {
  const code = data.errcode ? ` errcode=${data.errcode}` : '';
  const msg = data.errmsg ? ` errmsg=${data.errmsg}` : '';
  return new UserFacingError(`${prefix}.${code}${msg}`.trim(), fix);
}

function writeImageCache(map: Map<string, string>): void {
  const cacheDir = path.resolve(projectRoot, 'dist/cache');
  ensureDir(cacheDir);
  fs.writeFileSync(path.join(cacheDir, 'images.json'), JSON.stringify(Object.fromEntries(map), null, 2) + '\n');
}

function safeFilename(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80);
}
