import type {
  PoemExportBaseImageConfig,
  PoemExportBodyConfig,
  PoemExportGradientConfig,
  PoemExportRectConfig,
  PoemExportSpeckleConfig,
  PoemExportTemplate,
  PoemExportTextBlockConfig,
} from "../schema.js";

// Resolved renderer config for the antique tag template.
// The visual identity comes from the vertical red tag, warm backing, paper
// rules, and seal; the paper surface itself stays a unified color.
export type AntiqueTagImageConfig = PoemExportBaseImageConfig & {
  kind: "antique-tag";
  outerPanel: PoemExportRectConfig & {
    fill: string;
  };
  paper: PoemExportRectConfig & {
    gradient: PoemExportGradientConfig;
    speckles: PoemExportSpeckleConfig;
  };
  horizontalRules: Array<{
    fromX: number;
    toX: number;
    y: number;
    color: string;
    lineWidth: number;
  }>;
  tag: PoemExportRectConfig & {
    fill: string;
    textColor: string;
    textX: number;
    textY: number;
    fontSize: number;
    charGap: number;
  };
  title: PoemExportTextBlockConfig;
  author: PoemExportTextBlockConfig;
  body: PoemExportBodyConfig;
  seal: {
    x: number;
    y: number;
    size: number;
  };
};

export const ANTIQUE_TAG_TEMPLATE_META: PoemExportTemplate = {
  id: "antique-tag",
  name: "题签笺",
  description: "竖向题签、暖色笺纸与落款印章。",
};

// Antique tag: warm backing plus one unified paper layer. The paper and panel
// intentionally share the same fill; rules, tag, and seal provide the depth.
export const ANTIQUE_TAG_TEMPLATE_CONFIG = {
  kind: "antique-tag",
  background: { from: "#f0d091", to: "#c99553" },
  speckles: { count: 42, color: "#9d7744" },
  outerPanel: {
    x: "canvas.left + 5%",
    y: "canvas.top + 3.5%",
    width: "canvas.width - 10%",
    height: "canvas.height - 7%",
    fill: "#fff1cf",
  },
  paper: {
    x: "outerPanel.left + 6%",
    y: "outerPanel.top + 5%",
    width: "outerPanel.width - 12%",
    height: "outerPanel.height - 10%",
    gradient: { from: "#fff1cf", to: "#fff1cf" },
    speckles: { count: 36, color: "#b99258" },
  },
  horizontalRules: [
    {
      fromX: "paper.left + 12%",
      toX: "paper.right",
      y: "paper.top",
      color: "#c9aa72",
      lineWidth: 1.5,
    },
    {
      fromX: "paper.left",
      toX: "paper.right",
      y: "paper.bottom",
      color: "#c9aa72",
      lineWidth: 1.5,
    },
  ],
  tag: {
    x: "paper.left - 1%",
    y: "paper.top - 0.5%",
    width: "canvas.short * 0.08",
    height: "canvas.short * 0.145",
    fill: "#bd473e",
    textColor: "#fff6e8",
    textX: "tag.left + tag.width / 2",
    textY: "tag.top + 22",
    fontSize: "canvas.short * 0.027",
    charGap: "tag.fontSize * 1.25",
  },
  title: {
    x: "tag.right + 20",
    y: "paper.top + 20",
    color: "#2b2019",
    fontSize: "canvas.short * 0.038",
    minFontSize: 21,
    maxWidth: "paper.right - title.left - 20",
    weight: "700",
  },
  author: {
    x: "title.left",
    y: "title.bottom + 12",
    color: "#7a5b41",
    fontSize: "title.fontSize * 0.72",
  },
  body: {
    x: "canvas.width / 2",
    y: "author.bottom + 70",
    color: "#2b2019",
    fontSize: "canvas.short * 0.036",
    lineHeight: "body.fontSize * 1.62",
    sectionGap: "body.lineHeight * 0.7",
    maxWidth: "paper.width - 18%",
    align: "center",
  },
  seal: {
    x: "paper.right - 72",
    y: "paper.bottom - 190",
    size: "canvas.short * 0.052",
  },
};
