import {
  parsePoemExportTemplate,
  type PoemExportRatioId,
  type PoemExportTemplateId,
  type PoemLayoutDocument,
} from '@poem/layout-core';
import { renderAntiqueTag } from './renderers/antiqueTag';
import { renderCompactPaper } from './renderers/compactPaper';
import { renderModernWhitespace } from './renderers/modernWhitespace';

// 图片导出的总入口：layout-core 负责把模板表达式解析成数值配置，
// Web 侧只根据模板 kind 选择对应的 Canvas renderer。
export function createTextImageDataUrl(
  document: PoemLayoutDocument,
  templateId: PoemExportTemplateId,
  ratioId?: PoemExportRatioId,
): string {
  const { canvas, config } = parsePoemExportTemplate({ templateId, ratioId });
  switch (config.kind) {
    case 'antique-tag':
      return renderAntiqueTag(document, config, canvas.width, canvas.height);
    case 'compact-paper':
      return renderCompactPaper(document, config, canvas.width, canvas.height);
    case 'modern-whitespace':
    default:
      return renderModernWhitespace(document, config, canvas.width, canvas.height);
  }
}
