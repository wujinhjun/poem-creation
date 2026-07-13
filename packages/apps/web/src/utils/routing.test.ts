import { describe, expect, it } from 'vitest';
import { pathnameToMode, routeToPath } from './routing';
import type { AppRoute } from './routing';

describe('routeToPath', () => {
  it('每个 mode 映射到固定路径', () => {
    expect(routeToPath({ mode: 'entry' })).toBe('/');
    expect(routeToPath({ mode: 'template' })).toBe('/new');
    expect(routeToPath({ mode: 'quickfill' })).toBe('/quickfill');
    expect(routeToPath({ mode: 'works' })).toBe('/works');
    expect(routeToPath({ mode: 'template-designer' })).toBe('/export-templates');
    expect(routeToPath({ mode: 'settings' })).toBe('/settings');
    expect(routeToPath({ mode: 'editor', draftId: 'abc' })).toBe('/edit/abc');
  });

  it('editor draftId 做 URL 编码', () => {
    expect(routeToPath({ mode: 'editor', draftId: 'a/b c' })).toBe('/edit/a%2Fb%20c');
  });
});

describe('pathnameToMode', () => {
  it('路径映射回 mode', () => {
    expect(pathnameToMode('/')).toBe('entry');
    expect(pathnameToMode('/new')).toBe('template');
    expect(pathnameToMode('/quickfill')).toBe('quickfill');
    expect(pathnameToMode('/works')).toBe('works');
    expect(pathnameToMode('/export-templates')).toBe('template-designer');
    expect(pathnameToMode('/settings')).toBe('settings');
    expect(pathnameToMode('/edit/abc')).toBe('editor');
  });

  it('未知路径回落 entry', () => {
    expect(pathnameToMode('/wat')).toBe('entry');
  });

  it('非 editor 的 mode 与路径往返一致', () => {
    const modes: AppRoute[] = [
      { mode: 'entry' },
      { mode: 'template' },
      { mode: 'quickfill' },
      { mode: 'works' },
      { mode: 'template-designer' },
      { mode: 'settings' },
    ];
    for (const route of modes) {
      expect(pathnameToMode(routeToPath(route))).toBe(route.mode);
    }
  });
});
