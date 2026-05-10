import type { RhymeTone } from "../constants/index.js";

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
