import type {
  PoemExportLayoutValue,
  PoemExportRatio,
  PoemExportRatioId,
  PoemExportTemplateId,
} from "./schema.js";
import type { PoemExportImageTemplateConfig } from "./templates/registry.js";
import { POEM_EXPORT_IMAGE_TEMPLATE_CONFIGS, POEM_EXPORT_TEMPLATES } from "./templates/registry.js";

export { POEM_EXPORT_IMAGE_TEMPLATE_CONFIGS, POEM_EXPORT_TEMPLATES };

export const DEFAULT_POEM_EXPORT_TEMPLATE_ID = "modern-whitespace";

// Legacy mock size. Runtime export uses the selected ratio, so templates should
// prefer relative expressions instead of depending on this fixed canvas.
export const POEM_EXPORT_IMAGE_CANVAS = {
  width: 760,
  height: 1050,
};

export const DEFAULT_POEM_EXPORT_RATIO_ID = "3:4";

// Shared output ratios for Web and future native renderers.
export const POEM_EXPORT_RATIOS: PoemExportRatio[] = [
  { id: "4:3", label: "4:3", width: 1200, height: 900 },
  { id: "16:9", label: "16:9", width: 1600, height: 900 },
  { id: "9:16", label: "9:16", width: 900, height: 1600 },
  { id: "3:4", label: "3:4", width: 900, height: 1200 },
  { id: "1:1", label: "1:1", width: 1200, height: 1200 },
];

type LayoutAxis = "x" | "y" | "size";

type LayoutSlot = Record<string, number>;

type LayoutContext = {
  canvas: PoemExportRatio;
  slots: Record<string, LayoutSlot>;
};

function cloneConfig<T>(config: T): T {
  return JSON.parse(JSON.stringify(config)) as T;
}

function roundLayout(value: number): number {
  return Math.round(value * 100) / 100;
}

// Percentages are axis-aware: horizontal values use canvas width, vertical
// values use canvas height, and size values use the shorter edge.
function percentBase(axis: LayoutAxis, canvas: PoemExportRatio): number {
  if (axis === "x") return canvas.width;
  if (axis === "y") return canvas.height;
  return Math.min(canvas.width, canvas.height);
}

function tokenizeExpression(expression: string): string[] {
  const tokens: string[] = [];
  const matcher = /\s*([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?|\d+(?:\.\d+)?%?|\+|-|\*|\/|\(|\))/g;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(expression)) !== null) {
    tokens.push(match[1]);
  }
  return tokens;
}

function slotValue(context: LayoutContext, token: string): number {
  const [slotName, property] = token.split(".");
  const slot = context.slots[slotName];
  if (!slot || !property || slot[property] === undefined) {
    throw new Error(`未知导出版式引用：${token}`);
  }
  return slot[property];
}

