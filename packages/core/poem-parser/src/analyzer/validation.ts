/**
 * 验证模块
 *
 * 负责单行验证、字符校验、拗救标记等核心校验逻辑。
 */

import { CharValidationStatus } from '../core/types.js';
import type {
  CharNode,
  Diagnostic,
  LineNode,
  LineValidationResult,
  RescueDetail,
  Tone,
  ToneConstraint,
  ToneAmbiguity,
} from '../core/types.js';
import type { ResolvedLineTemplate } from './types.js';
import type { RhymeDict } from '../rhyme-dict/index.js';

/**
 * 判断某位置是否是多音字（歧义字）
 */
function isAmbiguousChar(
  ambiguities: ToneAmbiguity[],
  lineIndex: number,
  col: number,
): boolean {
  return ambiguities.some(
    (a) => a.position.line === lineIndex && a.position.col === col,
  );
}

/**
 * 验证单个字符是否符合模板约束（核心公共函数）
 *
 * 同时被 {@link validateChars}（单行分析路径）和
 * {@link validateLineAgainstPattern}（整诗管线路径）调用，
 * 保证两边的 Pass/Fail/Flexible/Unknown 判定一致。
 */
export function validateChar(
  charNode: CharNode,
  constraint: ToneConstraint | undefined,
): { status: CharValidationStatus; isCheckable: boolean } {
  if (!constraint) {
    return { status: CharValidationStatus.Unknown, isCheckable: false };
  }

  switch (constraint.type) {
    case 'flexible':
      return { status: CharValidationStatus.Flexible, isCheckable: false };

    case 'fixed': {
      if (charNode.tone === null) {
        return { status: CharValidationStatus.Fail, isCheckable: true };
      }
      const matches =
        charNode.tone === constraint.tone ||
        (charNode.toneOptions ?? []).includes(constraint.tone);
      return { status: matches ? CharValidationStatus.Pass : CharValidationStatus.Fail, isCheckable: true };
    }

    case 'rhyme':
      return {
        status: charNode.tone !== null ? CharValidationStatus.Pass : CharValidationStatus.Fail,
        isCheckable: true,
      };

    default:
      return { status: CharValidationStatus.Unknown, isCheckable: false };
  }
}

/**
 * 校验一行字符是否符合期望平仄模式。
 *
 * @returns 校验后的字符数组 + 匹配得分
 */
export function validateChars(
  chars: CharNode[],
  expectedPattern: ToneConstraint[],
): { validatedChars: CharNode[]; score: number } {
  let matchCount = 0;
  let checkableCount = 0;

  const validatedChars = chars.map((charNode, i) => {
    const constraint = expectedPattern[i];
    const { status, isCheckable } = validateChar(charNode, constraint);

    if (isCheckable) {
      checkableCount += 1;
      if (status === CharValidationStatus.Pass) matchCount += 1;
    }

    return {
      ...charNode,
      expectedConstraint: constraint,
      validationStatus: status,
    };
  });

  return {
    validatedChars,
    score: checkableCount > 0 ? matchCount / checkableCount : 1,
  };
}

/**
 * 行验证摘要信息
 */
export interface CharCheck {
  col: number;
  char: string;
  expected: string;
  actual: string;
  matched: boolean;
  reason?: string;
  /** 是否为多音字（歧义字） */
  isAmbiguous: boolean;
  /** 该字的校验状态（供调用方写回 AST） */
  status: CharValidationStatus;
}

export interface LineValidationSummary {
  lineIndex: number;
  checkableCount: number;
  matchedCount: number;
  mismatchCount: number;
  /** 排除多音字后的不合规数 */
  nonAmbiguousMismatchCount: number;
  isCompliant: boolean;
  charChecks: CharCheck[];
}

/**
 * 校验整行是否符合平仄模式（纯函数，不改动传入的 `line`），返回逐字校验详情。
 *
 * 每个字的校验状态记录在 `charChecks[].status`；如需写回 AST，
 * 调用 {@link applyValidationToLine}。
 *
 * @param line            行节点
 * @param expectedPattern 期望平仄模式
 * @param ambiguities     多音字列表（用于区分模糊失配）
 */
