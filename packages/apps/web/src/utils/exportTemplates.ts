import {
  POEM_EXPORT_TEMPLATES,
  parsePoemExportTemplate,
  type PoemExportImageTemplateConfig,
  type PoemExportTemplate,
  type PoemExportTemplateId,
  type PoemExportTextAlign,
} from '@poem/layout-core';

const USER_EXPORT_TEMPLATES_KEY = 'poem-creation:user-export-templates:v1';

export type ExportTemplateOverrides = {
  backgroundFrom?: string;
  backgroundTo?: string;
  titleColor?: string;
  titleFontSize?: number;
  titleAlign?: PoemExportTextAlign;
  authorColor?: string;
  authorFontSize?: number;
  authorAlign?: PoemExportTextAlign;
  bodyColor?: string;
  bodyFontSize?: number;
  bodyLineHeight?: number;
  bodySectionGap?: number;
  bodyAlign?: PoemExportTextAlign;
};

export type UserExportTemplate = {
  schemaVersion: 1;
  id: string;
  name: string;
  baseTemplateId: PoemExportTemplateId;
  overrides: ExportTemplateOverrides;
  createdAt: string;
  updatedAt: string;
};

export type ExportTemplateOption =
  | (PoemExportTemplate & { source: 'builtin' })
  | {
      id: string;
      name: string;
      description: string;
      source: 'user';
      template: UserExportTemplate;
    };

function createTemplateId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `export-template-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readRawTemplates(): unknown {
  try {
    const raw = localStorage.getItem(USER_EXPORT_TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isUserExportTemplate(value: unknown): value is UserExportTemplate {
  if (!value || typeof value !== 'object') return false;
  const item = value as UserExportTemplate;
  return (
    item.schemaVersion === 1 &&
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    POEM_EXPORT_TEMPLATES.some((template) => template.id === item.baseTemplateId)
  );
}

export function readLegacyUserExportTemplates(): UserExportTemplate[] {
  const raw = readRawTemplates();
  return Array.isArray(raw) ? raw.filter(isUserExportTemplate) : [];
}

export function createUserExportTemplate(
  baseTemplateId: PoemExportTemplateId,
  name?: string,
): UserExportTemplate {
  const baseTemplate = POEM_EXPORT_TEMPLATES.find((template) => template.id === baseTemplateId);
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: createTemplateId(),
    name: name?.trim() || `${baseTemplate?.name ?? '导出模板'}副本`,
    baseTemplateId,
    overrides: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function exportTemplateOptions(
  userTemplates: UserExportTemplate[],
): ExportTemplateOption[] {
  return [
    ...POEM_EXPORT_TEMPLATES.map((template) => ({
      ...template,
      source: 'builtin' as const,
    })),
    ...userTemplates.map((template) => ({
      id: `user:${template.id}`,
      name: template.name,
      description: '自定义导出版式',
      source: 'user' as const,
      template,
    })),
  ];
}

function cloneConfig<T>(config: T): T {
  return JSON.parse(JSON.stringify(config)) as T;
}

function applyTextOverrides(
  target: { color: string; fontSize: number; lineHeight?: number; sectionGap?: number; align?: PoemExportTextAlign },
  overrides: {
    color?: string;
    fontSize?: number;
    lineHeight?: number;
    sectionGap?: number;
    align?: PoemExportTextAlign;
  },
): void {
  if (overrides.color) target.color = overrides.color;
  if (typeof overrides.fontSize === 'number') target.fontSize = overrides.fontSize;
  if (typeof overrides.lineHeight === 'number') target.lineHeight = overrides.lineHeight;
  if (typeof overrides.sectionGap === 'number') target.sectionGap = overrides.sectionGap;
  if (overrides.align) target.align = overrides.align;
}

export function applyExportTemplateOverrides<T extends PoemExportImageTemplateConfig>(
  config: T,
  overrides: ExportTemplateOverrides,
): T {
  const next = cloneConfig(config);
  next.background.from = overrides.backgroundFrom ?? next.background.from;
  next.background.to = overrides.backgroundTo ?? next.background.to;

  applyTextOverrides(next.title, {
    color: overrides.titleColor,
    fontSize: overrides.titleFontSize,
    align: overrides.titleAlign,
  });
  applyTextOverrides(next.author, {
    color: overrides.authorColor,
    fontSize: overrides.authorFontSize,
    align: overrides.authorAlign,
  });
  applyTextOverrides(next.body, {
    color: overrides.bodyColor,
    fontSize: overrides.bodyFontSize,
    lineHeight: overrides.bodyLineHeight,
    sectionGap: overrides.bodySectionGap,
    align: overrides.bodyAlign,
  });

  return next;
}

export function resolveUserExportTemplateConfig(
  template: UserExportTemplate,
  ratioId?: Parameters<typeof parsePoemExportTemplate>[0]['ratioId'],
) {
  const { canvas, config } = parsePoemExportTemplate({
    templateId: template.baseTemplateId,
    ratioId,
  });
  return {
    canvas,
    config: applyExportTemplateOverrides(config, template.overrides),
  };
}
