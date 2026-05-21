const { Notice, Plugin } = require('obsidian');
const { execFile } = require('child_process');
const path = require('path');

module.exports = class WechatTypesetterPlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: 'send-current-note-to-wechat-draft',
      name: '公众号排版：发送当前文章到草稿箱',
      callback: () => this.sendCurrentNote()
    });
  }

  async sendCurrentNote() {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== 'md') {
      new Notice('请先打开一篇 Markdown 文章。');
      return;
    }
    const adapter = this.app.vault.adapter;
    const vaultBasePath = adapter && adapter.basePath;
    if (!vaultBasePath) {
      new Notice('无法读取 vault 路径；此插件仅支持桌面端本地 vault。');
      return;
    }
    const absolutePath = path.join(vaultBasePath, file.path);
    const cliPath = '/Users/xiaolong/Desktop/公号排版/dist/src/cli.js';
    new Notice('正在生成公众号草稿...');
    execFile(process.execPath, [cliPath, 'draft', absolutePath], { cwd: '/Users/xiaolong/Desktop/公号排版', maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        const message = (stderr || stdout || error.message).trim().slice(0, 500);
        new Notice(`公众号草稿创建失败：${message}`, 12000);
        return;
      }
      try {
        const result = JSON.parse(stdout);
        new Notice(`草稿创建成功：${result.mediaId || '已返回'}；图片 ${result.uploadedImages} 张；预览 ${result.previewPath}`, 12000);
      } catch {
        new Notice(`草稿创建完成：${stdout.trim().slice(0, 500)}`, 12000);
      }
    });
  }
};
