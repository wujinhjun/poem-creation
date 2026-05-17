#!/usr/bin/env bash
#
# 密钥 / 敏感配置扫描器
#
# 扫描文件内容中的密钥特征（代理订阅配置、私钥、云厂商密钥等）。
# 由 git pre-commit 钩子与 Claude Code 防泄露钩子共用。
#
# 用法:
#   check-secrets.sh --staged           扫描 git 暂存区中新增/修改的文件
#   check-secrets.sh <file> [file...]   扫描指定文件
#
# 退出码: 0 = 干净; 1 = 命中疑似密钥
#
set -uo pipefail

found=0

# 在一段文本中查找密钥特征。$1=展示用标签, $2=待扫描内容
scan_content() {
  local label="$1" content="$2"

  # 私钥块
  if grep -qE -- '-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----' <<<"$content"; then
    echo "  ✗ ${label}: 检测到私钥块 (PRIVATE KEY)"
    found=1
  fi

  # 代理 / Clash / Surge 订阅配置：端口声明 + proxies 列表
  if grep -qE -- '^[[:space:]]*(mixed-port|socks-port|redir-port|tproxy-port|external-controller):' <<<"$content" \
     && grep -qE -- '^[[:space:]]*(proxies|proxy-groups|proxy-providers):' <<<"$content"; then
    echo "  ✗ ${label}: 疑似代理/Clash 订阅配置 (端口声明 + proxies)"
    found=1
  fi

  # AWS Access Key ID
  if grep -qE -- '\bAKIA[0-9A-Z]{16}\b' <<<"$content"; then
    echo "  ✗ ${label}: 疑似 AWS Access Key ID"
    found=1
  fi

  # GitHub / 通用令牌前缀
  if grep -qE -- '\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b' <<<"$content"; then
    echo "  ✗ ${label}: 疑似 GitHub Token"
    found=1
  fi

  # Slack token
  if grep -qE -- '\bxox[baprs]-[A-Za-z0-9-]{10,}\b' <<<"$content"; then
    echo "  ✗ ${label}: 疑似 Slack Token"
    found=1
  fi
}

# 按文件名判定明显不该提交的文件
scan_filename() {
  local f="$1"
  case "$f" in
    *.pem|*.key|*.p12|*.pfx|id_rsa|id_dsa|id_ecdsa|id_ed25519)
      echo "  ✗ ${f}: 文件名疑似私钥/证书"
      found=1
      ;;
    .env|.env.*)
      # 允许 .env.example / .env.sample / .env.template
      case "$f" in
        *.example|*.sample|*.template) ;;
        *)
          echo "  ✗ ${f}: 提交了 .env 环境变量文件"
          found=1
          ;;
      esac
      ;;
  esac
}

scan_file_on_disk() {
  local f="$1"
  [ -f "$f" ] || return 0
  scan_filename "$f"
  # 跳过二进制
  if grep -qI . "$f" 2>/dev/null; then
    scan_content "$f" "$(cat "$f")"
  fi
}

scan_staged() {
  local files f content
  files=$(git diff --cached --name-only --diff-filter=ACM)
  [ -z "$files" ] && return 0
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    scan_filename "$f"
    # 取暂存区版本的内容；二进制文件 git show 也能取，靠 grep -I 过滤
    content=$(git show ":$f" 2>/dev/null) || continue
    if grep -qI . <<<"$content" 2>/dev/null; then
      scan_content "$f" "$content"
    fi
  done <<<"$files"
}

if [ "${1:-}" = "--staged" ]; then
  scan_staged
elif [ "$#" -gt 0 ]; then
  for f in "$@"; do scan_file_on_disk "$f"; done
else
  echo "用法: check-secrets.sh --staged | <file>..." >&2
  exit 2
fi

if [ "$found" -ne 0 ]; then
  echo "" >&2
  echo "🚫 检测到疑似密钥/敏感配置，已阻止。" >&2
  echo "   如确为误报，可用 'git commit --no-verify' 跳过（请谨慎）。" >&2
  exit 1
fi
exit 0
