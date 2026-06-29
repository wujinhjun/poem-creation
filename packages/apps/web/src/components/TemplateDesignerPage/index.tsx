import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_POEM_EXPORT_RATIO_ID,
  DEFAULT_POEM_EXPORT_TEMPLATE_ID,
  POEM_EXPORT_RATIOS,
  POEM_EXPORT_TEMPLATES,
  parsePoemExportTemplate,
  type PoemExportRatioId,
  type PoemExportTemplateId,
  type PoemExportTextAlign,
  type PoemLayoutDocument,
} from '@poem/layout-core';
import { createTextImageDataUrl } from '../../utils/exportImage';
import {
  applyExportTemplateOverrides,
  createUserExportTemplate,
  type ExportTemplateOverrides,
  type UserExportTemplate,
} from '../../utils/exportTemplates';
import { CustomSelect } from '../CustomSelect';
import type { SelectOption } from '../CustomSelect';

type TemplateDesignerPageProps = {
  templates: UserExportTemplate[];
  onTemplatesChange: (templates: UserExportTemplate[]) => void;
  onReturn: () => void;
};

const SAMPLE_DOCUMENT: PoemLayoutDocument = {
  title: '临江仙·滚滚长江东逝水',
  author: '杨慎',
  description: '廿一史弹词',
  sections: [
    {
      lines: [
        '滚滚长江东逝水，浪花淘尽英雄。',
        '是非成败转头空。',
        '青山依旧在，几度夕阳红。',
      ],
    },
    {
      lines: [
        '白发渔樵江渚上，惯看秋月春风。',
        '一壶浊酒喜相逢。',
        '古今多少事，都付笑谈中。',
      ],
    },
  ],
};

function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function templateBaseName(id: PoemExportTemplateId): string {
  return POEM_EXPORT_TEMPLATES.find((template) => template.id === id)?.name ?? id;
}

const BUILTIN_TEMPLATE_OPTIONS: SelectOption<PoemExportTemplateId>[] =
  POEM_EXPORT_TEMPLATES.map((template) => ({
    value: template.id,
    label: template.name,
  }));

function defaultOverrides(
  baseTemplateId: PoemExportTemplateId,
  ratioId: PoemExportRatioId,
): ExportTemplateOverrides {
  const { config } = parsePoemExportTemplate({ templateId: baseTemplateId, ratioId });
  return {
    backgroundFrom: config.background.from,
    backgroundTo: config.background.to,
    titleColor: config.title.color,
    titleFontSize: config.title.fontSize,
    titleAlign: config.title.align ?? 'left',
    authorColor: config.author.color,
    authorFontSize: config.author.fontSize,
    authorAlign: config.author.align ?? config.title.align ?? 'left',
    bodyColor: config.body.color,
    bodyFontSize: config.body.fontSize,
    bodyLineHeight: config.body.lineHeight,
    bodySectionGap: config.body.sectionGap,
    bodyAlign: config.body.align ?? 'left',
  };
}

