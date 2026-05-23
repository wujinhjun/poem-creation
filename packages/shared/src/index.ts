/**
 * @poem/shared —— 跨包共享类型与工具
 *
 * 供 apps 与其他 core 包共同使用。
 * 常量以 @poem/parser 为唯一数据源，本包仅做透传。
 * 编辑器逻辑已迁出至 @poem/editor-core。
 */

export { PoemGenre } from "./constants/index.js";
export {
  RhymeDictType,
  RhymeTone,
  CharValidationStatus,
} from "./constants/index.js";

export type {
  PoemMeta,
  AnalyzeRequest,
  CustomTune,
  CustomTuneSection,
  CustomTuneLine,
} from "./types/index.js";

export {
  RHYME_OPTIONS,
  allTemplates,
  meterMap,
  defaultRhymeType,
  createDraftId,
  createEmptyDraft,
  formatDraftTime,
  normalizeDraft,
  pairLineGroups,
  ciPatternForEditor,
  inferCiRhymeTone,
  variantSummary,
  firstVariantForTune,
} from "./creation.js";

export type {
  Genre,
  AppView,
  PoemCreationDraft,
  PoemCreationDraftSummary,
  PoemCreationDraftStore,
  CiPatternForEditor,
} from "./creation.js";
