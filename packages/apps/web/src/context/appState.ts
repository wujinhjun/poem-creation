import { createContext, useContext } from 'react';
import type { useAppShellState } from '../hooks/useAppShellState';

export type AppState = ReturnType<typeof useAppShellState>;

export const AppStateContext = createContext<AppState | null>(null);

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState 必须在 AppShell 内部使用');
  }
  return ctx;
}
