# Slash command mapping

Use English slash commands only. Some Agent shells cannot parse Chinese immediately after `/`. 回复用户时使用中文。

## /gzh

主入口。空参数时，引导用户先运行 `/gzh-setup`。

## /gzh-setup

配置 AppID、AppSecret、作者名、默认封面。不要泄露 AppSecret，不要写死默认作者。

## /gzh-check

Run config validate and report missing credentials, default cover issues, and IP whitelist guidance.

## /gzh-preview

Input examples:

```text
/gzh-preview /absolute/path/article.md
```

Run preview only. Do not call WeChat APIs.

## /gzh-sync

Input examples:

```text
/gzh-sync /absolute/path/article.md
```

Agent behavior:

1. Resolve the target Markdown file. If ambiguous, ask for the path.
2. Run inspect.
3. Run preview.
4. Run draft.
5. Report draft `mediaId`, uploaded image count, preview path, and any warnings.

## /gzh-update

Run `bash scripts/update.sh` to pull the latest GitHub code, reinstall dependencies, and rebuild. 回复用户时使用中文，不要打印敏感配置。
