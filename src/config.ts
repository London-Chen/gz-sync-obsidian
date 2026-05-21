import fs from 'node:fs';
import path from 'node:path';
import { request } from 'undici';
import dotenv from 'dotenv';
import { AppConfig } from './types.js';
import { UserFacingError } from './errors.js';

dotenv.config();

const localConfigPath = path.resolve(process.cwd(), 'config.local.json');

export function loadConfig(): AppConfig {
  let fileConfig: Partial<AppConfig> = {};
  if (fs.existsSync(localConfigPath)) {
    fileConfig = JSON.parse(fs.readFileSync(localConfigPath, 'utf8')) as Partial<AppConfig>;
  }
  return {
    appid: process.env.WECHAT_APPID || fileConfig.appid,
    secret: process.env.WECHAT_SECRET || fileConfig.secret,
    author: process.env.WECHAT_AUTHOR || fileConfig.author || '',
    defaultCover: process.env.WECHAT_DEFAULT_COVER || fileConfig.defaultCover
  };
}

export function initConfig(): string {
  if (fs.existsSync(localConfigPath)) {
    return localConfigPath;
  }
  const template: AppConfig = {
    appid: '',
    secret: '',
    author: '',
    defaultCover: '/absolute/path/to/default-cover.jpg'
  };
  fs.writeFileSync(localConfigPath, JSON.stringify(template, null, 2) + '\n');
  return localConfigPath;
}

export async function validateConfig(): Promise<{ ok: boolean; issues: string[]; publicIp?: string; configPath: string }> {
  const config = loadConfig();
  const issues: string[] = [];
  if (!config.appid) issues.push('缺少 WECHAT_APPID 或 config.local.json appid。');
  if (!config.secret) issues.push('缺少 WECHAT_SECRET 或 config.local.json secret。');
  if (!config.author) issues.push('缺少默认作者 WECHAT_AUTHOR。');
  if (!config.defaultCover) issues.push('缺少 WECHAT_DEFAULT_COVER；没有文章 cover 时草稿会失败。');
  if (config.defaultCover && !/^https?:\/\//i.test(config.defaultCover) && !fs.existsSync(config.defaultCover)) {
    issues.push(`默认封面不存在：${config.defaultCover}`);
  }

  let publicIp: string | undefined;
  try {
    const res = await request('https://api.ipify.org', { method: 'GET', bodyTimeout: 5000, headersTimeout: 5000 });
    publicIp = (await res.body.text()).trim();
  } catch {
    issues.push('无法查询当前公网 IP；请手动确认执行机器 IP 已加入微信后台白名单。');
  }

  return { ok: issues.length === 0, issues, publicIp, configPath: localConfigPath };
}

export function requireWechatConfig(config = loadConfig()): Required<Pick<AppConfig, 'appid' | 'secret'>> & AppConfig {
  if (!config.appid || !config.secret) {
    throw new UserFacingError(
      '缺少微信公众号凭证。',
      '运行 `wechat-typeset config init` 后填写 config.local.json，或设置 WECHAT_APPID / WECHAT_SECRET。'
    );
  }
  return config as Required<Pick<AppConfig, 'appid' | 'secret'>> & AppConfig;
}
