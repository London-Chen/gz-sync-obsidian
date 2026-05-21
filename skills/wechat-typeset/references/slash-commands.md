# Slash command mapping

Use English slash commands only. Some Agent shells cannot parse Chinese immediately after `/`.

## /gzh-sync

Input examples:

```text
/gzh-sync current article
/gzh-sync /absolute/path/article.md
```

Agent behavior:

1. Resolve the target Markdown file. If ambiguous, ask for the path.
2. Run inspect.
3. Run preview.
4. Run draft.
5. Report draft `mediaId`, uploaded image count, preview path, and any warnings.

## /gzh-preview

Run preview only. Do not call WeChat APIs.

## /gzh-setup

Run config init. If the user provides AppID/AppSecret, write them to local config only. Remind them to add the WeChat API outbound IP to the whitelist.

## /gzh-check

Run config validate and report missing credentials, default cover issues, and IP whitelist guidance.
