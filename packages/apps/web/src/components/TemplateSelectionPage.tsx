import { useEffect, useState } from 'react';
import type { RhymeDictType, ToneConstraint } from '@poem/parser/kernel';
import type { Genre } from '../constants/poem';
import { RHYME_OPTIONS } from '../constants/poem';
import { loadCiBundle } from '../utils/ciTemplate';
import { getMeterMap } from '@poem/poem-kit';
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
        <>
          <div className='pattern-preview-legend'>
            <span>平</span>
            <span>仄</span>
            <span>中：可平可仄</span>
            <span>韵：押韵</span>
          </div>
          <div className='pattern-preview-lines'>
            {pattern.map((line, index) => (
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
        </>
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
  const [genreNotice, setGenreNotice] = useState('');
  const [ciPattern, setCiPattern] = useState<ToneConstraint[][]>([]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, []);

  useEffect(() => {
    if (!genreNotice) return;
    const timer = window.setTimeout(() => setGenreNotice(''), 1800);
    return () => window.clearTimeout(timer);
  }, [genreNotice]);

  const selectedTemplate = templateOptions.find((option) => option.value === selectedTune);
  const selectedVariantOption = variantOptions.find((option) => option.value === selectedVariant);
  const meterPattern = genre === 'meter' && selectedVariant
    ? getMeterMap().get(selectedVariant)?.pattern ?? []
    : [];
  const pattern = genre === 'meter' ? meterPattern : ciPattern;
  const patternTitle = selectedTemplate?.value ?? '';
  const patternSubtitle =
    selectedVariantOption?.label ?? selectedTemplate?.label ?? '';
  const visiblePattern = pattern.slice(0, 10);

  useEffect(() => {
    if (genre !== 'ci' || !selectedTune || !selectedVariant) {
      queueMicrotask(() => setCiPattern([]));
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
    if (nextGenre === genre) return;
    onGenreChange(nextGenre);
    setGenreNotice(
      `已切换为${nextGenre === 'meter' ? '平水韵' : '词林正韵'}`,
    );
  };

  const pickTune = (nextTune: string) => {
    onTuneChange(nextTune);
  };

  return (
    <main className='page template-page'>
      <div className='template-topline'>
        <button type='button' className='text-link' onClick={onReturn}>
          返回起笔
        </button>
      </div>

      <section className='template-layout'>
        <div className='template-main'>
          <section className='template-section'>
            <p className='section-kicker'>模板</p>
            <div className='template-heading-row'>
              <h1>{genre === 'meter' ? '选择格律、变体与韵书' : '选择词牌、变体与韵书'}</h1>
            </div>
            {genreNotice && (
              <p className='inline-hint' role='status'>
                {genreNotice}
              </p>
            )}
            <div className='template-search-row'>
              <div className='template-field template-field-genre'>
                <span className='field-title'>体裁</span>
                <div className='genre-segment' aria-label='选择体裁'>
                  <button
                    type='button'
                    className={genre === 'meter' ? 'is-active' : ''}
                    onClick={() => pickGenre('meter')}
                  >
                    诗
                  </button>
                  <button
                    type='button'
                    className={genre === 'ci' ? 'is-active' : ''}
                    onClick={() => pickGenre('ci')}
                  >
                    词
                  </button>
                </div>
              </div>
              <div className='template-field template-field-rhyme'>
                <span className='field-title'>韵书</span>
                <CustomSelect
                  value={rhymeType}
                  options={RHYME_OPTIONS}
                  placeholder='请选择韵书'
                  onChange={(next) => {
                    if (next) onRhymeTypeChange(next);
                  }}
                />
              </div>
              <div className='template-field template-field-tune'>
                <span className='field-title'>{genre === 'meter' ? '格律' : '词牌'}</span>
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
              </div>
              <div className='template-field template-field-variant'>
                <span className='field-title'>变体</span>
                <CustomSelect
                  value={selectedVariant}
                  options={variantOptions}
                  placeholder={selectedTune ? '请选择变体' : '请先选模板'}
                  disabled={!selectedTune}
                  searchable
                  searchPlaceholder='搜索作者、押韵或字数'
                  onChange={onVariantChange}
                />
              </div>
            </div>
            <div className='template-action-row'>
              <button
                type='button'
                className='primary-button'
                disabled={!selectedVariant}
                onClick={onStartDraft}
              >
                开始新作
              </button>
            </div>
          </section>
        </div>
        <aside className='template-preview'>
          <PatternPreview
            title={patternTitle}
            subtitle={patternSubtitle}
            pattern={visiblePattern}
          />
          {pattern.length > visiblePattern.length && (
            <p className='pattern-preview-note'>
              已展示前 {visiblePattern.length} 行，全 {pattern.length} 行
            </p>
          )}
        </aside>
      </section>
    </main>
  );
}
