import type { PoemCreationDraft } from '../persist';

export type DraftArchive = {
  schemaVersion: 1;
  exportedAt: string;
  drafts: PoemCreationDraft[];
};

export function downloadDraftArchive(drafts: PoemCreationDraft[]) {
  const archive: DraftArchive = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    drafts,
  };
  const blob = new Blob([JSON.stringify(archive, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'poem-drafts.json';
  link.click();
  URL.revokeObjectURL(url);
}

export async function readDraftArchive(file: File): Promise<PoemCreationDraft[]> {
  const text = await file.text();
  const payload = JSON.parse(text) as Partial<DraftArchive> | PoemCreationDraft[];
  const drafts = Array.isArray(payload) ? payload : payload.drafts;
  if (!Array.isArray(drafts)) {
    throw new Error('草稿文件格式不正确');
  }
  return drafts.filter((draft): draft is PoemCreationDraft => {
    const candidate = draft as Partial<PoemCreationDraft>;
    return (
      candidate.schemaVersion === 1 &&
      typeof candidate.id === 'string' &&
      typeof candidate.selectedVariant === 'string' &&
      Array.isArray(candidate.chars)
    );
  });
}
