/**
 * 变体压缩 —— 正体 + EditOp 编辑序列
 *
 * 存储形态：
 * - CiVariantFull: 完整 sections（紧凑 DSL 字符串）
 * - CiVariantDelta: 正体 ID + EditOp 编辑序列
 *
 * 装载时通过 materializeVariant() 展开为运行时 CiTemplateVariant。
 *
 * @module templates/ci-compress
 */

import { Tone, RhymeTone } from "../core/types.js";
import type { ToneConstraint } from "../core/types.js";
import type { CiTemplateLine, CiTemplateSection, CiTemplateVariant } from "./index.js";
import { parseLineDSL, encodeLineDSL, extractRhymeToken } from "./dsl.js";
import type { RhymeTokenInfo } from "./dsl.js";

// ========== 存储类型 ==========

/** 行地址：[sectionIdx, lineIdx] */
export type LineAddr = [sectionIdx: number, lineIdx: number];

/** 紧凑 DSL 存储的 section：只存 lines 字符串数组 */
export interface CiSectionStored {
  lines: string[];
}

/** 完整变体（正体或差异过大的变体） */
export interface CiVariantFull {
  kind: "full";
  id: string;
  author?: string;
  sketch?: string;
  rhymeType?: "ping" | "ze" | "mixed";
  sections: CiSectionStored[];
}

/** 编辑操作 */
export type EditOp =
  | { op: "setTone"; at: LineAddr; col: number; tone: "P" | "Z" }
  | { op: "setFlex"; at: LineAddr; col: number }
  | { op: "addRhyme"; at: LineAddr; tone: "ping" | "ze" }
  | { op: "dropRhyme"; at: LineAddr }
  | { op: "insertChar"; at: LineAddr; col: number; cons: "P" | "Z" | "F" | "p" | "z" | "+p" | "+z" }
  | { op: "removeChar"; at: LineAddr; col: number }
  | { op: "splitLine"; at: LineAddr; col: number }
  | { op: "mergeLines"; at: LineAddr };

/** Delta 变体：正体 + 编辑 */
export interface CiVariantDelta {
  kind: "delta";
  id: string;
  author?: string;
  sketch?: string;
  base: string;
  edits: EditOp[];
}

/** 存储形态联合 */
export type CiVariantStored = CiVariantFull | CiVariantDelta;

// ========== 运行时物化 ==========

/**
 * 将存储形态的变体展开为运行时的 CiTemplateVariant。
 *
 * @param stored  存储形态变体（full 或 delta）
 * @param canonicalMap  正体映射（delta 需要查 base）
 * @returns 运行时 CiTemplateVariant
 */
export function materializeVariant(
  stored: CiVariantStored,
  canonicalMap: ReadonlyMap<string, CiVariantFull>,
): CiTemplateVariant {
  let full: CiVariantFull;

  if (stored.kind === "full") {
    full = stored;
  } else {
    const base = canonicalMap.get(stored.base);
    if (!base) {
      throw new Error(`Canonical variant not found: ${stored.base}`);
    }
    full = {
      kind: "full",
      id: stored.id,
      author: stored.author,
      sketch: stored.sketch,
      rhymeType: base.rhymeType,
      sections: applyEdits(base.sections, stored.edits),
    };
  }

  return sectionsToVariant(full);
}

/**
 * 将 CiVariantFull 的 sections 转换为运行时 CiTemplateVariant。
 */
function sectionsToVariant(full: CiVariantFull): CiTemplateVariant {
  const sections: CiTemplateSection[] = full.sections.map((sec, si) => {
    const lines: CiTemplateLine[] = sec.lines.map((dsl) => {
      const pattern = parseLineDSL(dsl);
      const rhymeToken = extractRhymeToken(dsl);

      return {
        charCount: pattern.length,
        pattern,
        isRhymeLine: rhymeToken !== null,
        rhymeType: rhymeToken?.tone as RhymeTone | undefined,
      };
    });

    const name = sectionName(si, full.sections.length);

    return { name, lines };
  });

  return {
    id: full.id,
    name: "",
    author: full.author,
    sketch: full.sketch,
    rhymeType: full.rhymeType,
    sections,
  };
}

