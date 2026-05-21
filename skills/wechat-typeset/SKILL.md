---
name: wechat-typeset
description: Use when the user wants to publish or sync an Obsidian/Markdown article to a WeChat Official Account draft, configure WeChat AppID/AppSecret, upload article images, generate a WeChat-compatible preview, or use slash-like commands such as /sync, /preview, /setup, /check, or /draft for公众号排版同步.
metadata:
  short-description: Markdown/Obsidian to WeChat draft
---

# WeChat Typeset

Turn the user's current Markdown/Obsidian article into a WeChat Official Account draft.

## Commands users may say

- `/sync <article.md>`: inspect, preview, upload images, create WeChat draft.
- `/preview <article.md>`: generate local preview and WeChat HTML without uploading.
- `/setup`: guide first-run credential setup.
- `/check`: validate local config and IP whitelist readiness.

## Core workflow

1. Find the project root that contains `package.json` and the `wechat-typeset` CLI.
2. If dependencies or build output are missing, run `npm install` then `npm run build`.
3. For first run, run `node dist/src/cli.js config init` and ask the user for AppID/AppSecret if missing.
4. Run `node dist/src/cli.js inspect "<article.md>"` and fix blocking readiness issues.
5. Run `node dist/src/cli.js preview "<article.md>"` so the user can inspect formatting.
6. For `/sync`, run `node dist/src/cli.js draft "<article.md>"` and report `mediaId`, uploaded image count, and preview path.

## Important rules

- Never expose or commit AppSecret. Store credentials only in `.env` or `config.local.json`.
- WeChat does not accept Markdown as draft content; this tool generates inline HTML in the background.
- If WeChat returns `invalid ip ... not in whitelist`, tell the user to add the exact IP from the error to the WeChat developer IP whitelist.
- If Markdown emphasis markers leak into output, regenerate after ensuring `**text**` becomes `<strong>text</strong>`.
- Do not auto-broadcast/publish. This skill only creates drafts.

## References

- First-run setup and common errors: `references/setup.md`
- Slash command behavior: `references/slash-commands.md`
