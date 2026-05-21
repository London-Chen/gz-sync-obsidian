# Lessons

暂无用户纠正记录。

## 2026-05-21 Markdown 强调符号清洗

用户指出：Obsidian 中 `**加粗**` 是 Markdown 语义，但公众号草稿里不能漏出原始星号。以后转换到微信公众号 HTML 时，必须把 `**...**` / `__...__` 转成内联 `<strong>` 加粗样式，或者在无法解析时删除包裹符号，不能让星号原样出现在公众号正文。


## 2026-05-21 slash command 注册与产品默认值

用户指出：`/gzh` 没有反应，因为只写 Skill/README 不等于注册 Claude Code slash command。以后要在插件中提供真实 `commands/*.md` 或 user-invoked skill，并说明安装 plugin 后需要重启或 `/reload-plugins`。另外面向外部用户的工具不能写死个人默认作者，必须让用户首次配置自己的作者名。