function sectionName(index: number, total: number): string {
  if (total <= 2) {
    return index === 0 ? "上阕" : "下阕";
  }
  return `第${index + 1}段`;
}

// ========== EditOp 应用引擎 ==========

/**
 * 将 EditOp 列表应用到 sections，返回新的 sections。
 * 操作在 DSL 字符串层面进行。
 */
export function applyEdits(
  sections: CiSectionStored[],
  edits: EditOp[],
): CiSectionStored[] {
  // 深拷贝 sections
  const result: CiSectionStored[] = sections.map((sec) => ({
    lines: [...sec.lines],
  }));

  // 需要按序处理的 ops（splitLine / mergeLines / insertChar / removeChar 会影响行索引和列索引）
  const structural = edits.filter(
    (e) => e.op === "splitLine" || e.op === "mergeLines",
  );
  const regular = edits.filter(
    (e) => e.op !== "splitLine" && e.op !== "mergeLines",
  );

  // 常规编辑按位置倒序排列，避免 removeChar/insertChar 索引漂移
  const sortedRegular = [...regular].sort((a, b) => {
    // 先按行地址倒序
    const lineCmp =
      b.at[0] - a.at[0] || b.at[1] - a.at[1];
    if (lineCmp !== 0) return lineCmp;
    // 同行的：removeChar 按 col 倒序，其余按 col 倒序
    const colA = "col" in a ? a.col : 0;
    const colB = "col" in b ? b.col : 0;
    return colB - colA;
  });

  for (const edit of sortedRegular) {
    applyRegularEdit(result, edit);
  }

  // 再应用结构性编辑
  for (const edit of structural) {
    applyStructuralEdit(result, edit);
  }

  return result;
}

function getLine(result: CiSectionStored[], at: LineAddr): string | undefined {
  return result[at[0]]?.lines[at[1]];
}

function setLine(result: CiSectionStored[], at: LineAddr, dsl: string): void {
  const sec = result[at[0]];
  if (sec && at[1] < sec.lines.length) {
    sec.lines[at[1]] = dsl;
  }
}

