import { useEffect, useState } from 'react';
import type { RhymeDictType, ToneConstraint } from '@poem/parser/kernel';
import type { Genre } from '../constants/poem';
import { RHYME_OPTIONS } from '../constants/poem';
import { loadCiBundle } from '../utils/ciTemplate';
import { meterMap } from '../utils/templateSelection';
import type { SelectOption } from './CustomSelect';
import { CustomSelect } from './CustomSelect';

type TemplateSelectionPageProps = {
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
  onReturn: () => void;
};

type TemplateStep = 1 | 2;

function toneMark(cell: ToneConstraint): string {
  if (cell.type === 'fixed') return cell.tone;
  if (cell.type === 'rhyme') return '韵';
  return '中';
}

function PatternPreview({
  title,
  subtitle,
  pattern,
}: {
  title: string;
  subtitle: string;
  pattern: ToneConstraint[][];
}) {
  return (
    <div className='pattern-preview-block'>
      <div className='pattern-preview-heading'>
        <h2>{title || '待选择'}</h2>
        <p>{subtitle || '选择后在这里查看体式。'}</p>
      </div>
      {pattern.length === 0 ? (
        <p className='empty-copy'>暂无体式预览，请先选择模板。</p>
      ) : (
        <div className='pattern-preview-lines'>
          {pattern.slice(0, 10).map((line, index) => (
            <div key={`${index}-${line.length}`} className='pattern-preview-line'>
              <span>{index + 1}</span>
              <div>
                {line.map((cell, cellIndex) => (
                  <i
                    key={`${index}-${cellIndex}`}
                    className={cell.type === 'rhyme' ? 'is-rhyme' : ''}
                  >
                    {toneMark(cell)}
                  </i>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TemplateSelectionPage({
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
  onReturn,
}: TemplateSelectionPageProps) {
  const [step, setStep] = useState<TemplateStep>(1);
  const [ciPattern, setCiPattern] = useState<ToneConstraint[][]>([]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [step]);

  const selectedTemplate = templateOptions.find((option) => option.value === selectedTune);
  const selectedVariantOption = variantOptions.find((option) => option.value === selectedVariant);
  const meterPattern = genre === 'meter' && selectedVariant
    ? meterMap.get(selectedVariant)?.pattern ?? []
    : [];
  const pattern = genre === 'meter' ? meterPattern : ciPattern;
  const patternTitle = selectedTemplate?.value ?? '';
  const patternSubtitle =
    selectedVariantOption?.label ?? selectedTemplate?.label ?? '';

  useEffect(() => {
    if (genre !== 'ci' || !selectedTune || !selectedVariant) {
      setCiPattern([]);
      return;
    }
    let alive = true;
    void loadCiBundle()
      .then((bundle) => {
        const variant = bundle[selectedTune]?.variants.find(
          (item) => item.id === selectedVariant,
        );
        const nextPattern = variant
          ? variant.sections.flatMap((section) =>
              section.lines.map((line) => line.pattern),
            )
          : [];
        if (alive) setCiPattern(nextPattern);
      })
      .catch(() => {
        if (alive) setCiPattern([]);
      });
    return () => {
      alive = false;
    };
  }, [genre, selectedTune, selectedVariant]);

  const pickGenre = (nextGenre: Genre) => {
    onGenreChange(nextGenre);
    setStep(2);
  };

  const pickTune = (nextTune: string) => {
    onTuneChange(nextTune);
  };

  const goNext = () => {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2 && selectedVariant) {
      onStartDraft();
    }
  };

  return (
    <main className='page template-page'>
      <div className='template-topline'>
        <button type='button' className='text-link' onClick={onReturn}>
          返回起笔
        </button>
        <div className='template-steps' aria-label='模板选择步骤'>
          {[
            { id: 1, label: '选择体裁' },
            { id: 2, label: genre === 'meter' ? '格律 / 变体 / 韵书' : '词牌 / 变体 / 韵书' },
          ].map((item) => (
            <button
              key={item.id}
              type='button'
              className={`template-step${step === item.id ? ' is-active' : ''}${step > item.id ? ' is-done' : ''}`}
              onClick={() => setStep(item.id as TemplateStep)}
            >
              <span>{item.id}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <section className='template-layout'>
        <div className='template-main'>
          {step === 1 && (
            <section className='template-section'>
              <p className='section-kicker'>第一步</p>
              <h1>先选择要写诗，还是填词</h1>
              <p className='page-lede'>保持纯色块与线条，把选择拆清楚，下一步再看格律和词牌。</p>
              <div className='genre-choice-grid'>
                <button
                  type='button'
                  className={`genre-choice${genre === 'meter' ? ' is-active' : ''}`}
                  onClick={() => pickGenre('meter')}
                >
                  <span>诗</span>
                  <strong>近体格律</strong>
                  <small>五绝、七绝、律诗与排律</small>
                </button>
                <button
                  type='button'
                  className={`genre-choice${genre === 'ci' ? ' is-active' : ''}`}
                  onClick={() => pickGenre('ci')}
                >
                  <span>词</span>
                  <strong>词牌体式</strong>
                  <small>如梦令、浣溪沙、更多词牌</small>
                </button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className='template-section'>
              <p className='section-kicker'>第二步</p>
              <h1>{genre === 'meter' ? '选择格律、变体与韵书' : '选择词牌、变体与韵书'}</h1>
              <p className='page-lede'>
                在这一页完成全部规则选择，右侧和下方会同步预览当前体式。
              </p>
              <div className='template-search-row'>
                <CustomSelect
                  value={selectedTune}
                  options={templateOptions}
                  placeholder={genre === 'meter' ? '搜索或选择格律' : '搜索或选择词牌'}
                  searchable
                  searchPlaceholder={genre === 'meter' ? '搜索五绝、七律' : '搜索词牌名'}
                  onChange={(nextTune) => {
                    if (nextTune) pickTune(nextTune);
                  }}
                />
                <CustomSelect
                  value={selectedVariant}
                  options={variantOptions}
                  placeholder='请选择变体'
                  searchable
                  searchPlaceholder='搜索作者、押韵或字数'
                  onChange={onVariantChange}
                />
                <CustomSelect
                  value={rhymeType}
                  options={RHYME_OPTIONS}
                  placeholder='请选择韵书'
                  onChange={(next) => {
                    if (next) onRhymeTypeChange(next);
                  }}
                />
              </div>
              <PatternPreview
                title={patternTitle}
                subtitle={patternSubtitle}
                pattern={pattern}
              />
            </section>
          )}

        </div>

        <aside className='panel template-preview'>
          <p className='section-kicker'>本次新建</p>
          <div className='preview-seal'>{genre === 'meter' ? '诗' : '词'}</div>
          <dl>
            <div>
              <dt>体裁</dt>
              <dd>{genre === 'meter' ? '诗 · 近体格律' : '词 · 词牌体式'}</dd>
            </div>
            <div>
              <dt>{genre === 'meter' ? '格律' : '词牌'}</dt>
              <dd>{selectedTemplate?.value || '待选择'}</dd>
            </div>
            <div>
              <dt>变体</dt>
              <dd>{selectedVariantOption?.label || '待选择'}</dd>
            </div>
            <div>
              <dt>韵书</dt>
              <dd>{RHYME_OPTIONS.find((option) => option.value === rhymeType)?.label}</dd>
            </div>
          </dl>
          <button
            type='button'
            className='primary-button'
            disabled={step === 2 && !selectedVariant}
            onClick={goNext}
          >
            {step === 2 ? '开始新作' : '下一步'}
          </button>
        </aside>
      </section>
    </main>
  );
}
