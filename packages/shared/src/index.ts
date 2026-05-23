/**
 * @poem/shared —— 跨包共享类型与工具（最底层）
 *
 * 不依赖任何其他 @poem/* 包；parser / rhyme-book / creation 等都依赖本包。
 * 编辑器逻辑见 @poem/editor-core；目录/模板业务见 @poem/poem-kit。
 */

export { PoemGenre } from "./constants/index.js";
export {
  Tone,
  RhymeDictType,
  RhymeTone,
  CharValidationStatus,
  HANZI_RE,
} from "./types/parser-base.js";
export type {
  ToneConstraint,
  RhymeDict,
  RhymeEntry,
} from "./types/parser-base.js";

export type {
  PoemMeta,
  AnalyzeRequest,
  CustomTune,
  CustomTuneSection,
  CustomTuneLine,
} from "./types/index.js";

export {
  RHYME_OPTIONS,
  defaultRhymeType,
  createDraftId,
  createEmptyDraft,
  formatDraftTime,
} from "./creation.js";

export type {
  Genre,
  AppView,
  PoemCreationDraft,
  PoemCreationDraftSummary,
  PoemCreationDraftStore,
} from "./creation.js";
