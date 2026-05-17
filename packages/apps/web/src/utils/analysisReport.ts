import type { AnalysisResult } from '@poem/parser/kernel';
import type { StrictGridValidation } from './strictGridValidation';

const reasonLabels: Record<string, string> = {
  tone_unresolved: '韵书未收或声调未知',
  tone_mismatch: '平仄不合',
  rhyme_unresolved: '韵脚未能确认',
};

function ambiguitySummary(result: AnalysisResult): string {
  const chars = result.ambiguities.map((item) => item.char);
  return chars.length > 0 ? `多音字：${chars.join('、')}` : '';
}

export function formatAnalysisReport(
  result: AnalysisResult,
  strictValidation?: StrictGridValidation,
): string {
  const strictIssues = strictValidation?.issues ?? [];
  const fullyCompliant = strictValidation
    ? strictIssues.length === 0
    : result.fullyCompliant;
  const ambiguityText = ambiguitySummary(result);

  const strictProblemLines = Object.entries(
    strictIssues.reduce<Record<string, string[]>>((groups, issue) => {
      const reason = issue.reason;
      const label = issue.lineText || `第 ${issue.lineIndex + 1} 句`;
      groups[label] ??= [];
      groups[label].push(
        `${issue.char}字，应${issue.expected}，实${issue.actual}（${reason}）`,
      );
      return groups;
    }, {}),
  )
    .map(
      ([lineText, problems]) =>
        `「${lineText}」：${problems.join('；')}`,
    );

  const parserProblemLines = result.lineValidations
    .filter((line) => !line.isCompliant)
    .map((line) => {
      const problems = line.charChecks
        .filter((check) => !check.matched)
        .map((check) => {
          const reason = check.reason ? reasonLabels[check.reason] ?? check.reason : '不合';
          return `${check.char}${check.col + 1}位，应${check.expected}，实${check.actual}（${reason}）`;
        })
        .join('；');
      return `第 ${line.lineIndex + 1} 句：${problems}`;
    });
  const problemLines = strictValidation ? strictProblemLines : parserProblemLines;
  const title = fullyCompliant
    ? '格律没有问题'
    : `平仄提示：发现 ${problemLines.length} 句需斟酌`;
  const header = ambiguityText ? `${title}\n${ambiguityText}需要注意` : title;

  return problemLines.length > 0
    ? `${header}\n${problemLines.join('\n')}`
    : header;
}
