/**
 * 诗歌体裁（shared 层分类，粒度比 parser 的 PoemType 更细）
 *
 * PoemType（parser）= Lüshi | Jueju | Ci —— 用于匹配逻辑
 * PoemGenre（shared）= wujue | qijue | wulü | qilü | ci —— 用于 UI/API
 */
export const PoemGenre = {
  Wujue: "wujue",
  Qijue: "qijue",
  Wulü: "wulü",
  Qilü: "qilü",
  Ci: "ci",
} as const;
export type PoemGenre = (typeof PoemGenre)[keyof typeof PoemGenre];

// 以 @poem/parser 为唯一数据源，只做值导出（类型随值自动导出）
export {
  RhymeDictType,
  RhymeTone,
  CharValidationStatus,
} from "@poem/parser/kernel";
