# Suggested Agent Slash Commands

Use English slash commands only because some Agent shells cannot parse Chinese immediately after `/`.

- `/sync <article path>`: run inspect -> preview -> draft.
- `/preview <article path>`: run preview only.
- `/setup`: run config init and guide AppID/AppSecret entry.
- `/check`: run config validate.

The implementation is the local CLI:

```bash
node dist/src/cli.js inspect "文章.md"
node dist/src/cli.js preview "文章.md"
node dist/src/cli.js draft "文章.md"
```
