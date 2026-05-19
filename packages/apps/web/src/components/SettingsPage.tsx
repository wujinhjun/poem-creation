import type { UserSettings } from '../utils/settings';

type SettingsPageProps = {
  settings: UserSettings;
  onSettingsChange: (settings: UserSettings) => void;
  onReturn: () => void;
};

export function SettingsPage({
  settings,
  onSettingsChange,
  onReturn,
}: SettingsPageProps) {
  return (
    <main className='page page-settings'>
      <section className='panel settings-panel'>
        <div className='panel-heading'>
          <div>
            <p className='section-kicker'>偏好</p>
            <h2>设置</h2>
          </div>
          <button
            type='button'
            className='ghost-button'
            onClick={onReturn}
          >
            返回
          </button>
        </div>

        <div className='form-field'>
          <span className='field-title'>默认署名</span>
          <input
            value={settings.defaultAuthor}
            placeholder='用于新作品的署名'
            className='line-input'
            onChange={(event) =>
              onSettingsChange({
                ...settings,
                defaultAuthor: event.currentTarget.value,
              })
            }
          />
        </div>
      </section>
    </main>
  );
}
