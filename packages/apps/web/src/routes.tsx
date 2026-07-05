import { useEffect } from 'react';
import { useParams } from '@tanstack/react-router';
import { EntryPage } from './components/EntryPage';
import { EditorPage } from './components/EditorPage';
import { QuickFillPage } from './components/QuickFillPage';
import { SettingsPage } from './components/SettingsPage';
import { TemplateDesignerPage } from './components/TemplateDesignerPage';
import { TemplateSelectionPage } from './components/TemplateSelectionPage';
import { WorksPage } from './components/WorksPage';
import { useAppState } from './context/appState';

export function EntryRoute() {
  const s = useAppState();
  return (
    <EntryPage
      drafts={s.drafts}
      persistenceMode={s.framePersistenceMode}
      onOpenQuickFill={() => void s.onOpenQuickFill()}
      onOpenTemplateSelection={() => void s.onOpenTemplateSelection()}
      onOpenWorks={() => void s.onOpenWorks()}
      onOpenDraft={(id) => void s.onOpenDraft(id)}
      onDeleteDraft={(id) => void s.onDeleteDraft(id)}
    />
  );
}

export function WorksRoute() {
  const s = useAppState();
  return (
    <WorksPage
      drafts={s.drafts}
      persistenceMode={s.framePersistenceMode}
      onCreateDraft={s.onOpenEntry}
      onOpenQuickFill={() => void s.onOpenQuickFill()}
      onOpenDraft={(id) => void s.onOpenDraft(id)}
      onDeleteDraft={(id) => void s.onDeleteDraft(id)}
      onExportDrafts={() => void s.onExportDrafts()}
      onImportDrafts={(file) => void s.onImportDrafts(file)}
    />
  );
}

export function SettingsRoute() {
  const s = useAppState();
  return (
    <SettingsPage
      settings={s.userSettings}
      onSettingsChange={s.onSettingsChange}
      onReturn={() => void s.onReturnToEntry()}
    />
  );
}

export function TemplateDesignerRoute() {
  const s = useAppState();
  return (
    <TemplateDesignerPage
      templates={s.userExportTemplates}
      onTemplatesChange={s.onUserExportTemplatesChange}
      onReturn={() => void s.onReturnToEntry()}
    />
  );
}

export function TemplateSelectionRoute() {
  const s = useAppState();
  return (
    <TemplateSelectionPage
      genre={s.entryGenre}
      selectedTune={s.entrySelectedTune}
      selectedVariant={s.entrySelectedVariant}
      rhymeType={s.entryRhymeType}
      templateOptions={s.templateOptions}
      variantOptions={s.variantOptions}
      onGenreChange={s.onEntryGenreChange}
      onTuneChange={s.onEntryTuneChange}
      onVariantChange={s.onEntryVariantChange}
      onRhymeTypeChange={s.onEntryRhymeTypeChange}
      onStartDraft={() => void s.onStartDraft()}
      onReturn={s.onOpenEntry}
    />
  );
}

export function QuickFillRoute() {
  const s = useAppState();
  return <QuickFillPage onRecognize={s.onRecognize} onReturn={s.onOpenEntry} />;
}

export function EditorRoute() {
  const s = useAppState();
  const { draftId } = useParams({ strict: false });
  // 依赖稳定的原语/回调，避免因 context 对象每次渲染换新而反复触发。
  const { activeDraftId, loadDraft, applyDraft, setActiveDraftIdInStore, navigateTo } = s;

  // 深链 / 刷新 / 前进后退落到 editor 时，若编辑态还不是该草稿则加载套用。
  // 经 openDraft/newDraft 进来时 activeDraftId 已等于 draftId，不会重复加载。
  useEffect(() => {
    if (!draftId || activeDraftId === draftId) return;
    let alive = true;
    void loadDraft(draftId).then((draft) => {
      if (!alive) return;
      if (!draft || draft.schemaVersion !== 1) {
        navigateTo({ mode: 'entry' });
        return;
      }
      applyDraft(draft);
      void setActiveDraftIdInStore(draftId);
    });
    return () => {
      alive = false;
    };
  }, [draftId, activeDraftId, loadDraft, applyDraft, setActiveDraftIdInStore, navigateTo]);

  return (
    <EditorPage
      activeDraftId={s.activeDraftId}
      draftRevision={s.draftRevision}
      genre={s.genre}
      selectedTune={s.selectedTune}
      selectedVariant={s.selectedVariant}
      selectedVariantLabel={s.selectedVariantLabel}
      rhymeType={s.rhymeType}
      title={s.title}
      description={s.description}
      author={s.author}
      chars={s.chars}
      dict={s.dict}
      pattern={s.pattern}
      expectedRhymeTone={s.expectedRhymeTone}
      visualLineGroups={s.visualLineGroups}
      sectionBreakBeforeGroups={s.sectionBreakBeforeGroups}
      analyzeResult={s.analyzeResult}
      analysisIssues={s.analysisIssues}
      errorMessage={s.errorMessage}
      exportStatus={s.exportStatus}
      exportPreviewDocument={s.exportPreviewDocument}
      exportPreviewOpen={s.exportPreviewOpen}
      userExportTemplates={s.userExportTemplates}
      persistReady={s.persistReady}
      onTitleChange={s.onTitleChange}
      onDescriptionChange={s.onDescriptionChange}
      onAuthorChange={s.onAuthorChange}
      onCharsChange={s.onCharsChange}
      onAnalyze={(nextChars) => void s.onAnalyze(nextChars)}
      onOpenExportPreview={s.onOpenExportPreview}
      onCloseExportPreview={s.onCloseExportPreview}
      onCopyExportText={() => void s.onCopyExportText()}
      onReturn={() => void s.onReturnToEntry()}
    />
  );
}

