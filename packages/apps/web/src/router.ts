import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { AppShell } from './AppShell';
import {
  EditorRoute,
  EntryRoute,
  QuickFillRoute,
  SettingsRoute,
  TemplateDesignerRoute,
  TemplateSelectionRoute,
  WorksRoute,
} from './routes';

const rootRoute = createRootRoute({ component: AppShell });

const entryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: EntryRoute,
});
const templateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/new',
  component: TemplateSelectionRoute,
});
const quickfillRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/quickfill',
  component: QuickFillRoute,
});
const worksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/works',
  component: WorksRoute,
});
const templateDesignerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/export-templates',
  component: TemplateDesignerRoute,
});
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsRoute,
});
const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/edit/$draftId',
  component: EditorRoute,
});

const routeTree = rootRoute.addChildren([
  entryRoute,
  templateRoute,
  quickfillRoute,
  worksRoute,
  templateDesignerRoute,
  settingsRoute,
  editorRoute,
]);

// 静态托管（GitHub Pages）：用 hash 历史，深链刷新不 404。
export const router = createRouter({
  routeTree,
  history: createHashHistory(),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
