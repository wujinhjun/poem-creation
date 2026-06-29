import type { PoemExportTextAlign, PoemLayoutDocument } from '@poem/layout-core';

// Canvas 不能像 DOM 一样依赖 CSS 字体栈继承，因此导出图片的字体栈
// 集中放在这里，保证各模板的宋体、楷体、无衬线选择一致。
export const SERIF_FONT =
  '"Songti SC", "STSong", "Noto Serif CJK SC", "Source Han Serif SC", serif';
export const KAI_FONT = '"Kaiti SC", "STKaiti", "Songti SC", "STSong", serif';
export const SANS_FONT =
  '"Avenir Next", "Helvetica Neue", Arial, "PingFang SC", sans-serif';

export type CanvasSetup = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
};

export type TextStyle = {
  font: string;
  fillStyle: string;
  align?: CanvasTextAlign;
};

export type BodyFit = {
  fontSize: number;
  lineHeight: number;
  sectionGap: number;
};

export function setupCanvas(width: number, height: number): CanvasSetup {
  const scale = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器不支持图片导出');

  ctx.scale(scale, scale);
  ctx.textBaseline = 'top';
  return { canvas, ctx, width, height };
}

// 用固定公式生成纸纹位置，避免每次预览刷新时纹理跳动。
function pseudoRandom(index: number): number {
  const value = Math.sin(index * 97.13) * 10000;
  return value - Math.floor(value);
}

export function fillBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  from: string,
  to: string,
): void {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, from);
  gradient.addColorStop(1, to);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export function drawSpeckles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  count: number,
  color: string,
): void {
  ctx.fillStyle = color;
  for (let index = 0; index < count; index += 1) {
    const x = 28 + pseudoRandom(index + 1) * (width - 56);
    const y = 24 + pseudoRandom(index + 23) * (height - 48);
    const radius = 0.7 + pseudoRandom(index + 47) * 1.1;
    ctx.globalAlpha = 0.18 + pseudoRandom(index + 71) * 0.2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  baseSize: number,
  minSize: number,
  maxWidth: number,
  family: string,
  weight = '400',
): string {
  // 标题只做单行缩小，不换行；模板通过 maxWidth 控制可用宽度。
  let size = baseSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  return `${weight} ${size}px ${family}`;
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  style: TextStyle,
): number {
  ctx.font = style.font;
  ctx.fillStyle = style.fillStyle;
  ctx.textAlign = style.align ?? 'left';
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
  return y + lines.length * lineHeight;
}

export function drawSectionedBody(
  ctx: CanvasRenderingContext2D,
  document: PoemLayoutDocument,
  x: number,
  y: number,
  lineHeight: number,
  sectionGap: number,
  style: TextStyle,
): number {
  // PoemLayoutDocument 已经把上下片/段落切成 sections；
  // renderer 只负责按 sectionGap 留出视觉停顿。
  let cursorY = y;
  document.sections.forEach((section, index) => {
    if (index > 0) cursorY += sectionGap;
    cursorY = drawLines(ctx, section.lines, x, cursorY, lineHeight, style);
  });
  return cursorY;
}

function sectionedBodyHeight(
  document: PoemLayoutDocument,
  lineHeight: number,
  sectionGap: number,
): number {
  const lineCount = bodyLineCount(document);
  const gapCount = Math.max(0, document.sections.length - 1);
  return lineCount * lineHeight + gapCount * sectionGap;
}

export function drawCenteredSectionedBody(
  ctx: CanvasRenderingContext2D,
  document: PoemLayoutDocument,
  x: number,
  y: number,
  availableHeight: number,
  lineHeight: number,
  sectionGap: number,
  style: TextStyle,
): number {
  // 长词不能把上下阙硬塞进等高格子，否则阙间距会被挤没。
  // 这里保留真实段距，只把整块正文放到模板预留区域的视觉中心。
  const bodyHeight = sectionedBodyHeight(document, lineHeight, sectionGap);
  const startY = y + Math.max(0, (availableHeight - bodyHeight) / 2);
  return drawSectionedBody(ctx, document, x, startY, lineHeight, sectionGap, style);
}

export function textAnchorX(
  regionLeft: number,
  regionWidth: number,
  align: PoemExportTextAlign | undefined,
): number {
  if (align === 'center') return regionLeft + regionWidth / 2;
  if (align === 'right') return regionLeft + regionWidth;
  return regionLeft;
}

export function textLeftX(
  anchorX: number,
  textWidth: number,
  align: PoemExportTextAlign | undefined,
): number {
  if (align === 'center') return anchorX - textWidth / 2;
  if (align === 'right') return anchorX - textWidth;
  return anchorX;
}

function bodyLineCount(document: PoemLayoutDocument): number {
  return document.sections.reduce((sum, section) => sum + section.lines.length, 0);
}

function roundLayout(value: number): number {
  return Math.round(value * 100) / 100;
}

export function fitBody({
  document,
  fontSize,
  lineHeight,
  sectionGap,
  availableHeight,
  minFontSize,
}: {
  document: PoemLayoutDocument;
  fontSize: number;
  lineHeight: number;
  sectionGap: number;
  availableHeight: number;
  minFontSize: number;
}): BodyFit {
  // 正文保持原始行分组，不做截断。高度不足时按比例缩小字号、行距和段距，
  // 避免只压缩 sectionGap 造成上下阙贴在一起。
  const lineCount = bodyLineCount(document);
  const gapCount = Math.max(0, document.sections.length - 1);
  const totalHeight = (nextLineHeight: number, nextSectionGap: number) =>
    lineCount * nextLineHeight + gapCount * nextSectionGap;
  const neededHeight = totalHeight(lineHeight, sectionGap);
  if (neededHeight <= availableHeight || neededHeight <= 0) {
    return { fontSize, lineHeight, sectionGap };
  }

  const scale = Math.max(minFontSize / fontSize, availableHeight / neededHeight);
  return {
    fontSize: roundLayout(fontSize * scale),
    lineHeight: roundLayout(lineHeight * scale),
    sectionGap: roundLayout(sectionGap * scale),
  };
}
