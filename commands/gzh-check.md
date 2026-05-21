---
description: "检查公众号排版同步工具配置是否可用"
argument-hint: ""
allowed-tools: [Bash, Read, Glob]
---

# 检查公众号配置

请全程用中文回复。

运行：

```bash
node dist/src/cli.js config validate
```

把检查结果翻译成用户能看懂的中文：

- 缺 AppID：让用户运行 `/gzh-setup` 或填写 `config.local.json`。
- 缺 AppSecret：让用户运行 `/gzh-setup` 或填写 `config.local.json`。
- 缺作者：让用户填写自己的公众号作者名，不要使用默认人名。
- 缺默认封面：说明可以设置默认封面，或在文章 frontmatter 里写 `cover`。
- IP 白名单：如果无法查询或微信报错，以微信错误里的 IP 为准。

不要泄露 AppSecret。
