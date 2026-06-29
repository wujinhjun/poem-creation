import { useState, useMemo, useEffect, useCallback } from 'react';
import { analyzeSync, RhymeDictType } from '@poem/parser/kernel';
import { createPoemLayoutDocument } from '@poem/layout-core';
import { identifyQuickFill } from '@poem/poem-kit';
import type { QuickFillCandidate } from '@poem/poem-kit';
import { createDraftStore, createExportTemplateStore } from './persist';
import type { PoemCreationDraft, PoemCreationDraftSummary } from './persist';
import type { Genre } from './constants/poem';
import { AppFrame } from './components/AppFrame';
import type { SaveStatus } from './components/AppFrame';
import { AppNotice } from './components/AppNotice';
import { EntryPage } from './components/EntryPage';
import { EditorPage } from './components/EditorPage';
import { QuickFillPage } from './components/QuickFillPage';
import { SettingsPage } from './components/SettingsPage';
import { TemplateDesignerPage } from './components/TemplateDesignerPage';
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
import type { UserExportTemplate } from './utils/exportTemplates';
import { validateGridStrictly } from './utils/strictGridValidation';
import type { StrictCharIssue } from './utils/strictGridValidation';
import { pushRoute, readRoute, replaceRoute } from './utils/routing';
import type { AppRoute } from './utils/routing';
import { loadCiBundle } from './utils/ciTemplate';
import { createBrowserDict } from './utils/rhymeDict';
import { getAllTemplates } from '@poem/poem-kit';
import {
  loadUserSettings,
  saveUserSettings,
} from './utils/settings';
import type { UserSettings } from './utils/settings';
import './style.css';

type ViewMode = AppRoute['mode'];
type FrameActiveView = 'entry' | 'works' | 'editor' | 'template-designer' | 'settings';

const QUICKFILL_MIN_CONFIDENCE = 0.55;

type QuickFillRecognitionInput = {
  title: string;
  author: string;
  lines: string[];
};

function quickFillInputText(lines: string[]): string {
  return lines.map((line) => line.trim()).filter(Boolean).join('\n');
}

