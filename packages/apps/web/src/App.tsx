import { useState, useMemo, useEffect, useCallback } from 'react';
import { RhymeDictType } from '@poem/parser/kernel';
import { createDraftStore } from './persist';
import type { PoemCreationDraft, PoemCreationDraftSummary } from './persist';
import type { Genre } from './constants/poem';
import { AppFrame } from './components/AppFrame';
import { AppNotice } from './components/AppNotice';
import { EntryPage } from './components/EntryPage';
import { EditorPage } from './components/EditorPage';
import { QuickFillPage } from './components/QuickFillPage';
import { SettingsPage } from './components/SettingsPage';
import { TemplateSelectionPage } from './components/TemplateSelectionPage';
import { WorksPage } from './components/WorksPage';
import { useBrowserDict } from './hooks/useBrowserDict';
import { useEditorPattern } from './hooks/useEditorPattern';
import { useEntrySelection } from './hooks/useEntrySelection';
import { formatAnalysisReport } from './utils/analysisReport';
import { createEmptyDraft, normalizeDraft } from './utils/draft';
import { downloadDraftArchive, readDraftArchive } from './utils/draftArchive';
import { draftDisplayTitle } from './utils/draftDisplay';
import { copyText, formatPoemText } from './utils/exportText';
import { validateGridStrictly } from './utils/strictGridValidation';
import { pushRoute, readRoute, replaceRoute } from './utils/routing';
import { defaultRhymeType } from '@poem/shared';
import { firstVariantForTune, getAllTemplates } from '@poem/poem-kit';
import {
  loadUserSettings,
  saveUserSettings,
} from './utils/settings';
import type { UserSettings } from './utils/settings';
import './style.css';

