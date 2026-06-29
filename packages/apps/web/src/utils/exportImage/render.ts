import {
  parsePoemExportTemplate,
  type PoemExportImageTemplateConfig,
  type PoemExportRatioId,
  type PoemExportTemplateId,
  type PoemLayoutDocument,
} from '@poem/layout-core';
import { resolveUserExportTemplateConfig, type UserExportTemplate } from '../exportTemplates';
import { renderAntiqueTag } from './renderers/antiqueTag';
import { renderCompactPaper } from './renderers/compactPaper';
import { renderModernWhitespace } from './renderers/modernWhitespace';

export type ExportImageTemplateInput =
  | PoemExportTemplateId
  | UserExportTemplate;

function renderResolvedTemplate(
  document: PoemLayoutDocument,
  config: PoemExportImageTemplateConfig,
  width: number,
  height: number,
): string {
  switch (config.kind) {
    case 'antique-tag':
      return renderAntiqueTag(document, config, width, height);
    case 'compact-paper':
      return renderCompactPaper(document, config, width, height);
    case 'modern-whitespace':
    default:
      return renderModernWhitespace(document, config, width, height);
  }
}

// 图片导出的总入口：layout-core 负责把模板表达式解析成数值配置，
// Web 侧只根据模板 kind 选择对应的 Canvas renderer。
export function createTextImageDataUrl(
  document: PoemLayoutDocument,
  template: ExportImageTemplateInput,
  ratioId?: PoemExportRatioId,
): string {
  if (typeof template !== 'string') {
    const { canvas, config } = resolveUserExportTemplateConfig(template, ratioId);
    return renderResolvedTemplate(document, config, canvas.width, canvas.height);
  }

  const { canvas, config } = parsePoemExportTemplate({ templateId: template, ratioId });
  return renderResolvedTemplate(document, config, canvas.width, canvas.height);
}
