export type AppRoute =
  | { mode: 'entry' }
  | { mode: 'settings' }
  | { mode: 'editor'; draftId: string };

function routePath(route: AppRoute): string {
  if (route.mode === 'editor') return `/edit/${encodeURIComponent(route.draftId)}`;
  if (route.mode === 'settings') return '/settings';
  return '/';
}

export function readRoute(): AppRoute {
  // Static deployments serve one HTML file, so editor state lives in the hash
  // instead of the real pathname: /#/edit/:draftId.
  const hashPath = window.location.hash.replace(/^#/, '') || '/';
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
