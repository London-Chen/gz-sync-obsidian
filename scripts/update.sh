#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v git >/dev/null 2>&1; then
  echo "缺少 git，无法自动更新。请重新 clone 最新仓库。" >&2
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "当前目录不是 Git 仓库，无法自动更新。请重新 clone https://github.com/London-Chen/gz-sync-obsidian.git" >&2
  exit 1
fi

echo "正在检查本地未提交改动..."
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "检测到本地有未提交改动。为避免覆盖你的配置或修改，已停止更新。" >&2
  echo "请先提交/备份改动后再运行更新。" >&2
  exit 1
fi

echo "正在拉取 GitHub 最新代码..."
git pull --ff-only

echo "正在安装依赖..."
npm install

echo "正在构建..."
npm run build

echo "更新完成。"
