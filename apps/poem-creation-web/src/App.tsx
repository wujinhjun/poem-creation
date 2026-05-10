import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { listAllTemplates, findCiTune } from '@poem/parser/catalog';
import { loadMeterTemplates, Tone } from '@poem/parser/kernel';
import type { ToneConstraint, CiTemplate } from '@poem/parser/kernel';
import { RhymeDictType } from '@poem/parser/kernel';
import { createBrowserDict } from './utils/rhymeDict.ts';
import type { RhymeDict } from '@poem/parser/kernel';
import { IndexedDbDraftStore } from './persist';
import type { PoemCreationDraft, PoemCreationDraftSummary } from './persist';
import type { Genre } from './constants/poem';
import { EntryPage } from './components/EntryPage';
import { EditorPage } from './components/EditorPage';
import { SettingsPage } from './components/SettingsPage';
import type { SelectOption } from './components/CustomSelect';
import { createEmptyDraft, normalizeDraft } from './utils/draft';
import { copyText, formatPoemText } from './utils/exportText';
import {
  ciPatternForEditor,
  inferCiRhymeTone,
  loadCiBundle,
} from './utils/ciTemplate';
import { pushRoute, readRoute, replaceRoute } from './utils/routing';
import {
  loadUserSettings,
  saveUserSettings,
} from './utils/settings';
import type { UserSettings } from './utils/settings';
import './style.css';

const allTemplates = listAllTemplates();
const meterMap = new Map(loadMeterTemplates().map((t) => [t.id, t]));
const draftStore = new IndexedDbDraftStore();

function pairLineGroups(pattern: ToneConstraint[][]): number[][] {
  const groups: number[][] = [];
  for (let index = 0; index < pattern.length; index += 2) {
    groups.push(
      index + 1 < pattern.length ? [index, index + 1] : [index],
    );
  }
  return groups;
}

function variantSummary(genre: Genre, tuneName: string, variantId: string): string {
  if (!variantId) return '';
  const template = allTemplates.find(
    (entry) => entry.genre === genre && entry.name === tuneName,
  );
  const variant = template?.variants.find((item) => item.id === variantId);
  if (!variant) return variantId;
  if (genre === 'meter') {
    return `${variant.rhymeFirst ? '首句押韵' : '首句不押韵'} · ${variant.author}`;
  }
  return `${variant.author} · ${variant.sketch}`;
}

