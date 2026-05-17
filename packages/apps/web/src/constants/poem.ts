import { RhymeDictType } from '@poem/parser/kernel';

export const RHYME_OPTIONS = [
  { value: RhymeDictType.Pingshui, label: '平水韵' },
  { value: RhymeDictType.Cilin, label: '词林正韵' },
  { value: RhymeDictType.Zhonghua, label: '中华新韵' },
] as const;

export type Genre = 'meter' | 'ci';