export function validateLineAgainstPattern(
  line: LineNode,
  expectedPattern: ToneConstraint[] | undefined,
  ambiguities: ToneAmbiguity[] = [],
): LineValidationSummary {
  if (!expectedPattern) {
    return {
      lineIndex: line.globalLineIndex,
      checkableCount: 0,
      matchedCount: 0,
      mismatchCount: 0,
      nonAmbiguousMismatchCount: 0,
      isCompliant: true,
      charChecks: line.chars.map((charNode, idx) => ({
        col: idx,
        char: charNode.char,
        expected: 'unknown',
        actual: charNode.tone ?? '未知',
        matched: true,
        isAmbiguous: isAmbiguousChar(ambiguities, line.globalLineIndex, idx),
        status: CharValidationStatus.Unknown,
      })),
    };
  }

  let checkableCount = 0;
  let matchedCount = 0;
  let mismatchCount = 0;
  let nonAmbiguousMismatchCount = 0;
  const charChecks: CharCheck[] = [];

  line.chars.forEach((charNode, idx) => {
    const constraint = expectedPattern[idx];
    const charIsAmbiguous = isAmbiguousChar(
      ambiguities,
      line.globalLineIndex,
      idx,
    );

    const { status, isCheckable } = validateChar(charNode, constraint);

    if (isCheckable) checkableCount += 1;
    if (status === CharValidationStatus.Pass) matchedCount += 1;
    if (status === CharValidationStatus.Fail) {
      mismatchCount += 1;
      if (!charIsAmbiguous) nonAmbiguousMismatchCount += 1;
    }

    const matched = status !== CharValidationStatus.Fail;
    const actualTone = charNode.tone ?? '未知';
    const unresolved = actualTone === '未知';

    charChecks.push({
      col: idx,
      char: charNode.char,
      expected: constraint
        ? constraint.type === 'fixed'
          ? constraint.tone
          : constraint.type === 'rhyme'
            ? '韵'
            : '中'
        : 'unknown',
      actual: actualTone,
      matched,
      reason: status === CharValidationStatus.Fail
        ? unresolved
          ? 'tone_unresolved'
          : constraint?.type === 'rhyme'
            ? 'rhyme_unresolved'
            : 'tone_mismatch'
        : undefined,
      isAmbiguous: charIsAmbiguous,
      status,
    });
  });

  return {
    lineIndex: line.globalLineIndex,
    checkableCount,
    matchedCount,
    mismatchCount,
    nonAmbiguousMismatchCount,
    isCompliant: mismatchCount === 0,
    charChecks,
  };
}

/**
 * 把 {@link validateLineAgainstPattern} 的结果写回 AST 行：
 * 为每个字设置 `validationStatus` 与 `expectedConstraint`。
 */
export function applyValidationToLine(
  line: LineNode,
  summary: LineValidationSummary,
  expectedPattern: ToneConstraint[] | undefined,
): void {
  for (const check of summary.charChecks) {
    const node = line.chars[check.col];
    if (!node) continue;
    node.validationStatus = check.status;
    node.expectedConstraint = expectedPattern?.[check.col];
  }
}

/**
 * 将拗救标记应用到行：将已救的 fail 位置改为 rescued。
 */
export function applyRescueMarks(
  currentLine: LineNode,
  rescues: RescueDetail[],
): LineNode {
  if (rescues.length === 0) return currentLine;

  const rescuedCols = rescues
    .filter((item) => item.jiuPosition.line === currentLine.globalLineIndex)
    .map((item) => item.jiuPosition.col);

  if (rescuedCols.length === 0) return currentLine;

  return {
    ...currentLine,
    chars: currentLine.chars.map((char, idx) =>
      rescuedCols.includes(idx) && char.validationStatus === CharValidationStatus.Fail
        ? { ...char, validationStatus: CharValidationStatus.Rescued }
        : char,
    ),
  };
}

/**
 * 校验韵脚一致性。
 *
 * @param chars             字符节点数组
 * @param resolvedTemplate  行模板信息
 * @param precedingRhymes   前置韵脚
 * @param dict              韵书实例
 */
export function validateRhyme(
  chars: CharNode[],
  resolvedTemplate: ResolvedLineTemplate,
  precedingRhymes: Array<{ char: string; rhymeGroup: string }> | undefined,
  dict: RhymeDict,
) {
  if (!resolvedTemplate.isRhymeLine) return undefined;

  const lastChar = chars[chars.length - 1];
  if (!lastChar) return undefined;

  let expectedRhymeGroup: string | undefined;
  let isConsistent: boolean | null = null;

  if (precedingRhymes?.length) {
    expectedRhymeGroup = precedingRhymes[0].rhymeGroup;
    isConsistent = dict.isSameRhyme(lastChar.char, precedingRhymes[0].char);
  }

  return {
    isRhymeLine: true,
    rhymeChar: lastChar.char,
    rhymeGroup: lastChar.rhymeGroup ?? '',
    expectedRhymeGroup,
    isConsistent,
  };
}
