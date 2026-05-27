import type { ReactNode } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type AppFrameProps = {
  activeView: "entry" | "works" | "editor" | "settings";
  children: ReactNode;
  persistenceMode: 'local' | 'supabase';
  saveStatus: SaveStatus;
  onOpenEntry: () => void;
  onOpenWorks: () => void;
  onOpenSettings: () => void;
};

const navItems = [
  { key: "entry", label: "起笔" },
  { key: "works", label: "作品" },
  { key: "settings", label: "设置" },
] as const;

function saveStatusLabel(
  saveStatus: SaveStatus,
  persistenceMode: AppFrameProps['persistenceMode'],
): string {
  if (saveStatus === 'saving') return '保存中';
  if (saveStatus === 'error') return '保存失败';
  if (persistenceMode === 'supabase') return '已云端保存';
  return '已本地保存';
}

export function AppFrame({
  activeView,
  children,
  persistenceMode,
  saveStatus,
  onOpenEntry,
  onOpenWorks,
  onOpenSettings,
}: AppFrameProps) {
  const handleNav = (key: (typeof navItems)[number]["key"]) => {
    if (key === "settings") {
      onOpenSettings();
      return;
    }
    if (key === "works") {
      onOpenWorks();
      return;
    }
    onOpenEntry();
  };

  return (
    <div className='app-frame'>
      <header className='topbar'>
        <button type='button' className='brand-lockup' onClick={onOpenEntry}>
          <span className='brand-seal'>诗</span>
          <span className='brand-copy'>
            <span className='brand-title'>诗笺</span>
            <span className='brand-subtitle'>Poem Creation</span>
          </span>
        </button>
        <div className={`save-status is-${saveStatus}`} aria-live='polite'>
          <span className='save-dot' />
          {saveStatusLabel(saveStatus, persistenceMode)}
        </div>
      </header>

      <div className='app-body'>
        <aside className='side-rail' aria-label='主导航'>
          {navItems.map((item) => {
            const active =
              item.key === activeView ||
              (item.key === "entry" && activeView === "editor");
            return (
              <button
                key={item.key}
                type='button'
                className={`rail-item${active ? ' is-active' : ''}`}
                onClick={() => handleNav(item.key)}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>
        <div className='app-content'>{children}</div>
      </div>
    </div>
  );
}
