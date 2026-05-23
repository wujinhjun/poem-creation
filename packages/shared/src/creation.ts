/**
 * 创作流程 —— 纯类型与无依赖工具
 *
 * 目录、模板、词牌格律相关的业务函数已迁到 @poem/poem-kit。
 * 本文件只保留与 parser/catalog 无关的纯定义。
 */
import { RhymeDictType } from "./types/parser-base.js";

export type Genre = "meter" | "ci";
export type AppView = "home" | "works" | "entry" | "editor" | "settings";

export const RHYME_OPTIONS = [
  { value: RhymeDictType.Pingshui, label: "平水韵" },
  { value: RhymeDictType.Cilin, label: "词林正韵" },
  { value: RhymeDictType.Zhonghua, label: "中华新韵" },
] as const;

export type PoemCreationDraft = {
  schemaVersion: 1;
  id: string;
  title: string;
  description: string;
  author: string;
  genre: Genre;
  selectedTune: string;
  selectedVariant: string;
  rhymeType: RhymeDictType;
  chars: string[][];
  updatedAt: string;
};

export type PoemCreationDraftSummary = {
  id: string;
  title: string;
  description: string;
  author: string;
  genre: Genre;
  selectedTune: string;
  selectedVariant: string;
  updatedAt: string;
};

export interface PoemCreationDraftStore {
  listDrafts(): Promise<PoemCreationDraftSummary[]>;
  loadActiveDraftId(): Promise<string | null>;
  setActiveDraftId(id: string): Promise<void>;
  loadDraft(id: string): Promise<PoemCreationDraft | null>;
  saveDraft(draft: PoemCreationDraft): Promise<void>;
  deleteDraft(id: string): Promise<void>;
}

export function defaultRhymeType(genre: Genre): RhymeDictType {
  return genre === "meter" ? RhymeDictType.Pingshui : RhymeDictType.Cilin;
}

export function createDraftId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createEmptyDraft(): PoemCreationDraft {
  return {
    schemaVersion: 1,
    id: createDraftId(),
    title: "",
    description: "",
    author: "",
    genre: "meter",
    selectedTune: "",
    selectedVariant: "",
    rhymeType: RhymeDictType.Pingshui,
    chars: [],
    updatedAt: new Date().toISOString(),
  };
}

export function formatDraftTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
