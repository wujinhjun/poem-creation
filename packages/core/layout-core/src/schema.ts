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

// 布局配置按值类型参数化：
// - V = number（默认）→ 解析后的配置，位置量都是纯数值，供渲染器使用。
// - V = PoemExportLayoutValue → 原始模板配置，位置量可为表达式字符串。
export type PoemExportRectConfig<V = number> = {
  x: V;
  y: V;
  width: V;
  height: V;
};

export type PoemExportTextBlockConfig<V = number> = {
  x: V;
  y: V;
  color: string;
  fontSize: V;
  minFontSize?: V;
  maxWidth?: V;
  weight?: string;
  align?: PoemExportTextAlign;
};

export type PoemExportBodyConfig<V = number> = PoemExportTextBlockConfig<V> & {
  lineHeight: V;
  sectionGap: V;
};

export type PoemExportBaseImageConfig = {
  background: PoemExportGradientConfig;
  speckles: PoemExportSpeckleConfig;
};