function candidateRhymeType(candidate: QuickFillCandidate): RhymeDictType {
  return candidate.genre === 'ci' ? RhymeDictType.Cilin : RhymeDictType.Pingshui;
}

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('entry');
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
  const [userExportTemplates, setUserExportTemplates] = useState<UserExportTemplate[]>([]);
  const [activeDraftId, setActiveDraftId] = useState('');
  const [draftRevision, setDraftRevision] = useState(0);
  const [drafts, setDrafts] = useState<PoemCreationDraftSummary[]>([]);
  const [chars, setChars] = useState<string[][]>([]);
  const [analyzeResult, setAnalyzeResult] = useState('');
  const [analysisIssues, setAnalysisIssues] = useState<StrictCharIssue[]>([]);
  const [appError, setAppError] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [exportStatus, setExportStatus] = useState('');
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const [persistReady, setPersistReady] = useState(false);
  const draftStore = useMemo(
    () => createDraftStore(userSettings.persistence),
    [userSettings.persistence],
  );
  const exportTemplateStore = useMemo(() => createExportTemplateStore(), []);
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

  const navigateTo = useCallback((route: AppRoute) => {
    setViewMode(route.mode);
    pushRoute(route);
  }, []);

  const handleUserExportTemplatesChange = useCallback(
    (templates: UserExportTemplate[]) => {
      setUserExportTemplates(templates);
    },
    [],
  );

  useEffect(() => {
    if (userExportTemplates.length === 0) return;
    const timer = window.setTimeout(() => {
      void exportTemplateStore.saveTemplates(userExportTemplates).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        setAppError(`导出版式保存失败：${message}`);
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [exportTemplateStore, userExportTemplates]);

  useEffect(() => {
    let alive = true;
    void exportTemplateStore
      .listTemplates()
      .then((templates) => {
        if (alive) setUserExportTemplates(templates);
      })
      .catch((error: unknown) => {
        if (!alive) return;
        const message = error instanceof Error ? error.message : String(error);
        setAppError(`导出版式加载失败：${message}`);
      });

    return () => {
      alive = false;
    };
  }, [exportTemplateStore]);

  const handleNewDraft = useCallback(async () => {
    await persistIfEditing();
    const nextDraft = {
      ...createEmptyDraft(),
      title: entrySelectedTune,
      author: userSettings.defaultAuthor,
      genre: entryGenre,
      selectedTune: entrySelectedTune,
      selectedVariant: entrySelectedVariant,
      rhymeType: entryRhymeType,
    };
    await draftStore.saveDraft(nextDraft);
    applyDraft(nextDraft);
    await refreshDraftList();
    navigateTo({ mode: 'editor', draftId: nextDraft.id });
  }, [
    applyDraft,
    draftStore,
    entryGenre,
    entryRhymeType,
    entrySelectedTune,
    entrySelectedVariant,
    navigateTo,
    persistIfEditing,
    refreshDraftList,
    userSettings.defaultAuthor,
  ]);

  const handleOpenDraft = useCallback(
    async (id: string) => {
      await persistIfEditing();
      const draft = await draftStore.loadDraft(id);
      if (!draft) return;
      applyDraft(draft);
      await draftStore.setActiveDraftId(id);
      await refreshDraftList();
      navigateTo({ mode: 'editor', draftId: id });
    },
    [
      applyDraft,
      draftStore,
      navigateTo,
      persistIfEditing,
      refreshDraftList,
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
        if (route.mode === 'template-designer') {
          setViewMode('template-designer');
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
      if (route.mode === 'template-designer') {
        setViewMode('template-designer');
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
    return () => {
      window.removeEventListener('popstate', handlePopState);
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
    await persistIfEditing();
    navigateTo({ mode: 'entry' });
  }, [navigateTo, persistIfEditing]);

  const handleOpenSettings = useCallback(async () => {
    await persistIfEditing();
    navigateTo({ mode: 'settings' });
  }, [navigateTo, persistIfEditing]);

  const handleOpenTemplateDesigner = useCallback(async () => {
    await persistIfEditing();
    navigateTo({ mode: 'template-designer' });
  }, [navigateTo, persistIfEditing]);

  const handleOpenWorks = useCallback(async () => {
    await persistIfEditing();
    navigateTo({ mode: 'works' });
  }, [navigateTo, persistIfEditing]);

  const handleOpenTemplateSelection = useCallback(async () => {
    await persistIfEditing();
    navigateTo({ mode: 'template' });
  }, [navigateTo, persistIfEditing]);

  const handleOpenQuickFill = useCallback(async () => {
    await persistIfEditing();
    navigateTo({ mode: 'quickfill' });
  }, [navigateTo, persistIfEditing]);

  const handleRecognizeQuickFill = useCallback(
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
        author: input.author.trim() || userSettings.defaultAuthor,
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
      setAppError(
        `已识别为${best.tuneName} · ${best.variantName}（置信度 ${Math.round(best.confidence * 100)}%）`,
      );
    },
    [
      applyDraft,
      draftStore,
      navigateTo,
      refreshDraftList,
      userSettings.defaultAuthor,
    ],
  );

  const handleSettingsChange = useCallback((settings: UserSettings) => {
    setUserSettings(settings);
    setSaveStatus('saved');
    saveUserSettings(settings);
  }, []);

  const handleAnalyze = useCallback(
    async (sourceChars = chars) => {
      if (!dict || !selectedVariant || !pattern.length) return;
      const text = sourceChars.map((row) => row.join('')).join('\n');
      if (!text.trim()) return;

      if (!analysisTemplate) return;

      try {
        const r = analyzeSync(text, analysisTemplate, dict, {
          variantId: selectedVariant,
        });
        const strictValidation = validateGridStrictly({
          chars: sourceChars,
          pattern,
          dict,
          expectedRhymeTone,
        });
        setAnalysisIssues(strictValidation.issues);
        setAnalyzeResult(formatAnalysisReport(r, strictValidation));
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        setAnalysisIssues([]);
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

  const exportPreviewDocument = useMemo(
    () =>
      createPoemLayoutDocument({
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
  const framePersistenceMode = userSettings.persistence.mode;

  const handleOpenEntry = useCallback(() => {
    if (viewMode === 'editor') {
      void handleReturnToEntry();
      return;
    }
    navigateTo({ mode: 'entry' });
  }, [handleReturnToEntry, navigateTo, viewMode]);

  const activeFrameView: FrameActiveView =
    viewMode === 'works' ||
    viewMode === 'settings' ||
    viewMode === 'template-designer' ||
    viewMode === 'editor'
      ? viewMode
      : 'entry';

  let pageContent;
  if (viewMode === 'settings') {
    pageContent = (
      <SettingsPage
        settings={userSettings}
        onSettingsChange={handleSettingsChange}
        onReturn={() => void handleReturnToEntry()}
      />
    );
  } else if (viewMode === 'template-designer') {
    pageContent = (
      <TemplateDesignerPage
        templates={userExportTemplates}
        onTemplatesChange={handleUserExportTemplatesChange}
        onReturn={() => void handleReturnToEntry()}
      />
    );
  } else if (viewMode === 'works') {
    pageContent = (
      <WorksPage
        drafts={drafts}
        persistenceMode={framePersistenceMode}
        onCreateDraft={handleOpenEntry}
        onOpenQuickFill={() => void handleOpenQuickFill()}
        onOpenDraft={(id) => void handleOpenDraft(id)}
        onDeleteDraft={(id) => void handleDeleteDraft(id)}
        onExportDrafts={() => void handleExportDrafts()}
        onImportDrafts={(file) => void handleImportDrafts(file)}
      />
    );
  } else if (viewMode === 'template') {
    pageContent = (
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
    );
  } else if (viewMode === 'quickfill') {
    pageContent = (
      <QuickFillPage
        onRecognize={handleRecognizeQuickFill}
        onReturn={handleOpenEntry}
      />
    );
  } else if (viewMode === 'entry') {
    pageContent = (
      <EntryPage
        drafts={drafts}
        persistenceMode={framePersistenceMode}
        onOpenQuickFill={() => void handleOpenQuickFill()}
        onOpenTemplateSelection={() => void handleOpenTemplateSelection()}
        onOpenWorks={() => void handleOpenWorks()}
        onOpenDraft={(id) => void handleOpenDraft(id)}
        onDeleteDraft={(id) => void handleDeleteDraft(id)}
      />
    );
  } else {
    pageContent = (
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
        analysisIssues={analysisIssues}
        errorMessage={errorMessage}
        exportStatus={exportStatus}
        exportPreviewDocument={exportPreviewDocument}
        exportPreviewOpen={exportPreviewOpen}
        userExportTemplates={userExportTemplates}
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
    );
  }

  return (
    <AppFrame
      activeView={activeFrameView}
      persistenceMode={framePersistenceMode}
      saveStatus={saveStatus}
      onOpenEntry={handleOpenEntry}
      onOpenWorks={() => void handleOpenWorks()}
      onOpenTemplateDesigner={() => void handleOpenTemplateDesigner()}
      onOpenSettings={() => void handleOpenSettings()}
    >
      <AppNotice message={errorMessage} />
      {pageContent}
    </AppFrame>
  );
}
