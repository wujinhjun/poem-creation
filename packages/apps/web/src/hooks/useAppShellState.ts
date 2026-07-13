import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { analyzeSync, RhymeDictType } from '@poem/parser/kernel';
import { createPoemLayoutDocument } from '@poem/layout-core';
import type { Genre } from '../constants/poem';
import { useBrowserDict } from './useBrowserDict';
import { useEditorPattern } from './useEditorPattern';
import { useEntrySelection } from './useEntrySelection';
import { useDraftManager } from './useDraftManager';
import { formatAnalysisReport } from '../utils/analysisReport';
import { copyText, formatPoemText } from '../utils/exportText';
import type { UserExportTemplate } from '../utils/exportTemplates';
import { validateGridStrictly } from '../utils/strictGridValidation';
import type { StrictCharIssue } from '../utils/strictGridValidation';
import { pathnameToMode } from '../utils/routing';
import type { AppRoute } from '../utils/routing';
import { createExportTemplateStore } from '../persist';
import {
  loadUserSettings,
  saveUserSettings,
} from '../utils/settings';
import type { UserSettings } from '../utils/settings';

type FrameActiveView = 'entry' | 'works' | 'editor' | 'template-designer' | 'settings';

/**
 * App 外壳的全部状态与编排逻辑。原 App.tsx 主体搬到这里，配合 TanStack Router：
 * - viewMode 从当前路由派生（不再是独立 state）
 * - navigateTo 适配到 router.navigate
 * - 编辑器草稿的深链加载移交给 EditorRoute（见 routes.tsx）
 *
 * 返回值即 AppStateContext 的载荷，供各路由组件消费。
 */
export function useAppShellState() {
  const navigate = useNavigate();
  const viewMode = useRouterState({
    select: (s) => pathnameToMode(s.location.pathname),
  });

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

  const navigateTo = useCallback(
    (route: AppRoute) => {
      switch (route.mode) {
        case 'editor':
          void navigate({ to: '/edit/$draftId', params: { draftId: route.draftId } });
          return;
        case 'template':
          void navigate({ to: '/new' });
          return;
        case 'quickfill':
          void navigate({ to: '/quickfill' });
          return;
        case 'works':
          void navigate({ to: '/works' });
          return;
        case 'template-designer':
          void navigate({ to: '/export-templates' });
          return;
        case 'settings':
          void navigate({ to: '/settings' });
          return;
        default:
          void navigate({ to: '/' });
      }
    },
    [navigate],
  );

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
    newDraft,
    openDraft,
    deleteDraft,
    recognize,
    importDrafts,
    exportDrafts,
    loadDraft,
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

  // 首屏：加载草稿列表并放行持久化。具体视图由路由决定，编辑器草稿由 EditorRoute
  // 自行深链加载，因此这里不再做旧 bootstrap 的“回落套用某草稿到编辑态”。
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const summaries = await listDrafts();
        if (alive) setDrafts(summaries);
      } catch (error: unknown) {
        if (!alive) return;
        const message = error instanceof Error ? error.message : String(error);
        setAppError(`草稿加载失败：${message}`);
      } finally {
        if (alive) setPersistReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [listDrafts, setDrafts]);

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

  const handleSettingsChange = useCallback(
    (settings: UserSettings) => {
      setUserSettings(settings);
      setSaveStatus('saved');
      saveUserSettings(settings);
    },
    [setSaveStatus],
  );

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

  return {
    // layout / frame
    activeFrameView,
    framePersistenceMode,
    saveStatus,
    errorMessage,
    onOpenEntry: handleOpenEntry,
    onOpenWorks: handleOpenWorks,
    onOpenTemplateDesigner: handleOpenTemplateDesigner,
    onOpenSettings: handleOpenSettings,
    onReturnToEntry: handleReturnToEntry,

    // entry / works
    drafts,
    onOpenQuickFill: handleOpenQuickFill,
    onOpenTemplateSelection: handleOpenTemplateSelection,
    onOpenDraft: openDraft,
    onDeleteDraft: deleteDraft,
    onExportDrafts: exportDrafts,
    onImportDrafts: importDrafts,

    // settings
    userSettings,
    onSettingsChange: handleSettingsChange,

    // template designer
    userExportTemplates,
    onUserExportTemplatesChange: handleUserExportTemplatesChange,

    // template selection
    entryGenre,
    entrySelectedTune,
    entrySelectedVariant,
    entryRhymeType,
    templateOptions,
    variantOptions,
    onEntryGenreChange: handleEntryGenreChange,
    onEntryTuneChange: handleEntryTuneChange,
    onEntryVariantChange: setEntrySelectedVariant,
    onEntryRhymeTypeChange: setEntryRhymeType,
    onStartDraft: newDraft,

    // quickfill
    onRecognize: recognize,

    // editor
    activeDraftId,
    draftRevision,
    genre,
    selectedTune,
    selectedVariant,
    selectedVariantLabel,
    rhymeType,
    title,
    description,
    author,
    chars,
    dict,
    pattern,
    expectedRhymeTone,
    visualLineGroups,
    sectionBreakBeforeGroups,
    analyzeResult,
    analysisIssues,
    exportStatus,
    exportPreviewDocument,
    exportPreviewOpen,
    persistReady,
    onTitleChange: setTitle,
    onDescriptionChange: setDescription,
    onAuthorChange: setAuthor,
    onCharsChange: setChars,
    onAnalyze: handleAnalyze,
    onOpenExportPreview: () => setExportPreviewOpen(true),
    onCloseExportPreview: () => setExportPreviewOpen(false),
    onCopyExportText: handleExportText,

    // editor deep-link loading (used by EditorRoute)
    navigateTo,
    applyDraft,
    loadDraft,
    setActiveDraftIdInStore,
  };
}
