---
description: "公众号排版同步主入口：配置、检查、预览、同步文章到公众号草稿箱"
argument-hint: "[setup|check|preview|sync] [markdown-file]"
allowed-tools: [Bash, Read, Write, Edit, Glob]
---

# 公众号排版同步主入口

请全程用中文回复。用户输入的是：`$ARGUMENTS`

## 先判断意图

- 空参数或 help：说明可用命令，并优先引导用户运行 `/gzh-setup`。
- `setup`：执行配置流程。
- `check`：执行配置检查。
- `preview <文章路径>`：生成预览。
- `sync <文章路径>`：同步到公众号草稿箱。
- `update`：更新到 GitHub 最新版本。
- 如果用户直接给了一个 `.md` 路径，按 `sync <文章路径>` 处理。

## 可用命令

```text
/gzh-setup
/gzh-check
/gzh-preview /absolute/path/to/article.md
/gzh-sync /absolute/path/to/article.md
/gzh-update
```

## 首次使用时

如果用户还没有配置，请直接引导：

1. 运行 `node dist/src/cli.js config init`。
2. 请用户提供微信公众号 AppID 和 AppSecret。
3. 请用户填写自己的公众号作者名，不要使用任何默认人名。
4. 请用户设置默认封面，或说明每篇文章 frontmatter 可写 `cover`。
5. 运行 `node dist/src/cli.js config validate`。

## 中文回复模板

如果只是打开 `/gzh`，回复：

“这是公众号排版同步工具。第一次使用请先输入 `/gzh-setup`，配置 AppID、AppSecret、作者名和默认封面。配置完成后，用 `/gzh-sync 文章路径.md` 同步到公众号草稿箱。以后需要升级时，输入 `/gzh-update`。”

不要用英文回复。不要泄露 AppSecret。