export default function App() {
  const [viewMode, setViewMode] = useState<
    'entry' | 'template' | 'quickfill' | 'works' | 'editor' | 'settings'
  >('entry');
  const [entryGenre, setEntryGenre] = useState<Genre>('meter');
  const [entrySelectedTune, setEntrySelectedTune] = useState('');
  const [entrySelectedVariant, setEntrySelectedVariant] = useState('');
  const [entryRhymeType, setEntryRhymeType] = useState<RhymeDictType>(
    RhymeDictType.Pingshui,
  );
  const [genre, setGenre] = useState<Genre>('meter');
  const [selectedTune, setSelectedTune] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [rhymeType, setRhymeType] = useState<RhymeDictType>(
    RhymeDictType.Pingshui,
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [userSettings, setUserSettings] = useState<UserSettings>(
    () => loadUserSettings(),
  );
  const [activeDraftId, setActiveDraftId] = useState('');
  const [draftRevision, setDraftRevision] = useState(0);
  const [drafts, setDrafts] = useState<PoemCreationDraftSummary[]>([]);
  const [chars, setChars] = useState<string[][]>([]);
  const [analyzeResult, setAnalyzeResult] = useState('');
  const [appError, setAppError] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const [persistReady, setPersistReady] = useState(false);
  const draftStore = useMemo(
    () => createDraftStore(userSettings.persistence),
    [userSettings.persistence],
  );
  const { dict, dictError } = useBrowserDict(rhymeType);
  const {
    pattern,
    expectedRhymeTone,
    visualLineGroups,
    sectionBreakBeforeGroups,
    selectedVariantLabel,
    analysisTemplate,
  } = useEditorPattern({
    genre,
    selectedTune,
    selectedVariant,
    onError: setAppError,
  });
  const {
    templateOptions,
    variantOptions,
    handleEntryGenreChange,
    handleEntryTuneChange,
  } = useEntrySelection({
    entryGenre,
    entrySelectedTune,
    setEntryGenre,
    setEntrySelectedTune,
    setEntrySelectedVariant,
    setEntryRhymeType,
  });

  // Applying a draft is the only place that hydrates editor state from storage.
  // Keeping it centralized prevents route/list actions from drifting apart.
  const applyDraft = useCallback((sourceDraft: PoemCreationDraft) => {
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
    setAnalyzeResult('');
  }, []);

  const refreshDraftList = useCallback(async () => {
    setDrafts(await draftStore.listDrafts());
  }, [draftStore]);

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

  const handleNewDraft = useCallback(async () => {
    const current = buildCurrentDraft();
    if (viewMode === 'editor' && persistReady && current) {
      await draftStore.saveDraft(current);
    }
    const nextDraft = {
      ...createEmptyDraft(),
      author: userSettings.defaultAuthor,
      genre: entryGenre,
      selectedTune: entrySelectedTune,
      selectedVariant: entrySelectedVariant,
      rhymeType: entryRhymeType,
    };
    await draftStore.saveDraft(nextDraft);
    applyDraft(nextDraft);
    await refreshDraftList();
    setViewMode('editor');
    pushRoute({ mode: 'editor', draftId: nextDraft.id });
  }, [
    applyDraft,
    buildCurrentDraft,
    draftStore,
    entryGenre,
    entryRhymeType,
    entrySelectedTune,
    entrySelectedVariant,
    persistReady,
    refreshDraftList,
    userSettings.defaultAuthor,
    viewMode,
  ]);

  const handleNewDraftFromTemplate = useCallback(
    async (nextGenre: Genre, tuneName: string) => {
      const current = buildCurrentDraft();
      if (viewMode === 'editor' && persistReady && current) {
        await draftStore.saveDraft(current);
      }
      const nextDraft = {
        ...createEmptyDraft(),
        author: userSettings.defaultAuthor,
        genre: nextGenre,
        selectedTune: tuneName,
        selectedVariant: firstVariantForTune(nextGenre, tuneName),
        rhymeType: defaultRhymeType(nextGenre),
      };
      await draftStore.saveDraft(nextDraft);
      applyDraft(nextDraft);
      await refreshDraftList();
      setViewMode('editor');
      pushRoute({ mode: 'editor', draftId: nextDraft.id });
    },
    [
      applyDraft,
      buildCurrentDraft,
      draftStore,
      persistReady,
      refreshDraftList,
      userSettings.defaultAuthor,
      viewMode,
    ],
  );

  const handleOpenDraft = useCallback(
    async (id: string) => {
      const current = buildCurrentDraft();
      if (viewMode === 'editor' && persistReady && current) {
        await draftStore.saveDraft(current);
      }
      const draft = await draftStore.loadDraft(id);
      if (!draft) return;
      applyDraft(draft);
      await draftStore.setActiveDraftId(id);
      await refreshDraftList();
      setViewMode('editor');
      pushRoute({ mode: 'editor', draftId: id });
    },
    [
      applyDraft,
      buildCurrentDraft,
      draftStore,
      persistReady,
      refreshDraftList,
      viewMode,
    ],
  );

  const handleDeleteDraft = useCallback(
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
          pushRoute({ mode: 'editor', draftId: nextId });
          return;
        }
      }

      applyDraft(createEmptyDraft());
      setViewMode('entry');
      pushRoute({ mode: 'entry' });
      await refreshDraftList();
    },
    [
      activeDraftId,
      applyDraft,
      draftStore,
      drafts,
      refreshDraftList,
      viewMode,
    ],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [activeId, summaries] = await Promise.all([
          draftStore.loadActiveDraftId(),
          draftStore.listDrafts(),
        ]);
        if (!alive) return;
        setDrafts(summaries);

        // On a static host the URL hash is the source of truth for whether the
        // user should land in the entry screen or a specific draft editor.
        const route = readRoute();
        if (route.mode === 'settings') {
          setViewMode('settings');
          setPersistReady(true);
          return;
        }
        if (route.mode === 'template') {
          setViewMode('template');
          setPersistReady(true);
          return;
        }
        if (route.mode === 'quickfill') {
          setViewMode('quickfill');
          setPersistReady(true);
          return;
        }
        if (route.mode === 'works') {
          setViewMode('works');
          setPersistReady(true);
          return;
        }

        if (route.mode === 'editor') {
          const draft = await draftStore.loadDraft(route.draftId);
          if (!alive) return;
          if (draft?.schemaVersion === 1) {
            applyDraft(draft);
            await draftStore.setActiveDraftId(route.draftId);
            setViewMode('editor');
            setPersistReady(true);
            return;
          }
          replaceRoute({ mode: 'entry' });
        }

        let fallbackDraft = activeId
          ? await draftStore.loadDraft(activeId)
          : null;
        if (
          !fallbackDraft &&
          summaries[0]?.id &&
          summaries[0].id !== activeId
        ) {
          fallbackDraft = await draftStore.loadDraft(summaries[0].id);
        }
        if (!alive) return;

        if (fallbackDraft?.schemaVersion === 1) {
          applyDraft(fallbackDraft);
        } else {
          applyDraft(createEmptyDraft());
        }
        setViewMode('entry');
        if (alive) setPersistReady(true);
      } catch (error: unknown) {
        if (!alive) return;
        const message = error instanceof Error ? error.message : String(error);
        setAppError(`草稿加载失败：${message}`);
        applyDraft(createEmptyDraft());
        setPersistReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [applyDraft, draftStore]);

  useEffect(() => {
    const handlePopState = () => {
      const route = readRoute();
      if (route.mode === 'entry') {
        setViewMode('entry');
        return;
      }
      if (route.mode === 'settings') {
        setViewMode('settings');
        return;
      }
      if (route.mode === 'template') {
        setViewMode('template');
        return;
      }
      if (route.mode === 'quickfill') {
        setViewMode('quickfill');
        return;
      }
      if (route.mode === 'works') {
        setViewMode('works');
        return;
      }

      void draftStore.loadDraft(route.draftId).then((draft) => {
        if (!draft) {
          setViewMode('entry');
          replaceRoute({ mode: 'entry' });
          return;
        }
        applyDraft(draft);
        setViewMode('editor');
        void draftStore.setActiveDraftId(route.draftId);
      });
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, [applyDraft, draftStore]);

  useEffect(() => {
    if (!persistReady || !activeDraftId || viewMode !== 'editor') return;
    // Debounce store writes so IME composition and rapid typing stay smooth.
    const timer = window.setTimeout(() => {
      const draft: PoemCreationDraft = {
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
      void draftStore
        .saveDraft(draft)
        .then(refreshDraftList)
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          setAppError(`草稿保存失败：${message}`);
        });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [
    activeDraftId,
    author,
    chars,
    description,
    draftStore,
    genre,
    persistReady,
    rhymeType,
    selectedTune,
    selectedVariant,
    title,
    viewMode,
    refreshDraftList,
  ]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [viewMode]);

  const handleReturnToEntry = useCallback(async () => {
    const current = buildCurrentDraft();
    if (viewMode === 'editor' && current) {
      await draftStore.saveDraft(current);
      await refreshDraftList();
    }
    setViewMode('entry');
    pushRoute({ mode: 'entry' });
  }, [buildCurrentDraft, draftStore, refreshDraftList, viewMode]);

  const handleOpenSettings = useCallback(async () => {
    const current = buildCurrentDraft();
    if (viewMode === 'editor' && current) {
      await draftStore.saveDraft(current);
      await refreshDraftList();
    }
    setViewMode('settings');
    pushRoute({ mode: 'settings' });
  }, [buildCurrentDraft, draftStore, refreshDraftList, viewMode]);

  const handleOpenWorks = useCallback(async () => {
    const current = buildCurrentDraft();
    if (viewMode === 'editor' && current) {
      await draftStore.saveDraft(current);
      await refreshDraftList();
    }
    setViewMode('works');
    pushRoute({ mode: 'works' });
  }, [buildCurrentDraft, draftStore, refreshDraftList, viewMode]);

  const handleOpenTemplateSelection = useCallback(async () => {
    const current = buildCurrentDraft();
    if (viewMode === 'editor' && current) {
      await draftStore.saveDraft(current);
      await refreshDraftList();
    }
    setViewMode('template');
    pushRoute({ mode: 'template' });
  }, [buildCurrentDraft, draftStore, refreshDraftList, viewMode]);

  const handleSettingsChange = useCallback((settings: UserSettings) => {
    setUserSettings(settings);
    saveUserSettings(settings);
  }, []);

  const handleAnalyze = useCallback(
    async (sourceChars = chars) => {
      if (!dict || !selectedVariant || !pattern.length) return;
      const text = sourceChars.map((row) => row.join('')).join('\n');
      if (!text.trim()) return;

      if (!analysisTemplate) return;

      try {
        const { analyzeSync } = await import('@poem/parser/kernel');
        const r = analyzeSync(text, analysisTemplate, dict, {
          variantId: selectedVariant,
        });
        const strictValidation = validateGridStrictly({
          chars: sourceChars,
          pattern,
          dict,
          expectedRhymeTone,
        });
        setAnalyzeResult(formatAnalysisReport(r, strictValidation));
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        setAnalyzeResult(`错误: ${message}`);
      }
    },
    [analysisTemplate, chars, dict, expectedRhymeTone, pattern, selectedVariant],
  );

  const exportPreviewText = useMemo(
    () =>
      formatPoemText({
        title,
        author,
        description,
        chars,
        pattern,
        visualLineGroups,
        sectionBreakBeforeGroups,
      }),
    [
      author,
      chars,
      description,
      pattern,
      sectionBreakBeforeGroups,
      title,
      visualLineGroups,
    ],
  );

  const handleExportText = useCallback(async () => {
    await copyText(exportPreviewText);
    setExportStatus('文字已复制');
    window.setTimeout(() => setExportStatus(''), 1800);
  }, [exportPreviewText]);

  const handleExportDrafts = useCallback(async () => {
    const fullDrafts = await Promise.all(
      drafts.map((draft) => draftStore.loadDraft(draft.id)),
    );
    downloadDraftArchive(
      fullDrafts.filter((draft): draft is PoemCreationDraft => Boolean(draft)),
    );
  }, [draftStore, drafts]);

  const handleImportDrafts = useCallback(
    async (file: File) => {
      try {
        const importedDrafts = await readDraftArchive(file);
        await Promise.all(importedDrafts.map((draft) => draftStore.saveDraft(draft)));
        await refreshDraftList();
        setAppError(`已导入 ${importedDrafts.length} 首作品`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        setAppError(`导入失败：${message}`);
      }
    },
    [draftStore, refreshDraftList],
  );

  const errorMessage = dictError || appError;

  const handleOpenEntry = useCallback(() => {
    if (viewMode === 'editor') {
      void handleReturnToEntry();
      return;
    }
    setViewMode('entry');
    pushRoute({ mode: 'entry' });
  }, [handleReturnToEntry, viewMode]);

  if (viewMode === 'settings') {
    return (
      <AppFrame
        activeView='settings'
        onOpenEntry={handleOpenEntry}
        onOpenWorks={() => void handleOpenWorks()}
        onOpenSettings={() => void handleOpenSettings()}
      >
        <AppNotice message={errorMessage} />
        <SettingsPage
          settings={userSettings}
          onSettingsChange={handleSettingsChange}
          onReturn={() => void handleReturnToEntry()}
        />
      </AppFrame>
    );
  }

  if (viewMode === 'works') {
    return (
      <AppFrame
        activeView='works'
        onOpenEntry={handleOpenEntry}
        onOpenWorks={() => void handleOpenWorks()}
        onOpenSettings={() => void handleOpenSettings()}
      >
        <AppNotice message={errorMessage} />
        <WorksPage
          drafts={drafts}
          onCreateDraft={handleOpenEntry}
          onOpenDraft={(id) => void handleOpenDraft(id)}
          onDeleteDraft={(id) => void handleDeleteDraft(id)}
          onExportDrafts={() => void handleExportDrafts()}
          onImportDrafts={(file) => void handleImportDrafts(file)}
        />
      </AppFrame>
    );
  }

  if (viewMode === 'template') {
    return (
      <AppFrame
        activeView='entry'
        onOpenEntry={handleOpenEntry}
        onOpenWorks={() => void handleOpenWorks()}
        onOpenSettings={() => void handleOpenSettings()}
      >
        <AppNotice message={errorMessage} />
        <TemplateSelectionPage
          genre={entryGenre}
          selectedTune={entrySelectedTune}
          selectedVariant={entrySelectedVariant}
          rhymeType={entryRhymeType}
          templateOptions={templateOptions}
          variantOptions={variantOptions}
          onGenreChange={handleEntryGenreChange}
          onTuneChange={handleEntryTuneChange}
          onVariantChange={setEntrySelectedVariant}
          onRhymeTypeChange={setEntryRhymeType}
          onStartDraft={() => void handleNewDraft()}
          onReturn={handleOpenEntry}
        />
      </AppFrame>
    );
  }

  if (viewMode === 'quickfill') {
    return (
      <AppFrame
        activeView='entry'
        onOpenEntry={handleOpenEntry}
        onOpenWorks={() => void handleOpenWorks()}
        onOpenSettings={() => void handleOpenSettings()}
      >
        <AppNotice message={errorMessage} />
        <QuickFillPage onReturn={handleOpenEntry} />
      </AppFrame>
    );
  }

  if (viewMode === 'entry') {
    return (
      <AppFrame
        activeView='entry'
        onOpenEntry={handleOpenEntry}
        onOpenWorks={() => void handleOpenWorks()}
        onOpenSettings={() => void handleOpenSettings()}
      >
        <AppNotice message={errorMessage} />
        <EntryPage
          drafts={drafts}
          onStartWithTemplate={(nextGenre, tuneName) =>
            void handleNewDraftFromTemplate(nextGenre, tuneName)
          }
          onOpenTemplateSelection={() => void handleOpenTemplateSelection()}
          onOpenWorks={() => void handleOpenWorks()}
          onOpenDraft={(id) => void handleOpenDraft(id)}
          onDeleteDraft={(id) => void handleDeleteDraft(id)}
        />
      </AppFrame>
    );
  }

  return (
    <AppFrame
      activeView='editor'
      onOpenEntry={handleOpenEntry}
      onOpenWorks={() => void handleOpenWorks()}
      onOpenSettings={() => void handleOpenSettings()}
    >
      <AppNotice message={errorMessage} />
      <EditorPage
        activeDraftId={activeDraftId}
        draftRevision={draftRevision}
        genre={genre}
        selectedTune={selectedTune}
        selectedVariant={selectedVariant}
        selectedVariantLabel={selectedVariantLabel}
        rhymeType={rhymeType}
        title={title}
        description={description}
        author={author}
        chars={chars}
        dict={dict}
        pattern={pattern}
        expectedRhymeTone={expectedRhymeTone}
        visualLineGroups={visualLineGroups}
        sectionBreakBeforeGroups={sectionBreakBeforeGroups}
        analyzeResult={analyzeResult}
        errorMessage={errorMessage}
        exportStatus={exportStatus}
        exportPreviewText={exportPreviewText}
        exportPreviewOpen={exportPreviewOpen}
        persistReady={persistReady}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onAuthorChange={setAuthor}
        onCharsChange={setChars}
        onAnalyze={(nextChars) => void handleAnalyze(nextChars)}
        onOpenExportPreview={() => setExportPreviewOpen(true)}
        onCloseExportPreview={() => setExportPreviewOpen(false)}
        onCopyExportText={() => void handleExportText()}
        onReturn={() => void handleReturnToEntry()}
      />
    </AppFrame>
  );
}
