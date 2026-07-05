import type {
  PoemExportBaseImageConfig,
  PoemExportBodyConfig,
  PoemExportLayoutValue,
  PoemExportRectConfig,
  PoemExportTemplate,
  PoemExportTextBlockConfig,
} from "../schema.js";

// 现代留白模板的渲染器配置类型。
// 这个模板刻意保持克制：一个纸面区域、一条强调线、左对齐文本，
// 以及底部的小型品牌署名。
// V=number 为解析后配置（渲染用），V=PoemExportLayoutValue 为原始模板配置。
export type ModernWhitespaceImageConfig<V = number> = PoemExportBaseImageConfig & {
  kind: "modern-whitespace";
  panel: PoemExportRectConfig<V> & {
    fill: string;
    stroke: string;
    lineWidth: V;
  };
  accentBar: PoemExportRectConfig<V> & {
    fill: string;
  };
  title: PoemExportTextBlockConfig<V>;
  author: PoemExportTextBlockConfig<V>;
  body: PoemExportBodyConfig<V>;
  brand: PoemExportTextBlockConfig<V> & {
    text: string;
  };
};

export const MODERN_WHITESPACE_TEMPLATE_META: PoemExportTemplate = {
  id: "modern-whitespace",
  name: "现代留白",
  description: "低饱和背景、左对齐标题与底部品牌署名。",
};

// 现代留白：安静的编辑型排版，正文左对齐，品牌信息固定在纸面底部附近。
export const MODERN_WHITESPACE_TEMPLATE_CONFIG = {
  kind: "modern-whitespace" as const,
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
    fontSize: "canvas.short * 0.026",
    lineHeight: "body.fontSize * 1.9",
    sectionGap: "body.lineHeight * 1.15",
    maxWidth: "panel.width - 16%",
  },
  brand: {
    x: "title.left",
    y: "panel.bottom - 70",
    color: "#94a9a2",
    fontSize: "canvas.short * 0.013",
    text: "Poem Creation",
  },
} satisfies ModernWhitespaceImageConfig<PoemExportLayoutValue>;
