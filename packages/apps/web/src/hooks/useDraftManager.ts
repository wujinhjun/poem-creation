import { useCallback, useEffect, useMemo, useState } from 'react';
import { RhymeDictType } from '@poem/parser/kernel';
import { getAllTemplates } from '@poem/poem-kit';
import { identifyQuickFill } from '@poem/poem-kit';
import type { QuickFillCandidate } from '@poem/poem-kit';
import { createDraftStore } from '../persist';
import type { PoemCreationDraft, PoemCreationDraftSummary } from '../persist';
import type { PersistenceSettings } from '../utils/settings';
import type { Genre } from '../constants/poem';
import type { SaveStatus } from '../components/AppFrame';
import type { AppRoute } from '../utils/routing';
import { createEmptyDraft, normalizeDraft } from '../utils/draft';
import { downloadDraftArchive, readDraftArchive } from '../utils/draftArchive';
import { draftDisplayTitle } from '../utils/draftDisplay';
import { createBrowserDict } from '../utils/rhymeDict';
import { loadCiBundle } from '../utils/ciTemplate';

const QUICKFILL_MIN_CONFIDENCE = 0.55;

export type QuickFillRecognitionInput = {
  title: string;
  author: string;
  lines: string[];
};

type EntrySelection = {
  genre: Genre;
  selectedTune: string;
  selectedVariant: string;
  rhymeType: RhymeDictType;
};

type UseDraftManagerParams = {
  persistence: PersistenceSettings;
  defaultAuthor: string;
  /** 当前视图；仅在 editor 视图下自动保存 / 持久化。 */
  viewMode: AppRoute['mode'];
  /** 首屏加载完成前不写库。 */
  persistReady: boolean;
  navigateTo: (route: AppRoute) => void;
  onError: (message: string) => void;
  /** 应用草稿后（如清空分析结果）。 */
  onDraftApplied?: () => void;
  entrySelection: EntrySelection;
};

function quickFillInputText(lines: string[]): string {
  return lines.map((line) => line.trim()).filter(Boolean).join('\n');
}

function candidateRhymeType(candidate: QuickFillCandidate): RhymeDictType {
  return candidate.genre === 'ci' ? RhymeDictType.Cilin : RhymeDictType.Pingshui;
}

/**
 * 草稿生命周期与持久化的唯一归属。
 *
 * 从 App 抽离，让视图/路由编排与草稿状态解耦——也为后续接入真正的
 * router loader 打基础（见 docs/project-review 的 router 迁移方案 Phase 0）。
 */
