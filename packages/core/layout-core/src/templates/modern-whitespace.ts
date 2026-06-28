import type {
  PoemExportBaseImageConfig,
  PoemExportBodyConfig,
  PoemExportRectConfig,
  PoemExportTemplate,
  PoemExportTextBlockConfig,
} from "../schema.js";

// Resolved renderer config for the modern whitespace template.
// This template is intentionally sparse: one paper panel, one accent line,
// left-aligned text, and a small brand mark at the bottom.
export type ModernWhitespaceImageConfig = PoemExportBaseImageConfig & {
  kind: "modern-whitespace";
  panel: PoemExportRectConfig & {
    fill: string;
    stroke: string;
    lineWidth: number;
  };
  accentBar: PoemExportRectConfig & {
    fill: string;
  };
  title: PoemExportTextBlockConfig;
  author: PoemExportTextBlockConfig;
  body: PoemExportBodyConfig;
  brand: PoemExportTextBlockConfig & {
    text: string;
  };
};

export const MODERN_WHITESPACE_TEMPLATE_META: PoemExportTemplate = {
  id: "modern-whitespace",
  name: "现代留白",
  description: "低饱和背景、左对齐标题与底部品牌署名。",
};

// Modern whitespace: quiet editorial layout with left-aligned content and a
// small brand mark anchored near the paper footer.
export const MODERN_WHITESPACE_TEMPLATE_CONFIG = {
  kind: "modern-whitespace",
  background: { from: "#fffdf8", to: "#fffdf8" },
  speckles: { count: 18, color: "#c8b17c" },
  panel: {
    x: "canvas.left + 6%",
    y: "canvas.top + 6%",
    width: "canvas.width - 12%",
    height: "canvas.height - 12%",
    fill: "#fffdf8",
    stroke: "#d5ded9",
    lineWidth: 2,
  },
  accentBar: {
    x: "panel.left + 8%",
    y: "panel.top + 8%",
    width: "panel.width * 0.12",
    height: 4,
    fill: "#d24b43",
  },
  title: {
    x: "panel.left + 8%",
    y: "accentBar.bottom + 28",
    color: "#27312f",
    fontSize: "canvas.short * 0.043",
    minFontSize: 26,
    maxWidth: "panel.width - 16%",
    weight: "700",
  },
  author: {
    x: "title.left",
    y: "title.bottom + 18",
    color: "#6c817a",
    fontSize: "title.fontSize * 0.58",
  },
  body: {
    x: "title.left",
    y: "author.bottom + 58",
    color: "#27312f",
    fontSize: "canvas.short * 0.032",
    lineHeight: "body.fontSize * 1.85",
    sectionGap: "body.lineHeight * 0.65",
    maxWidth: "panel.width - 16%",
  },
  brand: {
    x: "title.left",
    y: "panel.bottom - 70",
    color: "#94a9a2",
    fontSize: "canvas.short * 0.013",
    text: "Poem Creation",
  },
};
