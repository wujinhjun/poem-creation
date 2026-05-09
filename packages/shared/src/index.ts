/**
 * @poem/shared —— 跨包共享类型与工具
 *
 * 供 parser、web、rn、agent 等包共同使用。
 * 与 @poem/parser 导出的常量保持值对齐。
 */

// ========== 诗歌基础常量 ==========

/** 诗歌体裁 */
export const PoemGenre = {
  Wujue: "wujue",
  Qijue: "qijue",
  Wulü: "wulü",
  Qilü: "qilü",
  Ci: "ci",
} as const;
export type PoemGenre = (typeof PoemGenre)[keyof typeof PoemGenre];

/** 韵书类型 */
export const RhymeDictType = {
  Pingshui: "pingshui",
  Cilin: "cilin",
  Zhonghua: "zhonghua_new",
} as const;
export type RhymeDictType = (typeof RhymeDictType)[keyof typeof RhymeDictType];

/** 韵脚声调 */
export const RhymeTone = {
  Ping: "ping",
  Ze: "ze",
} as const;
export type RhymeTone = (typeof RhymeTone)[keyof typeof RhymeTone];

/** 校验状态 */
export const CharValidationStatus = {
  Pass: "pass",
  Fail: "fail",
  Flexible: "flexible",
  Rescued: "rescued",
  Unknown: "unknown",
} as const;
export type CharValidationStatus = (typeof CharValidationStatus)[keyof typeof CharValidationStatus];

// ========== API 类型 ==========

/** 诗词作品元数据（数据库、API 传输） */
export interface PoemMeta {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  genre: PoemGenre;
  rhymeDictType: RhymeDictType;
  templateId: string;
  variantId?: string;
  text: string;
  complianceRate: number;
  isCompliant: boolean;
  createdAt: string;
}

/** 分析请求参数 */
export interface AnalyzeRequest {
  text: string;
  templateId: string;
  rhymeDictType: RhymeDictType;
  variantId?: string;
  genre?: PoemGenre;
}

/** 自度曲（自定义词牌）定义 */
export interface CustomTune {
  id: string;
  name: string;
  author: string;
  sections: CustomTuneSection[];
}

export interface CustomTuneSection {
  name: string;
  lines: CustomTuneLine[];
}

export interface CustomTuneLine {
  charCount: number;
  pattern: string; // "平仄中韵" 格式
  isRhymeLine: boolean;
  rhymeType?: RhymeTone;
}
