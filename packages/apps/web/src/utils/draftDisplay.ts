import type { PoemCreationDraftSummary } from '../persist';

export function draftDisplayTitle(draft: Pick<PoemCreationDraftSummary, 'title'>): string {
  return draft.title.trim() || '无题';
}

export function draftAuthorLabel(
  draft: Pick<PoemCreationDraftSummary, 'author'>,
): string {
  return draft.author.trim() || '佚名';
}

export function draftGenreLabel(
  draft: Pick<PoemCreationDraftSummary, 'genre' | 'selectedTune'>,
): string {
  const genreLabel = draft.genre === 'ci' ? '词' : '诗';
  return draft.selectedTune.trim()
    ? `${genreLabel} · ${draft.selectedTune.trim()}`
    : `${genreLabel} · 待选择`;
}

export function draftSearchText(draft: PoemCreationDraftSummary): string {
  return [
    draftDisplayTitle(draft),
    draftAuthorLabel(draft),
    draftGenreLabel(draft),
    draft.selectedVariant,
  ].join(' ');
}
