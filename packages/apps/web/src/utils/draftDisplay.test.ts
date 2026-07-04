import { describe, expect, it } from 'vitest';
import type { PoemCreationDraftSummary } from '../persist';
import {
  draftAuthorLabel,
  draftDisplayTitle,
  draftGenreLabel,
  draftSearchText,
} from './draftDisplay';

const summary = (over: Partial<PoemCreationDraftSummary> = {}): PoemCreationDraftSummary => ({
  id: '1',
  title: '',
  description: '',
  author: '',
  genre: 'meter',
  selectedTune: '',
  selectedVariant: '',
  updatedAt: '2026-07-04T00:00:00.000Z',
  ...over,
});

describe('draftDisplayTitle / draftAuthorLabel', () => {
  it('空白回退到占位文案', () => {
    expect(draftDisplayTitle(summary())).toBe('无题');
    expect(draftAuthorLabel(summary())).toBe('佚名');
  });
  it('去除首尾空白后展示', () => {
    expect(draftDisplayTitle(summary({ title: '  春望 ' }))).toBe('春望');
    expect(draftAuthorLabel(summary({ author: ' 杜甫 ' }))).toBe('杜甫');
  });
});

describe('draftGenreLabel', () => {
  it('区分诗/词并拼接词牌', () => {
    expect(draftGenreLabel(summary({ genre: 'meter', selectedTune: '' }))).toBe('诗 · 待选择');
    expect(draftGenreLabel(summary({ genre: 'ci', selectedTune: '西江月' }))).toBe('词 · 西江月');
  });
});

describe('draftSearchText', () => {
  it('汇总标题/作者/体裁/变体供搜索', () => {
    const text = draftSearchText(
      summary({ title: '春望', author: '杜甫', genre: 'meter', selectedTune: '五律', selectedVariant: 'v1' }),
    );
    expect(text).toContain('春望');
    expect(text).toContain('杜甫');
    expect(text).toContain('五律');
    expect(text).toContain('v1');
  });
});
