import { useState, useMemo, useEffect, useCallback } from 'react';
import { analyzeSync, RhymeDictType } from '@poem/parser/kernel';
import { createPoemLayoutDocument } from '@poem/layout-core';
import { createExportTemplateStore } from './persist';
import type { Genre } from './constants/poem';
import { AppFrame } from './components/AppFrame';
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
import { useDraftManager } from './hooks/useDraftManager';
import { formatAnalysisReport } from './utils/analysisReport';
import { createEmptyDraft } from './utils/draft';
import { copyText, formatPoemText } from './utils/exportText';
import type { UserExportTemplate } from './utils/exportTemplates';
import { validateGridStrictly } from './utils/strictGridValidation';
import type { StrictCharIssue } from './utils/strictGridValidation';
import { pushRoute, readRoute, replaceRoute } from './utils/routing';
import type { AppRoute } from './utils/routing';
import {
  loadUserSettings,
  saveUserSettings,
} from './utils/settings';
import type { UserSettings } from './utils/settings';
import './style.css';

type ViewMode = AppRoute['mode'];
type FrameActiveView = 'entry' | 'works' | 'editor' | 'template-designer' | 'settings';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('entry');
  const [entryGenre, setEntryGenre] = useState<Genre>('meter');
  const [entrySelectedTune, setEntrySelectedTune] = useState('');
  const [entrySelectedVariant, setEntrySelectedVariant] = useState('');
  const [entryRhymeType, setEntryRhymeType] = useState<RhymeDictType>(
    RhymeDictType.Pingshui,
  );
  const [userSettings, setUserSettings] = useState<UserSettings>(
    () => loadUserSettings(),
  );
  const [userExportTemplates, setUserExportTemplates] = useState<UserExportTemplate[]>([]);
  const [analyzeResult, setAnalyzeResult] = useState('');
  const [analysisIssues, setAnalysisIssues] = useState<StrictCharIssue[]>([]);
  const [appError, setAppError] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const [persistReady, setPersistReady] = useState(false);
  const exportTemplateStore = useMemo(() => createExportTemplateStore(), []);

  const navigateTo = useCallback((route: AppRoute) => {
    setViewMode(route.mode);
    pushRoute(route);
  }, []);

  const entrySelection = useMemo(
    () => ({
      genre: entryGenre,
      selectedTune: entrySelectedTune,
      selectedVariant: entrySelectedVariant,
      rhymeType: entryRhymeType,
    }),
    [entryGenre, entrySelectedTune, entrySelectedVariant, entryRhymeType],
  );

  const resetAnalysis = useCallback(() => setAnalyzeResult(''), []);

  const {
    drafts,
    setDrafts,
    activeDraftId,
    draftRevision,
    saveStatus,
    setSaveStatus,
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
    setChars,
    applyDraft,
    persistIfEditing,
    newDraft: handleNewDraft,
    openDraft: handleOpenDraft,
    deleteDraft: handleDeleteDraft,
    recognize: handleRecognizeQuickFill,
    importDrafts: handleImportDrafts,
    exportDrafts: handleExportDrafts,
    loadDraft,
    loadActiveDraftId,
    listDrafts,
    setActiveDraftIdInStore,
  } = useDraftManager({
    persistence: userSettings.persistence,
    defaultAuthor: userSettings.defaultAuthor,
    viewMode,
    persistReady,
    navigateTo,
    onError: setAppError,
    onDraftApplied: resetAnalysis,
    entrySelection,
  });

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

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [activeId, summaries] = await Promise.all([
          loadActiveDraftId(),
          listDrafts(),
        ]);
        if (!alive) return;
        setDrafts(summaries);

        // On a static host the URL hash is the source of truth for whether the
        // user should land in the entry screen or a specific draft editor.
        const route = readRoute();
        // 除 editor（需异步加载草稿）外，其余无草稿视图直接落位即可。
        // entry 例外：它会走下方 fallback 逻辑挑选/新建草稿。
        if (route.mode !== 'entry' && route.mode !== 'editor') {
          setViewMode(route.mode);
          setPersistReady(true);
          return;
        }

        if (route.mode === 'editor') {
          const draft = await loadDraft(route.draftId);
          if (!alive) return;
          if (draft?.schemaVersion === 1) {
            applyDraft(draft);
            await setActiveDraftIdInStore(route.draftId);
            setViewMode('editor');
            setPersistReady(true);
            return;
          }
          replaceRoute({ mode: 'entry' });
        }

        let fallbackDraft = activeId ? await loadDraft(activeId) : null;
        if (
          !fallbackDraft &&
          summaries[0]?.id &&
          summaries[0].id !== activeId
        ) {
          fallbackDraft = await loadDraft(summaries[0].id);
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
  }, [
    applyDraft,
    listDrafts,
    loadActiveDraftId,
    loadDraft,
    setActiveDraftIdInStore,
    setDrafts,
  ]);

  useEffect(() => {
    const handlePopState = () => {
      const route = readRoute();
      // 只有 editor 需要异步加载草稿，其余视图直接落位。
      if (route.mode !== 'editor') {
        setViewMode(route.mode);
        return;
      }

      void loadDraft(route.draftId).then((draft) => {
        if (!draft) {
          setViewMode('entry');
          replaceRoute({ mode: 'entry' });
          return;
        }
        applyDraft(draft);
        setViewMode('editor');
        void setActiveDraftIdInStore(route.draftId);
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [applyDraft, loadDraft, setActiveDraftIdInStore]);

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

  const handleSettingsChange = useCallback((settings: UserSettings) => {
    setUserSettings(settings);
    setSaveStatus('saved');
    saveUserSettings(settings);
  }, [setSaveStatus]);

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
