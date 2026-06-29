import type { AntiqueTagImageConfig, PoemLayoutDocument } from '@poem/layout-core';
import {
  drawCenteredSectionedBody,
  drawSpeckles,
  fillBackground,
  fitBody,
  fitFont,
  KAI_FONT,
  SERIF_FONT,
  setupCanvas,
  textAnchorX,
  textLeftX,
} from '../canvas';

// 题签笺的印章是模板私有装饰，不放到公共 canvas 工具里，
// 避免所有模板都背上古风元素的概念。
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

// 题签笺：暖色底 -> 外层纸面 -> 内层纸纹 -> 横线 -> 竖题签 ->
// 标题/作者 -> 居中正文 -> 作者首字印章。
export function renderAntiqueTag(
  document: PoemLayoutDocument,
  config: AntiqueTagImageConfig,
  canvasWidth: number,
  canvasHeight: number,
): string {
  const { canvas, ctx, width, height } = setupCanvas(canvasWidth, canvasHeight);
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

  // 横线和题签共同构成这个模板的视觉骨架。
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
  // 题签只放主标题，遇到 “词牌·题名” 时取词牌前半段，避免竖排过长。
  Array.from(mainTitle(document.title)).forEach((char, index) => {
    ctx.fillText(char, config.tag.textX, config.tag.textY + index * config.tag.charGap);
  });

  ctx.fillStyle = config.title.color;
  ctx.textAlign = config.title.align ?? 'left';
  const titleRegionWidth = config.title.maxWidth ?? width;
  ctx.font = fitFont(
    ctx,
    document.title,
    config.title.fontSize,
    config.title.minFontSize ?? config.title.fontSize,
    titleRegionWidth,
    SERIF_FONT,
    config.title.weight,
  );
  const titleAnchor = textAnchorX(
    config.title.x,
    titleRegionWidth,
    config.title.align,
  );
  const titleTextWidth = ctx.measureText(document.title).width;
  const titleTextLeft = textLeftX(titleAnchor, titleTextWidth, config.title.align);
  ctx.fillText(
    document.title,
    titleAnchor,
    config.title.y,
  );
  if (document.author) {
    ctx.fillStyle = config.author.color;
    ctx.font = `${config.author.fontSize}px ${KAI_FONT}`;
    ctx.textAlign = config.author.align ?? 'left';
    ctx.fillText(
      document.author,
      textAnchorX(titleTextLeft, titleTextWidth, config.author.align),
      config.author.y,
    );
  }

  // 印章在右下角，不应把整个正文区截短；正文以下方横线内侧为下边界。
  const bodyAvailableHeight = Math.max(120, config.paper.y + config.paper.height - config.body.y - 92);
  const body = fitBody({
    document,
    fontSize: config.body.fontSize,
    lineHeight: config.body.lineHeight,
    sectionGap: config.body.sectionGap,
    availableHeight: bodyAvailableHeight,
    minFontSize: 18,
  });
  const bodyWidth = config.body.maxWidth ?? width;
  const bodyLeft = config.body.x - bodyWidth / 2;
  const bodyStyle = {
    font: `${body.fontSize}px ${SERIF_FONT}`,
    fillStyle: config.body.color,
    align: config.body.align,
  };

  drawCenteredSectionedBody(
    ctx,
    document,
    textAnchorX(bodyLeft, bodyWidth, config.body.align),
    config.body.y,
    bodyAvailableHeight,
    body.lineHeight,
    body.sectionGap,
    bodyStyle,
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
