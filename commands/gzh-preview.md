---
description: "生成公众号文章本地预览，不上传微信"
argument-hint: "<markdown-file>"
allowed-tools: [Bash, Read, Glob]
---

# 预览公众号排版

请全程用中文回复。

用户传入的文章路径是：`$ARGUMENTS`

执行：

```bash
node dist/src/cli.js inspect "$ARGUMENTS"
node dist/src/cli.js preview "$ARGUMENTS"
```

向用户报告：

- 文章标题
- readiness 问题
- 本地预览 HTML 路径
- 微信正文 HTML 路径

如果 `$ARGUMENTS` 为空，请让用户提供 Markdown 文件路径。
