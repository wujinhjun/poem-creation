// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { RhymeDictType } from '@poem/parser/kernel';
import type {
  PoemCreationDraft,
  PoemCreationDraftStore,
  PoemCreationDraftSummary,
} from '../persist';

// 内存假存储，避免碰 IndexedDB / Supabase。
class MemoryStore implements PoemCreationDraftStore {
  drafts = new Map<string, PoemCreationDraft>();
  activeId: string | null = null;
  async listDrafts(): Promise<PoemCreationDraftSummary[]> {
    return [...this.drafts.values()]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        author: d.author,
        genre: d.genre,
        selectedTune: d.selectedTune,
        selectedVariant: d.selectedVariant,
        updatedAt: d.updatedAt,
      }));
  }
  async loadDraft(id: string) {
    return this.drafts.get(id) ?? null;
  }
  async saveDraft(draft: PoemCreationDraft) {
    this.drafts.set(draft.id, draft);
    this.activeId = draft.id;
  }
  async deleteDraft(id: string) {
    this.drafts.delete(id);
  }
  async loadActiveDraftId() {
    return this.activeId;
  }
  async setActiveDraftId(id: string) {
    this.activeId = id;
  }
}

let store: MemoryStore;

vi.mock('../persist', () => ({
  createDraftStore: () => store,
}));

// 只用简单模板，避免加载全量目录。
vi.mock('@poem/poem-kit', () => ({
  getAllTemplates: () => [],
  normalizeDraft: (d: PoemCreationDraft) => ({ ...d, id: d.id || 'active' }),
  identifyQuickFill: () => [],
}));

import { useDraftManager } from './useDraftManager';

const baseParams = () => ({
  persistence: { mode: 'local' as const, supabase: {} as never },
  defaultAuthor: '默认作者',
  viewMode: 'editor' as const,
  persistReady: true,
  navigateTo: vi.fn(),
  onError: vi.fn(),
  entrySelection: {
    genre: 'meter' as const,
    selectedTune: '五言绝句',
    selectedVariant: 'v1',
    rhymeType: RhymeDictType.Pingshui,
  },
});

const sampleDraft = (over: Partial<PoemCreationDraft> = {}): PoemCreationDraft => ({
  schemaVersion: 1,
  id: 'd1',
  title: '春望',
  description: '',
  author: '杜甫',
  genre: 'meter',
  selectedTune: '五言律诗',
  selectedVariant: 'v1',
  rhymeType: RhymeDictType.Pingshui,
  chars: [['国', '破', '山', '河', '在']],
  updatedAt: '2026-07-05T00:00:00.000Z',
  ...over,
});

beforeEach(() => {
  store = new MemoryStore();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('useDraftManager', () => {
  it('applyDraft 把草稿灌进编辑态，buildCurrentDraft 往返一致', () => {
    const onDraftApplied = vi.fn();
    const { result } = renderHook(() =>
      useDraftManager({ ...baseParams(), onDraftApplied }),
    );

    act(() => result.current.applyDraft(sampleDraft()));

    expect(result.current.activeDraftId).toBe('d1');
    expect(result.current.title).toBe('春望');
    expect(result.current.author).toBe('杜甫');
    expect(result.current.chars).toEqual([['国', '破', '山', '河', '在']]);
    expect(onDraftApplied).toHaveBeenCalledTimes(1);

    const built = result.current.buildCurrentDraft();
    expect(built).toMatchObject({
      id: 'd1',
      title: '春望',
      author: '杜甫',
      selectedTune: '五言律诗',
    });
  });

  it('无活动草稿时 buildCurrentDraft 返回 null', () => {
    const { result } = renderHook(() => useDraftManager(baseParams()));
    expect(result.current.buildCurrentDraft()).toBeNull();
  });

  it('newDraft 用 entry 选择态建草稿、写库并跳转到编辑器', async () => {
    const params = baseParams();
    const { result } = renderHook(() => useDraftManager(params));

    await act(async () => {
      await result.current.newDraft();
    });

    expect(store.drafts.size).toBe(1);
    const saved = [...store.drafts.values()][0];
    expect(saved.selectedTune).toBe('五言绝句');
    expect(saved.author).toBe('默认作者');
    expect(params.navigateTo).toHaveBeenCalledWith({
      mode: 'editor',
      draftId: saved.id,
    });
    expect(result.current.activeDraftId).toBe(saved.id);
  });

  it('deleteDraft 确认后从库中删除并刷新列表', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const params = { ...baseParams(), viewMode: 'works' as const };
    const { result } = renderHook(() => useDraftManager(params));

    await act(async () => {
      await store.saveDraft(sampleDraft({ id: 'd1' }));
      await store.saveDraft(sampleDraft({ id: 'd2', title: '登高' }));
      await result.current.refreshDraftList();
    });
    expect(result.current.drafts).toHaveLength(2);

    await act(async () => {
      await result.current.deleteDraft('d1');
    });

    expect(store.drafts.has('d1')).toBe(false);
    expect(result.current.drafts.map((d) => d.id)).toEqual(['d2']);
  });

  it('deleteDraft 取消确认时不删除', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const params = { ...baseParams(), viewMode: 'works' as const };
    const { result } = renderHook(() => useDraftManager(params));

    await act(async () => {
      await store.saveDraft(sampleDraft({ id: 'd1' }));
      await result.current.refreshDraftList();
      await result.current.deleteDraft('d1');
    });

    expect(store.drafts.has('d1')).toBe(true);
  });
});
