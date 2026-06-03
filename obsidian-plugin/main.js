const { Notice, Plugin, PluginSettingTab, Setting } = require('obsidian');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const DEFAULT_SETTINGS = {
  projectRoot: '',
  nodePath: '',
  wechatAppId: '',
  wechatSecret: '',
  author: '',
  defaultCover: '',
  feishuAppId: '',
  feishuAppSecret: '',
  feishuFolderToken: ''
};

module.exports = class WechatTypesetterPlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.addSettingTab(new WechatTypesetterSettingTab(this.app, this));
    this.statusBar = this.addStatusBarItem();
    this.statusBar.setText('GZH Sync：待命');

    this.addRibbonIcon('send-plane', 'GZH Sync：同步当前文章到公众号和飞书', () => {
      this.runForCurrentNote('sync', '正在同步到公众号和飞书...');
    });

    this.registerEvent(this.app.workspace.on('editor-menu', (menu) => {
      menu.addSeparator();
      menu.addItem((item) => {
        item.setTitle('GZH Sync：同步到公众号和飞书')
          .setIcon('send-plane')
          .onClick(() => this.runForCurrentNote('sync', '正在同步到公众号和飞书...'));
      });
      menu.addItem((item) => {
        item.setTitle('GZH Sync：仅同步到公众号草稿箱')
          .setIcon('file-text')
          .onClick(() => this.runForCurrentNote('draft', '正在生成公众号草稿...'));
      });
      menu.addItem((item) => {
        item.setTitle('GZH Sync：仅同步到飞书')
          .setIcon('files')
          .onClick(() => this.runForCurrentNote('feishu', '正在同步到飞书...'));
      });
    }));

    this.registerEvent(this.app.workspace.on('file-menu', (menu, file) => {
      if (!file || file.extension !== 'md') return;
      menu.addSeparator();
      menu.addItem((item) => {
        item.setTitle('GZH Sync：同步到公众号和飞书')
          .setIcon('send-plane')
          .onClick(() => this.runForFile(file, 'sync', '正在同步到公众号和飞书...'));
      });
      menu.addItem((item) => {
        item.setTitle('GZH Sync：仅同步到公众号草稿箱')
          .setIcon('file-text')
          .onClick(() => this.runForFile(file, 'draft', '正在生成公众号草稿...'));
      });
      menu.addItem((item) => {
        item.setTitle('GZH Sync：仅同步到飞书')
          .setIcon('files')
          .onClick(() => this.runForFile(file, 'feishu', '正在同步到飞书...'));
      });
    }));

    this.addCommand({
      id: 'sync-current-note-to-wechat-and-feishu',
      name: '同步当前文章到公众号和飞书',
      callback: () => this.runForCurrentNote('sync', '正在同步到公众号和飞书...')
    });

    this.addCommand({
      id: 'send-current-note-to-wechat-draft',
      name: '仅发送当前文章到公众号草稿箱',
      callback: () => this.runForCurrentNote('draft', '正在生成公众号草稿...')
    });

    this.addCommand({
      id: 'send-current-note-to-feishu',
      name: '仅同步当前文章到飞书',
      callback: () => this.runForCurrentNote('feishu', '正在同步到飞书...')
    });
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async runForCurrentNote(command, pendingMessage) {
    const file = this.app.workspace.getActiveFile();
    return this.runForFile(file, command, pendingMessage);
  }

  async runForFile(file, command, pendingMessage) {
    if (!file || file.extension !== 'md') {
      new Notice('请先打开或选择一篇 Markdown 文章。');
      return;
    }
    const adapter = this.app.vault.adapter;
    const vaultBasePath = adapter && adapter.basePath;
    if (!vaultBasePath) {
      new Notice('无法读取 vault 路径；此插件仅支持桌面端本地 vault。');
      return;
    }
    const absolutePath = path.join(vaultBasePath, file.path);
    const env = this.createCliEnv();
    const cli = this.resolveCli(vaultBasePath, env);
    if (!cli) {
      await this.recordSyncFailure(file, command, '找不到 GZH Sync CLI。请在插件设置里填写项目根目录，或先运行 npm link 安装全局 gz 命令。');
      new Notice('找不到 GZH Sync CLI：已把处理建议写入当前文章。', 12000);
      return;
    }

    const startedAt = new Date();
    await this.markSyncStarted(file, command, startedAt);
    this.setStatus(`同步中：${this.commandLabel(command)}`);
    new Notice(`${pendingMessage} 已写入文章属性，可稍后查看 GZH Sync 日志。`, 8000);
    execFile(cli.executable, [...cli.args, command, absolutePath], { cwd: cli.cwd, env, maxBuffer: 1024 * 1024 * 10 }, async (error, stdout, stderr) => {
      if (error) {
        const message = (stderr || stdout || error.message).trim();
        await this.recordSyncFailure(file, command, message);
        this.setStatus(`失败：${this.commandLabel(command)}`);
        new Notice('GZH Sync 失败：已把错误和下一步写入当前文章。', 12000);
        return;
      }
      await this.recordSyncSuccess(file, command, stdout);
      this.setStatus(`成功：${this.commandLabel(command)}`);
      this.showSuccess(command, stdout);
    });
  }

  resolveCli(vaultBasePath, env) {
    const configuredRoot = this.settings.projectRoot && this.settings.projectRoot.trim();
    const roots = [];
    if (configuredRoot) roots.push(configuredRoot);
    roots.push(this.getPluginDir(vaultBasePath));

    for (const root of roots.filter(Boolean)) {
      const cliPath = path.join(root, 'dist/src/cli.js');
      if (fs.existsSync(cliPath)) {
        const nodePath = this.resolveNodePath(env);
        if (!nodePath) return null;
        return { executable: nodePath, args: [cliPath], cwd: root };
      }
    }

    const gzPath = this.resolveExecutable('gz', env);
    if (gzPath) return { executable: gzPath, args: [], cwd: configuredRoot || vaultBasePath };
    return null;
  }

  getPluginDir(vaultBasePath) {
    if (this.manifest && this.manifest.dir) return path.join(vaultBasePath, this.manifest.dir);
    const pluginId = this.manifest && this.manifest.id ? this.manifest.id : 'gz-sync';
    const configDir = this.app.vault.configDir || '.obsidian';
    return path.join(vaultBasePath, configDir, 'plugins', pluginId);
  }

  resolveNodePath(env) {
    const configured = this.settings.nodePath && this.settings.nodePath.trim();
    if (configured && fs.existsSync(configured)) return configured;
    return this.resolveExecutable('node', env);
  }

  resolveExecutable(name, env) {
    const paths = this.buildSearchPath(env).split(path.delimiter).filter(Boolean);
    for (const dir of paths) {
      const full = path.join(dir, name);
      if (fs.existsSync(full)) return full;
    }
    return null;
  }

  buildSearchPath(env) {
    const extra = [
      '/opt/homebrew/bin',
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
      '/usr/sbin',
      '/sbin'
    ];
    const home = env.HOME || process.env.HOME;
    if (home) {
      const nvmRoot = path.join(home, '.nvm/versions/node');
      try {
        if (fs.existsSync(nvmRoot)) {
          for (const version of fs.readdirSync(nvmRoot).sort().reverse()) {
            extra.unshift(path.join(nvmRoot, version, 'bin'));
          }
        }
      } catch {
        // Ignore unreadable NVM directories.
      }
    }
    return [...extra, env.PATH || ''].join(path.delimiter);
  }

  setStatus(text) {
    if (this.statusBar) this.statusBar.setText(`GZH Sync：${text}`);
  }

  commandLabel(command) {
    if (command === 'sync') return '公众号 + 飞书';
    if (command === 'draft') return '公众号';
    if (command === 'feishu') return '飞书';
    return command;
  }

  async markSyncStarted(file, command, startedAt) {
    const time = this.formatTime(startedAt);
    await this.updateFrontMatter(file, {
      gz_sync_status: 'syncing',
      gz_sync_target: this.commandLabel(command),
      gz_sync_started_at: time,
      gz_sync_updated_at: time,
      gz_sync_error: null
    });
    await this.appendSyncLog(file, [
      `开始同步：${this.commandLabel(command)}`,
      `状态：进行中`
    ], startedAt);
  }

  async recordSyncSuccess(file, command, stdout) {
    const result = this.parseJson(stdout);
    const now = new Date();
    const fields = {
      gz_sync_status: result.status === 'partial' ? 'partial' : 'success',
      gz_sync_target: this.commandLabel(command),
      gz_sync_updated_at: this.formatTime(now),
      gz_sync_error: null
    };
    const logLines = [`同步成功：${this.commandLabel(command)}`];

    const wechat = command === 'draft' ? result : result && result.wechat;
    const feishu = command === 'feishu' ? result : result && result.feishu;

    if (wechat) {
      if (wechat.mediaId) fields.gz_wechat_media_id = wechat.mediaId;
      if (wechat.thumbMediaId) fields.gz_wechat_thumb_media_id = wechat.thumbMediaId;
      if (typeof wechat.uploadedImages === 'number') fields.gz_wechat_uploaded_images = wechat.uploadedImages;
      if (wechat.previewPath) fields.gz_wechat_preview_path = wechat.previewPath;
      logLines.push(`公众号：成功${wechat.mediaId ? `，media_id=${wechat.mediaId}` : ''}`);
    }

    if (feishu) {
      if (feishu.documentUrl) fields.gz_feishu_url = feishu.documentUrl;
      if (feishu.documentToken) fields.gz_feishu_token = feishu.documentToken;
      if (feishu.ticket) fields.gz_feishu_ticket = feishu.ticket;
      if (feishu.markdownPath) fields.gz_feishu_markdown_path = feishu.markdownPath;
      logLines.push(`飞书：成功${feishu.documentUrl ? `，${feishu.documentUrl}` : ''}`);
    }

    if (Array.isArray(result.errors) && result.errors.length > 0) {
      fields.gz_sync_error = result.errors.map((error) => `${error.platform}: ${error.message}`).join(' | ').slice(0, 500);
      fields.gz_sync_next_step = result.errors.map((error) => error.fix).filter(Boolean).join(' | ').slice(0, 500);
      for (const error of result.errors) {
        logLines.push(`${error.platform}：失败，${error.message}`);
        if (error.fix) logLines.push(`${error.platform} 下一步：${error.fix}`);
      }
    }

    await this.updateFrontMatter(file, fields);
    await this.appendSyncLog(file, logLines, now);
  }

  async recordSyncFailure(file, command, message) {
    const now = new Date();
    const summary = this.summarizeError(message);
    await this.updateFrontMatter(file, {
      gz_sync_status: 'failed',
      gz_sync_target: this.commandLabel(command),
      gz_sync_updated_at: this.formatTime(now),
      gz_sync_error: summary.title,
      gz_sync_next_step: summary.fix
    });
    await this.appendSyncLog(file, [
      `同步失败：${this.commandLabel(command)}`,
      `错误：${summary.title}`,
      `下一步：${summary.fix}`
    ], now);
  }

  async updateFrontMatter(file, fields) {
    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      for (const [key, value] of Object.entries(fields)) {
        if (value === null || value === undefined || value === '') delete frontmatter[key];
        else frontmatter[key] = value;
      }
    });
  }

  async appendSyncLog(file, lines, date = new Date()) {
    const heading = '## GZH Sync 日志';
    const stamp = this.formatTime(date);
    const entry = [`- ${stamp}`, ...lines.map((line) => `  - ${line}`)].join('\n');
    await this.app.vault.process(file, (content) => {
      return content.includes(heading)
        ? content.replace(heading, `${heading}\n${entry}`)
        : `${content.trimEnd()}\n\n${heading}\n${entry}\n`;
    });
  }

  summarizeError(message) {
    const normalized = message.replace(/\s+/g, ' ').trim();
    const ipMatch = normalized.match(/invalid ip\s+([0-9.]+)/i);
    if (normalized.includes('errcode=40164') || ipMatch) {
      const ip = ipMatch ? ipMatch[1] : '微信返回的公网 IP';
      return {
        title: `公众号 IP 白名单未配置：${ip}`,
        fix: `把 ${ip} 添加到微信公众平台 IP 白名单后重试。`
      };
    }
    const feishuCode = normalized.match(/code=(\d+)/);
    if (feishuCode && normalized.toLowerCase().includes('forbidden')) {
      return {
        title: `飞书接口无权限：code=${feishuCode[1]}`,
        fix: '检查飞书应用是否开启 docs:document:import 和 docs:document.media:upload，并已发布/安装。'
      };
    }
    return {
      title: normalized.slice(0, 180) || '未知错误',
      fix: '查看本文底部 GZH Sync 日志；确认凭证、权限、IP 白名单和网络后重试。'
    };
  }

  parseJson(stdout) {
    try {
      return JSON.parse(stdout);
    } catch {
      return {};
    }
  }

  formatTime(date) {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  createCliEnv() {
    const env = Object.assign({}, process.env);
    if (this.settings.wechatAppId) env.WECHAT_APPID = this.settings.wechatAppId;
    if (this.settings.wechatSecret) env.WECHAT_SECRET = this.settings.wechatSecret;
    if (this.settings.author) env.WECHAT_AUTHOR = this.settings.author;
    if (this.settings.defaultCover) env.WECHAT_DEFAULT_COVER = this.settings.defaultCover;
    if (this.settings.feishuAppId) env.FEISHU_APP_ID = this.settings.feishuAppId;
    if (this.settings.feishuAppSecret) env.FEISHU_APP_SECRET = this.settings.feishuAppSecret;
    if (this.settings.feishuFolderToken) env.FEISHU_FOLDER_TOKEN = this.settings.feishuFolderToken;
    return env;
  }

  showSuccess(command, stdout) {
    try {
      const result = JSON.parse(stdout);
      if (command === 'sync') {
        const mediaId = result.wechat && result.wechat.mediaId ? result.wechat.mediaId : '已返回';
        const docUrl = result.feishu && result.feishu.documentUrl ? result.feishu.documentUrl : '已创建';
        const label = result.status === 'partial' ? '部分同步成功' : '同步成功';
        new Notice(`${label}：公众号 ${mediaId}；飞书 ${docUrl}`, 12000);
        return;
      }
      if (command === 'draft') {
        new Notice(`草稿创建成功：${result.mediaId || '已返回'}；图片 ${result.uploadedImages} 张`, 12000);
        return;
      }
      if (command === 'feishu') {
        new Notice(`飞书同步成功：${result.documentUrl || result.documentToken || '已创建'}`, 12000);
        return;
      }
    } catch {
      // Fall through to raw output notice.
    }
    new Notice(`GZH Sync 完成：${stdout.trim().slice(0, 500)}`, 12000);
  }
};

class WechatTypesetterSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl).setName('GZH Sync').setHeading();
    containerEl.createEl('p', { text: 'CLI 只负责执行同步；公众号和飞书开放平台仍需要各自的应用凭证。凭证会保存在当前 Obsidian vault 的插件数据里。' });

    this.addText('项目根目录', '可选；包含 package.json 和 dist/src/cli.js 的目录。留空时自动尝试插件目录和全局 gz 命令。', 'projectRoot');
    this.addText('Node 路径', '可选；Node.js 可执行文件绝对路径。留空时自动查找 node。', 'nodePath');
    new Setting(containerEl).setName('微信公众号').setHeading();
    this.addText('AppID', '微信公众号后台的 AppID', 'wechatAppId');
    this.addText('AppSecret', '微信公众号后台的 AppSecret', 'wechatSecret', true);
    this.addText('默认作者', '没有 frontmatter author 时使用', 'author');
    this.addText('默认封面', '没有 frontmatter cover 时使用，填写本地绝对路径或 URL', 'defaultCover');

    new Setting(containerEl).setName('飞书').setHeading();
    this.addText('App ID', '飞书开放平台自建应用的 App ID', 'feishuAppId');
    this.addText('App Secret', '飞书开放平台自建应用的 App Secret', 'feishuAppSecret', true);
    this.addText('目标文件夹 Token', '可选；为空时使用飞书接口默认位置', 'feishuFolderToken');
  }

  addText(name, desc, key, password = false) {
    new Setting(this.containerEl)
      .setName(name)
      .setDesc(desc)
      .addText((text) => {
        text.setPlaceholder(desc)
          .setValue(this.plugin.settings[key] || '')
          .onChange(async (value) => {
            this.plugin.settings[key] = value.trim();
            await this.plugin.saveSettings();
          });
        if (password && text.inputEl) text.inputEl.type = 'password';
      });
  }
}
