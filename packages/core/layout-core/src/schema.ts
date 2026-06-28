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

export type PoemExportTextAlign = "left" | "center" | "right";

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

export type PoemExportImageTemplateConfig =
  | ModernWhitespaceImageConfig
  | AntiqueTagImageConfig
  | CompactPaperImageConfig;
