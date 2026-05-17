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
    <main className='mx-auto w-[min(760px,calc(100%-32px))] py-7 max-[820px]:w-[min(calc(100%_-_20px),720px)] max-[820px]:pt-2.5'>
      <section className='grid gap-[18px] border border-[#5c3f22]/25 bg-[#fff9eb]/85 p-5 shadow-[0_14px_34px_rgba(60,40,21,0.08)]'>
        <div className='flex items-center justify-between gap-3'>
          <h2 className='m-0 text-[24px] font-bold text-[#4b3729]'>设置</h2>
          <button
            type='button'
            className='border border-[#8b6a4c] px-4 py-2 text-[15px] text-[#5b402f] transition hover:bg-[#efe1c6]'
            onClick={onReturn}
          >
            返回
          </button>
        </div>

        <div className='grid gap-2 text-sm font-bold text-[#5e4735]'>
          默认署名
          <input
            value={settings.defaultAuthor}
            placeholder='用于新作品的署名'
            className='h-12 w-full border border-[#9b7a5d] bg-[#fff9ea] px-4 text-[18px] text-[#2d2118] outline-none placeholder:text-[#9a8066] focus:border-[#8b2d24] focus:ring-2 focus:ring-[#8b2d24]/15'
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

