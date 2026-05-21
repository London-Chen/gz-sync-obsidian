# First-run setup

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
  "author": "默认作者",
  "defaultCover": "/absolute/path/to/default-cover.png"
}
```

Never commit `config.local.json` or `.env`.

## Validate

```bash
node dist/src/cli.js config validate
```

If the real draft call returns `invalid ip ... not in whitelist`, use the IP from WeChat's error message, not necessarily the IP from public lookup.

## Article frontmatter

```yaml
title: 文章标题
author: 陈龙得
digest: 摘要
cover: ./cover.jpg
source_url: ""
```

If `cover` is missing, the CLI uses the first article image, then `WECHAT_DEFAULT_COVER`/`defaultCover`.