export default function App() {
  const [viewMode, setViewMode] = useState<'entry' | 'editor' | 'settings'>(
    'entry',
  );
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
  const [dictState, setDictState] = useState<{
    type: RhymeDictType;
    dict: RhymeDict;
  } | null>(null);
  const [chars, setChars] = useState<string[][]>([]);
  const [analyzeResult, setAnalyzeResult] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const [persistReady, setPersistReady] = useState(false);
  const [ciPatternState, setCiPatternState] = useState<{
    key: string;
    pattern: ToneConstraint[][];
    visualLineGroups: number[][];
    sectionBreakBeforeGroups: number[];
  } | null>(null);
  const ciBundleRef = useRef<Record<string, CiTemplate> | null>(null);
  const dict = dictState?.type === rhymeType ? dictState.dict : null;

  // Applying a draft is the only place that hydrates editor state from storage.
  // Keeping it centralized prevents route/list actions from drifting apart.
  const applyDraft = useCallback((sourceDraft: PoemCreationDraft) => {
    const draft = normalizeDraft(sourceDraft, allTemplates);
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
  }, []);

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
    entryGenre,
    entryRhymeType,
    entrySelectedTune,
    entrySelectedVariant,
    persistReady,
    refreshDraftList,
    userSettings.defaultAuthor,
    viewMode,
  ]);

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
    [applyDraft, buildCurrentDraft, persistReady, refreshDraftList, viewMode],
  );

  const handleDeleteDraft = useCallback(
    async (id: string) => {
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
    [activeDraftId, applyDraft, refreshDraftList, viewMode],
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
      } catch {
        if (!alive) return;
        applyDraft(createEmptyDraft());
        setPersistReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [applyDraft]);

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
  }, [applyDraft]);

  useEffect(() => {
    if (!persistReady || !activeDraftId || viewMode !== 'editor') return;
    // Debounce IndexedDB writes so IME composition and rapid typing stay smooth.
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
      void draftStore.saveDraft(draft).then(refreshDraftList);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [
    activeDraftId,
    author,
    chars,
    description,
    genre,
    persistReady,
    rhymeType,
    selectedTune,
    selectedVariant,
    title,
    viewMode,
    refreshDraftList,
  ]);

  const handleReturnToEntry = useCallback(async () => {
    const current = buildCurrentDraft();
    if (viewMode === 'editor' && current) {
      await draftStore.saveDraft(current);
      await refreshDraftList();
    }
    setViewMode('entry');
    pushRoute({ mode: 'entry' });
  }, [buildCurrentDraft, refreshDraftList, viewMode]);

  const handleOpenSettings = useCallback(async () => {
    const current = buildCurrentDraft();
    if (viewMode === 'editor' && current) {
      await draftStore.saveDraft(current);
      await refreshDraftList();
    }
    setViewMode('settings');
    pushRoute({ mode: 'settings' });
  }, [buildCurrentDraft, refreshDraftList, viewMode]);

  const handleSettingsChange = useCallback((settings: UserSettings) => {
    setUserSettings(settings);
    saveUserSettings(settings);
  }, []);

  // 加载浏览器韵书
  useEffect(() => {
    let alive = true;
    createBrowserDict(rhymeType).then((loadedDict) => {
      if (alive) setDictState({ type: rhymeType, dict: loadedDict });
    });
    return () => {
      alive = false;
    };
  }, [rhymeType]);

  const meterOptions = useMemo(
    () => allTemplates.filter((t) => t.genre === 'meter'),
    [],
  );
  const ciOptions = useMemo(
    () => allTemplates.filter((t) => t.genre === 'ci'),
    [],
  );
  const entryCurrentTemplates =
    entryGenre === 'meter' ? meterOptions : ciOptions;
  const entrySelectedCatalog = entryCurrentTemplates.find(
    (t) => t.name === entrySelectedTune,
  );
  const entryTuneDetail =
    entryGenre === 'ci' ? findCiTune(entrySelectedTune) : undefined;
  const editorTuneDetail =
    genre === 'ci' ? findCiTune(selectedTune) : undefined;
  const selectedCiVariant = editorTuneDetail?.variants.find(
    (v) => v.id === selectedVariant,
  );
  const templateOptions = useMemo<SelectOption<string>[]>(
    () =>
      entryCurrentTemplates.map((t) => ({
        value: t.name,
        label: `${t.name}（${t.variantCount} 体）`,
      })),
    [entryCurrentTemplates],
  );
  const variantOptions = useMemo<SelectOption<string>[]>(() => {
    if (entryGenre === 'ci' && entryTuneDetail) {
      return entryTuneDetail.variants.map((v) => ({
        value: v.id,
        label: `${v.author} · ${v.sketch}（${v.charCount}字）`,
      }));
    }

    if (entryGenre === 'meter' && entrySelectedCatalog) {
      return entrySelectedCatalog.variants.map((v) => ({
        value: v.id,
        label: `${v.rhymeFirst ? '首句押韵' : '首句不押韵'} · ${v.author}`,
      }));
    }

    return [];
  }, [entryGenre, entrySelectedCatalog, entryTuneDetail]);

  // ci 变体变化时加载完整格律
  useEffect(() => {
    if (genre !== 'ci' || !selectedVariant) return;
    const key = `${selectedTune}::${selectedVariant}`;
    let alive = true;
    (async () => {
      const bundle = await loadCiBundle();
      ciBundleRef.current = bundle;
      const tune = bundle[selectedTune];
      if (!tune) return;
      const patternForEditor = ciPatternForEditor(tune, selectedVariant);
      if (alive)
        setCiPatternState({
          key,
          pattern: patternForEditor.lines,
          visualLineGroups: patternForEditor.rhymeGroups,
          sectionBreakBeforeGroups: patternForEditor.sectionBreaks,
        });
    })();
    return () => {
      alive = false;
    };
  }, [genre, selectedTune, selectedVariant]);

  // 获取当前模板的 pattern
  const pattern: ToneConstraint[][] = useMemo(() => {
    if (!selectedVariant) return [];
    if (genre === 'meter') {
      const t = meterMap.get(selectedVariant);
      return t?.pattern ?? [];
    }
    const key = `${selectedTune}::${selectedVariant}`;
    return ciPatternState?.key === key ? ciPatternState.pattern : [];
  }, [genre, selectedTune, selectedVariant, ciPatternState]);

  const expectedRhymeTone = useMemo(() => {
    if (genre === 'meter') return Tone.Ping;
    if (!selectedCiVariant) return null;
    return inferCiRhymeTone(
      `${selectedCiVariant.author} ${selectedCiVariant.sketch}`,
    );
  }, [genre, selectedCiVariant]);

  const visualLineGroups = useMemo(() => {
    if (!selectedVariant) return [];
    if (genre === 'meter') return pairLineGroups(pattern);
    const key = `${selectedTune}::${selectedVariant}`;
    return ciPatternState?.key === key
      ? ciPatternState.visualLineGroups
      : [];
  }, [ciPatternState, genre, pattern, selectedTune, selectedVariant]);

  const sectionBreakBeforeGroups = useMemo(() => {
    if (genre !== 'ci' || !selectedVariant) return [];
    const key = `${selectedTune}::${selectedVariant}`;
    return ciPatternState?.key === key
      ? ciPatternState.sectionBreakBeforeGroups
      : [];
  }, [ciPatternState, genre, selectedTune, selectedVariant]);

  const selectedVariantLabel = useMemo(
    () => variantSummary(genre, selectedTune, selectedVariant),
    [genre, selectedTune, selectedVariant],
  );

  const handleAnalyze = useCallback(
    async (sourceChars = chars) => {
      if (!dict || !selectedVariant || !pattern.length) return;
      const text = sourceChars.map((row) => row.join('')).join('\n');
      if (!text.trim()) return;

      const tpl =
        genre === 'meter'
          ? meterMap.get(selectedVariant)
          : ciBundleRef.current?.[selectedTune];
      if (!tpl) return;

      try {
        const { analyzeSync } = await import('@poem/parser/kernel');
        const r = analyzeSync(text, tpl, dict, { variantId: selectedVariant });
        setAnalyzeResult(
          `合律率: ${(r.complianceRate * 100).toFixed(0)}% | ` +
            `完全合律: ${r.fullyCompliant ? '是' : '否'} | ` +
            `多音字: ${r.ambiguities.map((a) => a.char).join(', ') || '无'}`,
        );
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        setAnalyzeResult(`错误: ${message}`);
      }
    },
    [dict, selectedVariant, chars, pattern, genre, selectedTune],
  );

  const exportPreviewText = useMemo(
    () =>
      formatPoemText({
        title,
        author,
        description,
        genre,
        selectedTune,
        chars,
        pattern,
      }),
    [author, chars, description, genre, pattern, selectedTune, title],
  );

  const handleEntryGenreChange = useCallback((nextGenre: Genre) => {
    setEntryGenre(nextGenre);
    setEntrySelectedTune('');
    setEntrySelectedVariant('');
    setEntryRhymeType(
      nextGenre === 'meter' ? RhymeDictType.Pingshui : RhymeDictType.Cilin,
    );
  }, []);

  const handleEntryTuneChange = useCallback(
    (nextTune: string) => {
      setEntrySelectedTune(nextTune);
      const templates = entryGenre === 'meter' ? meterOptions : ciOptions;
      const nextVariant =
        templates.find((template) => template.name === nextTune)?.variants[0]
          ?.id ?? '';
      setEntrySelectedVariant(nextVariant);
    },
    [ciOptions, entryGenre, meterOptions],
  );

  const handleExportText = useCallback(async () => {
    await copyText(exportPreviewText);
    setExportStatus('文字已复制');
    window.setTimeout(() => setExportStatus(''), 1800);
  }, [exportPreviewText]);

  if (viewMode === 'settings') {
    return (
      <SettingsPage
        settings={userSettings}
        onSettingsChange={handleSettingsChange}
        onReturn={() => void handleReturnToEntry()}
      />
    );
  }

  if (viewMode === 'entry') {
    return (
      <EntryPage
        genre={entryGenre}
        selectedTune={entrySelectedTune}
        selectedVariant={entrySelectedVariant}
        rhymeType={entryRhymeType}
        templateOptions={templateOptions}
        variantOptions={variantOptions}
        drafts={drafts}
        onGenreChange={handleEntryGenreChange}
        onTuneChange={handleEntryTuneChange}
        onVariantChange={setEntrySelectedVariant}
        onRhymeTypeChange={setEntryRhymeType}
        onStartDraft={() => void handleNewDraft()}
        onOpenDraft={(id) => void handleOpenDraft(id)}
        onDeleteDraft={(id) => void handleDeleteDraft(id)}
        onOpenSettings={() => void handleOpenSettings()}
      />
    );
  }

  return (
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
  );
}
