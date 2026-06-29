import type { ModernWhitespaceImageConfig, PoemLayoutDocument } from '@poem/layout-core';
import {
  drawCenteredSectionedBody,
  drawSpeckles,
  fillBackground,
  fitBody,
  fitFont,
  KAI_FONT,
  SANS_FONT,
  SERIF_FONT,
  setupCanvas,
  textAnchorX,
  textLeftX,
} from '../canvas';

// 现代留白：背景纸纹 -> 纸面边框 -> 强调线 -> 标题/作者 -> 正文 -> 品牌。
// 这个模板的核心是左对齐和较大的留白，适合更接近编辑器/现代海报的导出。
export function renderModernWhitespace(
  document: PoemLayoutDocument,
  config: ModernWhitespaceImageConfig,
  canvasWidth: number,
  canvasHeight: number,
): string {
  const { canvas, ctx, width, height } = setupCanvas(canvasWidth, canvasHeight);
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

  // 品牌位固定在纸面底部，正文的可用高度以它为下边界。
  const bodyAvailableHeight = Math.max(120, config.brand.y - config.body.y - 32);
  const body = fitBody({
    document,
    fontSize: config.body.fontSize,
    lineHeight: config.body.lineHeight,
    sectionGap: config.body.sectionGap,
    availableHeight: bodyAvailableHeight,
    minFontSize: 18,
  });
  const bodyWidth = config.body.maxWidth ?? width;

  drawCenteredSectionedBody(
    ctx,
    document,
    textAnchorX(config.body.x, bodyWidth, config.body.align),
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

  ctx.fillStyle = config.brand.color;
  ctx.font = `${config.brand.fontSize}px ${SANS_FONT}`;
  ctx.fillText(config.brand.text, config.brand.x, config.brand.y);

  return canvas.toDataURL('image/png');
}
