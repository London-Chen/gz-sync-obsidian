# WeChat Typeset Skill

把 Obsidian / Markdown 文章一键排版并同步到微信公众号草稿箱。

你正常写 Markdown，AI Agent 负责做后面的事：解析文章、生成微信兼容内联 HTML、上传图片、上传封面、创建公众号草稿。

> 你不需要手写 HTML，但微信公众号草稿接口最终需要 HTML，所以本工具会在后台自动转换。

## 适合谁

- 你平常在 Obsidian 写公众号文章。
- 你不想每次手动调字号、行距、标题、图片。
- 你希望在 AI Agent 里用一个命令同步到公众号草稿箱。
- 你有微信公众号 AppID 和 AppSecret，并能配置 IP 白名单。

## 功能

- Markdown / Obsidian 文章解析
- 微信公众号内联 HTML 排版
- 本地预览 HTML
- 正文图片上传到微信
- 封面上传并生成 `thumb_media_id`
- 创建微信公众号草稿
- AI Agent Skill 封装
- 英文斜杠命令：`/gzh-sync`、`/gzh-preview`、`/gzh-setup`、`/gzh-check`

## 安装方式一：作为 AI Agent Skill 安装

在支持 Agent Skill 的环境中运行：

```bash
npx skills add https://github.com/London-Chen/wechat-typeset --skill wechat-typeset
```

安装后，向你的 AI Agent 输入：

```text
/gzh-setup
```

Agent 会引导你配置公众号凭证。

## 安装方式二：作为本地 CLI 使用

```bash
git clone https://github.com/London-Chen/wechat-typeset.git
cd wechat-typeset
npm install
npm run build
```

验证：

```bash
node dist/src/cli.js preview test/fixtures/sample.md
```

可选：全局链接命令。

```bash
npm link
wechat-typeset preview test/fixtures/sample.md
```

## 第一次配置公众号

运行：

```bash
node dist/src/cli.js config init
```

它会生成本地配置文件：

```text
config.local.json
```

填入：

```json
{
  "appid": "你的公众号 AppID",
  "secret": "你的公众号 AppSecret",
  "author": "默认作者",
  "defaultCover": "/absolute/path/to/default-cover.jpg"
}
```

也可以用环境变量：

```bash
WECHAT_APPID=你的公众号 AppID
WECHAT_SECRET=你的公众号 AppSecret
WECHAT_AUTHOR=默认作者
WECHAT_DEFAULT_COVER=/absolute/path/to/default-cover.jpg
```

重要：`config.local.json` 和 `.env` 不要提交到 GitHub。项目已经默认忽略它们。

## 获取 AppID 和 AppSecret

1. 打开微信开发者平台：`https://developers.weixin.qq.com/platform`
2. 选择你的公众号。
3. 进入“开发接口管理”。
4. 复制 `AppID`。
5. 获取或重置 `AppSecret`。
6. 保存到 `config.local.json` 或 `.env`。

## 配置 IP 白名单

微信公众号接口通常要求调用机器的公网 IP 在白名单中。

先运行：

```bash
node dist/src/cli.js config validate
```

如果真正同步时微信返回类似错误：

```text
invalid ip xxx.xxx.xxx.xxx not in whitelist
```

请以微信错误里的 IP 为准，把它添加到微信后台：

```text
微信开发者平台 -> 开发接口管理 -> IP 白名单
```

## 推荐文章格式

在 Obsidian / Markdown 文件顶部写 frontmatter：

```yaml
---
title: 文章标题
author: 陈龙得
digest: 文章摘要
cover: ./attachments/cover.jpg
source_url: ""
---
```

正文继续正常写 Markdown：

```markdown
# 一级标题

这是一段正文，支持 **加粗**、链接、引用、列表和图片。

## 二级标题

![图片说明](./attachments/demo.jpg)
```

封面选择规则：

1. 优先使用 frontmatter 的 `cover`。
2. 没有 `cover` 时，使用文章第一张图片。
3. 再没有时，使用 `defaultCover` / `WECHAT_DEFAULT_COVER`。

