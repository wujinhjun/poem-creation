export type AppRoute =
  | { mode: 'entry' }
  | { mode: 'template' }
  | { mode: 'quickfill' }
  | { mode: 'works' }
  | { mode: 'settings' }
  | { mode: 'editor'; draftId: string };

function routePath(route: AppRoute): string {
  if (route.mode === 'editor') return `/edit/${encodeURIComponent(route.draftId)}`;
  if (route.mode === 'template') return '/new';
  if (route.mode === 'quickfill') return '/quickfill';
  if (route.mode === 'works') return '/works';
  if (route.mode === 'settings') return '/settings';
  return '/';
}

export function readRoute(): AppRoute {
  // Static deployments serve one HTML file, so editor state lives in the hash
  // instead of the real pathname: /#/edit/:draftId.
  const hashPath = window.location.hash.replace(/^#/, '') || '/';
  if (hashPath === '/new') return { mode: 'template' };
  if (hashPath === '/quickfill') return { mode: 'quickfill' };
  if (hashPath === '/works') return { mode: 'works' };
  if (hashPath === '/settings') return { mode: 'settings' };
  const match = hashPath.match(/^\/edit\/([^/]+)$/);
  if (match) return { mode: 'editor', draftId: decodeURIComponent(match[1]) };
  return { mode: 'entry' };
}

export function pushRoute(route: AppRoute): void {
  window.history.pushState(route, '', `#${routePath(route)}`);
}

export function replaceRoute(route: AppRoute): void {
  window.history.replaceState(route, '', `#${routePath(route)}`);
}
