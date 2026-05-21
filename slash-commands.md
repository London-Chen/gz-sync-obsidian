# AI Agent Commands

这个项目同时支持通用 AI Agent Skill 和 Claude Code slash commands。斜杠后面统一用英文，避免 `/中文` 在部分 Agent 中无法解析。

推荐命令：

- `/gzh`: 主入口，显示配置、检查、预览、同步、更新的引导。
- `/gzh-setup`: 配置 AppID、AppSecret、作者名、默认封面。
- `/gzh-check`: 检查公众号配置和 IP 白名单风险。
- `/gzh-preview <article path>`: 只生成预览，不上传微信。
- `/gzh-sync <article path>`: inspect -> preview -> draft，同步到公众号草稿箱。
- `/gzh-update`: 拉取 GitHub 最新代码、安装依赖并重新构建。

底层 CLI：

```bash
node dist/src/cli.js inspect "文章.md"
node dist/src/cli.js preview "文章.md"
node dist/src/cli.js draft "文章.md"
node dist/src/cli.js config init
node dist/src/cli.js config validate
bash scripts/update.sh
```

不同 Agent 的支持方式不同：

- 支持 Claude Code plugin 的环境：安装 plugin 后会出现真实 `/gzh*` 命令。
- 只支持 Skill 的环境：让 Agent 按这些命令语义调用本地 CLI。
- 不支持 slash command 的环境：直接让 Agent 运行对应 CLI。
