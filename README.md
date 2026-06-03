# GZH Sync

GZH Sync is a local CLI and community plugin that syncs the current Markdown note to WeChat Official Account drafts and Feishu Docs. It parses Markdown, generates WeChat-compatible HTML, uploads images and covers, creates a WeChat draft, and imports the same article into an online Feishu document.

Important: this tool only creates WeChat drafts. It never publishes articles automatically; review every draft in the WeChat admin before publishing.

GZH Sync 是一个本地 CLI + Obsidian 插件，用来把 Obsidian / Markdown 文章一键同步到：

- 微信公众号草稿箱
- 飞书云文档

你正常写 Markdown，工具负责解析文章、生成微信兼容 HTML、上传公众号图片和封面、创建公众号草稿，并把同一篇文章导入为飞书在线文档。

> 重要：本工具只创建公众号草稿，不会自动群发。草稿创建后，请到公众号后台人工检查再发布。

## 最终效果

CLI：

```bash
gz sync "文章.md"
```

Obsidian：

```text
命令面板 -> GZH Sync：同步当前文章到公众号和飞书
```

也可以分开执行：

```bash
gz draft "文章.md"     # 只创建微信公众号草稿
gz feishu "文章.md"    # 只创建飞书云文档
gz preview "文章.md"   # 只生成本地预览
```

## 适合谁

- 你平常在 Obsidian 写公众号文章。
- 你希望一篇 Markdown 同步到公众号草稿箱和飞书文档。
- 你不想手动调整公众号排版、字号、行距和图片。
- 你有微信公众号 AppID / AppSecret。
- 你能创建飞书开放平台自建应用。

## 功能

- Markdown / Obsidian 文章解析
- 微信公众号内联 HTML 排版
- 本地预览 HTML
- 正文图片上传到微信
- 封面上传并生成 `thumb_media_id`
- 创建微信公众号草稿
- 导入 Markdown 并创建飞书云文档
- Obsidian 插件配置页
- 一键同步到公众号草稿箱和飞书
- 保留 AI Agent / slash command 使用方式

## 安装

### 方式一：本地 CLI

```bash
git clone https://github.com/London-Chen/gz-sync-obsidian.git
cd gz-sync-obsidian
npm install
npm run build
npm link
```

验证：

```bash
gz preview test/fixtures/sample.md
```

如果不想 `npm link`，也可以直接运行：

```bash
node dist/src/cli.js preview test/fixtures/sample.md
```

### 方式二：Obsidian 插件

先在项目根目录构建：

```bash
npm install
npm run build
```

然后复制插件目录：

```text
obsidian-plugin -> 你的 vault/.obsidian/plugins/gz-sync
```

在 Obsidian 里：

1. 打开“设置 -> 第三方插件”。
2. 关闭安全模式，或允许第三方插件。
3. 启用 `GZH Sync`。
4. 打开 `GZH Sync` 插件设置页。
5. 填写项目根目录、公众号凭证、飞书凭证。

项目根目录示例：

```text
/path/to/gz-sync-obsidian
```

## 为什么绑定 CLI 后还要填 AppID / Secret？

CLI 绑定只是让你能在本地运行 `gz sync`，或者让 Obsidian 能调用这个命令。

但微信公众号和飞书都是开放平台接口，调用接口必须证明“你有权操作这个账号/租户”。所以仍然需要：

- 微信公众号 `AppID` / `AppSecret`
- 飞书自建应用 `App ID` / `App Secret`

这些凭证可以填在 Obsidian 插件设置页，也可以写入本地 `config.local.json` 或 `.env`。

## 公众号配置教程

### 1. 获取公众号 AppID / AppSecret

1. 打开微信公众平台或微信开发者平台。
2. 进入你的公众号后台。
3. 找到“开发 -> 基本配置”或“开发接口管理”。
4. 复制 `AppID`。
5. 获取或重置 `AppSecret`。
6. 保存好 `AppSecret`，不要发给别人。

### 2. 配置 IP 白名单

微信公众号接口通常要求调用机器的公网 IP 在白名单中。

先运行：

```bash
gz config validate
```

如果真正同步时微信返回类似：

```text
invalid ip xxx.xxx.xxx.xxx not in whitelist
```

请以微信错误里的 IP 为准，把它添加到公众号后台的 IP 白名单。

### 3. 公众号需要填写的配置

Obsidian 插件设置页填写：

