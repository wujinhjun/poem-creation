import { Outlet } from '@tanstack/react-router';
import { AppFrame } from './components/AppFrame';
import { AppNotice } from './components/AppNotice';
import { AppStateContext } from './context/appState';
import { useAppShellState } from './hooks/useAppShellState';

/**
 * 根布局：拥有全部外壳状态，经 context 下发给各路由组件，
 * 并渲染 AppFrame + 当前路由的 <Outlet/>。
 */
export function AppShell() {
  const state = useAppShellState();

  return (
    <AppStateContext.Provider value={state}>
      <AppFrame
        activeView={state.activeFrameView}
        persistenceMode={state.framePersistenceMode}
        saveStatus={state.saveStatus}
        onOpenEntry={state.onOpenEntry}
        onOpenWorks={() => void state.onOpenWorks()}
        onOpenTemplateDesigner={() => void state.onOpenTemplateDesigner()}
        onOpenSettings={() => void state.onOpenSettings()}
      >
        <AppNotice message={state.errorMessage} />
        <Outlet />
      </AppFrame>
    </AppStateContext.Provider>
  );
}
