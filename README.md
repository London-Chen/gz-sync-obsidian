# 公众号排版器

本项目把 Obsidian Markdown 确定性转换为微信兼容内联 HTML，并可上传图片后创建微信公众号草稿。

## 安装

```bash
npm install
npm run build
```

## 常用命令

```bash
node dist/src/cli.js inspect "文章.md"
node dist/src/cli.js preview "文章.md"
node dist/src/cli.js config init
node dist/src/cli.js config validate
node dist/src/cli.js draft "文章.md"
```

也可以全局链接后使用：

```bash
npm link
wechat-typeset preview "文章.md"
```

## 配置

运行 `node dist/src/cli.js config init` 生成 `config.local.json`，或复制 `.env.example` 为 `.env`。

```bash
WECHAT_APPID=...
WECHAT_SECRET=...
WECHAT_AUTHOR=陈龙得
WECHAT_DEFAULT_COVER=/absolute/path/to/default-cover.jpg
```

## Frontmatter

```yaml
title: 文章标题
author: 陈龙得
digest: 摘要
cover: ./attachments/cover.jpg
source_url: ""
wechat:
  draft: true
```

## Obsidian 插件

`obsidian-plugin` 是薄入口，核心逻辑仍在 CLI。

1. 运行 `npm install && npm run build`。
2. 将 `obsidian-plugin` 目录复制到 vault 的 `.obsidian/plugins/wechat-typesetter`。
3. 在 Obsidian 启用插件。
4. 打开文章并运行命令：`公众号排版：发送当前文章到草稿箱`。

## 注意

- 微信草稿箱需要有效 AppID/Secret，并且执行机器公网 IP 要加入微信后台白名单。
- 正文图片会上传到微信正文图片接口，封面会上传到永久图片素材接口。
- 第一版只创建草稿，不自动群发。
