---
description: "配置公众号排版同步工具的 AppID、AppSecret、作者和默认封面"
argument-hint: "[appid] [secret]"
allowed-tools: [Bash, Read, Write, Edit, Glob]
---

# 配置公众号排版同步

用户正在配置 WeChat Typeset。请全程用中文回复。

## 目标

引导用户完成微信公众号草稿箱同步所需配置：AppID、AppSecret、默认作者、默认封面。

## 执行步骤

1. 找到当前项目中的 `gz_sync` 仓库。如果当前目录不是仓库，请优先检查当前目录和常见位置。
2. 如果依赖或构建产物不存在，运行 `npm install` 和 `npm run build`。
3. 运行 `node dist/src/cli.js config init` 生成 `config.local.json`。
4. 如果用户已经在命令参数或消息里提供 AppID / AppSecret，把它们写入 `config.local.json`。
5. 如果缺少 AppID 或 AppSecret，直接用中文让用户提供，不要继续同步。
6. 默认作者不要写死任何人名；如果用户没提供作者，请让用户填写自己的公众号作者名。
7. 默认封面如果缺失，提醒用户可以先设置一个本地图片路径，或者在每篇文章 frontmatter 里写 `cover`。
8. 运行 `node dist/src/cli.js config validate`，把结果用中文解释给用户。

## 配置文件格式

```json
{
  "appid": "公众号 AppID",
  "secret": "公众号 AppSecret",
  "author": "公众号作者名",
  "defaultCover": "/absolute/path/to/default-cover.jpg"
}
```

## 注意

- 不要把 AppSecret 输出到最终回复里。
- 不要把 `config.local.json` 提交到 GitHub。
- 如果微信返回 IP 白名单错误，让用户把错误里的 IP 加到微信开发者平台白名单。
