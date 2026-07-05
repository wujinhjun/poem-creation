import { describe, expect, it } from 'vitest';
import { Tone } from '@poem/parser/kernel';
import type { ToneConstraint } from '@poem/parser/kernel';
import { formatPoemText } from './exportText';

const F: ToneConstraint = { type: 'flexible' };
const R: ToneConstraint = { type: 'rhyme', tone: Tone.Ping };
// 两句，每句三字，句末为韵脚（。）。
const pattern: ToneConstraint[][] = [
  [F, F, R],
  [F, F, R],
];

describe('formatPoemText', () => {
  it('输出标题/作者与正文，韵脚句以句号收束', () => {
    const text = formatPoemText({
      title: '春晓',
      author: '孟浩然',
      description: '',
      chars: [
        ['春', '眠', '晓'],
        ['处', '闻', '鸟'],
      ],
      pattern,
    });
    const lines = text.split('\n');
    expect(lines[0]).toBe('春晓');
    expect(lines[1]).toBe('孟浩然');
    expect(text).toContain('春眠晓。');
    expect(text).toContain('处闻鸟。');
  });

  it('无标题时回退为「无题」', () => {
    const text = formatPoemText({
      title: '   ',
      author: '',
      description: '',
      chars: [['春', '眠', '晓']],
      pattern: [[F, F, R]],
    });
    expect(text.split('\n')[0]).toBe('无题');
  });
});
