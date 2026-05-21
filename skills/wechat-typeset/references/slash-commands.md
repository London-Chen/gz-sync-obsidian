# Slash command mapping

These are natural-language conventions for AI Agents. They call the same local CLI.

## /同步

Input examples:

```text
/同步 当前文章
/同步 /absolute/path/article.md
/sync article.md
```

Agent behavior:

1. Resolve the target Markdown file. If ambiguous, ask for the path.
2. Run inspect.
3. Run preview.
4. Run draft.
5. Report draft `mediaId`, uploaded image count, preview path, and any warnings.

## /预览

Run preview only. Do not call WeChat APIs.

## /配置公众号

Run config init. If the user provides AppID/AppSecret, write them to local config only. Remind them to add the WeChat API outbound IP to the whitelist.
