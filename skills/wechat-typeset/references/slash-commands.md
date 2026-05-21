# Slash command mapping

Use English slash commands only. Some Agent shells cannot parse Chinese immediately after `/`.

## /sync

Input examples:

```text
/sync current article
/sync /absolute/path/article.md
```

Agent behavior:

1. Resolve the target Markdown file. If ambiguous, ask for the path.
2. Run inspect.
3. Run preview.
4. Run draft.
5. Report draft `mediaId`, uploaded image count, preview path, and any warnings.

## /preview

Run preview only. Do not call WeChat APIs.

## /setup

Run config init. If the user provides AppID/AppSecret, write them to local config only. Remind them to add the WeChat API outbound IP to the whitelist.

## /check

Run config validate and report missing credentials, default cover issues, and IP whitelist guidance.
