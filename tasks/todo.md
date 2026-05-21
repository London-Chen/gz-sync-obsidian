# 公众号排版器 TODO

## Plan

- [x] 初始化 Node/TypeScript CLI 项目与任务记录。
- [x] 实现 Markdown/frontmatter 解析、Obsidian 图片路径解析、readiness 检查。
- [x] 实现微信兼容内联 HTML 渲染与本地 preview 输出。
- [x] 实现 config init / validate、本地环境加载、明确错误提示。
- [x] 实现微信 access_token、正文图片上传、封面素材上传、草稿创建。
- [x] 实现 Obsidian 桌面插件薄入口。
- [x] 准备样例文章并验证 inspect / preview / config validate / build。
- [x] 记录 Review 结果。

## Progress

- 2026-05-21: 开始实现计划。

## Review

- `npm install` 完成，生成 `package-lock.json`；npm audit 提示 1 个 moderate vulnerability，未自动强制升级以避免破坏依赖。
- `npm run build` 通过。
- `npm test` 通过：验证固定内联样式、无 script/style。
- `node dist/src/cli.js inspect test/fixtures/sample.md` 通过，readiness 为空。
- `node dist/src/cli.js preview test/fixtures/sample.md` 通过，生成 `dist/preview/测试公众号排版器.html` 和 `dist/output/测试公众号排版器.wechat.html`。
- `node dist/src/cli.js config init` 验证可生成 `config.local.json`，测试后已删除临时配置。
- `node dist/src/cli.js config validate` 在无凭证环境下正确返回缺少凭证/默认封面/IP 查询提示。
- `node dist/src/cli.js draft test/fixtures/sample.md` 在无凭证环境下正确阻止并给出修复建议；未做真实微信草稿推送，因为当前未提供 AppID/Secret/IP 白名单。


## 2026-05-21 Draft Verification

- 用户提供微信公众号 AppID/Secret 后，已写入本地 `config.local.json`（该文件被 `.gitignore` 忽略）。
- 已生成默认封面 `assets/default-cover.png`。
- 首次草稿推送遇到 IP 白名单错误，微信实际出站 IP 为 `120.226.239.81`；用户添加白名单后继续。
- 修复了素材上传 multipart 实现：从 `form-data` stream 切换为 undici `FormData` + `File`，避免空响应/`media data missing`。
- `node dist/src/cli.js draft "/Users/xiaolong/Documents/观自的短视频/0514 CodeX 实训营（第一期）/meeting_04_润色版.md"` 已成功创建草稿。
- 草稿 media_id：`uCNcFyVb3XWw1-n9RCTA0zwpo6CIzF9lWDK1agRJHZUXT4svJlcB8Lo-htKYaYIt`。
- 封面 thumb_media_id：`uCNcFyVb3XWw1-n9RCTA04AYsW_D6LOrS9tvBgfCev33_spHlzYeFMUSo2sjaIbK`。


## 2026-05-21 Agent Workflow Draft Verification

- 已推送文章：`/Users/xiaolong/Library/Mobile Documents/iCloud~md~obsidian/Documents/dei's IMS 2/Clippings/5 个 AI Agent 实战场景：从办公自动化到内容创作的完整工作流.md`。
- 过程中微信返回 `description size out of limit`，已将草稿摘要限制到 120 字符。
- 过程中微信返回 `author size out of limit`，已将 Obsidian wiki author 清洗，并对 `@...` 来源作者回退为默认作者 `陈龙得`。
- 草稿创建成功，media_id：`uCNcFyVb3XWw1-n9RCTA0693_UWqcQ5imD70jfe2RhpO_XDQ9FKnY4KpkHlpa-84`。
- 封面 thumb_media_id：`uCNcFyVb3XWw1-n9RCTA06KBtiDvscmCRGs60jdEtX_YEO3Ubyl_0t0tjGkN8pgo`。
- 正文图片上传数：6。


## 2026-05-21 Bold Marker Correction

- 用户指出公众号草稿中泄漏了 Obsidian Markdown 加粗星号，例如列表项里的 `**办公自动化**`。
- 已记录到 `tasks/lessons.md`。
- 根因：列表项渲染直接使用 `item.text`，没有对列表内 inline Markdown 再解析。
- 修复：列表项内容改为 `marked.parseInline(..., { renderer })`，使 `**...**` 输出为 `<strong>...</strong>`，不保留原始星号。
- 新增回归测试：`converts markdown bold markers inside list items`。
- `npm run build`、`npm test` 通过。
- 已重新生成 Agent 工作流文章预览，并用 `rg` 检查输出 HTML 中无 `**...**` / `__...__` 泄漏。


## 2026-05-21 Skill Packaging

- 已使用 skill-creator 规范封装 `skills/wechat-typeset/SKILL.md`。
- 已添加 `skills/wechat-typeset/agents/openai.yaml`，用于 Agent UI 展示。
- 已添加 `skills/wechat-typeset/references/setup.md` 与 `references/slash-commands.md`，说明 `/gzh-sync`、`/gzh-preview`、`/gzh-setup`、`/gzh-check` 的行为。
- 已添加 `skills/wechat-typeset/scripts/install.sh`，用于安装依赖、构建、生成本地配置模板。
- 已添加根目录 `slash-commands.md`，作为 GitHub 产品说明。
- 已移除未使用的 `form-data` 依赖。
- `npm run build` 与 `npm test` 通过。
- 已扫描仓库内容，真实 AppID/AppSecret 未出现在可提交文件中；`config.local.json` 仍仅本地保存且被 `.gitignore` 覆盖。
- 尝试 `git init` 时当前环境返回 `Operation not permitted`，需要用户在本机终端或授权后初始化并推送 GitHub。


## 2026-05-21 Slash Command and Public Defaults Fix

- 用户反馈 `/gzh` 在 Claude Code 中没有反应；原因是之前只提供了 Skill 和说明，没有真实注册 Claude Code command。
- 已新增 `.claude-plugin/plugin.json`，将仓库作为 Claude Code plugin。
- 已新增 `commands/gzh.md`、`commands/gzh-setup.md`、`commands/gzh-check.md`、`commands/gzh-preview.md`、`commands/gzh-sync.md`。
- 已将命令说明改为中文回复，避免返回英文。
- 已移除代码中的个人默认作者；`config init` 生成空 author，要求用户填写自己的公众号作者名。
- 已更新 README，说明 `/gzh` 没反应时应使用 plugin 安装并重启或 `/reload-plugins`。


## 2026-05-21 Update Command and Agent Positioning

- 用户指出不应只限制 Claude plugin，任何 AI Agent 都应可用。
- 已将 README 和命令说明改为：核心是本地 CLI，通用 Agent Skill、Claude Code plugin、本地 CLI 都可使用。
- 已新增 `/gzh-update` 命令与 `scripts/update.sh`，用于 `git pull --ff-only`、`npm install`、`npm run build`。
- 更新脚本会在本地有未提交改动时停止，避免覆盖用户配置或修改。