## AI Agent 斜杠命令

注意：斜杠后面统一用英文，避免部分 Agent 不支持 `/中文`。

### `/gzh-setup`

配置公众号凭证。

```text
/gzh-setup
```

Agent 会运行：

```bash
node dist/src/cli.js config init
```

然后引导你填写 AppID、AppSecret、默认作者、默认封面。

### `/gzh-check`

检查配置是否完整。

```text
/gzh-check
```

Agent 会运行：

```bash
node dist/src/cli.js config validate
```

### `/gzh-preview`

只生成本地预览，不调用微信接口。

```text
/gzh-preview /absolute/path/to/article.md
```

等价 CLI：

```bash
node dist/src/cli.js preview "/absolute/path/to/article.md"
```

输出：

- `dist/preview/<title>.html`
- `dist/output/<title>.wechat.html`

### `/gzh-sync`

同步文章到微信公众号草稿箱。

```text
/gzh-sync /absolute/path/to/article.md
```

Agent 会依次执行：

1. `inspect`：检查标题、封面、图片、配置。
2. `preview`：生成本地预览。
3. `draft`：上传图片并创建公众号草稿。

成功后会返回：

- 草稿 `media_id`
- 封面 `thumb_media_id`
- 上传图片数量
- 本地预览路径

## 直接使用 CLI

```bash
node dist/src/cli.js inspect "文章.md"
node dist/src/cli.js preview "文章.md"
node dist/src/cli.js draft "文章.md"
node dist/src/cli.js config init
node dist/src/cli.js config validate
```

## 默认排版参数

排版参数在 `style.profile.json` 中，可以自己修改。

当前默认值：

- 正文字号：`15px`
- 正文颜色：`#3F3F3F`
- 字间距：`1px`
- 行间距：`1.75`
- 段后距：`15px`
- 左右边距：`12px`
- 对齐方式：两端对齐
- 一级标题：`20px`
- 二级标题：`18px`
- 三级标题：`16px`
- 注释/来源：`12px #888888`

## Obsidian 插件

项目里也提供了一个很薄的 Obsidian 插件入口：`obsidian-plugin`。

安装方式：

1. 先运行：

```bash
npm install
npm run build
```

2. 复制目录：

```text
obsidian-plugin -> 你的 vault/.obsidian/plugins/wechat-typesetter
```

3. 在 Obsidian 设置里启用“公众号排版器”。
4. 打开文章，运行命令：`公众号排版：发送当前文章到草稿箱`。

插件只负责读取当前文章路径，真正逻辑仍然由 CLI 完成。

## 常见问题

### 1. 为什么不能直接上传 Markdown？

微信公众号草稿接口的正文 `content` 是微信可接受的 HTML。Markdown 必须先转换成微信兼容内联 HTML。

### 2. 星号 `**加粗**` 会不会出现在公众号里？

不会。工具会把 Markdown 加粗转换成 `<strong>...</strong>`，包括列表项里的加粗。

### 3. 报 `invalid ip ... not in whitelist` 怎么办？

把错误信息里的 IP 添加到微信开发者平台 IP 白名单。以微信返回的 IP 为准。

### 4. 报 `description size out of limit` 怎么办？

工具会自动截断摘要。如果仍然报错，请手动缩短 frontmatter 里的 `digest`。

### 5. 报 `author size out of limit` 怎么办？

工具会清洗 Obsidian 的 `[[author]]` 格式，并在 `@xxx` 来源作者时回退到默认作者。

### 6. 图片为什么必须上传？

公众号正文不能引用本地图片路径。正文图片会上传到微信正文图片接口，封面会上传到微信素材接口。

## 安全提醒

- 不要把 AppSecret 发给别人。
- 不要把 `config.local.json` 或 `.env` 提交到 GitHub。
- 本工具只创建草稿，不会自动群发。
- 草稿创建后，请在公众号后台人工检查再发布。

## 开发验证

```bash
npm run build
npm test
```

测试覆盖：

- 固定内联样式生成
- Markdown 加粗星号不泄漏到列表项
