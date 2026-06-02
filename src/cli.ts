#!/usr/bin/env node
import { parseArticle } from './article.js';
import { initConfig, requireFeishuConfig, requireWechatConfig, validateConfig } from './config.js';
import { UserFacingError } from './errors.js';
import { renderArticle, writeRendered } from './renderer.js';
import { createDraft } from './wechat.js';
import { syncToFeishu } from './feishu.js';

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  try {
    switch (command) {
      case 'inspect':
        await inspect(args[0]);
        break;
      case 'preview':
        await preview(args[0]);
        break;
      case 'draft':
        await draft(args[0]);
        break;
      case 'feishu':
        await feishu(args[0]);
        break;
      case 'sync':
        await sync(args[0]);
        break;
      case 'config':
        await config(args[0]);
        break;
      case 'help':
      case undefined:
        printHelp();
        break;
      default:
        throw new UserFacingError(`未知命令：${command}`, '运行 `gz help` 查看可用命令。');
    }
  } catch (error) {
    if (error instanceof UserFacingError) {
      console.error(`错误：${error.message}`);
      if (error.fix) console.error(`修复：${error.fix}`);
      process.exitCode = 1;
      return;
    }
    console.error(error);
    process.exitCode = 1;
  }
}

async function inspect(file?: string): Promise<void> {
  const article = parseRequiredArticle(file);
  console.log(JSON.stringify({
    filePath: article.filePath,
    title: article.meta.title,
    author: article.meta.author,
    digest: article.meta.digest,
    cover: article.cover,
    images: article.images,
    readiness: article.readiness,
    ready: article.readiness.length === 0
  }, null, 2));
}

async function preview(file?: string): Promise<void> {
  const article = parseRequiredArticle(file);
  const rendered = renderArticle(article);
  const paths = writeRendered(article, rendered);
  console.log(JSON.stringify({
    title: article.meta.title,
    previewPath: paths.previewPath,
    outputPath: paths.outputPath,
    readiness: article.readiness
  }, null, 2));
}

async function draft(file?: string): Promise<void> {
  const article = parseRequiredArticle(file);
  if (article.readiness.some((issue) => issue.includes('正文为空') || issue.includes('不存在') || issue.includes('缺少封面'))) {
    throw new UserFacingError(`文章未准备好：${article.readiness.join('；')}`, '先运行 `gz inspect "文章.md"` 修复 readiness 问题。');
  }
  const config = requireWechatConfig();
  const result = await createDraft(article, config);
  console.log(JSON.stringify(result, null, 2));
}

async function feishu(file?: string): Promise<void> {
  const article = parseRequiredArticle(file);
  if (article.readiness.some((issue) => issue.includes('正文为空') || issue.includes('不存在'))) {
    throw new UserFacingError(`文章未准备好：${article.readiness.join('；')}`, '先运行 `gz inspect "文章.md"` 修复 readiness 问题。');
  }
  const config = requireFeishuConfig();
  const result = await syncToFeishu(article, config);
  console.log(JSON.stringify(result, null, 2));
}

async function sync(file?: string): Promise<void> {
  const article = parseRequiredArticle(file);
  if (article.readiness.some((issue) => issue.includes('正文为空') || issue.includes('不存在') || issue.includes('缺少封面'))) {
    throw new UserFacingError(`文章未准备好：${article.readiness.join('；')}`, '先运行 `gz inspect "文章.md"` 修复 readiness 问题。');
  }

  const result: { title: string; status: 'success' | 'partial' | 'failed'; wechat?: unknown; feishu?: unknown; errors: Array<{ platform: string; message: string; fix?: string }> } = {
    title: article.meta.title,
    status: 'failed',
    errors: []
  };

  try {
    const wechatConfig = requireWechatConfig();
    result.wechat = await createDraft(article, wechatConfig);
  } catch (error) {
    result.errors.push(serializeSyncError('wechat', error));
  }

  try {
    const feishuConfig = requireFeishuConfig();
    result.feishu = await syncToFeishu(article, feishuConfig);
  } catch (error) {
    result.errors.push(serializeSyncError('feishu', error));
  }

  const successCount = Number(Boolean(result.wechat)) + Number(Boolean(result.feishu));
  result.status = successCount === 2 ? 'success' : successCount === 1 ? 'partial' : 'failed';
  console.log(JSON.stringify(result, null, 2));
  if (result.status === 'failed') process.exitCode = 1;
}

async function config(subcommand?: string): Promise<void> {
  if (subcommand === 'init') {
    const configPath = initConfig();
    console.log(JSON.stringify({ configPath, message: '已生成本地配置模板，请填写微信公众号凭证。' }, null, 2));
    return;
  }
  if (subcommand === 'validate') {
    const result = await validateConfig();
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
    return;
  }
  throw new UserFacingError(`未知 config 子命令：${subcommand ?? ''}`, '可用命令：gz config init / validate。');
}

function serializeSyncError(platform: string, error: unknown): { platform: string; message: string; fix?: string } {
  if (error instanceof UserFacingError) return { platform, message: error.message, fix: error.fix };
  if (error instanceof Error) return { platform, message: error.message };
  return { platform, message: String(error) };
}

function parseRequiredArticle(file?: string) {
  if (!file) throw new UserFacingError('缺少文章路径。', '示例：gz preview "文章.md"');
  return parseArticle(file);
}

function printHelp(): void {
  console.log(`gz

命令：
  gz inspect "文章.md"       解析文章元数据和 readiness
  gz preview "文章.md"       生成本地预览和微信正文 HTML
  gz draft "文章.md"         上传图片并创建微信公众号草稿
  gz feishu "文章.md"        导入 Markdown 并创建飞书云文档
  gz sync "文章.md"          一键同步到公众号草稿箱和飞书
  gz config init             生成 config.local.json 模板
  gz config validate         检查配置和公网 IP 提示
`);
}

main();
