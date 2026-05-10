import { useMemo, useState } from 'react';
import type { RhymeDictType } from '@poem/parser/kernel';
import type { Genre } from '../constants/poem';
import { RHYME_OPTIONS } from '../constants/poem';
import type { PoemCreationDraftSummary } from '../persist';
import { formatDraftTime } from '../utils/draft';
import { CustomSelect } from './CustomSelect';
import type { SelectOption } from './CustomSelect';

type EntryPageProps = {
  genre: Genre;
  selectedTune: string;
  selectedVariant: string;
  rhymeType: RhymeDictType;
  templateOptions: SelectOption<string>[];
  variantOptions: SelectOption<string>[];
  drafts: PoemCreationDraftSummary[];
  onGenreChange: (genre: Genre) => void;
  onTuneChange: (tune: string) => void;
  onVariantChange: (variant: string) => void;
  onRhymeTypeChange: (rhymeType: RhymeDictType) => void;
  onStartDraft: () => void;
  onOpenDraft: (id: string) => void;
  onDeleteDraft: (id: string) => void;
  onOpenSettings: () => void;
};

export function EntryPage({
  genre,
  selectedTune,
  selectedVariant,
  rhymeType,
  templateOptions,
  variantOptions,
  drafts,
  onGenreChange,
  onTuneChange,
  onVariantChange,
  onRhymeTypeChange,
  onStartDraft,
  onOpenDraft,
  onDeleteDraft,
  onOpenSettings,
}: EntryPageProps) {
  const [draftQuery, setDraftQuery] = useState('');
  const filteredDrafts = useMemo(() => {
    const keyword = draftQuery.trim().toLowerCase();
    if (!keyword) return drafts;
    return drafts.filter((draft) =>
      [draft.title, draft.author, draft.selectedTune, draft.selectedVariant]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }, [draftQuery, drafts]);

  return (
    <main className='mx-auto w-[min(1180px,calc(100%-32px))] py-7 max-[820px]:w-[min(calc(100%_-_20px),720px)] max-[820px]:pt-2.5'>
      <section className='mt-[18px] grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-[18px] max-[820px]:grid-cols-1'>
        <section className='grid gap-[18px] border border-[#5c3f22]/25 bg-[#fff9eb]/85 p-5 shadow-[0_14px_34px_rgba(60,40,21,0.08)]'>
          <div className='flex items-center justify-between gap-3'>
            <h2 className='m-0 text-[24px] font-bold text-[#4b3729]'>
              本次编辑
            </h2>
            <button
              type='button'
              className='border border-[#8b6a4c] px-3 py-1.5 text-[14px] text-[#5b402f] transition hover:bg-[#efe1c6]'
              onClick={onOpenSettings}
            >
              设置
            </button>
          </div>
          <div>
            <span className='grid gap-2 text-sm font-bold text-[#5e4735]'>
              体裁
            </span>
            <div className='mt-2 grid grid-cols-2 border border-[#8b6a4c]'>
              <button
                type='button'
                className={`min-h-[42px] border-r border-[#8b6a4c] text-[22px] transition ${genre === 'meter' ? 'bg-[#5f3928] text-[#fffaf0]' : 'bg-transparent text-[#5b402f] hover:bg-[#efe1c6]'}`}
                onClick={() => onGenreChange('meter')}
              >
                诗
              </button>
              <button
                type='button'
                className={`min-h-[42px] text-[22px] transition ${genre === 'ci' ? 'bg-[#5f3928] text-[#fffaf0]' : 'bg-transparent text-[#5b402f] hover:bg-[#efe1c6]'}`}
                onClick={() => onGenreChange('ci')}
              >
                词
              </button>
            </div>
          </div>

          <div className='grid gap-2 text-sm font-bold text-[#5e4735]'>
            模板
            <CustomSelect
              value={selectedTune}
              options={templateOptions}
              placeholder='请选择'
              searchable
              searchPlaceholder='搜索模板'
              onChange={onTuneChange}
            />
          </div>

          {variantOptions.length > 0 && (
            <div className='grid gap-2 text-sm font-bold text-[#5e4735]'>
              变体
              <CustomSelect
                value={selectedVariant}
                options={variantOptions}
                placeholder='请选择'
                searchable
                searchPlaceholder='搜索变体'
                onChange={onVariantChange}
              />
            </div>
          )}

          <div className='grid gap-2 text-sm font-bold text-[#5e4735]'>
            韵书
            <CustomSelect
              value={rhymeType}
              options={RHYME_OPTIONS}
              placeholder='请选择'
              onChange={(next) => {
                if (next) onRhymeTypeChange(next);
              }}
            />
          </div>

          <button
            type='button'
            className='primary-button w-fit'
            disabled={!selectedVariant}
            onClick={onStartDraft}
          >
            开始新作
          </button>
        </section>

        <section className='grid h-[500px] grid-rows-[auto_auto_minmax(0,1fr)] gap-[18px] border border-[#5c3f22]/25 bg-[#fff9eb]/85 p-5 shadow-[0_14px_34px_rgba(60,40,21,0.08)] max-[820px]:h-[460px]'>
          <h2 className='m-0 text-[24px] font-bold text-[#4b3729]'>作品</h2>
          <input
            value={draftQuery}
            placeholder='搜索标题、署名或模板'
            className='h-11 w-full border border-[#9b7a5d] bg-[#fff9ea] px-3 text-[16px] text-[#2d2118] outline-none placeholder:text-[#9a8066] focus:border-[#8b2d24] focus:ring-2 focus:ring-[#8b2d24]/15'
            onChange={(event) => setDraftQuery(event.currentTarget.value)}
          />
          <div className='grid min-h-0 content-start gap-2 overflow-auto border border-[#8b6a4c]/40 bg-[#fff9ea]/70 p-2'>
            {drafts.length === 0 && (
              <div className='px-2 py-3 text-[14px] text-[#806851]'>
                暂无旧作
              </div>
            )}
            {drafts.length > 0 && filteredDrafts.length === 0 && (
              <div className='px-2 py-3 text-[14px] text-[#806851]'>
                无匹配作品
              </div>
            )}
            {filteredDrafts.map((draft) => (
              <div
                key={draft.id}
                className='grid grid-cols-[minmax(0,1fr)_auto] gap-2 border border-[#c8ad8a] px-3 py-2 transition hover:bg-[#efe1c6]'
              >
                <button
                  type='button'
                  className='grid min-w-0 gap-1 text-left'
                  onClick={() => onOpenDraft(draft.id)}
                >
                  <span className='truncate text-[16px] font-bold text-[#2d2118]'>
                    {draft.title || '未题'}
                  </span>
                  <span className='truncate text-[13px] text-[#806851]'>
                    {draft.author || '佚名'} · {draft.selectedTune || '未选模板'}
                  </span>
                  <span className='text-[12px] text-[#9a8066]'>
                    {formatDraftTime(draft.updatedAt)}
                  </span>
                </button>
                <button
                  type='button'
                  className='self-start border border-[#a43c2f] px-2 py-1 text-[12px] text-[#8b2d24] transition hover:bg-[#f6e2dc]'
                  onClick={() => onDeleteDraft(draft.id)}
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
