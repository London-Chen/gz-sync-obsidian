# Suggested Agent Slash Commands

These commands are product conventions to expose in an AI Agent that has this repo installed.

- `/同步 <文章路径>`: run inspect -> preview -> draft.
- `/预览 <文章路径>`: run preview only.
- `/配置公众号`: run config init and guide AppID/AppSecret entry.
- `/检查公众号配置`: run config validate.

The implementation is the local CLI:

```bash
node dist/src/cli.js inspect "文章.md"
node dist/src/cli.js preview "文章.md"
node dist/src/cli.js draft "文章.md"
```
