import type { CompactPaperImageConfig, PoemLayoutDocument } from '@poem/layout-core';
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

// 素笺居中：背景纸纹 -> 纸面 -> 细边框 -> 居中标题/作者 -> 居中正文。
// 这个模板装饰最少，主要服务经典词作的稳定阅读。
export function renderCompactPaper(
  document: PoemLayoutDocument,
  config: CompactPaperImageConfig,
  canvasWidth: number,
  canvasHeight: number,
): string {
  const { canvas, ctx, width, height } = setupCanvas(canvasWidth, canvasHeight);
  fillBackground(ctx, width, height, config.background.from, config.background.to);
  drawSpeckles(ctx, width, height, config.speckles.count, config.speckles.color);

  ctx.fillStyle = config.paper.fill;
  ctx.fillRect(config.paper.x, config.paper.y, config.paper.width, config.paper.height);
  ctx.strokeStyle = config.border.stroke;
  ctx.lineWidth = config.border.lineWidth;
  ctx.strokeRect(config.border.x, config.border.y, config.border.width, config.border.height);

  // 标题和正文都使用居中坐标；具体居中与否由模板配置的 align 决定。
  ctx.fillStyle = config.title.color;
  ctx.textAlign = config.title.align ?? 'left';
  const titleRegionWidth = config.title.maxWidth ?? width;
  const titleRegionLeft = config.title.x - titleRegionWidth / 2;
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
    titleRegionLeft,
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

  // 细边框底部是正文的下边界，留出 52px 防止末行贴边。
  const bodyAvailableHeight = Math.max(
    120,
    config.border.y + config.border.height - config.body.y - 52,
  );
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

  drawCenteredSectionedBody(
    ctx,
    document,
    textAnchorX(bodyLeft, bodyWidth, config.body.align),
    config.body.y,
    bodyAvailableHeight,
    body.lineHeight,
    body.sectionGap,
    {
      font: `${body.fontSize}px ${SERIF_FONT}`,
      fillStyle: config.body.color,
      align: config.body.align,
    },
  );

  return canvas.toDataURL('image/png');
}