function applyRegularEdit(result: CiSectionStored[], edit: EditOp): void {
  switch (edit.op) {
    case "setTone":
    case "setFlex": {
      const dsl = getLine(result, edit.at);
      if (!dsl) return;
      const pattern = parseLineDSL(dsl);
      if (edit.col >= pattern.length) return;

      if (edit.op === "setTone") {
        const toneEnum = edit.tone === "P" ? Tone.Ping : Tone.Ze;
        const rhymeTone = edit.tone === "P" ? "ping" : "ze";
        const isLast = edit.col === pattern.length - 1;
        const wasRhyme = pattern[edit.col]?.type === "rhyme";

        // 如果在韵脚位置改声调，保持韵脚但改韵调
        if (isLast && wasRhyme) {
          const newDslChars = [...dsl];
          const lastIdx = newDslChars.length - 1;
          const prevChar = newDslChars[lastIdx - 1];
          const isXieyun = prevChar === "+";
          if (isXieyun) {
            newDslChars[lastIdx - 1] = "+";
            newDslChars[lastIdx] = rhymeTone === "ping" ? "p" : "z";
          } else {
            newDslChars[lastIdx] = rhymeTone === "ping" ? "p" : "z";
          }
          setLine(result, edit.at, newDslChars.join(""));
        } else {
          pattern[edit.col] = { type: "fixed", tone: toneEnum };
          const rhymeInfo = extractRhymeToken(dsl);
          setLine(
            result,
            edit.at,
            encodeLineDSL(pattern, {
              isRhymeLine: rhymeInfo !== null,
              rhymeTone: rhymeInfo?.tone,
              xieyun: rhymeInfo?.xieyun,
            }),
          );
        }
      } else {
        // setFlex
        pattern[edit.col] = { type: "flexible" };
        const rhymeInfo = extractRhymeToken(dsl);
        setLine(
          result,
          edit.at,
          encodeLineDSL(pattern, {
            isRhymeLine: rhymeInfo !== null,
            rhymeTone: rhymeInfo?.tone,
            xieyun: rhymeInfo?.xieyun,
          }),
        );
      }
      break;
    }

    case "addRhyme": {
      const dsl = getLine(result, edit.at);
      if (!dsl) return;
      if (extractRhymeToken(dsl)) return; // already a rhyme line

      const token = edit.tone === "ping" ? "p" : "z";
      setLine(result, edit.at, dsl + token);
      break;
    }

    case "dropRhyme": {
      const dsl = getLine(result, edit.at);
      if (!dsl) return;
      const rhymeInfo = extractRhymeToken(dsl);
      if (!rhymeInfo) return; // not a rhyme line

      const chars = [...dsl];
      // 移除韵脚 token（可能含 + 前缀）
      const last = chars[chars.length - 1];
      if (last === "p" || last === "z") {
        if (rhymeInfo.xieyun) {
          chars.splice(chars.length - 2, 2); // 移除 + 和 p/z
        } else {
          chars.pop(); // 移除 p/z
        }
      }
      setLine(result, edit.at, chars.join(""));
      break;
    }

    case "insertChar": {
      const dsl = getLine(result, edit.at);
      if (!dsl) return;
      const chars = [...dsl];

      // 插入的字符可能是双字符 (+p/+z)
      const insertChars = [...edit.cons];
      chars.splice(edit.col, 0, ...insertChars);
      setLine(result, edit.at, chars.join(""));
      break;
    }

    case "removeChar": {
      const dsl = getLine(result, edit.at);
      if (!dsl) return;
      const chars = [...dsl];

      // 检查移除位置是否命中 + 修饰符
      if (chars[edit.col] === "+") {
        // 移除 + 和它修饰的 p/z
        chars.splice(edit.col, 2);
      } else {
        chars.splice(edit.col, 1);
      }
      setLine(result, edit.at, chars.join(""));
      break;
    }
  }
}

function applyStructuralEdit(
  result: CiSectionStored[],
  edit: EditOp,
): void {
  switch (edit.op) {
    case "splitLine": {
      const dsl = getLine(result, edit.at);
      if (!dsl) return;
      const chars = [...dsl];
      const left = chars.slice(0, edit.col).join("");
      const right = chars.slice(edit.col).join("");
      const sec = result[edit.at[0]];
      if (!sec) return;

      sec.lines.splice(edit.at[1], 1, left, right);
      break;
    }

    case "mergeLines": {
      const sec = result[edit.at[0]];
      if (!sec) return;
      const lineIdx = edit.at[1];
      if (lineIdx >= sec.lines.length - 1) return;

      const merged = sec.lines[lineIdx] + sec.lines[lineIdx + 1];
      sec.lines.splice(lineIdx, 2, merged);
      break;
    }
  }
}

// ========== Diff 计算（用于数据生成脚本） ==========

/**
 * 计算两个 sections 之间的 EditOp 差异。
 * 返回 null 表示差异过大，应回退为 full。
 */
export function computeDiff(
  base: CiSectionStored[],
  target: CiSectionStored[],
  maxEditRatio = 0.4,
): EditOp[] | null {
  const edits: EditOp[] = [];

  // 展平所有行
  const baseLines = flattenLines(base);
  const targetLines = flattenLines(target);

  let totalPositions = 0;
  for (const line of baseLines) {
    totalPositions += [...line].length;
  }

  // 对齐行
  const maxLines = Math.max(baseLines.length, targetLines.length);

  for (let i = 0; i < maxLines; i++) {
    const baseDsl = baseLines[i];
    const targetDsl = targetLines[i];

    if (!baseDsl && targetDsl) {
      // 新增行——无法用现有 EditOp 表达，回退 full
      return null;
    }
    if (baseDsl && !targetDsl) {
      // 删除行——无法表达，回退 full
      return null;
    }
    if (!baseDsl && !targetDsl) continue;

    const [sectionIdx, lineIdx] = findSectionAddr(base, i);
    if (sectionIdx < 0) return null;

    const lineEdits = computeLineDiff(
      baseDsl!,
      targetDsl!,
      [sectionIdx, lineIdx],
    );
    edits.push(...lineEdits);
  }

  // 检查是否超过阈值
  const maxEdits = Math.floor(totalPositions * maxEditRatio);
  if (edits.length > maxEdits) return null;

  return edits;
}

