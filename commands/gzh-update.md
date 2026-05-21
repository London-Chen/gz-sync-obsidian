---
description: "更新公众号排版同步工具到 GitHub 最新版本"
argument-hint: ""
allowed-tools: [Bash, Read, Glob]
---

# 更新公众号排版同步工具

请全程用中文回复。

执行：

```bash
bash scripts/update.sh
```

然后向用户说明：

- 是否成功拉取 GitHub 最新代码
- 是否已重新安装依赖
- 是否已重新构建
- 如果因为本地未提交改动停止，提醒用户先提交或备份改动
- 如果不是 Git 仓库，提醒用户重新 clone 最新仓库

不要修改或打印 `config.local.json` / `.env` 的敏感内容。
