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
    <section className='lookup-panel'>
      <h3>字词查询</h3>
      <div className='lookup-row'>
        <input
          value={query}
          maxLength={2}
          placeholder='字'
          className='line-input'
          onChange={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleLookup();
          }}
        />
        <button
          type='button'
          className='ghost-button'
          onClick={() => void handleLookup()}
        >
          查
        </button>
      </div>
      {status && <div className='subtle-copy'>{status}</div>}
      {result.length > 0 && (
        <div className='lookup-result'>
          {result.slice(0, 3).map((entry, index) => (
            <div key={`${entry.pronunciation ?? 'x'}-${index}`}>
              {entry.pronunciation && (
                <div className='lookup-pronunciation'>
                  {entry.pronunciation}
                </div>
              )}
              {entry.explains.slice(0, 3).map((explain) => (
                <p key={explain}>
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
