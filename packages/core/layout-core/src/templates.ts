import type {
  PoemExportImageTemplateConfig,
  PoemExportTemplate,
  PoemExportTemplateId,
} from "./schema.js";

export const DEFAULT_POEM_EXPORT_TEMPLATE_ID = "modern-whitespace";

export const POEM_EXPORT_IMAGE_CANVAS = {
  width: 760,
  height: 1050,
};

export const POEM_EXPORT_TEMPLATES: PoemExportTemplate[] = [
  {
    id: "modern-whitespace",
    name: "现代留白",
    description: "低饱和背景、左对齐标题与底部品牌署名。",
  },
  {
    id: "antique-tag",
    name: "题签笺",
    description: "竖向题签、暖色笺纸与落款印章。",
  },
  {
    id: "compact-paper",
    name: "素笺居中",
    description: "居中排版、细框纸纹，适合经典词作导出。",
  },
];

export const POEM_EXPORT_IMAGE_TEMPLATE_CONFIGS: Record<
  PoemExportTemplateId,
  PoemExportImageTemplateConfig
> = {
  "modern-whitespace": {
    kind: "modern-whitespace",
    background: { from: "#e8f1ee", to: "#f7f1e3" },
    speckles: { count: 40, color: "#c8b17c" },
    panel: {
      x: 50,
      y: 50,
      width: 660,
      height: 950,
      fill: "#fffdf8",
      stroke: "#d5ded9",
      lineWidth: 2,
    },
    accentBar: {
      x: 108,
      y: 124,
      width: 72,
      height: 4,
      fill: "#d24b43",
    },
    title: {
      x: 108,
      y: 150,
      color: "#27312f",
      fontSize: 38,
      minFontSize: 26,
      maxWidth: 530,
      weight: "700",
    },
    author: {
      x: 108,
      y: 202,
      color: "#6c817a",
      fontSize: 22,
    },
    body: {
      x: 108,
      y: 292,
      color: "#27312f",
      fontSize: 28,
      lineHeight: 54,
      sectionGap: 34,
    },
    brand: {
      x: 108,
      y: 910,
      color: "#94a9a2",
      fontSize: 13,
      text: "Poem Creation",
    },
  },
  "antique-tag": {
    kind: "antique-tag",
    background: { from: "#e6c57e", to: "#bd8144" },
    speckles: { count: 58, color: "#9d7744" },
    outerPanel: {
      x: 38,
      y: 34,
      width: 684,
      height: 982,
      fill: "#ffefca",
    },
    paper: {
      x: 80,
      y: 84,
      width: 600,
      height: 878,
      gradient: { from: "#fff3d6", to: "#f8dfaa" },
      speckles: { count: 46, color: "#b99258" },
    },
    horizontalRules: [
      { fromX: 160, toX: 680, y: 86, color: "#c9aa72", lineWidth: 1.5 },
      { fromX: 80, toX: 680, y: 963, color: "#c9aa72", lineWidth: 1.5 },
    ],
    tag: {
      x: 74,
      y: 82,
      width: 74,
      height: 132,
      fill: "#bd473e",
      textColor: "#fff6e8",
      textX: 111,
      textY: 104,
      fontSize: 24,
      charGap: 30,
    },
    title: {
      x: 160,
      y: 104,
      color: "#2b2019",
      fontSize: 29,
      minFontSize: 21,
      maxWidth: 490,
      weight: "700",
    },
    author: {
      x: 160,
      y: 149,
      color: "#7a5b41",
      fontSize: 21,
    },
    body: {
      x: POEM_EXPORT_IMAGE_CANVAS.width / 2,
      y: 260,
      color: "#2b2019",
      fontSize: 28,
      lineHeight: 52,
      sectionGap: 36,
      align: "center",
    },
    seal: {
      x: 606,
      y: 776,
      size: 46,
    },
  },
  "compact-paper": {
    kind: "compact-paper",
    background: { from: "#f6ead5", to: "#f3e0bc" },
    speckles: { count: 52, color: "#bd955e" },
    paper: {
      x: 28,
      y: 28,
      width: 704,
      height: 994,
      fill: "#fff9eb",
    },
    border: {
      x: 40,
      y: 40,
      width: 680,
      height: 972,
      stroke: "#cfa965",
      lineWidth: 1,
    },
    title: {
      x: POEM_EXPORT_IMAGE_CANVAS.width / 2,
      y: 74,
      color: "#2a2019",
      fontSize: 34,
      minFontSize: 24,
      maxWidth: 520,
      weight: "700",
      align: "center",
    },
    author: {
      x: POEM_EXPORT_IMAGE_CANVAS.width / 2,
      y: 130,
      color: "#735f4a",
      fontSize: 20,
      align: "center",
    },
    body: {
      x: POEM_EXPORT_IMAGE_CANVAS.width / 2,
      y: 216,
      color: "#2a2019",
      fontSize: 27,
      lineHeight: 50,
      sectionGap: 34,
      align: "center",
    },
  },
};
