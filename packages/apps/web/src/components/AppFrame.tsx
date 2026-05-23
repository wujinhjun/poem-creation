import type { ReactNode } from 'react';

type AppFrameProps = {
  activeView: "entry" | "works" | "editor" | "settings";
  children: ReactNode;
  onOpenEntry: () => void;
  onOpenWorks: () => void;
  onOpenSettings: () => void;
};

const navItems = [
  { key: "entry", label: "起笔", mark: "一" },
  { key: "works", label: "作品", mark: "目" },
  { key: "settings", label: "设置", mark: "设" },
] as const;

export function AppFrame({
  activeView,
  children,
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
            <span className='brand-title'>Poem Creation</span>
            <span className='brand-subtitle'>本地诗词创作工具</span>
          </span>
        </button>
        <div className='save-status' aria-live='polite'>
          <span className='save-dot' />
          已本地保存
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
                <span className='rail-mark'>{item.mark}</span>
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
