# First-run setup

回复用户时使用中文。

## Install/build

```bash
npm install
npm run build
```

## Configure credentials

```bash
node dist/src/cli.js config init
```

Fill `config.local.json` or `.env`:

```json
{
  "appid": "公众号 AppID",
  "secret": "公众号 AppSecret",
  "author": "公众号作者名",
  "defaultCover": "/absolute/path/to/default-cover.png"
}
```

不要给 `author` 写死默认人名。每个用户都要填写自己的公众号作者名。

Never commit `config.local.json` or `.env`.

## Validate

```bash
node dist/src/cli.js config validate
```

If the real draft call returns `invalid ip ... not in whitelist`, use the IP from WeChat's error message, not necessarily the IP from public lookup.

## Article frontmatter

```yaml
title: 文章标题
author: 公众号作者名
digest: 摘要
cover: ./cover.jpg
source_url: ""
```

If `cover` is missing, the CLI uses the first article image, then `WECHAT_DEFAULT_COVER`/`defaultCover`.
