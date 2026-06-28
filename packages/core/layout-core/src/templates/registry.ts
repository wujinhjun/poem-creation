import type { PoemExportTemplate, PoemExportTemplateId } from "../schema.js";
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

export type PoemExportImageTemplateConfig =
  | ModernWhitespaceImageConfig
  | AntiqueTagImageConfig
  | CompactPaperImageConfig;

export const POEM_EXPORT_TEMPLATES: PoemExportTemplate[] = [
  MODERN_WHITESPACE_TEMPLATE_META,
  ANTIQUE_TAG_TEMPLATE_META,
  COMPACT_PAPER_TEMPLATE_META,
];

// Source template configs may use lightweight layout expressions. The parser in
// ../templates.ts resolves them before app-level renderers receive the config.
export const POEM_EXPORT_IMAGE_TEMPLATE_CONFIGS: Record<
  PoemExportTemplateId,
  unknown
> = {
  "modern-whitespace": MODERN_WHITESPACE_TEMPLATE_CONFIG,
  "antique-tag": ANTIQUE_TAG_TEMPLATE_CONFIG,
  "compact-paper": COMPACT_PAPER_TEMPLATE_CONFIG,
};
