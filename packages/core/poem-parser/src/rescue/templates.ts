/**
 * 拗救模板数据表
 *
 * 枚举格律诗中常见的拗救形态，供模式匹配与诊断生成使用。
 * 每个模板描述一个"拗 → 救"变换：base 是合律的正则平仄序列，
 * nao 是拗后的实际序列，jiuPosition 指出救的位置。
 *
 * 数据来源：王力《诗词格律》拗救章节
 *
 * @module rescue/templates
 */

import { Tone } from "../core/types.js";

// ========== 类型定义 ==========

/** 拗救类别 */
export type RescueCategory =
  | "benju-zijiou"      // 本句自救
  | "duiju-xiangjiou"   // 对句相救
  | "guping-jiou"       // 孤平救
  | "sansi-hujiou"      // 三四互救
  | "daao-jiou";         // 大拗救（出句大拗，对句必救）

/** 平仄标记：P=平, Z=仄, F=可平可仄 */
type ToneMark = "P" | "Z" | "F";

/**
 * 拗救模板
 *
 * - base: 合律的正则平仄序列（不含韵脚标记）
 * - nao: 拗后的实际平仄序列（不含韵脚标记）
 * - naoCol: 拗发生的位置（0-indexed）
 * - jiuCol: 救发生的位置（0-indexed，-1 表示需对句救）
 * - category: 拗救类别
 * - lineLength: 适用于 5 言还是 7 言
 * - requiresCounterpart: 是否需要出句+对句联合检测
 * - description: 中文描述
 */
export interface RescueTemplate {
  /** 模板唯一 ID */
  id: string;
  /** 拗救类别 */
  category: RescueCategory;
  /** 适用于几言句（5 或 7） */
  lineLength: 5 | 7;
  /** 合律 base 声调序列 */
  base: ToneMark[];
  /** 拗后声调序列 */
  nao: ToneMark[];
  /** 拗的位置 */
  naoCol: number;
  /** 救的位置（-1 表示需在对句中救） */
  jiuCol: number;
  /** 是否需要出句+对句联合 */
  requiresCounterpart: boolean;
  /** 对句救模板（仅 requiresCounterpart 时有效） */
  counterpart?: {
    /** 对句 base 声调序列 */
    base: ToneMark[];
    /** 对句救后的声调序列 */
    jiu: ToneMark[];
    /** 救在对句的位置 */
    jiuCol: number;
  };
  /** 中文描述 */
  description: string;
}

// ========== 拗救模板数据 ==========

/**
 * 常见拗救形态枚举表。
 *
 * 覆盖王力《诗词格律》中五言和七言的典型拗救模式：
 * - 本句自救（含孤平救）
 * - 对句相救
 * - 三四互救（特种拗救）
 * - 大拗救
 */
