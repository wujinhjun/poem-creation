import { useState } from 'react';
import { testSupabaseConnection } from '../../persist/supabaseDraftStore';
import { SUPABASE_BYOK_ENABLED } from '../../utils/settings';
import type { UserSettings } from '../../utils/settings';

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
  const isSupabaseMode =
    SUPABASE_BYOK_ENABLED && settings.persistence.mode === 'supabase';
  const [connectionStatus, setConnectionStatus] = useState('');

  const setPersistenceMode = (mode: UserSettings['persistence']['mode']) => {
    if (mode === 'supabase' && !SUPABASE_BYOK_ENABLED) return;
    onSettingsChange({
      ...settings,
      persistence: {
        ...settings.persistence,
        mode,
      },
    });
  };

  const handleTestConnection = async () => {
    setConnectionStatus('测试连接中...');
    try {
      await testSupabaseConnection(settings.persistence.supabase);
      setConnectionStatus('连接成功');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setConnectionStatus(`连接失败：${message}`);
    }
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
                <p className='section-kicker'>保存</p>
                <h3>作品保存方式</h3>
              </div>
              {SUPABASE_BYOK_ENABLED ? (
                <div className='storage-mode-toggle' aria-label='选择作品保存方式'>
                  <button
                    type='button'
                    className={
                      settings.persistence.mode === 'local' ? 'is-active' : ''
                    }
                    onClick={() => setPersistenceMode('local')}
                  >
                    当前设备
                  </button>
                  <button
                    type='button'
                    className={
                      settings.persistence.mode === 'supabase' ? 'is-active' : ''
                    }
                    onClick={() => setPersistenceMode('supabase')}
                  >
                    云端保存
                  </button>
                </div>
              ) : (
                <div className='storage-status-badge' aria-label='当前作品保存方式'>
                  当前设备
                </div>
              )}
            </div>

            {!isSupabaseMode && (
              <div className='settings-local-note'>
                <p>作品会自动保存在这台设备上。</p>
                <p>
                  换设备、清理浏览器数据前，请先到作品页导出备份。
                </p>
              </div>
            )}

            {isSupabaseMode && (
              <>
                <p className='settings-help'>
                  填入你的云端项目地址和公开访问密钥后，
                  新作品会自动保存到云端。不要填写管理员密钥。
                </p>

                <div className='settings-grid'>
                  <div className='form-field'>
                    <span className='field-title'>云端项目地址</span>
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
                    <span className='field-title'>公开访问密钥</span>
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

                <div className='settings-connection-row'>
                  <button
                    type='button'
                    className='ghost-button'
                    onClick={() => void handleTestConnection()}
                  >
                    测试连接
                  </button>
                  {connectionStatus && (
                    <span className='settings-connection-status'>
                      {connectionStatus}
                    </span>
                  )}
                </div>

                <details className='settings-schema-note'>
                  <summary className='field-title'>建表 SQL 参考</summary>
                  <pre>{`create table if not exists poem_creation_drafts (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null
);

create table if not exists poem_creation_meta (
  key text primary key,
  value text not null
);`}</pre>
                </details>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