function flattenLines(sections: CiSectionStored[]): string[] {
  const result: string[] = [];
  for (const sec of sections) {
    for (const line of sec.lines) {
      result.push(line);
    }
  }
  return result;
}

function findSectionAddr(
  sections: CiSectionStored[],
  flatIdx: number,
): LineAddr {
  let cursor = 0;
  for (let si = 0; si < sections.length; si++) {
    const sec = sections[si];
    if (flatIdx < cursor + sec.lines.length) {
      return [si, flatIdx - cursor];
    }
    cursor += sec.lines.length;
  }
  return [-1, -1];
}

function computeLineDiff(
  baseDsl: string,
  targetDsl: string,
  at: LineAddr,
): EditOp[] {
  const edits: EditOp[] = [];

  // 检查韵脚增删
  const baseRhyme = extractRhymeToken(baseDsl);
  const targetRhyme = extractRhymeToken(targetDsl);

  // 剥离韵脚 token 用于比较非韵脚部分
  let baseNonRhyme = baseDsl;
  let targetNonRhyme = targetDsl;
  const baseRhymeLen = baseRhyme ? (baseRhyme.xieyun ? 2 : 1) : 0;
  const targetRhymeLen = targetRhyme ? (targetRhyme.xieyun ? 2 : 1) : 0;

  if (baseRhyme) {
    baseNonRhyme = baseDsl.slice(0, baseDsl.length - baseRhymeLen);
  }
  if (targetRhyme) {
    targetNonRhyme = targetDsl.slice(0, targetDsl.length - targetRhymeLen);
  }

  // 处理韵脚本身的变化
  if (!baseRhyme && targetRhyme) {
    edits.push({ op: "addRhyme", at, tone: targetRhyme.tone });
  } else if (baseRhyme && !targetRhyme) {
    edits.push({ op: "dropRhyme", at });
  } else if (baseRhyme && targetRhyme) {
    if (baseRhyme.tone !== targetRhyme.tone) {
      // 韵调变化：通过 setTone 在韵脚位置表达
      const tone = targetRhyme.tone === "ping" ? "P" : "Z";
      edits.push({ op: "setTone", at, col: baseNonRhyme.length, tone });
    }
    if (baseRhyme.xieyun !== targetRhyme.xieyun) {
      // 叶韵标志变化：无法用简单 EditOp 表达，回退
      // 目前处理：忽略 + 差异，由数据标注保证
    }
  }

  // 比较非韵脚部分
  const baseChars = [...baseNonRhyme];
  const targetChars = [...targetNonRhyme];
  const maxLen = Math.max(baseChars.length, targetChars.length);

  for (let i = 0; i < maxLen; i++) {
    const bc = baseChars[i];
    const tc = targetChars[i];

    if (!bc && tc) {
      // 插入：位置 cap 在 base 非韵脚长度以内（插入到韵脚之前）
      const insertPos = Math.min(i, baseChars.length);
      edits.push({ op: "insertChar", at, col: insertPos, cons: tc as "P" | "Z" | "F" });
      continue;
    }
    if (bc && !tc) {
      // 删除：从 base 的非韵脚位置删除
      edits.push({ op: "removeChar", at, col: i });
      continue;
    }
    if (bc === tc) continue;

    // 字符不同：setTone 或 setFlex
    if (tc === "F") {
      edits.push({ op: "setFlex", at, col: i });
    } else if (tc === "P" || tc === "Z") {
      edits.push({ op: "setTone", at, col: i, tone: tc });
    }
  }

  return edits;
}