export function TemplateDesignerPage({
  templates,
  onTemplatesChange,
  onReturn,
}: TemplateDesignerPageProps) {
  const [ratioId, setRatioId] = useState<PoemExportRatioId>(
    DEFAULT_POEM_EXPORT_RATIO_ID,
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    templates[0]?.id ?? '',
  );
  const effectiveSelectedTemplateId = selectedTemplateId || (templates[0]?.id ?? '');
  const selectedTemplate = templates.find(
    (template) => template.id === effectiveSelectedTemplateId,
  );
  const selectedRatio =
    POEM_EXPORT_RATIOS.find((ratio) => ratio.id === ratioId) ??
    POEM_EXPORT_RATIOS[0];
  const previewTemplate = useMemo(
    () =>
      selectedTemplate ??
      createUserExportTemplate(DEFAULT_POEM_EXPORT_TEMPLATE_ID, '未保存模板'),
    [selectedTemplate],
  );
  const [previewUrl, setPreviewUrl] = useState(() =>
    createTextImageDataUrl(SAMPLE_DOCUMENT, previewTemplate, ratioId),
  );
  const resolvedOverrides = useMemo(
    () => ({
      ...defaultOverrides(previewTemplate.baseTemplateId, ratioId),
      ...previewTemplate.overrides,
    }),
    [previewTemplate.baseTemplateId, previewTemplate.overrides, ratioId],
  );
  const baseConfig = useMemo(
    () => parsePoemExportTemplate({
      templateId: previewTemplate.baseTemplateId,
      ratioId,
    }).config,
    [previewTemplate.baseTemplateId, ratioId],
  );
  const previewConfig = useMemo(
    () => applyExportTemplateOverrides(baseConfig, previewTemplate.overrides),
    [baseConfig, previewTemplate.overrides],
  );

  const createTemplate = (baseTemplateId: PoemExportTemplateId) => {
    const nextTemplate = createUserExportTemplate(baseTemplateId);
    const nextTemplates = [nextTemplate, ...templates];
    onTemplatesChange(nextTemplates);
    setSelectedTemplateId(nextTemplate.id);
  };

  useEffect(() => {
    let frameId = 0;
    const timer = window.setTimeout(() => {
      frameId = window.requestAnimationFrame(() => {
        setPreviewUrl(createTextImageDataUrl(SAMPLE_DOCUMENT, previewTemplate, ratioId));
      });
    }, 120);

    return () => {
      window.clearTimeout(timer);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [previewTemplate, ratioId]);

  const persistTemplates = (nextTemplates: UserExportTemplate[]) => {
    onTemplatesChange(nextTemplates);
    if (!nextTemplates.some((template) => template.id === effectiveSelectedTemplateId)) {
      setSelectedTemplateId(nextTemplates[0]?.id ?? '');
    }
  };

  const updateSelectedTemplate = (patch: Partial<UserExportTemplate>) => {
    if (!selectedTemplate) return;
    const updated = {
      ...selectedTemplate,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    onTemplatesChange(
      templates.map((template) =>
        template.id === selectedTemplate.id ? updated : template,
      ),
    );
  };

  const updateOverrides = (patch: ExportTemplateOverrides) => {
    updateSelectedTemplate({
      overrides: {
        ...selectedTemplate?.overrides,
        ...patch,
      },
    });
  };

  const deleteSelectedTemplate = () => {
    if (!selectedTemplate) return;
    if (!window.confirm(`确定删除「${selectedTemplate.name}」吗？`)) return;
    persistTemplates(templates.filter((template) => template.id !== selectedTemplate.id));
  };

  return (
    <main className='page page-template-designer'>
      <section className='template-designer-header'>
        <div>
          <p className='section-kicker'>导出版式</p>
          <h1>模板设计</h1>
          <p className='page-lede'>
            基于内置模板创建自定义版本，调整常用排版参数后可用于作品导出。
          </p>
        </div>
        <button type='button' className='ghost-button' onClick={onReturn}>
          返回
        </button>
      </section>

      <section className='template-designer-layout'>
        <aside className='template-list-panel'>
          <div className='template-list-head'>
            <span className='field-title'>我的模板</span>
            <CustomSelect
              value=''
              options={BUILTIN_TEMPLATE_OPTIONS}
              placeholder='新建模板副本'
              onChange={(baseTemplateId) => {
                if (baseTemplateId) createTemplate(baseTemplateId);
              }}
            />
          </div>

          <div className='template-list-scroll'>
            {templates.map((template) => (
              <button
                key={template.id}
                type='button'
                className={`template-list-item${
                  template.id === effectiveSelectedTemplateId ? ' is-active' : ''
                }`}
                onClick={() => setSelectedTemplateId(template.id)}
              >
                <span>{template.name}</span>
                <small>基于{templateBaseName(template.baseTemplateId)}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className='template-preview-stage'>
          <div className='template-preview-toolbar'>
            <span className='field-title'>预览比例</span>
            <div className='template-ratio-buttons'>
              {POEM_EXPORT_RATIOS.map((ratio) => (
                <button
                  key={ratio.id}
                  type='button'
                  className={ratio.id === ratioId ? 'is-active' : ''}
                  onClick={() => setRatioId(ratio.id)}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>
          <div className='template-preview-frame'>
            <div
              role='img'
              aria-label='模板预览'
              className='template-preview-art'
              style={{
                aspectRatio: `${selectedRatio.width} / ${selectedRatio.height}`,
                backgroundImage: `url(${previewUrl})`,
              }}
            />
          </div>
        </section>

        <aside className='template-control-panel'>
          <div className='template-control-head'>
            <div>
              <span className='field-title'>参数</span>
              <h2>{selectedTemplate ? selectedTemplate.name : '预览模板'}</h2>
            </div>
            <button
              type='button'
              className='danger-button'
              disabled={!selectedTemplate}
              onClick={deleteSelectedTemplate}
            >
              删除
            </button>
          </div>

          <div className='template-control-stack'>
            <label className='form-field'>
              <span className='field-title'>模板名称</span>
              <input
                className='line-input'
                value={selectedTemplate?.name ?? previewTemplate.name}
                disabled={!selectedTemplate}
                onChange={(event) =>
                  updateSelectedTemplate({ name: event.currentTarget.value })
                }
              />
            </label>

            <div className='form-field'>
              <span className='field-title'>基础模板</span>
              <CustomSelect
                value={previewTemplate.baseTemplateId}
                options={BUILTIN_TEMPLATE_OPTIONS}
                placeholder='选择基础模板'
                disabled={!selectedTemplate}
                onChange={(baseTemplateId) => {
                  if (!baseTemplateId) return;
                  updateSelectedTemplate({
                    baseTemplateId,
                    overrides: {},
                  });
                }}
              />
            </div>

            <div className='template-control-section'>
              <span className='field-title'>颜色</span>
              <div className='template-control-grid'>
                <ColorInput
                  label='背景起色'
                  value={resolvedOverrides.backgroundFrom ?? previewConfig.background.from}
                  disabled={!selectedTemplate}
                  onChange={(value) => updateOverrides({ backgroundFrom: value })}
                />
                <ColorInput
                  label='背景止色'
                  value={resolvedOverrides.backgroundTo ?? previewConfig.background.to}
                  disabled={!selectedTemplate}
                  onChange={(value) => updateOverrides({ backgroundTo: value })}
                />
                <ColorInput
                  label='标题'
                  value={resolvedOverrides.titleColor ?? previewConfig.title.color}
                  disabled={!selectedTemplate}
                  onChange={(value) => updateOverrides({ titleColor: value })}
                />
                <ColorInput
                  label='正文'
                  value={resolvedOverrides.bodyColor ?? previewConfig.body.color}
                  disabled={!selectedTemplate}
                  onChange={(value) => updateOverrides({ bodyColor: value })}
                />
              </div>
            </div>

            <div className='template-control-section'>
              <span className='field-title'>文字</span>
              <RangeInput
                label='标题字号'
                min={22}
                max={72}
                value={resolvedOverrides.titleFontSize ?? previewConfig.title.fontSize}
                disabled={!selectedTemplate}
                onChange={(value) => updateOverrides({ titleFontSize: value })}
              />
              <RangeInput
                label='作者字号'
                min={12}
                max={44}
                value={resolvedOverrides.authorFontSize ?? previewConfig.author.fontSize}
                disabled={!selectedTemplate}
                onChange={(value) => updateOverrides({ authorFontSize: value })}
              />
              <RangeInput
                label='正文字号'
                min={16}
                max={56}
                value={resolvedOverrides.bodyFontSize ?? previewConfig.body.fontSize}
                disabled={!selectedTemplate}
                onChange={(value) => updateOverrides({ bodyFontSize: value })}
              />
              <RangeInput
                label='正文行距'
                min={28}
                max={100}
                value={resolvedOverrides.bodyLineHeight ?? previewConfig.body.lineHeight}
                disabled={!selectedTemplate}
                onChange={(value) => updateOverrides({ bodyLineHeight: value })}
              />
              <RangeInput
                label='段落间距'
                min={0}
                max={80}
                value={resolvedOverrides.bodySectionGap ?? previewConfig.body.sectionGap}
                disabled={!selectedTemplate}
                onChange={(value) => updateOverrides({ bodySectionGap: value })}
              />
            </div>

            <AlignButtons
              label='题头位置'
              value={resolvedOverrides.titleAlign ?? previewConfig.title.align ?? 'left'}
              disabled={!selectedTemplate}
              onChange={(align) => updateOverrides({ titleAlign: align })}
            />

            <AlignButtons
              label='作者位置'
              value={resolvedOverrides.authorAlign ?? previewConfig.author.align ?? 'left'}
              disabled={!selectedTemplate}
              onChange={(align) => updateOverrides({ authorAlign: align })}
            />

            <AlignButtons
              label='正文对齐'
              value={resolvedOverrides.bodyAlign ?? previewConfig.body.align ?? 'left'}
              disabled={!selectedTemplate}
              onChange={(align) => updateOverrides({ bodyAlign: align })}
            />
          </div>
        </aside>
      </section>
    </main>
  );
}

function AlignButtons({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: PoemExportTextAlign;
  disabled?: boolean;
  onChange: (value: PoemExportTextAlign) => void;
}) {
  return (
    <div className='form-field'>
      <span className='field-title'>{label}</span>
      <div className='template-align-buttons'>
        {(['left', 'center', 'right'] as PoemExportTextAlign[]).map((align) => (
          <button
            key={align}
            type='button'
            className={value === align ? 'is-active' : ''}
            disabled={disabled}
            onClick={() => onChange(align)}
          >
            {align === 'left' ? '左' : align === 'center' ? '中' : '右'}
          </button>
        ))}
      </div>
    </div>
  );
}

function ColorInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className='template-color-field'>
      <span>{label}</span>
      <input
        type='color'
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

function RangeInput({
  label,
  min,
  max,
  value,
  disabled,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const rounded = Math.round(value);
  return (
    <label className='template-range-field'>
      <span>{label}</span>
      <input
        type='range'
        min={min}
        max={max}
        value={rounded}
        disabled={disabled}
        onChange={(event) =>
          onChange(clampNumber(Number(event.currentTarget.value), min, max))
        }
      />
      <output>{rounded}</output>
    </label>
  );
}
