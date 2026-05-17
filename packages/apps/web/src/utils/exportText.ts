import type { ToneConstraint } from '@poem/parser/kernel';
import { lineEndsWithRhyme } from '@poem/shared';

function formatBodyLines(
  chars: string[][],
  pattern: ToneConstraint[][],
  visualLineGroups?: number[][],
  sectionBreakBeforeGroups: number[] = [],
): string[] {
  const body: string[] = [];
  const groups =
    visualLineGroups && visualLineGroups.length > 0
      ? visualLineGroups
      : pattern.map((_, index) => [index]);

  groups.forEach((group, groupIndex) => {
    let paragraph = '';

    group.forEach((lineIndex) => {
      const text = chars[lineIndex]?.join('').trim() ?? '';
      if (!text) return;
      const endsWithRhyme = lineEndsWithRhyme(pattern[lineIndex]);
      paragraph += `${text}${endsWithRhyme ? '。' : '，'}`;
    });

    if (paragraph) {
      if (body.length > 0 && sectionBreakBeforeGroups.includes(groupIndex)) {
        body.push('');
      }
      body.push(paragraph);
    }
  });

  return body;
}

export function formatPoemText({
  title,
  author,
  description,
  selectedTune,
  chars,
  pattern,
  visualLineGroups,
  sectionBreakBeforeGroups,
}: {
  title: string;
  author: string;
  description: string;
  selectedTune: string;
  chars: string[][];
  pattern: ToneConstraint[][];
  visualLineGroups?: number[][];
  sectionBreakBeforeGroups?: number[];
}): string {
  const lines = formatBodyLines(
    chars,
    pattern,
    visualLineGroups,
    sectionBreakBeforeGroups,
  );
  const header = [
    title.trim() || selectedTune.trim() || '未题',
    author.trim(),
    description.trim(),
  ].filter(Boolean);

  return [...header, '', ...lines].join('\n');
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

export function createTextImageDataUrl(text: string): string {
  const lines = text.split('\n');
  const bodyStartIndex = lines.findIndex((line) => line.trim() === '');
  const scale = window.devicePixelRatio || 1;
  const width = 900;
  const padding = 64;
  const lineHeight = 42;
  const height = Math.max(520, padding * 2 + lines.length * lineHeight);
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器不支持图片导出');

  ctx.scale(scale, scale);
  ctx.fillStyle = '#fff7e6';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#2d2118';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  lines.forEach((line, index) => {
    if (index === 0) {
      ctx.fillStyle = '#2d2118';
      ctx.font =
        'bold 34px "Songti SC", "STSong", "Noto Serif CJK SC", "Source Han Serif SC", serif';
    } else if (bodyStartIndex > 0 && index < bodyStartIndex) {
      ctx.fillStyle = index === bodyStartIndex - 1 ? '#6f5844' : '#4b3729';
      ctx.font =
        `${index === bodyStartIndex - 1 ? '22px' : '24px'} "Kaiti SC", "STKaiti", "Songti SC", "STSong", serif`;
    } else {
      ctx.fillStyle = '#2d2118';
      ctx.font =
        '24px "Songti SC", "STSong", "Noto Serif CJK SC", "Source Han Serif SC", serif';
    }
    ctx.fillText(line, width / 2, padding + index * lineHeight);
  });

  return canvas.toDataURL('image/png');
}

export function downloadImageDataUrl(dataUrl: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = 'poem-export.png';
  link.click();
}
