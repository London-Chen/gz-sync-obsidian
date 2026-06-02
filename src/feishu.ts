import fs from 'node:fs';
import path from 'node:path';
import { lookup as mimeLookup } from 'mime-types';
import { File } from 'node:buffer';
import { fetch, request, FormData } from 'undici';
import { AppConfig, FeishuResult, ImageRef, ParsedArticle } from './types.js';
import { UserFacingError } from './errors.js';
import { ensureDir, projectRoot } from './paths.js';

interface FeishuResponse {
  code?: number;
  msg?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

interface TenantTokenResponse extends FeishuResponse {
  tenant_access_token?: string;
  expire?: number;
}

interface ImportTaskResult {
  token?: string;
  url?: string;
  jobStatus?: number;
  raw: FeishuResponse;
}

const feishuApiBase = 'https://open.feishu.cn/open-apis';

export async function syncToFeishu(
  article: ParsedArticle,
  config: Required<Pick<AppConfig, 'feishuAppId' | 'feishuAppSecret'>> & AppConfig
): Promise<FeishuResult> {
  validateArticleImages(article.images);
  const token = await getTenantAccessToken(config);
  const markdownPath = writeFeishuMarkdown(article);
  const fileToken = await uploadImportFile(token, markdownPath, article.meta.slug);
  const task = await createImportTask(token, fileToken, article.meta.title, config.feishuFolderToken);
  const result = await pollImportTask(token, task.ticket);
  return {
    title: article.meta.title,
    markdownPath,
    fileToken,
    ticket: task.ticket,
    documentToken: result.token,
    documentUrl: result.url,
    raw: result.raw
  };
}

async function getTenantAccessToken(config: Required<Pick<AppConfig, 'feishuAppId' | 'feishuAppSecret'>>): Promise<string> {
  const data = (await postJson(`${feishuApiBase}/auth/v3/tenant_access_token/internal`, {
    app_id: config.feishuAppId,
    app_secret: config.feishuAppSecret
  })) as TenantTokenResponse;
  if (!data.tenant_access_token) {
    throw feishuError('获取 tenant_access_token 失败', data, '请确认 FEISHU_APP_ID / FEISHU_APP_SECRET 正确，并检查应用状态。');
  }
  return data.tenant_access_token;
}

function writeFeishuMarkdown(article: ParsedArticle): string {
  const outputDir = path.resolve(projectRoot, 'dist/output');
  ensureDir(outputDir);
  const markdown = rewriteLocalImageLinks(article.markdown, article.filePath, article.images);
  const outputPath = path.join(outputDir, `${article.meta.slug}.feishu.md`);
  fs.writeFileSync(outputPath, markdown, 'utf8');
  return outputPath;
}

function rewriteLocalImageLinks(markdown: string, articlePath: string, images: ImageRef[]): string {
  let result = markdown;
  const baseDir = path.dirname(articlePath);
  for (const image of images) {
    if (!image.resolved || image.isRemote) continue;
    const relative = path.relative(baseDir, image.resolved).split(path.sep).join('/');
    result = result.replaceAll(`](${image.raw})`, `](${relative})`);
    result = result.replaceAll(`](${encodeURI(image.raw)})`, `](${encodeURI(relative)})`);
  }
  return result;
}

async function uploadImportFile(token: string, filePath: string, slug: string): Promise<string> {
  const bytes = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('file_name', `${slug}.md`);
  form.append('parent_type', 'ccm_import_open');
  form.append('parent_node', '');
  form.append('size', String(bytes.byteLength));
  form.append('extra', JSON.stringify({ obj_type: 'docx', file_extension: 'md' }));
  form.append('file', new File([bytes], `${slug}.md`, { type: (mimeLookup(filePath) || 'text/markdown').toString() }));
  const data = await postForm(`${feishuApiBase}/drive/v1/medias/upload_all`, token, form);
  const fileToken = stringFromPath(data, ['data', 'file_token']) || stringFromPath(data, ['data', 'token']) || stringFromPath(data, ['file_token']);
  if (!fileToken) {
    throw feishuError('上传飞书导入文件失败', data, '请确认应用已开通云文档/素材上传权限，且文件大小未超过接口限制。');
  }
  return fileToken;
}

async function createImportTask(token: string, fileToken: string, title: string, folderToken?: string): Promise<{ ticket: string; raw: FeishuResponse }> {
  const payload = {
    file_extension: 'md',
    file_token: fileToken,
    type: 'docx',
    file_name: title,
    point: {
      mount_type: 1,
      mount_key: folderToken || ''
    }
  };
  const data = await postJson(`${feishuApiBase}/drive/v1/import_tasks`, payload, token);
  const ticket = stringFromPath(data, ['data', 'ticket']) || stringFromPath(data, ['data', 'job_ticket']) || stringFromPath(data, ['ticket']);
  if (!ticket) {
    throw feishuError('创建飞书导入任务失败', data, '请确认应用有导入云文档权限；如需导入到指定目录，请检查 FEISHU_FOLDER_TOKEN。');
  }
  return { ticket, raw: data };
}

async function pollImportTask(token: string, ticket: string): Promise<ImportTaskResult> {
  let last: FeishuResponse | undefined;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (attempt > 0) await delay(2000);
    const data = await getJson(`${feishuApiBase}/drive/v1/import_tasks/${encodeURIComponent(ticket)}`, token);
    last = data;
    const jobStatus = numberFromPath(data, ['data', 'result', 'job_status']) ?? numberFromPath(data, ['data', 'job_status']);
    const tokenValue = stringFromPath(data, ['data', 'result', 'token']) || stringFromPath(data, ['data', 'token']);
    const url = stringFromPath(data, ['data', 'result', 'url']) || stringFromPath(data, ['data', 'url']);
    if (tokenValue || url || jobStatus === 0) return { token: tokenValue, url, jobStatus, raw: data };
    if (typeof jobStatus === 'number' && jobStatus !== 1 && jobStatus !== 2) {
      throw feishuError('飞书导入任务失败', data, '请查看返回的 job_status / job_error_msg，并确认 Markdown 格式和应用权限。');
    }
  }
  throw feishuError('飞书导入任务超时', last ?? {}, '稍后运行飞书后台检查，或重试同步命令。');
}