export function useDraftManager({
  persistence,
  defaultAuthor,
  viewMode,
  persistReady,
  navigateTo,
  onError,
  onDraftApplied,
  entrySelection,
}: UseDraftManagerParams) {
  const draftStore = useMemo(() => createDraftStore(persistence), [persistence]);

  const [activeDraftId, setActiveDraftId] = useState('');
  const [draftRevision, setDraftRevision] = useState(0);
  const [drafts, setDrafts] = useState<PoemCreationDraftSummary[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState<Genre>('meter');
  const [selectedTune, setSelectedTune] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [rhymeType, setRhymeType] = useState<RhymeDictType>(
    RhymeDictType.Pingshui,
  );
  const [chars, setChars] = useState<string[][]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');

  // Applying a draft is the only place that hydrates editor state from storage.
  // Keeping it centralized prevents route/list actions from drifting apart.
  const applyDraft = useCallback(
    (sourceDraft: PoemCreationDraft) => {
      const draft = normalizeDraft(sourceDraft, getAllTemplates());
      setActiveDraftId(draft.id);
      setDraftRevision((revision) => revision + 1);
      setTitle(draft.title);
      setDescription(draft.description);
      setAuthor(draft.author);
      setGenre(draft.genre);
      setSelectedTune(draft.selectedTune);
      setSelectedVariant(draft.selectedVariant);
      setRhymeType(draft.rhymeType);
      setChars(draft.chars);
      onDraftApplied?.();
    },
    [onDraftApplied],
  );

  const refreshDraftList = useCallback(async () => {
    setDrafts(await draftStore.listDrafts());
  }, [draftStore]);

  const loadDraft = useCallback(
    (id: string) => draftStore.loadDraft(id),
    [draftStore],
  );

  const setActiveDraftIdInStore = useCallback(
    (id: string) => draftStore.setActiveDraftId(id),
    [draftStore],
  );

  const loadActiveDraftId = useCallback(
    () => draftStore.loadActiveDraftId(),
    [draftStore],
  );

  const listDrafts = useCallback(
    () => draftStore.listDrafts(),
    [draftStore],
  );

  const buildCurrentDraft = useCallback((): PoemCreationDraft | null => {
    if (!activeDraftId) return null;
    return {
      schemaVersion: 1,
      id: activeDraftId,
      title,
      description,
      author,
      genre,
      selectedTune,
      selectedVariant,
      rhymeType,
      chars,
      updatedAt: new Date().toISOString(),
    };
  }, [
    activeDraftId,
    author,
    chars,
    description,
    genre,
    rhymeType,
    selectedTune,
    selectedVariant,
    title,
  ]);

  const persistIfEditing = useCallback(async () => {
    if (viewMode !== 'editor' || !persistReady) return;
    const current = buildCurrentDraft();
    if (!current) return;
    await draftStore.saveDraft(current);
    await refreshDraftList();
  }, [
    buildCurrentDraft,
    draftStore,
    persistReady,
    refreshDraftList,
    viewMode,
  ]);

  const newDraft = useCallback(async () => {
    await persistIfEditing();
    const nextDraft = {
      ...createEmptyDraft(),
      title: entrySelection.selectedTune,
      author: defaultAuthor,
      genre: entrySelection.genre,
      selectedTune: entrySelection.selectedTune,
      selectedVariant: entrySelection.selectedVariant,
      rhymeType: entrySelection.rhymeType,
    };
    await draftStore.saveDraft(nextDraft);
    applyDraft(nextDraft);
    await refreshDraftList();
    navigateTo({ mode: 'editor', draftId: nextDraft.id });
  }, [
    applyDraft,
    defaultAuthor,
    draftStore,
    entrySelection,
    navigateTo,
    persistIfEditing,
    refreshDraftList,
  ]);

  const openDraft = useCallback(
    async (id: string) => {
      await persistIfEditing();
      const draft = await draftStore.loadDraft(id);
      if (!draft) return;
      applyDraft(draft);
      await draftStore.setActiveDraftId(id);
      await refreshDraftList();
      navigateTo({ mode: 'editor', draftId: id });
    },
    [applyDraft, draftStore, navigateTo, persistIfEditing, refreshDraftList],
  );

  const deleteDraft = useCallback(
    async (id: string) => {
      const target = drafts.find((draft) => draft.id === id);
      const label = target ? draftDisplayTitle(target) : '这首作品';
      if (!window.confirm(`确定删除「${label}」吗？此操作不可恢复。`)) {
        return;
      }
      await draftStore.deleteDraft(id);
      const remaining = await draftStore.listDrafts();
      setDrafts(remaining);

      if (id !== activeDraftId) return;
      if (viewMode !== 'editor') {
        setActiveDraftId('');
        return;
      }

      const nextId = remaining[0]?.id;
      if (nextId) {
        const nextDraft = await draftStore.loadDraft(nextId);
        if (nextDraft) {
          applyDraft(nextDraft);
          await draftStore.setActiveDraftId(nextId);
          navigateTo({ mode: 'editor', draftId: nextId });
          return;
        }
      }

      applyDraft(createEmptyDraft());
      navigateTo({ mode: 'entry' });
      await refreshDraftList();
    },
    [
      activeDraftId,
      applyDraft,
      draftStore,
      drafts,
      navigateTo,
      refreshDraftList,
      viewMode,
    ],
  );

  const recognize = useCallback(
    async (input: QuickFillRecognitionInput) => {
      const text = quickFillInputText(input.lines);
      if (!text) throw new Error('请先输入至少一句正文');

      const [pingshuiDict, cilinDict, ciBundle] = await Promise.all([
        createBrowserDict(RhymeDictType.Pingshui),
        createBrowserDict(RhymeDictType.Cilin),
        loadCiBundle(),
      ]);
      const meterCandidates = identifyQuickFill(text, pingshuiDict, undefined, {
        topN: 6,
      });
      const ciCandidates = identifyQuickFill(
        text,
        cilinDict,
        Object.values(ciBundle),
        { topN: 8 },
      ).filter((candidate) => candidate.genre === 'ci');
      const candidates = [...meterCandidates, ...ciCandidates].sort(
        (a, b) => b.confidence - a.confidence,
      );
      const best = candidates[0];
      if (!best || best.confidence < QUICKFILL_MIN_CONFIDENCE) {
        throw new Error('暂未识别到足够可信的格律或词牌，请补充分行或改用模板起笔');
      }

      const nextDraft: PoemCreationDraft = {
        ...createEmptyDraft(),
        title: input.title.trim() || best.tuneName,
        author: input.author.trim() || defaultAuthor,
        genre: best.genre,
        selectedTune: best.tuneName,
        selectedVariant: best.variantId,
        rhymeType: candidateRhymeType(best),
        chars: best.normalizedLines,
      };
      await draftStore.saveDraft(nextDraft);
      applyDraft(nextDraft);
      await refreshDraftList();
      navigateTo({ mode: 'editor', draftId: nextDraft.id });
      onError(
        `已识别为${best.tuneName} · ${best.variantName}（置信度 ${Math.round(best.confidence * 100)}%）`,
      );
    },
    [
      applyDraft,
      defaultAuthor,
      draftStore,
      navigateTo,
      onError,
      refreshDraftList,
    ],
  );

  const exportDrafts = useCallback(async () => {
    const fullDrafts = await Promise.all(
      drafts.map((draft) => draftStore.loadDraft(draft.id)),
    );
    downloadDraftArchive(
      fullDrafts.filter((draft): draft is PoemCreationDraft => Boolean(draft)),
    );
  }, [draftStore, drafts]);

  const importDrafts = useCallback(
    async (file: File) => {
      try {
        const importedDrafts = await readDraftArchive(file);
        await Promise.all(importedDrafts.map((draft) => draftStore.saveDraft(draft)));
        await refreshDraftList();
        onError(`已导入 ${importedDrafts.length} 首作品`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        onError(`导入失败：${message}`);
      }
    },
    [draftStore, onError, refreshDraftList],
  );

  // Debounce store writes so IME composition and rapid typing stay smooth.
  useEffect(() => {
    if (!persistReady || !activeDraftId || viewMode !== 'editor') return;
    const timer = window.setTimeout(() => {
      const draft = buildCurrentDraft();
      if (!draft) return;
      setSaveStatus('saving');
      void draftStore
        .saveDraft(draft)
        .then(async () => {
          await refreshDraftList();
          setSaveStatus('saved');
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          setSaveStatus('error');
          onError(`草稿保存失败：${message}`);
        });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [
    activeDraftId,
    buildCurrentDraft,
    draftStore,
    onError,
    persistReady,
    refreshDraftList,
    viewMode,
  ]);

  return {
    // state
    drafts,
    setDrafts,
    activeDraftId,
    draftRevision,
    saveStatus,
    setSaveStatus,
    // editor working fields
    title,
    description,
    author,
    genre,
    selectedTune,
    selectedVariant,
    rhymeType,
    chars,
    setTitle,
    setDescription,
    setAuthor,
    setGenre,
    setSelectedTune,
    setSelectedVariant,
    setRhymeType,
    setChars,
    // operations
    applyDraft,
    buildCurrentDraft,
    refreshDraftList,
    persistIfEditing,
    newDraft,
    openDraft,
    deleteDraft,
    recognize,
    importDrafts,
    exportDrafts,
    // low-level store access (used by App boot / popstate route sync)
    loadDraft,
    loadActiveDraftId,
    listDrafts,
    setActiveDraftIdInStore,
  };
}
