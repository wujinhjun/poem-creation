import type { ToneConstraint } from '@poem/parser/kernel';
import {
  POEM_EXPORT_IMAGE_CANVAS,
  POEM_EXPORT_IMAGE_TEMPLATE_CONFIGS,
  formatPoemText as formatLayoutPoemText,
  type AntiqueTagImageConfig,
  type CompactPaperImageConfig,
  type ModernWhitespaceImageConfig,
  type PoemExportTemplateId,
  type PoemLayoutDocument,
} from '@poem/layout-core';

export function formatPoemText({
  title,
  author,
  description,
  chars,
  pattern,
  visualLineGroups,
  sectionBreakBeforeGroups,
}: {
  title: string;
  author: string;
  description: string;
  chars: string[][];
  pattern: ToneConstraint[][];
  visualLineGroups?: number[][];
  sectionBreakBeforeGroups?: number[];
}): string {
  return formatLayoutPoemText({
    title,
    author,
    description,
    chars,
    pattern,
    visualLineGroups,
    sectionBreakBeforeGroups,
  });
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

const SERIF_FONT =
  '"Songti SC", "STSong", "Noto Serif CJK SC", "Source Han Serif SC", serif';
const KAI_FONT = '"Kaiti SC", "STKaiti", "Songti SC", "STSong", serif';
const SANS_FONT =
  '"Avenir Next", "Helvetica Neue", Arial, "PingFang SC", sans-serif';

type CanvasSetup = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
};

type TextStyle = {
  font: string;
  fillStyle: string;
  align?: CanvasTextAlign;
};

