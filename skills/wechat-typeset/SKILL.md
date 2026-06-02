---
name: wechat-typeset
description: Use when the user wants to publish or sync an Obsidian/Markdown article to a WeChat Official Account draft and Feishu docs, configure WeChat and Feishu credentials, upload article images, generate a WeChat-compatible preview, or use slash commands /gzh, /gzh-setup, /gzh-check, /gzh-preview, /gzh-sync, or /gzh-update.
metadata:
  short-description: Markdown/Obsidian to WeChat and Feishu
---

# WeChat Typeset

把用户当前的 Markdown/Obsidian 文章转换并推送到微信公众号草稿箱，也可同步为飞书云文档。回复用户时默认使用中文。

## 用户可用命令

- `/gzh`：主入口，说明功能并优先引导首次配置。
- `/gzh-setup`：配置 AppID、AppSecret、作者名、默认封面。
- `/gzh-check`：检查本地配置和 IP 白名单风险。
- `/gzh-preview <article.md>`：只生成本地预览，不上传。
- `/gzh-sync <article.md>`：检查、预览、上传图片，创建公众号草稿并同步飞书云文档。
- `/gzh-update`：从 GitHub 拉取最新代码、安装依赖并重新构建。

## 核心流程

1. 找到包含 `package.json` 和 `wechat-typeset` CLI 的项目根目录。
2. 如果依赖或构建产物缺失，运行 `npm install` 和 `npm run build`。
3. 如果用户要求更新，运行 `bash scripts/update.sh`。
4. 首次使用时运行 `node dist/src/cli.js config init`，引导用户输入 AppID、AppSecret、作者名、默认封面。
5. 同步前运行 `node dist/src/cli.js inspect "<article.md>"` 并修复阻塞问题。
6. 运行 `node dist/src/cli.js preview "<article.md>"` 生成本地预览。
7. 对 `/gzh-sync`，运行 `node dist/src/cli.js sync "<article.md>"`，报告公众号 `mediaId`、上传图片数量、预览路径和飞书文档链接。

## 重要规则

- 不要泄露或提交 AppSecret，凭证只写入 `.env` 或 `config.local.json`。
- 不要写死默认作者；用户必须配置自己的公众号作者名。
- 微信草稿正文不能直接接收 Markdown；工具会在后台生成微信兼容内联 HTML。
- 如果微信返回 `invalid ip ... not in whitelist`，让用户把错误里的 IP 加到微信开发者平台白名单。
- 如果 Markdown 加粗符号泄漏，重新生成并确保 `**text**` 变成 `<strong>text</strong>`。
- 飞书需要 `docs:document:import` 和 `docs:document.media:upload` 权限，或使用 `drive:drive`。
- 不自动群发，只创建草稿。

## 参考

- 首次配置和常见错误：`references/setup.md`
- slash 命令行为：`references/slash-commands.md`
