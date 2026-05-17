#!/usr/bin/env node
/**
 * Claude Code PreToolUse 钩子 —— 拦截 Claude 执行的 git commit。
 *
 * 在 .claude/settings.json 注册为 Bash 工具的 PreToolUse 钩子。
 * 当待执行命令是 git commit 时，复用 scripts/check-secrets.sh 扫描暂存区，
 * 命中疑似密钥则以退出码 2 阻断该工具调用。
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

let payload = {};
try {
  payload = JSON.parse(readStdin() || "{}");
} catch {
  process.exit(0); // 解析失败不阻断正常工作
}

const command = payload?.tool_input?.command ?? "";

// 仅在命令包含 git commit 时介入
if (!/\bgit\s+commit\b/.test(command)) {
  process.exit(0);
}

try {
  execFileSync(join(here, "check-secrets.sh"), ["--staged"], {
    stdio: ["ignore", "ignore", "pipe"],
  });
  process.exit(0); // 干净，放行
} catch (err) {
  const detail = (err.stderr?.toString() || "").trim();
  process.stderr.write(
    "🚫 提交被防泄露钩子拦截：暂存区检测到疑似密钥/敏感配置。\n" +
      (detail ? detail + "\n" : "") +
      "请先从暂存区移除敏感文件再提交。\n",
  );
  process.exit(2); // 退出码 2 = 阻断工具调用
}