function setupCanvas(width: number, height: number): CanvasSetup {
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

function pseudoRandom(index: number): number {
  const value = Math.sin(index * 97.13) * 10000;
  return value - Math.floor(value);
}

function fillBackground(
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

function drawSpeckles(
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

function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  baseSize: number,
  minSize: number,
  maxWidth: number,
  family: string,
  weight = '400',
): string {
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

function drawSectionedBody(
  ctx: CanvasRenderingContext2D,
  document: PoemLayoutDocument,
  x: number,
  y: number,
  lineHeight: number,
  sectionGap: number,
  style: TextStyle,
): number {
  let cursorY = y;
  document.sections.forEach((section, index) => {
    if (index > 0) cursorY += sectionGap;
    cursorY = drawLines(ctx, section.lines, x, cursorY, lineHeight, style);
  });
  return cursorY;
}

function drawSeal(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size = 42,
): void {
  if (!text) return;
  ctx.save();
  ctx.fillStyle = '#b8463d';
  ctx.strokeStyle = '#b8463d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 4);
  ctx.fill();
  ctx.strokeStyle = '#fff3df';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 6, y + 6, size - 12, size - 12);
  ctx.fillStyle = '#fff3df';
  ctx.font = `22px ${KAI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.slice(0, 1), x + size / 2, y + size / 2 + 1);
  ctx.restore();
}

function authorSealText(author: string): string {
  return author.trim().slice(0, 1);
}

function mainTitle(title: string): string {
  return title.split(/[·・]/)[0]?.trim() || title;
}

function renderModernWhitespace(
  document: PoemLayoutDocument,
  config: ModernWhitespaceImageConfig,
): string {
  const { canvas, ctx, width, height } = setupCanvas(
    POEM_EXPORT_IMAGE_CANVAS.width,
    POEM_EXPORT_IMAGE_CANVAS.height,
  );
  fillBackground(ctx, width, height, config.background.from, config.background.to);
  drawSpeckles(ctx, width, height, config.speckles.count, config.speckles.color);

  ctx.fillStyle = config.panel.fill;
  ctx.fillRect(config.panel.x, config.panel.y, config.panel.width, config.panel.height);
  ctx.strokeStyle = config.panel.stroke;
  ctx.lineWidth = config.panel.lineWidth;
  ctx.strokeRect(config.panel.x, config.panel.y, config.panel.width, config.panel.height);

  ctx.fillStyle = config.accentBar.fill;
  ctx.fillRect(
    config.accentBar.x,
    config.accentBar.y,
    config.accentBar.width,
    config.accentBar.height,
  );

  ctx.fillStyle = config.title.color;
  ctx.textAlign = config.title.align ?? 'left';
  ctx.font = fitFont(
    ctx,
    document.title,
    config.title.fontSize,
    config.title.minFontSize ?? config.title.fontSize,
    config.title.maxWidth ?? width,
    SERIF_FONT,
    config.title.weight,
  );
  ctx.fillText(document.title, config.title.x, config.title.y);

  if (document.author) {
    ctx.fillStyle = config.author.color;
    ctx.font = `${config.author.fontSize}px ${KAI_FONT}`;
    ctx.fillText(document.author, config.author.x, config.author.y);
  }

  drawSectionedBody(
    ctx,
    document,
    config.body.x,
    config.body.y,
    config.body.lineHeight,
    config.body.sectionGap,
    {
      font: `${config.body.fontSize}px ${SERIF_FONT}`,
      fillStyle: config.body.color,
      align: config.body.align,
    },
  );

  ctx.fillStyle = config.brand.color;
  ctx.font = `${config.brand.fontSize}px ${SANS_FONT}`;
  ctx.fillText(config.brand.text, config.brand.x, config.brand.y);

  return canvas.toDataURL('image/png');
}

function renderAntiqueTag(
  document: PoemLayoutDocument,
  config: AntiqueTagImageConfig,
): string {
  const { canvas, ctx, width, height } = setupCanvas(
    POEM_EXPORT_IMAGE_CANVAS.width,
    POEM_EXPORT_IMAGE_CANVAS.height,
  );
  fillBackground(ctx, width, height, config.background.from, config.background.to);
  drawSpeckles(ctx, width, height, config.speckles.count, config.speckles.color);

  ctx.fillStyle = config.outerPanel.fill;
  ctx.fillRect(
    config.outerPanel.x,
    config.outerPanel.y,
    config.outerPanel.width,
    config.outerPanel.height,
  );

  const paperGradient = ctx.createLinearGradient(
    config.paper.x,
    config.paper.y,
    config.paper.x + config.paper.width,
    config.paper.y + config.paper.height,
  );
  paperGradient.addColorStop(0, config.paper.gradient.from);
  paperGradient.addColorStop(1, config.paper.gradient.to);
  ctx.fillStyle = paperGradient;
  ctx.fillRect(config.paper.x, config.paper.y, config.paper.width, config.paper.height);
  drawSpeckles(ctx, width, height, config.paper.speckles.count, config.paper.speckles.color);

  config.horizontalRules.forEach((rule) => {
    ctx.strokeStyle = rule.color;
    ctx.lineWidth = rule.lineWidth;
    ctx.beginPath();
    ctx.moveTo(rule.fromX, rule.y);
    ctx.lineTo(rule.toX, rule.y);
    ctx.stroke();
  });

  ctx.fillStyle = config.tag.fill;
  ctx.fillRect(config.tag.x, config.tag.y, config.tag.width, config.tag.height);
  ctx.fillStyle = config.tag.textColor;
  ctx.font = `${config.tag.fontSize}px ${KAI_FONT}`;
  ctx.textAlign = 'center';
  Array.from(mainTitle(document.title)).forEach((char, index) => {
    ctx.fillText(char, config.tag.textX, config.tag.textY + index * config.tag.charGap);
  });

  ctx.fillStyle = config.title.color;
  ctx.textAlign = 'left';
  ctx.font = fitFont(
    ctx,
    document.title,
    config.title.fontSize,
    config.title.minFontSize ?? config.title.fontSize,
    config.title.maxWidth ?? width,
    SERIF_FONT,
    config.title.weight,
  );
  ctx.fillText(document.title, config.title.x, config.title.y);
  if (document.author) {
    ctx.fillStyle = config.author.color;
    ctx.font = `${config.author.fontSize}px ${KAI_FONT}`;
    ctx.fillText(document.author, config.author.x, config.author.y);
  }

  drawSectionedBody(
    ctx,
    document,
    config.body.x,
    config.body.y,
    config.body.lineHeight,
    config.body.sectionGap,
    {
      font: `${config.body.fontSize}px ${SERIF_FONT}`,
      fillStyle: config.body.color,
      align: config.body.align,
    },
  );

  drawSeal(
    ctx,
    authorSealText(document.author),
    config.seal.x,
    config.seal.y,
    config.seal.size,
  );
  return canvas.toDataURL('image/png');
}

function renderCompactPaper(
  document: PoemLayoutDocument,
  config: CompactPaperImageConfig,
): string {
  const { canvas, ctx, width, height } = setupCanvas(
    POEM_EXPORT_IMAGE_CANVAS.width,
    POEM_EXPORT_IMAGE_CANVAS.height,
  );
  fillBackground(ctx, width, height, config.background.from, config.background.to);
  drawSpeckles(ctx, width, height, config.speckles.count, config.speckles.color);

  ctx.fillStyle = config.paper.fill;
  ctx.fillRect(config.paper.x, config.paper.y, config.paper.width, config.paper.height);
  ctx.strokeStyle = config.border.stroke;
  ctx.lineWidth = config.border.lineWidth;
  ctx.strokeRect(config.border.x, config.border.y, config.border.width, config.border.height);

  ctx.fillStyle = config.title.color;
  ctx.textAlign = config.title.align ?? 'left';
  ctx.font = fitFont(
    ctx,
    document.title,
    config.title.fontSize,
    config.title.minFontSize ?? config.title.fontSize,
    config.title.maxWidth ?? width,
    SERIF_FONT,
    config.title.weight,
  );
  ctx.fillText(document.title, config.title.x, config.title.y);

  if (document.author) {
    ctx.fillStyle = config.author.color;
    ctx.font = `${config.author.fontSize}px ${KAI_FONT}`;
    ctx.textAlign = config.author.align ?? 'left';
    ctx.fillText(document.author, config.author.x, config.author.y);
  }

  drawSectionedBody(
    ctx,
    document,
    config.body.x,
    config.body.y,
    config.body.lineHeight,
    config.body.sectionGap,
    {
      font: `${config.body.fontSize}px ${SERIF_FONT}`,
      fillStyle: config.body.color,
      align: config.body.align,
    },
  );

  return canvas.toDataURL('image/png');
}

export function createTextImageDataUrl(
  document: PoemLayoutDocument,
  templateId: PoemExportTemplateId,
): string {
  const config = POEM_EXPORT_IMAGE_TEMPLATE_CONFIGS[templateId];
  switch (config.kind) {
    case 'antique-tag':
      return renderAntiqueTag(document, config);
    case 'compact-paper':
      return renderCompactPaper(document, config);
    case 'modern-whitespace':
    default:
      return renderModernWhitespace(document, config);
  }
}

function imageFilename(title: string): string {
  const safeTitle = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 80);
  return `${safeTitle || 'poem-export'}.png`;
}

export function downloadImageDataUrl(dataUrl: string, title = ''): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = imageFilename(title);
  link.click();
}
