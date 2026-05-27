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
  | { op: "addRhyme"; at: LineAddr; tone: "ping" | "ze"; xieyun?: boolean }
  | { op: "dropRhyme"; at: LineAddr }
  | { op: "setXieyun"; at: LineAddr; value: boolean }
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
  expanded?: CiVariantFull,
): CiTemplateVariant {
  return sectionsToVariant(expanded ?? expandStoredVariant(stored, canonicalMap));
}

/**
 * 将存储形态的变体展开为完整 DSL sections。
 */
export function expandStoredVariant(
  stored: CiVariantStored,
  canonicalMap: ReadonlyMap<string, CiVariantFull>,
): CiVariantFull {
  if (stored.kind === "full") {
    return stored;
  }

  const base = canonicalMap.get(stored.base);
  if (!base) {
    throw new Error(`Canonical variant not found: ${stored.base}`);
  }
  return {
    kind: "full",
    id: stored.id,
    author: stored.author,
    sketch: stored.sketch,
    rhymeType: base.rhymeType,
    sections: applyEdits(base.sections, stored.edits),
  };
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
        isXieyun: rhymeToken?.xieyun,
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

      const base = edit.tone === "ping" ? "p" : "z";
      const token = edit.xieyun ? `+${base}` : base;
      setLine(result, edit.at, dsl + token);
      break;
    }

    case "setXieyun": {
      const dsl = getLine(result, edit.at);
      if (!dsl) return;
      const rhymeInfo = extractRhymeToken(dsl);
      if (!rhymeInfo) return; // not a rhyme line

      if (edit.value === rhymeInfo.xieyun) return; // no change

      // 在 p/z 和 +p/+z 之间切换
      const chars = [...dsl];
      if (edit.value) {
        // 普通韵脚 → 叶韵：p → +p, z → +z
        chars.splice(chars.length - 1, 0, "+");
      } else {
        // 叶韵 → 普通韵脚：+p → p, +z → z
        if (chars[chars.length - 2] === "+") {
          chars.splice(chars.length - 2, 1);
        }
      }
      setLine(result, edit.at, chars.join(""));
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
 * 使用行级 LCS 对齐，支持检测 splitLine / mergeLines 结构变化。
 * 返回 null 表示差异过大，应回退为 full。
 */
export function computeDiff(
  base: CiSectionStored[],
  target: CiSectionStored[],
  maxEditRatio = 0.4,
): EditOp[] | null {
  const baseLines = flattenLines(base);
  const targetLines = flattenLines(target);

  let totalPositions = 0;
  for (const line of baseLines) {
    totalPositions += [...line].length;
  }

  // 行级 LCS 对齐
  const alignment = alignLines(baseLines, targetLines);
  if (!alignment) return null;

  const edits: EditOp[] = [];
  const { pairs } = alignment;
  let bi = 0;
  let ti = 0;

  while (bi < baseLines.length || ti < targetLines.length) {
    if (bi < baseLines.length && ti < targetLines.length && pairs.get(bi) === ti) {
      // 1:1 匹配行
      const addr = findSectionAddr(base, bi);
      if (addr[0] < 0) return null;
      const lineEdits = computeLineDiff(baseLines[bi], targetLines[ti], addr);
      edits.push(...lineEdits);
      bi++;
      ti++;
    } else if (
      bi < baseLines.length &&
      ti + 1 < targetLines.length &&
      isSplitCandidate(baseLines[bi], targetLines[ti], targetLines[ti + 1])
    ) {
      // 1 base → 2 target: splitLine
      const addr = findSectionAddr(base, bi);
      if (addr[0] < 0) return null;

      const { nonRhyme: bNR } = stripRhymeToken(baseLines[bi]);
      const { nonRhyme: t1NR } = stripRhymeToken(targetLines[ti]);
      const splitCol = t1NR.length;

      edits.push({ op: "splitLine", at: addr, col: splitCol });

      // 对 split 后的两部分分别做字符级 diff
      const concatTarget = mergeTargetPair(targetLines[ti], targetLines[ti + 1]);
      const lineEdits = computeLineDiff(baseLines[bi], concatTarget, addr);
      edits.push(...lineEdits);

      bi++;
      ti += 2;
    } else if (
      bi + 1 < baseLines.length &&
      ti < targetLines.length &&
      isMergeCandidate(baseLines[bi], baseLines[bi + 1], targetLines[ti])
    ) {
      // 2 base → 1 target: mergeLines
      const addr = findSectionAddr(base, bi);
      if (addr[0] < 0) return null;

      edits.push({ op: "mergeLines", at: addr });

      // 字符级差异分布在两条 base 行上，各行使用自己的行地址
      const b1 = stripRhymeToken(baseLines[bi]);
      const b2 = stripRhymeToken(baseLines[bi + 1]);
      const t = stripRhymeToken(targetLines[ti]);

      // 第一条 base 行 → target 前 b1.nonRhyme.length 个非韵脚字符
      const t1Seg = t.nonRhyme.slice(0, b1.nonRhyme.length) + b1.rhymeToken;
      const addr1 = findSectionAddr(base, bi);
      if (addr1[0] < 0) return null;
      edits.push(...computeLineDiff(baseLines[bi], t1Seg, addr1));

      // 第二条 base 行 → target 剩余非韵脚字符 + target 韵脚
      const t2Seg = t.nonRhyme.slice(b1.nonRhyme.length) + t.rhymeToken;
      const addr2 = findSectionAddr(base, bi + 1);
      if (addr2[0] < 0) return null;
      edits.push(...computeLineDiff(baseLines[bi + 1], t2Seg, addr2));

      bi += 2;
      ti++;
    } else {
      // 无法处理的结构差异
      return null;
    }
  }

  // 检查是否超过阈值（splitLine/mergeLines 是结构性编辑，不计入）
  const maxEdits = Math.floor(totalPositions * maxEditRatio);
  const regularEdits = edits.filter(
    (e) => e.op !== "splitLine" && e.op !== "mergeLines",
  );
  if (regularEdits.length > maxEdits) return null;

  return edits;
}

// ========== 行级对齐（LCS） ==========

/**
 * 行级 LCS 对齐结果。
 * pairs: baseIdx → targetIdx 的匹配映射。
 */
interface LineAlignment {
  pairs: Map<number, number>;
}

/**
 * 对两个行序列做 LCS 对齐。
 * 两行"匹配"当且仅当它们的非韵脚部分长度相同。
 * 返回 null 表示行数差异过大（>50% 行无法对齐）。
 */
function alignLines(
  baseLines: string[],
  targetLines: string[],
): LineAlignment | null {
  const m = baseLines.length;
  const n = targetLines.length;

  // LCS DP
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (linesStructurallyMatch(baseLines[i - 1], targetLines[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // 检查总非韵脚字符数是否兼容（防止完全无关的 sections 进入）
  const totalBaseNonRhyme = baseLines.reduce((sum, l) => sum + stripRhymeToken(l).nonRhyme.length, 0);
  const totalTargetNonRhyme = targetLines.reduce((sum, l) => sum + stripRhymeToken(l).nonRhyme.length, 0);
  if (totalBaseNonRhyme !== totalTargetNonRhyme) return null;

  // 回溯构建匹配对
  const pairs = new Map<number, number>();
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (linesStructurallyMatch(baseLines[i - 1], targetLines[j - 1])) {
      pairs.set(i - 1, j - 1);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return { pairs };
}

/** 两行结构匹配：非韵脚部分长度相同 */
function linesStructurallyMatch(a: string, b: string): boolean {
  const sa = stripRhymeToken(a);
  const sb = stripRhymeToken(b);
  return sa.nonRhyme.length === sb.nonRhyme.length;
}

// ========== Split / Merge 检测 ==========

/**
 * 检测 1 base → 2 target 是否为合法的 splitLine。
 * 条件：两 target 的非韵脚部分拼接后长度等于 base 的非韵脚部分。
 */
function isSplitCandidate(
  baseLine: string,
  targetLine1: string,
  targetLine2: string,
): boolean {
  const b = stripRhymeToken(baseLine);
  const t1 = stripRhymeToken(targetLine1);
  const t2 = stripRhymeToken(targetLine2);
  return b.nonRhyme.length === t1.nonRhyme.length + t2.nonRhyme.length;
}

/**
 * 检测 2 base → 1 target 是否为合法的 mergeLines。
 * 条件：两 base 的非韵脚部分拼接后长度等于 target 的非韵脚部分。
 */
function isMergeCandidate(
  baseLine1: string,
  baseLine2: string,
  targetLine: string,
): boolean {
  const b1 = stripRhymeToken(baseLine1);
  const b2 = stripRhymeToken(baseLine2);
  const t = stripRhymeToken(targetLine);
  return b1.nonRhyme.length + b2.nonRhyme.length === t.nonRhyme.length;
}

/**
 * 将两条 target 行合并为一条"虚拟 base 行"用于字符级 diff。
 * 第一行剥离韵脚 token，第二行保留韵脚 token。
 */
function mergeTargetPair(line1: string, line2: string): string {
  const { nonRhyme: nr1 } = stripRhymeToken(line1);
  const r2 = stripRhymeToken(line2);
  // 如果 line1 末尾有韵脚，将其移除（split 后韵脚在第二部分）
  return nr1 + r2.nonRhyme + r2.rhymeToken;
}

/** 从 DSL 行中剥离韵脚 token，返回非韵脚部分和韵脚 token */
function stripRhymeToken(dsl: string): { nonRhyme: string; rhymeToken: string } {
  const info = extractRhymeToken(dsl);
  if (!info) return { nonRhyme: dsl, rhymeToken: "" };
  const len = info.xieyun ? 2 : 1;
  return {
    nonRhyme: dsl.slice(0, dsl.length - len),
    rhymeToken: dsl.slice(dsl.length - len),
  };
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
    edits.push({ op: "addRhyme", at, tone: targetRhyme.tone, xieyun: targetRhyme.xieyun });
  } else if (baseRhyme && !targetRhyme) {
    edits.push({ op: "dropRhyme", at });
  } else if (baseRhyme && targetRhyme) {
    if (baseRhyme.tone !== targetRhyme.tone) {
      const tone = targetRhyme.tone === "ping" ? "P" : "Z";
      edits.push({ op: "setTone", at, col: baseNonRhyme.length, tone });
    }
    if (baseRhyme.xieyun !== targetRhyme.xieyun) {
      edits.push({ op: "setXieyun", at, value: targetRhyme.xieyun });
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
      if (tc === "F" || tc === "P" || tc === "Z") {
        const insertPos = Math.min(i, baseChars.length);
        edits.push({ op: "insertChar", at, col: insertPos, cons: tc });
      }
      continue;
    }
    if (bc && !tc) {
      edits.push({ op: "removeChar", at, col: i });
      continue;
    }
    if (bc === tc) continue;

    if (tc === "F") {
      edits.push({ op: "setFlex", at, col: i });
    } else if (tc === "P" || tc === "Z") {
      edits.push({ op: "setTone", at, col: i, tone: tc });
    }
  }

  return edits;
}
