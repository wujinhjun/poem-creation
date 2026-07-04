import type {
  PoemExportLayoutValue,
  PoemExportTemplate,
  PoemExportTemplateId,
} from "../schema.js";
import type { AntiqueTagImageConfig } from "./antique-tag.js";
import {
  ANTIQUE_TAG_TEMPLATE_CONFIG,
  ANTIQUE_TAG_TEMPLATE_META,
} from "./antique-tag.js";
import type { CompactPaperImageConfig } from "./compact-paper.js";
import {
  COMPACT_PAPER_TEMPLATE_CONFIG,
  COMPACT_PAPER_TEMPLATE_META,
} from "./compact-paper.js";
import type { ModernWhitespaceImageConfig } from "./modern-whitespace.js";
import {
  MODERN_WHITESPACE_TEMPLATE_CONFIG,
  MODERN_WHITESPACE_TEMPLATE_META,
} from "./modern-whitespace.js";

// V=number（默认）为解析后配置；V=PoemExportLayoutValue 为原始模板配置。
export type PoemExportImageTemplateConfig<V = number> =
  | ModernWhitespaceImageConfig<V>
  | AntiqueTagImageConfig<V>
  | CompactPaperImageConfig<V>;

// 原始模板配置：位置量可为版式表达式字符串，交由 templates.ts 解析为纯数值。
export type RawPoemExportImageTemplateConfig =
  PoemExportImageTemplateConfig<PoemExportLayoutValue>;

export const POEM_EXPORT_TEMPLATES: PoemExportTemplate[] = [
  MODERN_WHITESPACE_TEMPLATE_META,
  ANTIQUE_TAG_TEMPLATE_META,
  COMPACT_PAPER_TEMPLATE_META,
];

// 源模板配置可以使用轻量版式表达式。../templates.ts 中的解析器会先把它们
// 转成纯数值，再交给应用层渲染器。
export const POEM_EXPORT_IMAGE_TEMPLATE_CONFIGS: Record<
  PoemExportTemplateId,
  RawPoemExportImageTemplateConfig
> = {
  "modern-whitespace": MODERN_WHITESPACE_TEMPLATE_CONFIG,
  "antique-tag": ANTIQUE_TAG_TEMPLATE_CONFIG,
  "compact-paper": COMPACT_PAPER_TEMPLATE_CONFIG,
};
