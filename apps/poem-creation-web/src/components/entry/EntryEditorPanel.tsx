import type { RhymeDictType } from '@poem/parser/kernel';
import type { Genre } from '../../constants/poem';
import { RHYME_OPTIONS } from '../../constants/poem';
import { CustomSelect } from '../CustomSelect';
import type { SelectOption } from '../CustomSelect';

type EntryEditorPanelProps = {
  genre: Genre;
  selectedTune: string;
  selectedVariant: string;
  rhymeType: RhymeDictType;
  templateOptions: SelectOption<string>[];
  variantOptions: SelectOption<string>[];
  onGenreChange: (genre: Genre) => void;
  onTuneChange: (tune: string) => void;
  onVariantChange: (variant: string) => void;
  onRhymeTypeChange: (rhymeType: RhymeDictType) => void;
  onStartDraft: () => void;
  onOpenSettings: () => void;
};

export function EntryEditorPanel({
  genre,
  selectedTune,
  selectedVariant,
  rhymeType,
  templateOptions,
  variantOptions,
  onGenreChange,
  onTuneChange,
  onVariantChange,
  onRhymeTypeChange,
  onStartDraft,
  onOpenSettings,
}: EntryEditorPanelProps) {
  return (
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
  );
}
