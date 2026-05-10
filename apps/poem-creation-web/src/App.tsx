import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { listAllTemplates, findCiTune } from '@poem/parser/catalog';
import { loadMeterTemplates, Tone } from '@poem/parser/kernel';
import type { ToneConstraint, CiTemplate } from '@poem/parser/kernel';
import { RhymeDictType } from '@poem/parser/kernel';
import { createBrowserDict } from './rhymeDict.ts';
import type { RhymeDict } from '@poem/parser/kernel';
import Composer from './Composer.tsx';
import { IndexedDbDraftStore } from './persist';
import type { PoemCreationDraft, PoemCreationDraftSummary } from './persist';
import heroImage from './assets/hero.png';
import './style.css';

const RHYME_OPTIONS = [
  { value: RhymeDictType.Pingshui, label: '平水韵' },
  { value: RhymeDictType.Cilin, label: '词林正韵' },
  { value: RhymeDictType.Zhonghua, label: '中华新韵' },
] as const;

type SelectOption<T extends string> = {
  value: T;
  label: string;
};

type AppRoute = { mode: 'entry' } | { mode: 'editor'; draftId: string };

function CustomSelect<T extends string>({
  value,
  options,
  placeholder,
  searchable = false,
  searchPlaceholder = '搜索',
  onChange,
}: {
  value: T | '';
  options: SelectOption<T>[];
  placeholder: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  onChange: (value: T | '') => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const selected = options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(keyword) ||
        option.value.toLowerCase().includes(keyword),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open && searchable)
      requestAnimationFrame(() => searchRef.current?.focus());
  }, [open, searchable]);

  return (
    <div ref={rootRef} className='relative'>
      <button
        type='button'
        className='flex min-h-12 w-full items-center justify-between border border-[#9b7a5d] bg-[#fff9ea] px-4 text-left text-[18px] text-[#2d2118] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] transition hover:border-[#704f36] focus:border-[#8b2d24] focus:outline-none focus:ring-2 focus:ring-[#8b2d24]/15'
        onClick={() => setOpen((next) => !next)}
      >
        <span className={selected ? '' : 'text-[#8f7b66]'}>
          {selected?.label ?? placeholder}
        </span>
        <span
          className={`ml-3 text-[20px] leading-none transition ${open ? 'rotate-180' : ''}`}
        >
          ⌄
        </span>
      </button>
      {open && (
        <div className='absolute left-0 right-0 top-[calc(100%+6px)] z-20 border border-[#8b6a4c] bg-[#fffaf0] py-1 shadow-[0_18px_38px_rgba(54,35,18,0.2)]'>
          {searchable && (
            <div className='sticky top-0 z-10 border-b border-[#8b6a4c]/30 bg-[#fffaf0] p-2'>
              <input
                ref={searchRef}
                value={query}
                placeholder={searchPlaceholder}
                className='h-10 w-full border border-[#b29273] bg-[#fff9ea] px-3 text-[16px] text-[#2d2118] outline-none placeholder:text-[#9a8066] focus:border-[#8b2d24] focus:ring-2 focus:ring-[#8b2d24]/15'
                onChange={(event) => setQuery(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setOpen(false);
                    setQuery('');
                  }
                }}
              />
            </div>
          )}
          <div className='max-h-72 overflow-auto'>
            <button
              type='button'
              className='block min-h-11 w-full px-4 text-left text-[17px] text-[#806851] transition hover:bg-[#efe1c6]'
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange('');
                setQuery('');
                setOpen(false);
              }}
            >
              {placeholder}
            </button>
            {filteredOptions.map((option) => (
              <button
                key={option.value}
                type='button'
                className={`block min-h-11 w-full px-4 text-left text-[17px] transition ${option.value === value ? 'bg-[#5f3928] text-[#fffaf0]' : 'text-[#2d2118] hover:bg-[#efe1c6]'}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  setQuery('');
                  setOpen(false);
                }}
              >
                {option.value === value ? '✓ ' : ''}
                {option.label}
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <div className='px-4 py-3 text-[16px] text-[#806851]'>
                无匹配结果
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const allTemplates = listAllTemplates();
const meterMap = new Map(loadMeterTemplates().map((t) => [t.id, t]));
const draftStore = new IndexedDbDraftStore();

function readRoute(): AppRoute {
  const match = window.location.pathname.match(/^\/edit\/([^/]+)$/);
  if (match) return { mode: 'editor', draftId: decodeURIComponent(match[1]) };
  return { mode: 'entry' };
}

function pushRoute(route: AppRoute): void {
  const path =
    route.mode === 'editor'
      ? `/edit/${encodeURIComponent(route.draftId)}`
      : '/';
  window.history.pushState(route, '', path);
}

function replaceRoute(route: AppRoute): void {
  const path =
    route.mode === 'editor'
      ? `/edit/${encodeURIComponent(route.draftId)}`
      : '/';
  window.history.replaceState(route, '', path);
}

function createDraftId(): string {
  if ('crypto' in window && 'randomUUID' in crypto) return crypto.randomUUID();
  return `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyDraft(): PoemCreationDraft {
  return {
    schemaVersion: 1,
    id: createDraftId(),
    title: '',
    description: '',
    author: '',
    genre: 'meter',
    selectedTune: '',
    selectedVariant: '',
    rhymeType: RhymeDictType.Pingshui,
    chars: [],
    updatedAt: new Date().toISOString(),
  };
}

function formatDraftTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function inferTemplateNameFromVariant(variantId: string): string {
  for (const entry of allTemplates) {
    if (entry.variants.some((variant) => variant.id === variantId)) {
      return entry.name;
    }
  }
  return '';
}

function normalizeDraft(draft: PoemCreationDraft): PoemCreationDraft {
  if (draft.selectedTune || !draft.selectedVariant) return draft;
  return {
    ...draft,
    selectedTune: inferTemplateNameFromVariant(draft.selectedVariant),
  };
}

// 懒加载词牌完整格律（8.7MB，gzip ~2MB，fetch 一次全缓存）
let ciBundlePromise: Promise<Record<string, CiTemplate>> | null = null;
function loadCiBundle(): Promise<Record<string, CiTemplate>> {
  if (!ciBundlePromise) {
    ciBundlePromise = fetch('/data/ci-tunes-bundle.json').then((r) => r.json());
  }
  return ciBundlePromise;
}

/** 从词牌变体中提取平仄 pattern */
function ciVariantPattern(
  tune: CiTemplate,
  variantId: string,
): ToneConstraint[][] {
  const v = tune.variants.find((v) => v.id === variantId);
  if (!v) return [];
  return v.sections.flatMap((s) => s.lines.map((l) => l.pattern));
}

function inferCiRhymeTone(text: string): Tone | null {
  const hasPing = text.includes('平韵');
  const hasZe = text.includes('仄韵');
  if (hasPing && !hasZe) return Tone.Ping;
  if (hasZe && !hasPing) return Tone.Ze;
  return null;
}

export default function App() {
  const [viewMode, setViewMode] = useState<'entry' | 'editor'>('entry');
  const [entryGenre, setEntryGenre] = useState<'meter' | 'ci'>('meter');
  const [entrySelectedTune, setEntrySelectedTune] = useState('');
  const [entrySelectedVariant, setEntrySelectedVariant] = useState('');
  const [entryRhymeType, setEntryRhymeType] = useState<RhymeDictType>(
    RhymeDictType.Pingshui,
  );
  const [genre, setGenre] = useState<'meter' | 'ci'>('meter');
  const [selectedTune, setSelectedTune] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [rhymeType, setRhymeType] = useState<RhymeDictType>(
    RhymeDictType.Pingshui,
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [activeDraftId, setActiveDraftId] = useState('');
  const [draftRevision, setDraftRevision] = useState(0);
  const [drafts, setDrafts] = useState<PoemCreationDraftSummary[]>([]);
  const [dictState, setDictState] = useState<{
    type: RhymeDictType;
    dict: RhymeDict;
  } | null>(null);
  const [chars, setChars] = useState<string[][]>([]);
  const [analyzeResult, setAnalyzeResult] = useState('');
  const [persistReady, setPersistReady] = useState(false);
  const [ciPatternState, setCiPatternState] = useState<{
    key: string;
    pattern: ToneConstraint[][];
  } | null>(null);
  const ciBundleRef = useRef<Record<string, CiTemplate> | null>(null);
  const dict = dictState?.type === rhymeType ? dictState.dict : null;

  const applyDraft = useCallback((sourceDraft: PoemCreationDraft) => {
    const draft = normalizeDraft(sourceDraft);
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

        const route = readRoute();
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
    return () => window.removeEventListener('popstate', handlePopState);
  }, [applyDraft]);

  useEffect(() => {
    if (!persistReady || !activeDraftId || viewMode !== 'editor') return;
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
      if (alive)
        setCiPatternState({
          key,
          pattern: ciVariantPattern(tune, selectedVariant),
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

  if (viewMode === 'entry') {
    return (
      <main className='mx-auto w-[min(1180px,calc(100%-32px))] py-7 max-[820px]:w-[min(calc(100%_-_20px),720px)] max-[820px]:pt-2.5'>
        <section className='mt-[18px] grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-[18px] max-[820px]:grid-cols-1'>
          <section className='grid gap-[18px] border border-[#5c3f22]/25 bg-[#fff9eb]/85 p-5 shadow-[0_14px_34px_rgba(60,40,21,0.08)]'>
            <h2 className='m-0 text-[24px] font-bold text-[#4b3729]'>
              本次编辑
            </h2>
            <div>
              <span className='grid gap-2 text-sm font-bold text-[#5e4735]'>
                体裁
              </span>
              <div className='mt-2 grid grid-cols-2 border border-[#8b6a4c]'>
                <button
                  type='button'
                  className={`min-h-[42px] border-r border-[#8b6a4c] text-[22px] transition ${entryGenre === 'meter' ? 'bg-[#5f3928] text-[#fffaf0]' : 'bg-transparent text-[#5b402f] hover:bg-[#efe1c6]'}`}
                  onClick={() => {
                    setEntryGenre('meter');
                    setEntrySelectedTune('');
                    setEntrySelectedVariant('');
                  }}
                >
                  诗
                </button>
                <button
                  type='button'
                  className={`min-h-[42px] text-[22px] transition ${entryGenre === 'ci' ? 'bg-[#5f3928] text-[#fffaf0]' : 'bg-transparent text-[#5b402f] hover:bg-[#efe1c6]'}`}
                  onClick={() => {
                    setEntryGenre('ci');
                    setEntrySelectedTune('');
                    setEntrySelectedVariant('');
                  }}
                >
                  词
                </button>
              </div>
            </div>

            <div className='grid gap-2 text-sm font-bold text-[#5e4735]'>
              模板
              <CustomSelect
                value={entrySelectedTune}
                options={templateOptions}
                placeholder='请选择'
                searchable
                searchPlaceholder='搜索模板'
                onChange={(next) => {
                  setEntrySelectedTune(next);
                  setEntrySelectedVariant('');
                }}
              />
            </div>

            {variantOptions.length > 0 && (
              <div className='grid gap-2 text-sm font-bold text-[#5e4735]'>
                变体
                <CustomSelect
                  value={entrySelectedVariant}
                  options={variantOptions}
                  placeholder='请选择'
                  searchable
                  searchPlaceholder='搜索变体'
                  onChange={setEntrySelectedVariant}
                />
              </div>
            )}

            <div className='grid gap-2 text-sm font-bold text-[#5e4735]'>
              韵书
              <CustomSelect
                value={entryRhymeType}
                options={[...RHYME_OPTIONS]}
                placeholder='请选择'
                onChange={(next) => {
                  if (next) setEntryRhymeType(next);
                }}
              />
            </div>

            <button
              type='button'
              className='primary-button w-fit'
              disabled={!entrySelectedVariant}
              onClick={() => void handleNewDraft()}
            >
              开始新作
            </button>
          </section>

          <section className='grid gap-[18px] border border-[#5c3f22]/25 bg-[#fff9eb]/85 p-5 shadow-[0_14px_34px_rgba(60,40,21,0.08)]'>
            <h2 className='m-0 text-[24px] font-bold text-[#4b3729]'>作品</h2>
            <div className='grid max-h-[520px] gap-2 overflow-auto border border-[#8b6a4c]/40 bg-[#fff9ea]/70 p-2'>
              {drafts.length === 0 && (
                <div className='px-2 py-3 text-[14px] text-[#806851]'>
                  暂无旧作
                </div>
              )}
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className='grid grid-cols-[minmax(0,1fr)_auto] gap-2 border border-[#c8ad8a] px-3 py-2 transition hover:bg-[#efe1c6]'
                >
                  <button
                    type='button'
                    className='grid min-w-0 gap-1 text-left'
                    onClick={() => void handleOpenDraft(draft.id)}
                  >
                    <span className='truncate text-[16px] font-bold text-[#2d2118]'>
                      {draft.title || '未题'}
                    </span>
                    <span className='truncate text-[13px] text-[#806851]'>
                      {draft.author || '佚名'} ·{' '}
                      {draft.selectedTune || '未选模板'}
                    </span>
                    <span className='text-[12px] text-[#9a8066]'>
                      {formatDraftTime(draft.updatedAt)}
                    </span>
                  </button>
                  <button
                    type='button'
                    className='self-start border border-[#a43c2f] px-2 py-1 text-[12px] text-[#8b2d24] transition hover:bg-[#f6e2dc]'
                    onClick={() => void handleDeleteDraft(draft.id)}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className='mx-auto w-[min(1180px,calc(100%-32px))] py-7 max-[820px]:w-[min(calc(100%_-_20px),720px)] max-[820px]:pt-2.5'>
      <section className='hero-panel' aria-label='诗词创作'>
        <div>
          <p className='eyebrow'>诗律 · 词谱 · 韵检</p>
          <h1>诗词创作</h1>
          <p className='hero-copy'>按格入字，随写随验平仄与韵脚。</p>
        </div>
        <img src={heroImage} alt='' className='hero-seal' />
      </section>

      <section className='mt-[18px] grid grid-cols-[300px_minmax(0,1fr)] items-start gap-[18px] max-[820px]:grid-cols-1'>
        <aside className='grid gap-[18px] border border-[#5c3f22]/25 bg-[#fff9eb]/85 p-5 shadow-[0_14px_34px_rgba(60,40,21,0.08)]'>
          <div className='grid gap-3'>
            <button
              type='button'
              className='w-fit border border-[#8b6a4c] px-4 py-2 text-[15px] text-[#5b402f] transition hover:bg-[#efe1c6]'
              onClick={() => void handleReturnToEntry()}
            >
              返回
            </button>
            <div className='border border-[#8b6a4c]/40 bg-[#fff9ea]/70 p-3 text-[14px] leading-7 text-[#806851]'>
              <div>体裁：{genre === 'meter' ? '诗' : '词'}</div>
              <div>模板：{selectedTune || '未选模板'}</div>
              <div>变体：{selectedVariant || '未选变体'}</div>
              <div>
                韵书：
                {RHYME_OPTIONS.find((option) => option.value === rhymeType)
                  ?.label ?? rhymeType}
              </div>
            </div>
          </div>

          <div className='grid gap-2 text-sm font-bold text-[#5e4735]'>
            标题
            <input
              value={title}
              placeholder='未题'
              className='h-12 w-full border border-[#9b7a5d] bg-[#fff9ea] px-4 text-[18px] text-[#2d2118] outline-none placeholder:text-[#9a8066] focus:border-[#8b2d24] focus:ring-2 focus:ring-[#8b2d24]/15'
              onChange={(event) => setTitle(event.currentTarget.value)}
            />
          </div>

          <div className='grid gap-2 text-sm font-bold text-[#5e4735]'>
            说明
            <input
              value={description}
              placeholder='题记、说明或备注'
              className='h-12 w-full border border-[#9b7a5d] bg-[#fff9ea] px-4 text-[18px] text-[#2d2118] outline-none placeholder:text-[#9a8066] focus:border-[#8b2d24] focus:ring-2 focus:ring-[#8b2d24]/15'
              onChange={(event) => setDescription(event.currentTarget.value)}
            />
          </div>

          <div className='grid gap-2 text-sm font-bold text-[#5e4735]'>
            署名
            <input
              value={author}
              placeholder='佚名'
              className='h-12 w-full border border-[#9b7a5d] bg-[#fff9ea] px-4 text-[18px] text-[#2d2118] outline-none placeholder:text-[#9a8066] focus:border-[#8b2d24] focus:ring-2 focus:ring-[#8b2d24]/15'
              onChange={(event) => setAuthor(event.currentTarget.value)}
            />
          </div>

          <div className='flex flex-wrap gap-4 text-[13px] text-[#725c47]'>
            <span className='inline-flex items-center gap-1.5'>
              <i className='h-3 w-3 border border-[#4d7a35] bg-[#e8f1df]' />合
            </span>
            <span className='inline-flex items-center gap-1.5'>
              <i className='h-3 w-3 border border-[#a43c2f] bg-[#f6e2dc]' />误
            </span>
            <span className='inline-flex items-center gap-1.5'>
              <i className='h-3 w-3 border border-[#9b7a5d] bg-[#fffaf0]' />
              待填
            </span>
          </div>
        </aside>

        <section className='min-h-[430px] border border-[#5c3f22]/25 bg-[#fff9eb]/85 p-6 shadow-[0_14px_34px_rgba(60,40,21,0.08)] max-[820px]:overflow-x-auto max-[820px]:px-3.5 max-[820px]:py-[18px]'>
          {!dict && <p className='loading-text'>加载韵书中...</p>}

          {genre === 'ci' && selectedVariant && pattern.length === 0 && (
            <p className='loading-text'>加载词牌格律中...</p>
          )}

          {pattern.length === 0 && (
            <div className='empty-state'>择一格律，即可开始填字。</div>
          )}

          {pattern.length > 0 && dict && persistReady && (
            <>
              <Composer
                key={`${activeDraftId}:${selectedVariant}:${draftRevision}`}
                pattern={pattern}
                dict={dict}
                expectedRhymeTone={expectedRhymeTone}
                initialChars={chars}
                onChange={setChars}
                onComplete={handleAnalyze}
              />
              <div className='analysis-bar'>
                <button
                  className='primary-button'
                  onClick={() => handleAnalyze()}
                >
                  分析
                </button>
                {analyzeResult && (
                  <span className='analysis-result'>{analyzeResult}</span>
                )}
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}
