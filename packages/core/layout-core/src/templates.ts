import type {
  PoemExportLayoutValue,
  PoemExportRatio,
  PoemExportRatioId,
  PoemExportTemplateId,
} from "./schema.js";
import type {
  PoemExportImageTemplateConfig,
  RawPoemExportImageTemplateConfig,
} from "./templates/registry.js";
import { POEM_EXPORT_IMAGE_TEMPLATE_CONFIGS, POEM_EXPORT_TEMPLATES } from "./templates/registry.js";

export { POEM_EXPORT_IMAGE_TEMPLATE_CONFIGS, POEM_EXPORT_TEMPLATES };

export const DEFAULT_POEM_EXPORT_TEMPLATE_ID = "modern-whitespace";

// 早期样张使用的基准尺寸。实际导出会使用用户选择的比例，
// 因此模板应优先使用相对表达式，不要依赖这个固定画布。
export const POEM_EXPORT_IMAGE_CANVAS = {
  width: 760,
  height: 1050,
};

export const DEFAULT_POEM_EXPORT_RATIO_ID = "3:4";

// 网页端和未来原生端渲染器共享的导出比例。
export const POEM_EXPORT_RATIOS: PoemExportRatio[] = [
  { id: "4:3", label: "4:3", width: 900, height: 1200 },
  { id: "16:9", label: "16:9", width: 900, height: 1600 },
  { id: "9:16", label: "9:16", width: 1600, height: 900 },
  { id: "3:4", label: "3:4", width: 1200, height: 900 },
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

// 百分比会感知当前轴向：横向值基于画布宽度，纵向值基于画布高度，
// 字号、线宽等尺寸值基于画布短边。
function percentBase(axis: LayoutAxis, canvas: PoemExportRatio): number {
  if (axis === "x") return canvas.width;
  if (axis === "y") return canvas.height;
  return Math.min(canvas.width, canvas.height);
}

// 用 sticky 匹配逐段消费表达式：遇到无法识别的字符立即报错，
// 避免旧实现"静默丢弃未知字符"掩盖模板笔误（如 "panel.left & 8%"）。
function tokenizeExpression(expression: string): string[] {
  const tokens: string[] = [];
  const matcher = /([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?|\d+(?:\.\d+)?%?|[+\-*/()])/y;
  let pos = 0;
  while (pos < expression.length) {
    while (pos < expression.length && /\s/.test(expression[pos])) pos += 1;
    if (pos >= expression.length) break;
    matcher.lastIndex = pos;
    const match = matcher.exec(expression);
    if (!match) {
      throw new Error(
        `导出版式表达式含非法字符：${expression}（位置 ${pos} 处 "${expression[pos]}"）`,
      );
    }
    tokens.push(match[1]);
    pos = matcher.lastIndex;
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

// 一个很小的坐标表达式解析器，支持类似 "panel.left + 8%" 的写法。
// 它刻意比 JavaScript 窄，避免模板配置变成可执行脚本。
// 导出以便单测直接覆盖各分支（百分比轴向、优先级、错误路径）。
export function evaluateLayoutExpression(
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
      if (operator === "/" && right === 0) {
        throw new Error(`导出版式表达式除以零：${expression}`);
      }
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

// 模板值可以是绝对数值、百分比，或引用其他区域的表达式。
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

// 槽位是区域之间的依赖图。只有在 title 区域解析完成之后，
// 模板才能引用 "title.bottom" 这样的值。
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

// 文本槽位暴露估算边界和排版指标，供后续区域引用；
// 最终的字体收缩与适配仍由具体渲染器负责。
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

// 原始矩形区域：位置量可为表达式字符串，解析时就地写回为纯数值。
type RawRectLike = {
  x: PoemExportLayoutValue;
  y: PoemExportLayoutValue;
  width: PoemExportLayoutValue;
  height: PoemExportLayoutValue;
  lineWidth?: PoemExportLayoutValue;
};

function resolveRect(
  context: LayoutContext,
  name: string,
  rect: RawRectLike,
): void {
  const x = resolveValue(rect.x, context, "x");
  const y = resolveValue(rect.y, context, "y");
  const width = resolveValue(rect.width, context, "x");
  const height = resolveValue(rect.height, context, "y");
  rect.x = x;
  rect.y = y;
  rect.width = width;
  rect.height = height;
  if (rect.lineWidth !== undefined) {
    rect.lineWidth = resolveValue(rect.lineWidth, context, "size");
  }
  updateRectSlot(context, name, { x, y, width, height });
}

// 原始文本块：位置/字号等可为表达式字符串，解析时就地写回为纯数值。
type RawTextBlockLike = {
  x: PoemExportLayoutValue;
  y: PoemExportLayoutValue;
  fontSize: PoemExportLayoutValue;
  minFontSize?: PoemExportLayoutValue;
  maxWidth?: PoemExportLayoutValue;
  lineHeight?: PoemExportLayoutValue;
  sectionGap?: PoemExportLayoutValue;
};

function resolveTextBlock(
  context: LayoutContext,
  name: string,
  block: RawTextBlockLike,
): void {
  const x = resolveValue(block.x, context, "x");
  const y = resolveValue(block.y, context, "y");
  const fontSize = resolveValue(block.fontSize, context, "size");
  block.x = x;
  block.y = y;
  block.fontSize = fontSize;
  updateTextSlot(context, name, { x, y, fontSize });

  if (block.minFontSize !== undefined) {
    block.minFontSize = resolveValue(block.minFontSize, context, "size");
  }
  let maxWidth: number | undefined;
  if (block.maxWidth !== undefined) {
    maxWidth = resolveValue(block.maxWidth, context, "x");
    block.maxWidth = maxWidth;
  }
  let lineHeight: number | undefined;
  if (block.lineHeight !== undefined) {
    lineHeight = resolveValue(block.lineHeight, context, "size");
    block.lineHeight = lineHeight;
    updateTextSlot(context, name, { x, y, fontSize, maxWidth, lineHeight });
  }
  let sectionGap: number | undefined;
  if (block.sectionGap !== undefined) {
    sectionGap = resolveValue(block.sectionGap, context, "size");
    block.sectionGap = sectionGap;
  }
  updateTextSlot(context, name, { x, y, fontSize, maxWidth, lineHeight, sectionGap });
}

// 导出以便单测直接构造上下文来覆盖 evaluateLayoutExpression。
export function createLayoutContext(canvas: PoemExportRatio): LayoutContext {
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

// 把原始模板配置（含版式表达式）解析为纯数值配置。位置量在 raw 上就地写回，
// raw 与解析结果结构一致，只是值类型从 number|string 收敛为 number，
// 因此在末尾一次性收窄为对应的解析后类型。
function resolveTemplateConfig(
  canvas: PoemExportRatio,
  config: RawPoemExportImageTemplateConfig,
): PoemExportImageTemplateConfig {
  const context = createLayoutContext(canvas);
  const raw = cloneConfig(config);

  switch (raw.kind) {
    case "modern-whitespace":
      resolveRect(context, "panel", raw.panel);
      resolveRect(context, "accentBar", raw.accentBar);
      resolveTextBlock(context, "title", raw.title);
      resolveTextBlock(context, "author", raw.author);
      resolveTextBlock(context, "body", raw.body);
      resolveTextBlock(context, "brand", raw.brand);
      return raw as PoemExportImageTemplateConfig;
    case "antique-tag": {
      resolveRect(context, "outerPanel", raw.outerPanel);
      resolveRect(context, "paper", raw.paper);
      resolveRect(context, "tag", raw.tag);
      const tagTextX = resolveValue(raw.tag.textX, context, "x");
      const tagTextY = resolveValue(raw.tag.textY, context, "y");
      const tagFontSize = resolveValue(raw.tag.fontSize, context, "size");
      raw.tag.textX = tagTextX;
      raw.tag.textY = tagTextY;
      raw.tag.fontSize = tagFontSize;
      context.slots.tag.fontSize = tagFontSize;
      const tagCharGap = resolveValue(raw.tag.charGap, context, "size");
      raw.tag.charGap = tagCharGap;
      context.slots.tag.charGap = tagCharGap;
      raw.horizontalRules = raw.horizontalRules.map((rule) => ({
        ...rule,
        fromX: resolveValue(rule.fromX, context, "x"),
        toX: resolveValue(rule.toX, context, "x"),
        y: resolveValue(rule.y, context, "y"),
        lineWidth: resolveValue(rule.lineWidth, context, "size"),
      }));
      resolveTextBlock(context, "title", raw.title);
      resolveTextBlock(context, "author", raw.author);
      resolveTextBlock(context, "body", raw.body);
      raw.seal.x = resolveValue(raw.seal.x, context, "x");
      raw.seal.y = resolveValue(raw.seal.y, context, "y");
      raw.seal.size = resolveValue(raw.seal.size, context, "size");
      return raw as PoemExportImageTemplateConfig;
    }
    case "compact-paper":
      resolveRect(context, "paper", raw.paper);
      resolveRect(context, "border", raw.border);
      resolveTextBlock(context, "title", raw.title);
      resolveTextBlock(context, "author", raw.author);
      resolveTextBlock(context, "body", raw.body);
      return raw as PoemExportImageTemplateConfig;
    default:
      throw new Error(`未知导出模板类型：${String(config.kind)}`);
  }
}

// 公共解析入口。App 只需要选择模板与比例，拿到的配置已经是纯数值，
// 不需要在渲染器里再次理解表达式。
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
