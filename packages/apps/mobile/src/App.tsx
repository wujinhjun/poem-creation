import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native";
import { RhymeDictType } from "@poem/parser/kernel";

import type { AppView, Genre } from "./constants/poem";
import { defaultRhymeType } from "./constants/poem";
import { AsyncStorageDraftStore } from "./persist";
import type { PoemCreationDraft, PoemCreationDraftSummary } from "./persist";
import { EditorScreen } from "./screens/EditorScreen";
import { EntryScreen } from "./screens/EntryScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { WorksScreen } from "./screens/WorksScreen";
import { appColors } from "./theme/colors";
import { analyzeGrid } from "./utils/analysis";
import { createEmptyDraft, normalizeDraft } from "./utils/draft";
import { createAppDict } from "./utils/rhymeDict";
import { getAllTemplates } from "@poem/poem-kit";
import {
  expectedRhymeToneForSelection,
  firstVariantForTune,
  patternForSelection,
  templateOptions,
  variantOptions,
  variantSummary,
} from "./utils/templates";
import {
  defaultSettings,
  loadUserSettings,
  saveUserSettings,
  type UserSettings,
} from "./utils/settings";

const draftStore = new AsyncStorageDraftStore();

export default function App() {
  const [view, setView] = useState<AppView>("home");
  const [drafts, setDrafts] = useState<PoemCreationDraftSummary[]>([]);
  const [activeDraftId, setActiveDraftId] = useState("");
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [entryGenre, setEntryGenre] = useState<Genre>("meter");
  const [entrySelectedTune, setEntrySelectedTune] = useState("");
  const [entrySelectedVariant, setEntrySelectedVariant] = useState("");
  const [entryRhymeType, setEntryRhymeType] = useState<RhymeDictType>(
    RhymeDictType.Pingshui,
  );
  const [draft, setDraft] = useState<PoemCreationDraft>(() => createEmptyDraft());
  const [analyzeResult, setAnalyzeResult] = useState("");
  const hydratedRef = useRef(false);

  const patternState = useMemo(
    () =>
      patternForSelection(
        draft.genre,
        draft.selectedTune,
        draft.selectedVariant,
      ),
    [draft.genre, draft.selectedTune, draft.selectedVariant],
  );
  const dict = useMemo(() => createAppDict(draft.rhymeType), [draft.rhymeType]);
  const expectedRhymeTone = useMemo(
    () =>
      expectedRhymeToneForSelection(
        draft.genre,
        draft.selectedTune,
        draft.selectedVariant,
      ),
    [draft.genre, draft.selectedTune, draft.selectedVariant],
  );
  const selectedVariantLabel = useMemo(
    () =>
      variantSummary(draft.genre, draft.selectedTune, draft.selectedVariant),
    [draft.genre, draft.selectedTune, draft.selectedVariant],
  );
  const currentTemplateOptions = useMemo(
    () => templateOptions(entryGenre),
    [entryGenre],
  );
  const currentVariantOptions = useMemo(
    () => variantOptions(entryGenre, entrySelectedTune),
    [entryGenre, entrySelectedTune],
  );

  const refreshDrafts = useCallback(async () => {
    setDrafts(await draftStore.listDrafts());
  }, []);

  const applyDraft = useCallback((source: PoemCreationDraft) => {
    const next = normalizeDraft(source, getAllTemplates());
    setDraft(next);
    setActiveDraftId(next.id);
    setAnalyzeResult("");
  }, []);

  const saveCurrentDraft = useCallback(async () => {
    const next = { ...draft, updatedAt: new Date().toISOString() };
    await draftStore.saveDraft(next);
    await refreshDrafts();
  }, [draft, refreshDrafts]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [loadedSettings, summaries, activeId] = await Promise.all([
        loadUserSettings(),
        draftStore.listDrafts(),
        draftStore.loadActiveDraftId(),
      ]);
      if (!alive) return;
      setSettings(loadedSettings);
      setDrafts(summaries);
      if (activeId) {
        const activeDraft = await draftStore.loadDraft(activeId);
        if (activeDraft && alive) applyDraft(activeDraft);
      }
      hydratedRef.current = true;
    })();
    return () => {
      alive = false;
    };
  }, [applyDraft]);

  useEffect(() => {
    if (!hydratedRef.current || view !== "editor" || !activeDraftId) return;
    const timer = setTimeout(() => {
      void draftStore
        .saveDraft({ ...draft, updatedAt: new Date().toISOString() })
        .then(refreshDrafts);
    }, 450);
    return () => clearTimeout(timer);
  }, [activeDraftId, draft, refreshDrafts, view]);

  const updateDraft = useCallback((patch: Partial<PoemCreationDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const handleGenreChange = useCallback((nextGenre: Genre) => {
    setEntryGenre(nextGenre);
    setEntrySelectedTune("");
    setEntrySelectedVariant("");
    setEntryRhymeType(defaultRhymeType(nextGenre));
  }, []);

  const handleTuneChange = useCallback(
    (tuneName: string) => {
      setEntrySelectedTune(tuneName);
      setEntrySelectedVariant(firstVariantForTune(entryGenre, tuneName));
    },
    [entryGenre],
  );

  const startDraft = useCallback(async () => {
    const nextDraft: PoemCreationDraft = {
      ...createEmptyDraft(),
      author: settings.defaultAuthor,
      genre: entryGenre,
      selectedTune: entrySelectedTune,
      selectedVariant: entrySelectedVariant,
      rhymeType: entryRhymeType,
      updatedAt: new Date().toISOString(),
    };
    await draftStore.saveDraft(nextDraft);
    applyDraft(nextDraft);
    await refreshDrafts();
    setView("editor");
  }, [
    applyDraft,
    entryGenre,
    entryRhymeType,
    entrySelectedTune,
    entrySelectedVariant,
    refreshDrafts,
    settings.defaultAuthor,
  ]);

  const openDraft = useCallback(
    async (id: string) => {
      if (view === "editor") await saveCurrentDraft();
      const next = await draftStore.loadDraft(id);
      if (!next) return;
      applyDraft(next);
      await draftStore.setActiveDraftId(id);
      setView("editor");
    },
    [applyDraft, saveCurrentDraft, view],
  );

  const deleteDraft = useCallback(
    async (id: string) => {
      await draftStore.deleteDraft(id);
      await refreshDrafts();
      if (id === activeDraftId) {
        setActiveDraftId("");
        setDraft(createEmptyDraft());
        setView("works");
      }
    },
    [activeDraftId, refreshDrafts],
  );

  const runAnalyze = useCallback(
    (sourceChars = draft.chars) => {
      try {
        setAnalyzeResult(
          analyzeGrid({
            genre: draft.genre,
            selectedTune: draft.selectedTune,
            selectedVariant: draft.selectedVariant,
            chars: sourceChars,
            dict,
            pattern: patternState.lines,
          }),
        );
      } catch (error) {
        setAnalyzeResult(
          `错误: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
    [dict, draft, patternState.lines],
  );

  const handleCharsChange = useCallback((chars: string[][]) => {
    updateDraft({ chars });
  }, [updateDraft]);

  const returnHome = useCallback(async () => {
    if (view === "editor") await saveCurrentDraft();
    setView("home");
  }, [saveCurrentDraft, view]);

  let screen = (
    <HomeScreen
      draftCount={drafts.length}
      onCreate={() => setView("entry")}
      onWorks={() => setView("works")}
      onSettings={() => setView("settings")}
    />
  );

  if (view === "entry") {
    screen = (
      <EntryScreen
        genre={entryGenre}
        selectedTune={entrySelectedTune}
        selectedVariant={entrySelectedVariant}
        rhymeType={entryRhymeType}
        templateOptions={currentTemplateOptions}
        variantOptions={currentVariantOptions}
        onBack={() => setView("home")}
        onGenreChange={handleGenreChange}
        onTuneChange={handleTuneChange}
        onVariantChange={setEntrySelectedVariant}
        onRhymeTypeChange={setEntryRhymeType}
        onStart={() => void startDraft()}
      />
    );
  } else if (view === "works") {
    screen = (
      <WorksScreen
        drafts={drafts}
        onBack={() => setView("home")}
        onOpenDraft={(id) => void openDraft(id)}
        onDeleteDraft={(id) => void deleteDraft(id)}
      />
    );
  } else if (view === "settings") {
    screen = (
      <SettingsScreen
        settings={settings}
        onBack={() => setView("home")}
        onSave={(nextSettings) => {
          setSettings(nextSettings);
          void saveUserSettings(nextSettings);
          setView("home");
        }}
      />
    );
  } else if (view === "editor") {
    screen = (
      <EditorScreen
        activeDraftId={activeDraftId}
        genre={draft.genre}
        selectedTune={draft.selectedTune}
        selectedVariantLabel={selectedVariantLabel}
        title={draft.title}
        description={draft.description}
        author={draft.author}
        chars={draft.chars}
        pattern={patternState.lines}
        dict={dict}
        expectedRhymeTone={expectedRhymeTone}
        visualLineGroups={patternState.rhymeGroups}
        sectionBreakBeforeGroups={patternState.sectionBreaks}
        analyzeResult={analyzeResult}
        onBack={() => void returnHome()}
        onTitleChange={(title) => updateDraft({ title })}
        onDescriptionChange={(description) => updateDraft({ description })}
        onAuthorChange={(author) => updateDraft({ author })}
        onCharsChange={handleCharsChange}
        onAnalyze={runAnalyze}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: appColors.paper }}>
      <StatusBar style="dark" />
      {screen}
    </SafeAreaView>
  );
}