function validateArticleImages(images: ImageRef[]): void {
  for (const image of images) {
    if (!image.exists) throw new UserFacingError(`正文图片不存在：${image.raw}`, '请修正 Markdown 图片路径或 Obsidian 附件链接。');
  }
}

async function postJson(url: string, payload: unknown, token?: string): Promise<FeishuResponse> {
  const res = await request(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });
  const data = (await res.body.json()) as FeishuResponse;
  if (typeof data.code === 'number' && data.code !== 0) {
    throw feishuError('飞书接口返回错误', data, '请按 code/msg 检查凭证、权限和请求参数。');
  }
  return data;
}

async function getJson(url: string, token: string): Promise<FeishuResponse> {
  const res = await request(url, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  const data = (await res.body.json()) as FeishuResponse;
  if (typeof data.code === 'number' && data.code !== 0) {
    throw feishuError('飞书接口返回错误', data, '请按 code/msg 检查凭证、权限和请求参数。');
  }
  return data;
}

async function postForm(url: string, token: string, form: FormData): Promise<FeishuResponse> {
  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  const text = await res.text();
  if (!text.trim()) throw new UserFacingError('飞书上传接口返回空响应。', '请检查网络和应用权限后重试。');
  let data: FeishuResponse;
  try {
    data = JSON.parse(text) as FeishuResponse;
  } catch {
    throw new UserFacingError(`飞书上传接口返回非 JSON 响应：${text.slice(0, 200)}`, '请检查网络代理和飞书接口可用性。');
  }
  if (typeof data.code === 'number' && data.code !== 0) {
    throw feishuError('飞书上传接口返回错误', data, '请确认应用已开启 docs:document.media:upload 或 drive:drive 权限，并检查文件大小和上传参数。');
  }
  return data;
}

function stringFromPath(input: unknown, keys: string[]): string | undefined {
  const value = valueFromPath(input, keys);
  return typeof value === 'string' && value ? value : undefined;
}

function numberFromPath(input: unknown, keys: string[]): number | undefined {
  const value = valueFromPath(input, keys);
  return typeof value === 'number' ? value : undefined;
}

function valueFromPath(input: unknown, keys: string[]): unknown {
  let current = input;
  for (const key of keys) {
    if (!current || typeof current !== 'object' || !(key in current)) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function feishuError(prefix: string, data: FeishuResponse, fix: string): UserFacingError {
  const code = typeof data.code === 'number' ? ` code=${data.code}` : '';
  const msg = data.msg ? ` msg=${data.msg}` : '';
  return new UserFacingError(`${prefix}.${code}${msg}`.trim(), fix);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
