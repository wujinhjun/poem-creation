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
 * 验证单个字符是否符合模板约束
 */
function validateSingleChar(
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
        return { status: CharValidationStatus.Unknown, isCheckable: true };
      }
      const matches =
        charNode.tone === constraint.tone ||
        (charNode.toneOptions ?? []).includes(constraint.tone);
      return { status: matches ? CharValidationStatus.Pass : CharValidationStatus.Fail, isCheckable: true };
    }

    case 'rhyme':
      return {
        status: charNode.tone !== null ? CharValidationStatus.Pass : CharValidationStatus.Unknown,
        isCheckable: true,
      };

    default:
      return { status: CharValidationStatus.Unknown, isCheckable: false };
  }
}

/**
 * 验证一行字符是否符合期望模式
 */
export function validateChars(
  chars: CharNode[],
  expectedPattern: ToneConstraint[],
): { validatedChars: CharNode[]; score: number } {
  let matchCount = 0;
  let checkableCount = 0;

  const validatedChars = chars.map((charNode, i) => {
    const constraint = expectedPattern[i];
    const { status, isCheckable } = validateSingleChar(charNode, constraint);

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
 * 验证行是否符合平仄模式（纯函数，不改动传入的 `line`）。
 *
 * 每个字的校验状态记录在 `charChecks[].status`；如需写回 AST，
 * 调用 {@link applyValidationToLine}。
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

    if (!constraint) {
      charChecks.push({
        col: idx,
        char: charNode.char,
        expected: 'unknown',
        actual: charNode.tone ?? '未知',
        matched: true,
        isAmbiguous: charIsAmbiguous,
        status: CharValidationStatus.Unknown,
      });
      return;
    }

    if (constraint.type === 'flexible') {
      charChecks.push({
        col: idx,
        char: charNode.char,
        expected: '中',
        actual: charNode.tone ?? '未知',
        matched: true,
        isAmbiguous: charIsAmbiguous,
        status: CharValidationStatus.Flexible,
      });
      return;
    }

    checkableCount += 1;
    const matchesFixed =
      constraint.type === 'fixed' &&
      (charNode.tone === constraint.tone ||
        (charNode.toneOptions ?? []).includes(constraint.tone));
    const matchesRhyme = constraint.type === 'rhyme' && charNode.tone !== null;
    const isMatch = matchesFixed || matchesRhyme;

    if (isMatch) {
      matchedCount += 1;
      charChecks.push({
        col: idx,
        char: charNode.char,
        expected: constraint.type === 'fixed' ? constraint.tone : '韵',
        actual: charNode.tone ?? '未知',
        matched: true,
        isAmbiguous: charIsAmbiguous,
        status: CharValidationStatus.Pass,
      });
      return;
    }

    mismatchCount += 1;
    if (!charIsAmbiguous) {
      nonAmbiguousMismatchCount += 1;
    }
    const actualTone = charNode.tone ?? '未知';
    const unresolved = actualTone === '未知';

    charChecks.push({
      col: idx,
      char: charNode.char,
      expected: constraint.type === 'fixed' ? constraint.tone : '韵',
      actual: actualTone,
      matched: false,
      reason: unresolved
        ? 'tone_unresolved'
        : constraint.type === 'fixed'
          ? 'tone_mismatch'
          : 'rhyme_unresolved',
      isAmbiguous: charIsAmbiguous,
      status: CharValidationStatus.Fail,
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
 * 应用拗救标记到行
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
 * 验证韵脚一致性
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
