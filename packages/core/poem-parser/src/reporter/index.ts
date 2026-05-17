import { CharValidationStatus } from "../core/types.js";
import { AnalysisResult } from "../analyzer/index.js";

/**
 * 将分析结果格式化为 JSON 字符串
 */
export function toJSON(result: AnalysisResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * 将分析结果格式化为逐字标注平仄的文本
 */
export function toAnnotatedText(result: AnalysisResult): string {
  return result.ast.lines
    .map((line) =>
      line.chars
        .map((char) => {
          const tone = char.tone ?? "未知";
          const marker = char.validationStatus === CharValidationStatus.Fail ? "!" : "";
          return `${char.char}(${tone}${marker})`;
        })
        .join(" "),
    )
    .join("\n");
}

/**
 * 将分析结果格式化为终端友好的命令行输出
 */
export function toCLI(result: AnalysisResult): string {
  const headline = result.bestMatch
    ? `模板 ${result.bestMatch.templateId} ${(result.bestMatch.confidence * 100).toFixed(1)}%`
    : "未匹配模板";
  return [headline, toAnnotatedText(result)].join("\n\n");
}
