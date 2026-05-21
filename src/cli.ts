#!/usr/bin/env node
import { parseArticle } from './article.js';
import { initConfig, requireWechatConfig, validateConfig } from './config.js';
import { UserFacingError } from './errors.js';
import { renderArticle, writeRendered } from './renderer.js';
import { createDraft } from './wechat.js';

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
      case 'config':
        await config(args[0]);
        break;
      case 'help':
      case undefined:
        printHelp();
        break;
      default:
        throw new UserFacingError(`未知命令：${command}`, '运行 `wechat-typeset help` 查看可用命令。');
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
    throw new UserFacingError(`文章未准备好：${article.readiness.join('；')}`, '先运行 `wechat-typeset inspect "文章.md"` 修复 readiness 问题。');
  }
  const config = requireWechatConfig();
  const result = await createDraft(article, config);
  console.log(JSON.stringify(result, null, 2));
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
  throw new UserFacingError(`未知 config 子命令：${subcommand ?? ''}`, '可用命令：wechat-typeset config init / validate。');
}

function parseRequiredArticle(file?: string) {
  if (!file) throw new UserFacingError('缺少文章路径。', '示例：wechat-typeset preview "文章.md"');
  return parseArticle(file);
}

function printHelp(): void {
  console.log(`wechat-typeset

命令：
  wechat-typeset inspect "文章.md"       解析文章元数据和 readiness
  wechat-typeset preview "文章.md"       生成本地预览和微信正文 HTML
  wechat-typeset draft "文章.md"         上传图片并创建微信公众号草稿
  wechat-typeset config init             生成 config.local.json 模板
  wechat-typeset config validate         检查配置和公网 IP 提示
`);
}

main();
