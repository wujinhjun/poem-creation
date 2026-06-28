export type LayoutConstraint = {
  type: unknown;
};

export type PoemBodyLayoutInput = {
  chars: string[][];
  pattern: LayoutConstraint[][];
  visualLineGroups?: number[][];
  sectionBreakBeforeGroups?: number[];
};

export type PoemTextLayoutInput = PoemBodyLayoutInput & {
  title: string;
  author: string;
  description: string;
};

export type PoemLayoutSection = {
  lines: string[];
};

export type PoemLayoutDocument = {
  title: string;
  author: string;
  description: string;
  sections: PoemLayoutSection[];
};

export type PoemExportTemplateId =
  | "modern-whitespace"
  | "antique-tag"
  | "compact-paper";

export type PoemExportTemplate = {
  id: PoemExportTemplateId;
  name: string;
  description: string;
};

export type PoemExportRatioId = "4:3" | "16:9" | "9:16" | "3:4" | "1:1";

// 比例 id 使用“高:宽”的产品语义，width/height 则是渲染画布的实际像素尺寸。
export type PoemExportRatio = {
  id: PoemExportRatioId;
  label: string;
  width: number;
  height: number;
};

export type PoemExportTextAlign = "left" | "center" | "right";

export type PoemExportLayoutValue = number | string;

export type PoemExportGradientConfig = {
  from: string;
  to: string;
};

export type PoemExportSpeckleConfig = {
  count: number;
  color: string;
};

export type PoemExportRectConfig = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PoemExportTextBlockConfig = {
  x: number;
  y: number;
  color: string;
  fontSize: number;
  minFontSize?: number;
  maxWidth?: number;
  weight?: string;
  align?: PoemExportTextAlign;
};

export type PoemExportBodyConfig = PoemExportTextBlockConfig & {
  lineHeight: number;
  sectionGap: number;
};

export type PoemExportBaseImageConfig = {
  background: PoemExportGradientConfig;
  speckles: PoemExportSpeckleConfig;
};
