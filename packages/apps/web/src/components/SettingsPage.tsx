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
  const setPersistenceMode = (
    mode: UserSettings['persistence']['mode'],
  ) => {
    onSettingsChange({
      ...settings,
      persistence: {
        ...settings.persistence,
        mode,
      },
    });
  };

  const setSupabaseField = (
    field: keyof UserSettings['persistence']['supabase'],
    value: string,
  ) => {
    onSettingsChange({
      ...settings,
      persistence: {
        ...settings.persistence,
        supabase: {
          ...settings.persistence.supabase,
          [field]: value,
        },
      },
    });
  };

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

        <div className='settings-stack'>
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

          <div className='settings-storage-card'>
            <div className='settings-storage-head'>
              <div>
                <p className='section-kicker'>持久化</p>
                <h3>数据保存位置</h3>
              </div>
              <div className='storage-mode-toggle' aria-label='选择数据保存位置'>
                <button
                  type='button'
                  className={
                    settings.persistence.mode === 'local' ? 'is-active' : ''
                  }
                  onClick={() => setPersistenceMode('local')}
                >
                  本地
                </button>
                <button
                  type='button'
                  className={
                    settings.persistence.mode === 'supabase' ? 'is-active' : ''
                  }
                  onClick={() => setPersistenceMode('supabase')}
                >
                  Supabase BYOK
                </button>
              </div>
            </div>

            <p className='settings-help'>
              本地模式使用浏览器 IndexedDB。Supabase 模式只需要填项目 URL
              和 anon public key，浏览器端不要填写 service_role key。
            </p>

            <div className='settings-grid'>
              <div className='form-field'>
                <span className='field-title'>Supabase Project URL</span>
                <input
                  value={settings.persistence.supabase.url}
                  placeholder='https://xxxx.supabase.co'
                  className='line-input'
                  inputMode='url'
                  onChange={(event) =>
                    setSupabaseField('url', event.currentTarget.value)
                  }
                />
              </div>

              <div className='form-field'>
                <span className='field-title'>anon public key</span>
                <input
                  value={settings.persistence.supabase.anonKey}
                  placeholder='eyJhbGciOi...'
                  className='line-input'
                  type='password'
                  autoComplete='off'
                  onChange={(event) =>
                    setSupabaseField('anonKey', event.currentTarget.value)
                  }
                />
              </div>

              <div className='form-field'>
                <span className='field-title'>草稿表</span>
                <input
                  value={settings.persistence.supabase.draftsTable}
                  className='line-input'
                  onChange={(event) =>
                    setSupabaseField('draftsTable', event.currentTarget.value)
                  }
                />
              </div>

              <div className='form-field'>
                <span className='field-title'>元信息表</span>
                <input
                  value={settings.persistence.supabase.metaTable}
                  className='line-input'
                  onChange={(event) =>
                    setSupabaseField('metaTable', event.currentTarget.value)
                  }
                />
              </div>
            </div>

            <div className='settings-schema-note'>
              <span className='field-title'>建表参考</span>
              <pre>{`create table if not exists poem_creation_drafts (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null
);

create table if not exists poem_creation_meta (
  key text primary key,
  value text not null
);`}</pre>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
