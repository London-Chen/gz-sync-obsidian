# Claude Code Slash Commands

这个项目提供真实 Claude Code slash commands。斜杠后面统一用英文，避免 `/中文` 在部分 Agent 中无法解析。

- `/gzh`: 主入口，显示配置、检查、预览、同步的引导。
- `/gzh-setup`: 配置 AppID、AppSecret、作者名、默认封面。
- `/gzh-check`: 检查公众号配置和 IP 白名单风险。
- `/gzh-preview <article path>`: 只生成预览，不上传微信。
- `/gzh-sync <article path>`: inspect -> preview -> draft，同步到公众号草稿箱。

底层 CLI：

```bash
node dist/src/cli.js inspect "文章.md"
node dist/src/cli.js preview "文章.md"
node dist/src/cli.js draft "文章.md"
node dist/src/cli.js config init
node dist/src/cli.js config validate
```

如果 `/gzh` 没有出现在 Claude Code 命令列表里，请确认你安装的是 plugin，而不只是 skill：

```bash
claude plugin install https://github.com/London-Chen/wechat-typeset.git
```

安装后重启 Claude Code，或运行 `/reload-plugins`。