// Tiny arithmetic parser for coordinates such as "panel.left + 8%". It is kept
// deliberately narrower than JavaScript so template files stay declarative.
function evaluateLayoutExpression(
  expression: string,
  context: LayoutContext,
  axis: LayoutAxis,
): number {
  const tokens = tokenizeExpression(expression);
  let index = 0;

  const parseFactor = (): number => {
    const token = tokens[index++];
    if (!token) throw new Error(`导出版式表达式不完整：${expression}`);
    if (token === "(") {
      const value = parseExpression();
      if (tokens[index++] !== ")") {
        throw new Error(`导出版式表达式缺少右括号：${expression}`);
      }
      return value;
    }
    if (token === "-") return -parseFactor();
    if (/^\d+(?:\.\d+)?%$/.test(token)) {
      return (Number(token.slice(0, -1)) / 100) * percentBase(axis, context.canvas);
    }
    if (/^\d+(?:\.\d+)?$/.test(token)) return Number(token);
    return slotValue(context, token);
  };

  const parseTerm = (): number => {
    let value = parseFactor();
    while (tokens[index] === "*" || tokens[index] === "/") {
      const operator = tokens[index++];
      const right = parseFactor();
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  };

  function parseExpression(): number {
    let value = parseTerm();
    while (tokens[index] === "+" || tokens[index] === "-") {
      const operator = tokens[index++];
      const right = parseTerm();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  }

  const result = parseExpression();
  if (index !== tokens.length) {
    throw new Error(`无法解析导出版式表达式：${expression}`);
  }
  return roundLayout(result);
}

// Template values may be absolute numbers, percentages, or slot expressions.
function resolveValue(
  value: PoemExportLayoutValue | undefined,
  context: LayoutContext,
  axis: LayoutAxis,
  fallback = 0,
): number {
  if (value === undefined) return fallback;
  return typeof value === "number"
    ? value
    : evaluateLayoutExpression(value, context, axis);
}

// Slots are the dependency graph between regions. A template can reference
// "title.bottom" only after the title slot has been resolved.
function updateRectSlot(
  context: LayoutContext,
  name: string,
  rect: { x: number; y: number; width: number; height: number },
): void {
  context.slots[name] = {
    x: rect.x,
    y: rect.y,
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height,
  };
}

// Text slots expose estimated bounds and typography metrics for later regions;
// final font fitting still belongs to the renderer.
function updateTextSlot(
  context: LayoutContext,
  name: string,
  block: { x: number; y: number; fontSize: number; maxWidth?: number; lineHeight?: number; sectionGap?: number },
): void {
  const height = block.lineHeight ?? block.fontSize * 1.2;
  const width = block.maxWidth ?? 0;
  context.slots[name] = {
    x: block.x,
    y: block.y,
    left: block.x,
    top: block.y,
    width,
    height,
    right: block.x + width,
    bottom: block.y + height,
    fontSize: block.fontSize,
    maxWidth: width,
    lineHeight: block.lineHeight ?? height,
    sectionGap: block.sectionGap ?? 0,
  };
}

function resolveRect<T extends Record<string, unknown>>(
  context: LayoutContext,
  name: string,
  rect: T,
): T {
  const resolved = rect as T & { x: number; y: number; width: number; height: number; lineWidth?: number };
  resolved.x = resolveValue(rect.x as PoemExportLayoutValue, context, "x");
  resolved.y = resolveValue(rect.y as PoemExportLayoutValue, context, "y");
  resolved.width = resolveValue(rect.width as PoemExportLayoutValue, context, "x");
  resolved.height = resolveValue(rect.height as PoemExportLayoutValue, context, "y");
  if (rect.lineWidth !== undefined) {
    resolved.lineWidth = resolveValue(rect.lineWidth as PoemExportLayoutValue, context, "size");
  }
  updateRectSlot(context, name, resolved);
  return resolved;
}

function resolveTextBlock<T extends Record<string, unknown>>(
  context: LayoutContext,
  name: string,
  block: T,
): T {
  const resolved = block as T & {
    x: number;
    y: number;
    fontSize: number;
    minFontSize?: number;
    maxWidth?: number;
    lineHeight?: number;
    sectionGap?: number;
  };
  resolved.x = resolveValue(block.x as PoemExportLayoutValue, context, "x");
  resolved.y = resolveValue(block.y as PoemExportLayoutValue, context, "y");
  resolved.fontSize = resolveValue(block.fontSize as PoemExportLayoutValue, context, "size");
  updateTextSlot(context, name, resolved);
  if (block.minFontSize !== undefined) {
    resolved.minFontSize = resolveValue(block.minFontSize as PoemExportLayoutValue, context, "size");
  }
  if (block.maxWidth !== undefined) {
    resolved.maxWidth = resolveValue(block.maxWidth as PoemExportLayoutValue, context, "x");
  }
  if (block.lineHeight !== undefined) {
    resolved.lineHeight = resolveValue(block.lineHeight as PoemExportLayoutValue, context, "size");
    updateTextSlot(context, name, resolved);
  }
  if (block.sectionGap !== undefined) {
    resolved.sectionGap = resolveValue(block.sectionGap as PoemExportLayoutValue, context, "size");
  }
  updateTextSlot(context, name, resolved);
  return resolved;
}

function createLayoutContext(canvas: PoemExportRatio): LayoutContext {
  return {
    canvas,
    slots: {
      canvas: {
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        width: canvas.width,
        height: canvas.height,
        right: canvas.width,
        bottom: canvas.height,
        short: Math.min(canvas.width, canvas.height),
        long: Math.max(canvas.width, canvas.height),
      },
    },
  };
}

function resolveTemplateConfig(
  canvas: PoemExportRatio,
  config: unknown,
): PoemExportImageTemplateConfig {
  const context = createLayoutContext(canvas);
  const resolved = cloneConfig(config) as Record<string, any>;

  switch (resolved.kind) {
    case "modern-whitespace":
      resolveRect(context, "panel", resolved.panel);
      resolveRect(context, "accentBar", resolved.accentBar);
      resolveTextBlock(context, "title", resolved.title);
      resolveTextBlock(context, "author", resolved.author);
      resolveTextBlock(context, "body", resolved.body);
      resolveTextBlock(context, "brand", resolved.brand);
      return resolved as PoemExportImageTemplateConfig;
    case "antique-tag":
      resolveRect(context, "outerPanel", resolved.outerPanel);
      resolveRect(context, "paper", resolved.paper);
      resolveRect(context, "tag", resolved.tag);
      resolved.tag.textX = resolveValue(resolved.tag.textX, context, "x");
      resolved.tag.textY = resolveValue(resolved.tag.textY, context, "y");
      resolved.tag.fontSize = resolveValue(resolved.tag.fontSize, context, "size");
      context.slots.tag.fontSize = resolved.tag.fontSize;
      resolved.tag.charGap = resolveValue(resolved.tag.charGap, context, "size");
      context.slots.tag.charGap = resolved.tag.charGap;
      resolved.horizontalRules = resolved.horizontalRules.map((rule: Record<string, unknown>) => ({
        ...rule,
        fromX: resolveValue(rule.fromX as PoemExportLayoutValue, context, "x"),
        toX: resolveValue(rule.toX as PoemExportLayoutValue, context, "x"),
        y: resolveValue(rule.y as PoemExportLayoutValue, context, "y"),
        lineWidth: resolveValue(rule.lineWidth as PoemExportLayoutValue, context, "size"),
      }));
      resolveTextBlock(context, "title", resolved.title);
      resolveTextBlock(context, "author", resolved.author);
      resolveTextBlock(context, "body", resolved.body);
      resolved.seal.x = resolveValue(resolved.seal.x, context, "x");
      resolved.seal.y = resolveValue(resolved.seal.y, context, "y");
      resolved.seal.size = resolveValue(resolved.seal.size, context, "size");
      return resolved as PoemExportImageTemplateConfig;
    case "compact-paper":
      resolveRect(context, "paper", resolved.paper);
      resolveRect(context, "border", resolved.border);
      resolveTextBlock(context, "title", resolved.title);
      resolveTextBlock(context, "author", resolved.author);
      resolveTextBlock(context, "body", resolved.body);
      return resolved as PoemExportImageTemplateConfig;
    default:
      throw new Error(`未知导出模板类型：${String(resolved.kind)}`);
  }
}

// Public parser entry. Apps select a template and ratio, then render from the
// resolved numeric config without parsing expressions themselves.
export function parsePoemExportTemplate({
  templateId,
  ratioId = DEFAULT_POEM_EXPORT_RATIO_ID,
}: {
  templateId: PoemExportTemplateId;
  ratioId?: PoemExportRatioId;
}): {
  canvas: PoemExportRatio;
  config: PoemExportImageTemplateConfig;
} {
  const canvas =
    POEM_EXPORT_RATIOS.find((ratio) => ratio.id === ratioId) ??
    POEM_EXPORT_RATIOS.find((ratio) => ratio.id === DEFAULT_POEM_EXPORT_RATIO_ID) ??
    POEM_EXPORT_RATIOS[0];

  return {
    canvas,
    config: resolveTemplateConfig(canvas, POEM_EXPORT_IMAGE_TEMPLATE_CONFIGS[templateId]),
  };
}
