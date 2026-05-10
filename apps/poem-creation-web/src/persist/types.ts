import type { RhymeDictType } from "@poem/parser/kernel";

export type PoemCreationDraft = {
  schemaVersion: 1;
  id: string;
  title: string;
  author: string;
  genre: "meter" | "ci";
  selectedTune: string;
  selectedVariant: string;
  rhymeType: RhymeDictType;
  chars: string[][];
  updatedAt: string;
};

export type PoemCreationDraftSummary = {
  id: string;
  title: string;
  author: string;
  genre: "meter" | "ci";
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
