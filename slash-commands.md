# Suggested Agent Slash Commands

Use English slash commands only because some Agent shells cannot parse Chinese immediately after `/`.

- `/gzh-sync <article path>`: run inspect -> preview -> draft.
- `/gzh-preview <article path>`: run preview only.
- `/gzh-setup`: run config init and guide AppID/AppSecret entry.
- `/gzh-check`: run config validate.

The implementation is the local CLI:

```bash
node dist/src/cli.js inspect "文章.md"
node dist/src/cli.js preview "文章.md"
node dist/src/cli.js draft "文章.md"
```
