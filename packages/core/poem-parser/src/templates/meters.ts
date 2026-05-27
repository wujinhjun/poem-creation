/**
 * 格律模板 —— 纯数据，硬编码
 *
 * 使用紧凑 ASCII DSL 编码，由 parseLineDSL 在装载时展开。
 * 无 fs / path / process 依赖，可被 kernel 直接导入。
 */
import { PoemType, RhymeTone } from "../core/types.js";
import type { ToneConstraint } from "../core/types.js";
import { parseLineDSL } from "./dsl.js";

export interface MeterTemplate {
  id: string;
  type: PoemType;
  name: string;
  charPerLine: 5 | 7;
  lineCount: 4 | 8;
  /** 起式：RhymeTone.Ping = 平起, RhymeTone.Ze = 仄起 */
  startsWith: RhymeTone;
  pattern: ToneConstraint[][];
  /** 韵脚行索引；首句入韵当且仅当 rhymeLineIndices 包含 0 */
  rhymeLineIndices: number[];
  variants?: string[];
}

export function loadMeterTemplates(): MeterTemplate[] {
  return [
    {
      id: "qilü-shouju-ping",
      type: PoemType.Lüshi,
      name: "七律·首句入韵·平起",
      charPerLine: 7,
      lineCount: 8,
      startsWith: RhymeTone.Ping,
      pattern: [
        parseLineDSL("FPFZZPp"),
        parseLineDSL("ZFPPFZp"),
        parseLineDSL("FZFPPZZ"),
        parseLineDSL("FPFZZPp"),
        parseLineDSL("FPFZPPZ"),
        parseLineDSL("ZFPPFZp"),
        parseLineDSL("FZFPPZZ"),
        parseLineDSL("FPFZZPp"),
      ],
      rhymeLineIndices: [0, 1, 3, 5, 7],
    },
    {
      id: "qilü-shouju-ze",
      type: PoemType.Lüshi,
      name: "七律·首句入韵·仄起",
      charPerLine: 7,
      lineCount: 8,
      startsWith: RhymeTone.Ze,
      pattern: [
        parseLineDSL("FZFPPZp"),
        parseLineDSL("FPFZZPp"),
        parseLineDSL("FPFZPPZ"),
        parseLineDSL("ZFPPFZp"),
        parseLineDSL("FZFPPZZ"),
        parseLineDSL("FPFZZPp"),
        parseLineDSL("FPFZPPZ"),
        parseLineDSL("ZFPPFZp"),
      ],
      rhymeLineIndices: [0, 1, 3, 5, 7],
    },
    {
      id: "qilü-pingqi",
      type: PoemType.Lüshi,
      name: "七律·首句不入韵·平起",
      charPerLine: 7,
      lineCount: 8,
      startsWith: RhymeTone.Ping,
      pattern: [
        parseLineDSL("FPFZPPZ"),
        parseLineDSL("ZFPPFZp"),
        parseLineDSL("FZFPPZZ"),
        parseLineDSL("FPFZZPp"),
        parseLineDSL("FPFZPPZ"),
        parseLineDSL("ZFPPFZp"),
        parseLineDSL("FZFPPZZ"),
        parseLineDSL("FPFZZPp"),
      ],
      rhymeLineIndices: [1, 3, 5, 7],
    },
    {
      id: "qilü-zeqi",
      type: PoemType.Lüshi,
      name: "七律·首句不入韵·仄起",
      charPerLine: 7,
      lineCount: 8,
      startsWith: RhymeTone.Ze,
      pattern: [
        parseLineDSL("FZFPPZZ"),
        parseLineDSL("FPFZZPp"),
        parseLineDSL("FPFZPPZ"),
        parseLineDSL("ZFPPFZp"),
        parseLineDSL("FZFPPZZ"),
        parseLineDSL("FPFZZPp"),
        parseLineDSL("FPFZPPZ"),
        parseLineDSL("ZFPPFZp"),
      ],
      rhymeLineIndices: [1, 3, 5, 7],
    },
    {
      id: "wulü-shouju-ping",
      type: PoemType.Lüshi,
      name: "五律·首句入韵·平起",
      charPerLine: 5,
      lineCount: 8,
      startsWith: RhymeTone.Ping,
      pattern: [
        parseLineDSL("FPFZp"),
        parseLineDSL("FZZPp"),
        parseLineDSL("FZPPZ"),
        parseLineDSL("FPZZp"),
        parseLineDSL("FPFZZ"),
        parseLineDSL("FZZPp"),
        parseLineDSL("FZPPZ"),
        parseLineDSL("FPZZp"),
      ],
      rhymeLineIndices: [0, 1, 3, 5, 7],
    },
    {
      id: "wulü-shouju-ze",
      type: PoemType.Lüshi,
      name: "五律·首句入韵·仄起",
      charPerLine: 5,
      lineCount: 8,
      startsWith: RhymeTone.Ze,
      pattern: [
        parseLineDSL("FZFPp"),
        parseLineDSL("FPZZp"),
        parseLineDSL("FPFZZ"),
        parseLineDSL("FZZPp"),
        parseLineDSL("FZPPZ"),
        parseLineDSL("FPZZp"),
        parseLineDSL("FPFZZ"),
        parseLineDSL("FZZPp"),
      ],
      rhymeLineIndices: [0, 1, 3, 5, 7],
    },
    {
      id: "wulü-pingqi",
      type: PoemType.Lüshi,
      name: "五律·首句不入韵·平起",
      charPerLine: 5,
      lineCount: 8,
      startsWith: RhymeTone.Ping,
      pattern: [
        parseLineDSL("FPFZZ"),
        parseLineDSL("FZZPp"),
        parseLineDSL("FZPPZ"),
        parseLineDSL("FPZZp"),
        parseLineDSL("FPFZZ"),
        parseLineDSL("FZZPp"),
        parseLineDSL("FZPPZ"),
        parseLineDSL("FPZZp"),
      ],
      rhymeLineIndices: [1, 3, 5, 7],
    },
    {
      id: "wulü-zeqi",
      type: PoemType.Lüshi,
      name: "五律·首句不入韵·仄起",
      charPerLine: 5,
      lineCount: 8,
      startsWith: RhymeTone.Ze,
      pattern: [
        parseLineDSL("FZPPZ"),
        parseLineDSL("FPZZp"),
        parseLineDSL("FPFZZ"),
        parseLineDSL("FZZPp"),
        parseLineDSL("FZPPZ"),
        parseLineDSL("FPZZp"),
        parseLineDSL("FPFZZ"),
        parseLineDSL("FZZPp"),
      ],
      rhymeLineIndices: [1, 3, 5, 7],
    },
    {
      id: "qijue-shouju-ping",
      type: PoemType.Jueju,
      name: "七绝·首句入韵·平起",
      charPerLine: 7,
      lineCount: 4,
      startsWith: RhymeTone.Ping,
      pattern: [
        parseLineDSL("FPFZZPp"),
        parseLineDSL("ZFPPFZp"),
        parseLineDSL("FZFPPZZ"),
        parseLineDSL("FPFZZPp"),
      ],
      rhymeLineIndices: [0, 1, 3],
    },
    {
      id: "qijue-shouju-ze",
      type: PoemType.Jueju,
      name: "七绝·首句入韵·仄起",
      charPerLine: 7,
      lineCount: 4,
      startsWith: RhymeTone.Ze,
      pattern: [
        parseLineDSL("ZFPPFZp"),
        parseLineDSL("FPFZZPp"),
        parseLineDSL("FPFZPPZ"),
        parseLineDSL("ZFPPFZp"),
      ],
      rhymeLineIndices: [0, 1, 3],
    },
    {
      id: "qijue-pingqi",
      type: PoemType.Jueju,
      name: "七绝·平起·首句不入韵",
      charPerLine: 7,
      lineCount: 4,
      startsWith: RhymeTone.Ping,
      pattern: [
        parseLineDSL("FPFZPPZ"),
        parseLineDSL("ZFPPFZp"),
        parseLineDSL("FZFPPZZ"),
        parseLineDSL("FPFZZPp"),
      ],
      rhymeLineIndices: [1, 3],
    },
    {
      id: "qijue-zeqi",
      type: PoemType.Jueju,
      name: "七绝·仄起·首句不入韵",
      charPerLine: 7,
      lineCount: 4,
      startsWith: RhymeTone.Ze,
      pattern: [
        parseLineDSL("FZFPPZZ"),
        parseLineDSL("FPFZZPp"),
        parseLineDSL("FPFZPPZ"),
        parseLineDSL("ZFPPFZp"),
      ],
      rhymeLineIndices: [1, 3],
    },
    {
      id: "wujue-shouju-ping",
      type: PoemType.Jueju,
      name: "五绝·首句入韵·平起",
      charPerLine: 5,
      lineCount: 4,
      startsWith: RhymeTone.Ping,
      pattern: [
        parseLineDSL("FPZZp"),
        parseLineDSL("FZZPp"),
        parseLineDSL("FZPPZ"),
        parseLineDSL("FPZZp"),
      ],
      rhymeLineIndices: [0, 1, 3],
    },
    {
      id: "wujue-shouju-ze",
      type: PoemType.Jueju,
      name: "五绝·首句入韵·仄起",
      charPerLine: 5,
      lineCount: 4,
      startsWith: RhymeTone.Ze,
      pattern: [
        parseLineDSL("FZZPp"),
        parseLineDSL("FPZZp"),
        parseLineDSL("FPFZZ"),
        parseLineDSL("FZZPp"),
      ],
      rhymeLineIndices: [0, 1, 3],
    },
    {
      id: "wujue-pingqi",
      type: PoemType.Jueju,
      name: "五绝·平起·首句不入韵",
      charPerLine: 5,
      lineCount: 4,
      startsWith: RhymeTone.Ping,
      pattern: [
        parseLineDSL("FPFZZ"),
        parseLineDSL("FZZPp"),
        parseLineDSL("FZPPZ"),
        parseLineDSL("FPZZp"),
      ],
      rhymeLineIndices: [1, 3],
    },
    {
      id: "wujue-zeqi",
      type: PoemType.Jueju,
      name: "五绝·仄起·首句不入韵",
      charPerLine: 5,
      lineCount: 4,
      startsWith: RhymeTone.Ze,
      pattern: [
        parseLineDSL("FZPPZ"),
        parseLineDSL("FPZZp"),
        parseLineDSL("FPFZZ"),
        parseLineDSL("FZZPp"),
      ],
      rhymeLineIndices: [1, 3],
    },
  ];
}
