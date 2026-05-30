/**
 * 紧凑 DSL 编解码
 *
 * 字母表（5 个基础 token + 1 个 + 修饰符）：
 *   F = flexible（可平可仄）
 *   P = fixed ping（必平，非韵脚）
 *   Z = fixed ze（必仄，非韵脚）
 *   p = 韵脚，押平声
 *   z = 韵脚，押仄声
 *   +p / +z = 叶韵（续上一韵组）
 *
 * @module templates/dsl
 */

import { Tone } from "../core/types.js";
import type { ToneConstraint } from "../core/types.js";

// ---- 解码：DSL 字符串 → ToneConstraint[] ----

/**
 * 将紧凑 DSL 字符串解析为 ToneConstraint 数组。
 *
 * 支持 `+p` / `+z` 双字符 token（叶韵修饰）。
 * 韵脚 token (p/z/+p/+z) 只能出现在行末。
 */
export function parseLineDSL(dsl: string): ToneConstraint[] {
  const result: ToneConstraint[] = [];
  const chars = [...dsl];
  let i = 0;

  while (i < chars.length) {
    const ch = chars[i];

    // 处理 + 修饰符：+p / +z 是双字符 token
    if (ch === "+") {
      const next = chars[i + 1];
      if (next === "p" || next === "z") {
        result.push({
          type: "rhyme",
          tone: next === "p" ? Tone.Ping : Tone.Ze,
          xieyun: true,
        });
        i += 2;
        continue;
      }
      // 孤立的 + 不合法，跳过
      i += 1;
      continue;
    }

    switch (ch) {
      case "F":
        result.push({ type: "flexible" });
        break;
      case "P":
        result.push({ type: "fixed", tone: Tone.Ping });
        break;
      case "Z":
        result.push({ type: "fixed", tone: Tone.Ze });
        break;
      case "p":
      case "z":
        result.push({
          type: "rhyme",
          tone: ch === "p" ? Tone.Ping : Tone.Ze,
        });
        break;
      default:
        // 未知字符，宽松处理为 flexible
        result.push({ type: "flexible" });
    }
    i += 1;
  }

  return result;
}

// ---- 编码：ToneConstraint[] → DSL 字符串 ----

/** 编码选项：调用方提供韵脚上下文 */
export interface EncodeLineOptions {
  /** 此行是否为韵脚行 */
  isRhymeLine: boolean;
  /** 韵脚声调（仅 isRhymeLine 时有效） */
  rhymeTone?: "ping" | "ze";
  /** 是否为叶韵（+ 修饰） */
  xieyun?: boolean;
}

/**
 * 将 ToneConstraint[] 编码为紧凑 DSL 字符串。
 *
 * 约束：
 * - 最后一个 position 如果是 `{ type: "rhyme" }`，根据 rhymeTone 编码为 p/z。
 * - xieyun 为 true 时加 + 前缀（+p / +z）。
 * - 非韵脚行的 pattern 不应包含 `{ type: "rhyme" }` 约束。
 */
export function encodeLineDSL(
  constraints: ToneConstraint[],
  opts: EncodeLineOptions = { isRhymeLine: false },
): string {
  let result = "";

  for (let i = 0; i < constraints.length; i++) {
    const c = constraints[i];
    const isLast = i === constraints.length - 1;

    if (c.type === "rhyme" && isLast && opts.isRhymeLine) {
      const tone = opts.rhymeTone ?? "ping";
      const token = tone === "ping" ? "p" : "z";
      result += opts.xieyun ? `+${token}` : token;
    } else if (c.type === "rhyme") {
      // 非行末的 rhyme 约束或无 rhymeTone，fallback 为 flexible
      result += "F";
    } else if (c.type === "flexible") {
      result += "F";
    } else if (c.type === "fixed") {
      result += c.tone === Tone.Ping ? "P" : "Z";
    }
  }

  return result;
}

// ---- 韵脚信息提取 ----

export interface RhymeTokenInfo {
  /** 韵脚声调 */
  tone: "ping" | "ze";
  /** 是否为叶韵（+ 前缀） */
  xieyun: boolean;
}

/**
 * 从 DSL 行字符串提取韵脚 token 信息。
 * 返回 null 表示此行不是韵脚行。
 */
export function extractRhymeToken(dsl: string): RhymeTokenInfo | null {
  const chars = [...dsl];
  const len = chars.length;
  if (len === 0) return null;

  // 检查倒数第二个字符是否为 +
  if (len >= 2 && chars[len - 2] === "+") {
    const token = chars[len - 1];
    if (token === "p" || token === "z") {
      return { tone: token === "p" ? "ping" : "ze", xieyun: true };
    }
  }

  // 检查最后一个字符
  const last = chars[len - 1];
  if (last === "p") return { tone: "ping", xieyun: false };
  if (last === "z") return { tone: "ze", xieyun: false };

  return null;
}
