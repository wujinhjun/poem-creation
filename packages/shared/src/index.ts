/**
 * @poem/shared —— 跨包共享类型与工具
 *
 * 供 web、rn、agent 等上游包使用。
 * 常量以 @poem/parser 为唯一数据源，本包仅做透传。
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

export type {
  EditorConstraint,
  EditorPosition,
  EditorWriteResult,
} from "./editor/index.js";

export {
  createEmptyEditorGrid,
  createEditorPatternSignature,
  lineEndsWithRhyme,
  normalizeEditorInput,
  writeEditorCharsAt,
  pasteEditorTextAt,
} from "./editor/index.js";
