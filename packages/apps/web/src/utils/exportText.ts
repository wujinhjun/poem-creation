import type { ToneConstraint } from '@poem/parser/kernel';
import { formatPoemText as formatLayoutPoemText } from '@poem/layout-core';

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
