import type { ToneConstraint } from '@poem/parser/kernel';
import type { Genre } from '../constants/poem';
import { lineEndsWithRhyme } from '@poem/shared';

function formatBodyLines(chars: string[][], pattern: ToneConstraint[][]): string[] {
  const body: string[] = [];
  let paragraph = '';

  chars.forEach((row, index) => {
    const text = row.join('').trim();
    if (!text) return;

    const endsWithRhyme = lineEndsWithRhyme(pattern[index]);
    paragraph += `${text}${endsWithRhyme ? '。' : '，'}`;
    if (endsWithRhyme) {
      body.push(paragraph);
      paragraph = '';
    }
  });

  if (paragraph) body.push(paragraph);
  return body;
}

export function formatPoemText({
  title,
  author,
  description,
  genre,
  selectedTune,
  chars,
  pattern,
}: {
  title: string;
  author: string;
  description: string;
  genre: Genre;
  selectedTune: string;
  chars: string[][];
  pattern: ToneConstraint[][];
}): string {
  const lines = formatBodyLines(chars, pattern);
  const header = [
    title.trim() || '未题',
    author.trim() ? `署名：${author.trim()}` : '',
    selectedTune.trim()
      ? `${genre === 'meter' ? '格律' : '词牌'}：${selectedTune.trim()}`
      : '',
    description.trim() ? `说明：${description.trim()}` : '',
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