- 公众号 AppID
- 公众号 AppSecret
- 默认作者
- 默认封面

CLI 配置文件方式：

```bash
gz config init
```

生成：

```text
config.local.json
```

填写：

```json
{
  "appid": "你的公众号 AppID",
  "secret": "你的公众号 AppSecret",
  "author": "你的公众号作者名",
  "defaultCover": "/absolute/path/to/default-cover.jpg",
  "feishuAppId": "",
  "feishuAppSecret": "",
  "feishuFolderToken": ""
}
```

环境变量方式：

```bash
WECHAT_APPID=你的公众号 AppID
WECHAT_SECRET=你的公众号 AppSecret
WECHAT_AUTHOR=你的公众号作者名
WECHAT_DEFAULT_COVER=/absolute/path/to/default-cover.jpg
```

## 飞书配置教程

飞书同步使用的是飞书开放平台“导入文件为云文档”的能力。流程是：

1. 获取 `tenant_access_token`。
2. 上传 Markdown 文件作为导入素材。
3. 创建导入任务，把 Markdown 导入为新版飞书文档 `docx`。
4. 轮询查询导入结果，返回飞书文档链接。

### 1. 创建飞书自建应用

1. 打开飞书开放平台：`https://open.feishu.cn/`。
2. 进入“开发者后台”。
3. 创建“企业自建应用”。
4. 进入应用详情。
5. 在“凭证与基础信息”里复制：
   - `App ID`
   - `App Secret`

### 2. 开启飞书权限

进入飞书开放平台应用后台：

```text
应用详情 -> 权限管理 -> API 权限
```

建议开启以下权限：

| 权限名 | 权限标识 | 用途 |
| --- | --- | --- |
| 查看、创建云文档导入任务 | `docs:document:import` | 创建和查询 Markdown 导入任务 |
| 上传图片和附件到云文档中 | `docs:document.media:upload` | 上传待导入的 Markdown 文件 |

如果你不想逐项排查，也可以开启更大的云空间权限：

| 权限名 | 权限标识 | 用途 |
| --- | --- | --- |
| 查看、评论、编辑和管理云空间中所有文件 | `drive:drive` | 覆盖上传素材、创建导入任务、查询导入结果 |

推荐最小权限组合：

```text
docs:document:import
docs:document.media:upload
```

如果要导入到某个指定飞书文件夹，还需要确保应用对该文件夹有权限。否则导入任务可能返回无权限或 `job_status=116`。

### 3. 发布并安装飞书应用

开启权限后，通常还需要：

1. 在应用后台创建版本。
2. 发布版本。
3. 由企业管理员审核/启用。
4. 确认应用已安装到当前飞书租户。

如果只创建了应用但没有发布/安装，`App ID` / `App Secret` 可能能获取 token，但后续云文档接口仍可能报无权限。

### 4. 配置飞书凭证

Obsidian 插件设置页填写：

- 飞书 App ID
- 飞书 App Secret
- 目标文件夹 Token，选填

CLI 配置文件填写：

```json
{
  "feishuAppId": "cli_xxx 或 cli_a1b2c3...",
  "feishuAppSecret": "你的飞书 App Secret",
  "feishuFolderToken": "可选，目标飞书文件夹 token"
}
```

环境变量方式：

```bash
FEISHU_APP_ID=你的飞书自建应用 App ID
FEISHU_APP_SECRET=你的飞书自建应用 App Secret
FEISHU_FOLDER_TOKEN=可选，目标飞书文件夹 token
```

### 5. 如何获取飞书文件夹 Token

如果你希望文档导入到指定文件夹：

1. 在飞书云空间打开目标文件夹。
2. 复制浏览器地址栏链接。
3. 链接中的文件夹 token 通常是最后一段路径或 URL 参数中的 token。
4. 填入 `FEISHU_FOLDER_TOKEN` 或 Obsidian 插件设置里的“目标文件夹 Token”。

如果不填，工具会把 `mount_key` 传空，表示导入到云空间根目录。

## Obsidian 插件使用教程

### 1. 填写插件设置

打开：

```text
Obsidian 设置 -> 第三方插件 -> GZH Sync -> 设置
```

填写：

- 项目根目录：包含 `package.json` 和 `dist/src/cli.js` 的目录
- 公众号 AppID
- 公众号 AppSecret
- 默认作者
- 默认封面
- 飞书 App ID
- 飞书 App Secret
- 飞书目标文件夹 Token，选填

