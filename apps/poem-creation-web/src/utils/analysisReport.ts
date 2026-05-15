import type { AnalysisResult } from '@poem/parser/kernel';

const reasonLabels: Record<string, string> = {
  tone_unresolved: '韵书未收或声调未知',
  tone_mismatch: '平仄不合',
  rhyme_unresolved: '韵脚未能确认',
};

export function formatAnalysisReport(result: AnalysisResult): string {
  const header = [
    `合律率：${(result.complianceRate * 100).toFixed(0)}%`,
    `完全合律：${result.fullyCompliant ? '是' : '否'}`,
    `多音字：${result.ambiguities.map((a) => a.char).join('、') || '无'}`,
  ];

  const problemLines = result.lineValidations
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

  return problemLines.length > 0
    ? `${header.join(' | ')}\n${problemLines.join('\n')}`
    : header.join(' | ');
}
