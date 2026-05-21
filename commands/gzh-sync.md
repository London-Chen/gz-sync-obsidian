---
description: "同步 Markdown/Obsidian 文章到微信公众号草稿箱"
argument-hint: "<markdown-file>"
allowed-tools: [Bash, Read, Glob]
---

# 同步到公众号草稿箱

请全程用中文回复。

用户传入的文章路径是：`$ARGUMENTS`

## 步骤

1. 如果 `$ARGUMENTS` 为空，请让用户提供 Markdown 文件路径。
2. 运行 `node dist/src/cli.js inspect "$ARGUMENTS"`。
3. 如果 readiness 有阻塞问题，先告诉用户如何修复。
4. 运行 `node dist/src/cli.js preview "$ARGUMENTS"`。
5. 运行 `node dist/src/cli.js draft "$ARGUMENTS"`。
6. 用中文报告草稿 `mediaId`、上传图片数量、预览路径。

## 常见错误处理

- 缺 AppID / AppSecret：让用户先运行 `/gzh-setup`。
- 缺作者：让用户填写自己的公众号作者名。
- 缺封面：让用户设置默认封面或在文章 frontmatter 里写 `cover`。
- `invalid ip ... not in whitelist`：让用户把微信错误里的 IP 加到微信开发者平台 IP 白名单。
- `description size out of limit`：摘要过长，工具通常会自动截断；仍失败则让用户缩短 `digest`。
- `author size out of limit`：作者名过长，让用户缩短作者名。

不要泄露 AppSecret。
