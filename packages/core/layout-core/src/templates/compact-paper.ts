import type {
  PoemExportBaseImageConfig,
  PoemExportBodyConfig,
  PoemExportLayoutValue,
  PoemExportRectConfig,
  PoemExportTemplate,
  PoemExportTextBlockConfig,
} from "../schema.js";

// 素笺居中模板的渲染器配置类型。
// 这个模板保持居中的古典构图，只使用纸纹和细边框作为装饰。
// V=number 为解析后配置（渲染用），V=PoemExportLayoutValue 为原始模板配置。
export type CompactPaperImageConfig<V = number> = PoemExportBaseImageConfig & {
  kind: "compact-paper";
  paper: PoemExportRectConfig<V> & {
    fill: string;
  };
  border: PoemExportRectConfig<V> & {
    stroke: string;
    lineWidth: V;
  };
  title: PoemExportTextBlockConfig<V>;
  author: PoemExportTextBlockConfig<V>;
  body: PoemExportBodyConfig<V>;
};

export const COMPACT_PAPER_TEMPLATE_META: PoemExportTemplate = {
  id: "compact-paper",
  name: "素笺居中",
  description: "居中排版、细框纸纹，适合经典词作导出。",
};

// 素笺居中：居中经典构图，装饰最少。
export const COMPACT_PAPER_TEMPLATE_CONFIG = {
  kind: "compact-paper" as const,
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
    fontSize: "canvas.short * 0.025",
    lineHeight: "body.fontSize * 1.9",
    sectionGap: "body.lineHeight * 1.2",
    maxWidth: "border.width - 16%",
    align: "center",
  },
} satisfies CompactPaperImageConfig<PoemExportLayoutValue>;
