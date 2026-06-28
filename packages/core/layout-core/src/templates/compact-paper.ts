import type {
  PoemExportBaseImageConfig,
  PoemExportBodyConfig,
  PoemExportRectConfig,
  PoemExportTemplate,
  PoemExportTextBlockConfig,
} from "../schema.js";

// Resolved renderer config for the compact paper template.
// This template keeps a centered, classical composition with only paper texture
// and a thin border as ornamentation.
export type CompactPaperImageConfig = PoemExportBaseImageConfig & {
  kind: "compact-paper";
  paper: PoemExportRectConfig & {
    fill: string;
  };
  border: PoemExportRectConfig & {
    stroke: string;
    lineWidth: number;
  };
  title: PoemExportTextBlockConfig;
  author: PoemExportTextBlockConfig;
  body: PoemExportBodyConfig;
};

export const COMPACT_PAPER_TEMPLATE_META: PoemExportTemplate = {
  id: "compact-paper",
  name: "素笺居中",
  description: "居中排版、细框纸纹，适合经典词作导出。",
};

// Compact paper: centered classic composition with the least ornamentation.
export const COMPACT_PAPER_TEMPLATE_CONFIG = {
  kind: "compact-paper",
  background: { from: "#fff9eb", to: "#fff9eb" },
  speckles: { count: 24, color: "#bd955e" },
  paper: {
    x: "canvas.left + 4%",
    y: "canvas.top + 4%",
    width: "canvas.width - 8%",
    height: "canvas.height - 8%",
    fill: "#fff9eb",
  },
  border: {
    x: "paper.left + 1.5%",
    y: "paper.top + 1.5%",
    width: "paper.width - 3%",
    height: "paper.height - 3%",
    stroke: "#cfa965",
    lineWidth: 1,
  },
  title: {
    x: "canvas.width / 2",
    y: "border.top + 4%",
    color: "#2a2019",
    fontSize: "canvas.short * 0.04",
    minFontSize: 24,
    maxWidth: "border.width - 16%",
    weight: "700",
    align: "center",
  },
  author: {
    x: "title.left",
    y: "title.bottom + 18",
    color: "#735f4a",
    fontSize: "title.fontSize * 0.58",
    align: "center",
  },
  body: {
    x: "canvas.width / 2",
    y: "author.bottom + 60",
    color: "#2a2019",
    fontSize: "canvas.short * 0.03",
    lineHeight: "body.fontSize * 1.85",
    sectionGap: "body.lineHeight * 0.68",
    maxWidth: "border.width - 16%",
    align: "center",
  },
};
