import { HANZI_RE } from "../core/types.js";

export interface LexLine {
  raw: string;
  chars: string[];
  punctuation: string;
}

export interface LexResult {
  lines: LexLine[];
  metadata: {
    totalLines: number;
    charsPerLine: number[];
  };
}
const LINE_END_PUNC_RE = /[，。！？；：,.!?;:]$/u;

/** 中文标点分隔符 —— 诗词和词牌的通用分句模式 */
const SENTENCE_SEP_RE = /[，。！？；、\n]/u;

function normalizePunctuation(input: string): string {
  return input
    .replace(/\r\n?/g, "\n")
    .replace(/,/g, "，")
    .replace(/\./g, "。")
    .replace(/!/g, "！")
    .replace(/\?/g, "？")
    .replace(/;/g, "；")
    .replace(/:/g, "：");
}

/**
 * 按中文标点分句（不区分诗体/词牌），用于词牌分析、流式解析等场景。
 *
 * 先做标点标准化，使半角 `,.!?;` 与全角 `，。！？；` 一视同仁——
 * 否则用户用半角标点输入词牌时不会分句，导致字数预检/流式/模糊匹配错乱。
 *
 * @param input 输入文本
 * @returns 分句后的字符串数组
 */
export function splitSentences(input: string): string[] {
  return normalizePunctuation(input)
    .replace(/\s+/g, "")
    .split(SENTENCE_SEP_RE)
    .filter(Boolean);
}

/**
 * 词法分析：标点标准化 → 按换行拆句 → 提取汉字
 * @param input 输入文本
 */
export function lex(input: string): LexResult {
  const normalized = normalizePunctuation(input).trim();
  if (!normalized) {
    return {
      lines: [],
      metadata: { totalLines: 0, charsPerLine: [] },
    };
  }

  const rawLines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const lines: LexLine[] = rawLines.map((raw) => {
    const punctuation = LINE_END_PUNC_RE.test(raw) ? raw.at(-1) ?? "" : "";
    const chars = [...raw].filter((ch) => HANZI_RE.test(ch));
    return { raw, chars, punctuation };
  });

  return {
    lines,
    metadata: {
      totalLines: lines.length,
      charsPerLine: lines.map((line) => line.chars.length),
    },
  };
}