插件会把这些设置作为环境变量传给 CLI。你不必再手动写 `.env`。

### 2. 运行同步命令

打开一篇 Markdown 文章，然后打开 Obsidian 命令面板：

```text
GZH Sync：同步当前文章到公众号和飞书
```

也可以只同步一边：

```text
GZH Sync：仅发送当前文章到公众号草稿箱
GZH Sync：仅同步当前文章到飞书
```

## CLI 使用教程

初始化配置：

```bash
gz config init
```

检查配置：

```bash
gz config validate
```

检查文章 readiness：

```bash
gz inspect "文章.md"
```

生成本地预览：

```bash
gz preview "文章.md"
```

只创建公众号草稿：

```bash
gz draft "文章.md"
```

只创建飞书文档：

```bash
gz feishu "文章.md"
```

一键同步公众号和飞书：

```bash
gz sync "文章.md"
```

## 推荐文章格式

在 Obsidian / Markdown 文件顶部写 frontmatter：

```yaml
---
title: 文章标题
author: 你的公众号作者名
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

## 输出文件

预览和导出文件会写入：

```text
dist/preview/<title>.html
dist/output/<title>.wechat.html
dist/output/<title>.feishu.md
```

## AI Agent / Slash Commands

如果你的 Agent 支持 slash command，可以继续使用：

```text
/gzh
/gzh-setup
/gzh-check
/gzh-preview
/gzh-sync
/gzh-update
```

如果 Agent 不支持 slash command，就直接让它运行 CLI，例如：

```bash
gz preview "文章.md"
gz sync "文章.md"
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

## 常见问题

### 1. `gz` 命令找不到怎么办？

在项目根目录运行：

```bash
npm link
```

或者直接用：

```bash
node dist/src/cli.js sync "文章.md"
```

### 2. 为什么不能直接上传 Markdown 到公众号？

微信公众号草稿接口的正文 `content` 是微信可接受的 HTML。Markdown 必须先转换成微信兼容内联 HTML。

### 3. 为什么飞书还要 App ID / Secret？

因为飞书云文档属于你的企业租户。CLI 只是本地工具，必须通过飞书开放平台应用凭证获取授权后才能创建云文档。

### 4. 公众号报 `invalid ip ... not in whitelist` 怎么办？

把错误信息里的 IP 添加到微信公众平台 IP 白名单。以微信返回的 IP 为准。

### 5. 飞书报无权限怎么办？

检查：

- 应用是否开启了 `docs:document:import`。
- 应用是否开启了 `docs:document.media:upload` 或 `drive:drive`。
- 应用是否已经发布并安装到当前租户。
- 如果指定了文件夹 token，应用是否有该文件夹权限。

### 6. 飞书导入任务返回 `job_status=116` 怎么办？

这通常表示当前身份无导入至该文件夹的权限。请换一个有权限的文件夹，或给应用开通该文件夹权限，或清空 `FEISHU_FOLDER_TOKEN` 先导入到根目录测试。

### 7. 公众号报 `description size out of limit` 怎么办？

工具会自动截断摘要。如果仍然报错，请手动缩短 frontmatter 里的 `digest`。

### 8. 公众号报 `author size out of limit` 怎么办？

工具会清洗 Obsidian 的 `[[author]]` 格式。如果仍然失败，请缩短作者名。

### 9. 图片为什么必须上传？

公众号正文不能引用本地图片路径。正文图片会上传到微信正文图片接口，封面会上传到微信素材接口。

## 安全提醒

- 不要把 AppSecret 发给别人。
- 不要把 `config.local.json` 或 `.env` 提交到 GitHub。
- Obsidian 插件设置会保存在当前 vault 的插件数据里，请保护好 vault。
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

## 官方接口参考

- 飞书：自建应用获取 `tenant_access_token`  
  https://open.feishu.cn/document/server-docs/authentication-management/access-token/tenant_access_token_internal
- 飞书：上传素材 `drive/v1/medias/upload_all`  
  https://open.feishu.cn/document/server-docs/docs/drive-v1/media/upload_all
- 飞书：创建导入任务 `drive/v1/import_tasks`  
  https://open.feishu.cn/document/server-docs/docs/drive-v1/import_task/create
- 飞书：查询导入结果 `drive/v1/import_tasks/:ticket`  
  https://open.feishu.cn/document/server-docs/docs/drive-v1/import_task/get
