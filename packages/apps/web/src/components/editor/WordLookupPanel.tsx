import { useState } from 'react';
import { lookupWordExplain } from '../../utils/wordExplain';

type LookupResult = Awaited<ReturnType<typeof lookupWordExplain>>;

export function WordLookupPanel() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<LookupResult>([]);
  const [status, setStatus] = useState('');

  const handleLookup = async () => {
    const target = [...query.trim()][0] ?? '';
    if (!target) {
      setResult([]);
      setStatus('');
      return;
    }
    setStatus('查询中...');
    try {
      const entries = await lookupWordExplain(target);
      setResult(entries);
      setStatus(entries.length > 0 ? '' : '暂无释义');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`查询失败：${message}`);
      setResult([]);
    }
  };

  return (
    <section className='grid gap-2 border border-[#8b6a4c]/40 bg-[#fff9ea]/70 p-3'>
      <h3 className='m-0 text-[15px] font-bold text-[#5e4735]'>字词查询</h3>
      <div className='flex gap-2'>
        <input
          value={query}
          maxLength={2}
          placeholder='字'
          className='min-w-0 flex-1 border border-[#9b7a5d] bg-[#fff9ea] px-2 py-1.5 text-[15px] text-[#2d2118] outline-none placeholder:text-[#9a8066] focus:border-[#8b2d24] focus:ring-2 focus:ring-[#8b2d24]/15'
          onChange={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleLookup();
          }}
        />
        <button
          type='button'
          className='border border-[#8b6a4c] px-3 py-1.5 text-[14px] text-[#5b402f] transition hover:bg-[#efe1c6]'
          onClick={() => void handleLookup()}
        >
          查
        </button>
      </div>
      {status && <div className='text-[13px] text-[#806851]'>{status}</div>}
      {result.length > 0 && (
        <div className='max-h-48 overflow-auto text-[13px] leading-6 text-[#5f4a38]'>
          {result.slice(0, 3).map((entry, index) => (
            <div key={`${entry.pronunciation ?? 'x'}-${index}`} className='mb-2'>
              {entry.pronunciation && (
                <div className='font-bold text-[#8b2d24]'>
                  {entry.pronunciation}
                </div>
              )}
              {entry.explains.slice(0, 3).map((explain) => (
                <p key={explain} className='m-0'>
                  {explain}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