export const RESCUE_TEMPLATES: RescueTemplate[] = [
  // ===== 五言 本句自救 =====

  {
    id: "wuyan-guping-jiu",
    category: "guping-jiou",
    lineLength: 5,
    base: ["Z", "Z", "P", "Z", "P"],
    nao:  ["Z", "P", "Z", "P", "P"],  // col1 Z→P 救孤平
    naoCol: 2,   // 原 P→Z（犯孤平）
    jiuCol: 1,   // 原 Z→P（救）
    requiresCounterpart: false,
    description: "五言孤平拗救：平平仄仄平 → 仄平平仄平。第一字拗仄犯孤平，第三字改平救之。",
  },

  {
    id: "wuyan-sansi-hujiu",
    category: "sansi-hujiou",
    lineLength: 5,
    base: ["P", "P", "P", "Z", "Z"],
    nao:  ["P", "P", "Z", "P", "Z"],  // col2 P→Z, col3 Z→P
    naoCol: 2,
    jiuCol: 3,
    requiresCounterpart: false,
    description: "五言三四互救（特种拗救）：平平平仄仄 → 平平仄平仄。第三字拗仄，第四字改平救之。",
  },

  // ===== 五言 对句相救 =====

  {
    id: "wuyan-daao-jiu",
    category: "daao-jiou",
    lineLength: 5,
    base: ["Z", "Z", "P", "P", "Z"],
    nao:  ["Z", "Z", "P", "Z", "Z"],  // col3 P→Z（大拗）
    naoCol: 3,
    jiuCol: -1,  // 需对句救
    requiresCounterpart: true,
    counterpart: {
      base: ["P", "P", "P", "Z", "P"],
      jiu:  ["P", "P", "Z", "P", "P"],  // col2 P→Z（救大拗）
      jiuCol: 2,
    },
    description: "五言大拗对句救：出句仄仄平平仄 → 仄仄平仄仄（第四字拗仄），对句平平平仄平 → 平平仄平平（第三字改平救）。",
  },

  {
    id: "wuyan-ban-ao-duijiu",
    category: "duiju-xiangjiou",
    lineLength: 5,
    base: ["Z", "Z", "P", "P", "Z"],
    nao:  ["Z", "Z", "Z", "P", "Z"],  // col2 P→Z（半拗）
    naoCol: 2,
    jiuCol: -1,
    requiresCounterpart: true,
    counterpart: {
      base: ["P", "P", "P", "Z", "P"],
      jiu:  ["P", "P", "Z", "P", "P"],  // col2 P→Z（救）
      jiuCol: 2,
    },
    description: "五言半拗对句救：出句仄仄平平仄 → 仄仄仄平仄（第三字拗仄，可救可不救），若救则对句第三字改平。",
  },

  // ===== 五言 本句自救 (对句侧) =====

  {
    id: "wuyan-duiju-benju-jiu",
    category: "benju-zijiou",
    lineLength: 5,
    base: ["P", "P", "P", "Z", "P"],
    nao:  ["Z", "P", "Z", "P", "P"],  // col0 P→Z, col2 P→Z（对句自救）
    naoCol: 0,
    jiuCol: 2,
    requiresCounterpart: false,
    description: "五言对句自救：平平平仄平 → 仄平平仄平。第一字拗仄，第三字改平救（同孤平救逻辑在对句侧的表现）。",
  },

  // ===== 七言 本句自救 =====

  {
    id: "qiyan-guping-jiu",
    category: "guping-jiou",
    lineLength: 7,
    base: ["Z", "Z", "P", "P", "Z", "Z", "P"],
    nao:  ["Z", "Z", "Z", "P", "Z", "P", "P"],  // col2 P→Z（孤平）, col4 Z→P（救）
    naoCol: 2,
    jiuCol: 4,
    requiresCounterpart: false,
    description: "七言孤平拗救：仄仄平平仄仄平 → 仄仄仄平平仄平。第三字拗仄犯孤平，第五字改平救之。",
  },

  {
    id: "qiyan-sansi-hujiu",
    category: "sansi-hujiou",
    lineLength: 7,
    base: ["P", "P", "Z", "Z", "P", "Z", "Z"],
    nao:  ["P", "P", "Z", "Z", "Z", "P", "Z"],  // col4 Z→Z(ok), col5 Z→P(jiu)
    naoCol: 4,   // 第三字（实际第七字位置）
    jiuCol: 5,   // 第四字（实际第六字位置）
    requiresCounterpart: false,
    description: "七言三四互救（特种拗救）：平平仄仄平平仄 → 平平仄仄仄平仄。第五字拗仄，第六字改平救之。",
  },

  // ===== 七言 对句相救 =====

  {
    id: "qiyan-daao-jiu",
    category: "daao-jiou",
    lineLength: 7,
    base: ["P", "P", "Z", "Z", "P", "P", "Z"],
    nao:  ["P", "P", "Z", "Z", "P", "Z", "Z"],  // col5 P→Z（大拗）
    naoCol: 5,
    jiuCol: -1,
    requiresCounterpart: true,
    counterpart: {
      base: ["Z", "Z", "P", "P", "Z", "Z", "P"],
      jiu:  ["Z", "Z", "P", "Z", "P", "Z", "P"],  // col4 P→Z（救大拗）
      jiuCol: 4,
    },
    description: "七言大拗对句救：出句平平仄仄平平仄 → 平平仄仄平仄仄（第六字拗仄），对句仄仄平平仄仄平 → 仄仄平平平仄平（第五字改平救）。",
  },

  // ===== 七言 双救（对句自身孤平救 + 对句救出句） =====

  {
    id: "qiyan-shuangjiu",
    category: "duiju-xiangjiou",
    lineLength: 7,
    base: ["P", "P", "Z", "Z", "P", "P", "Z"],
    nao:  ["P", "P", "Z", "Z", "Z", "Z", "Z"],  // col4 P→Z, col5 P→Z（大拗）
    naoCol: 4,
    jiuCol: -1,
    requiresCounterpart: true,
    counterpart: {
      base: ["Z", "Z", "P", "P", "Z", "Z", "P"],
      jiu:  ["Z", "Z", "Z", "P", "Z", "P", "P"],  // col2 P→Z, col4 Z→P, col5 Z→P
      jiuCol: 4,
    },
    description: "七言双救：出句第六字拗仄（大拗），对句第五字改平救出句大拗，同时第三字拗仄的对句自身也形成自救结构。",
  },
];

// ========== 查询辅助 ==========

/** 按行长度筛选拗救模板 */
export function getRescueTemplatesByLength(lineLength: 5 | 7): RescueTemplate[] {
  return RESCUE_TEMPLATES.filter((t) => t.lineLength === lineLength);
}

/** 按类别筛选拗救模板 */
export function getRescueTemplatesByCategory(category: RescueCategory): RescueTemplate[] {
  return RESCUE_TEMPLATES.filter((t) => t.category === category);
}

/** 按行长度和 base 序列匹配拗救模板 */
export function matchRescueTemplate(
  lineLength: 5 | 7,
  actualTones: ToneMark[],
): RescueTemplate | undefined {
  const candidates = RESCUE_TEMPLATES.filter((t) => t.lineLength === lineLength);
  return candidates.find((t) => {
    if (t.nao.length !== actualTones.length) return false;
    return t.nao.every((expected, i) => expected === "F" || expected === actualTones[i]);
  });
}

/**
 * 将 Tone 值序列映射为 P/Z/F 标记。
 * null / Tone.Unknown 映射为 F。
 */
export function tonesToMarks(tones: Array<Tone | null>): ToneMark[] {
  return tones.map((t) => {
    if (t === Tone.Ping) return "P";
    if (t === Tone.Ze) return "Z";
    return "F";
  });
}
