// 路由语义与 URL 路径的双向映射。历史/导航现由 TanStack Router 负责，
// 这里只保留“语义 mode ↔ 路径”的纯映射，供派生 viewMode 与导航适配使用。
export type AppRoute =
  | { mode: 'entry' }
  | { mode: 'template' }
  | { mode: 'quickfill' }
  | { mode: 'works' }
  | { mode: 'template-designer' }
  | { mode: 'settings' }
  | { mode: 'editor'; draftId: string };

export type ViewMode = AppRoute['mode'];

export function routeToPath(route: AppRoute): string {
  if (route.mode === 'editor') return `/edit/${encodeURIComponent(route.draftId)}`;
  if (route.mode === 'template') return '/new';
  if (route.mode === 'quickfill') return '/quickfill';
  if (route.mode === 'works') return '/works';
  if (route.mode === 'template-designer') return '/export-templates';
  if (route.mode === 'settings') return '/settings';
  return '/';
}

/** 从（hash 内的）pathname 解析出当前视图 mode，用于高亮/派生状态。 */
export function pathnameToMode(pathname: string): ViewMode {
  if (pathname === '/new') return 'template';
  if (pathname === '/quickfill') return 'quickfill';
  if (pathname === '/works') return 'works';
  if (pathname === '/export-templates') return 'template-designer';
  if (pathname === '/settings') return 'settings';
  if (/^\/edit\//.test(pathname)) return 'editor';
  return 'entry';
}
