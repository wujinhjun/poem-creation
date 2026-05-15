import { listAllTemplates } from '@poem/parser/catalog';
import { loadMeterTemplates } from '@poem/parser/kernel';
import type { ToneConstraint } from '@poem/parser/kernel';
import type { Genre } from '../constants/poem';

export const allTemplates = listAllTemplates();
export const meterMap = new Map(loadMeterTemplates().map((t) => [t.id, t]));

export function pairLineGroups(pattern: ToneConstraint[][]): number[][] {
  const groups: number[][] = [];
  for (let index = 0; index < pattern.length; index += 2) {
    groups.push(
      index + 1 < pattern.length ? [index, index + 1] : [index],
    );
  }
  return groups;
}

export function variantSummary(
  genre: Genre,
  tuneName: string,
  variantId: string,
): string {
  if (!variantId) return '';
  const template = allTemplates.find(
    (entry) => entry.genre === genre && entry.name === tuneName,
  );
  const variant = template?.variants.find((item) => item.id === variantId);
  if (!variant) return variantId;
  if (genre === 'meter') {
    return `${variant.rhymeFirst ? '首句押韵' : '首句不押韵'} · ${variant.author}`;
  }
  return `${variant.author} · ${variant.sketch}`;
}
