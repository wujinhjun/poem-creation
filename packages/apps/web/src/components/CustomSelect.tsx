import { useEffect, useMemo, useRef, useState } from 'react';

export type SelectOption<T extends string> = {
  value: T;
  label: string;
};

export function CustomSelect<T extends string>({
  value,
  options,
  placeholder,
  searchable = false,
  searchPlaceholder = '搜索',
  onChange,
}: {
  value: T | '';
  options: readonly SelectOption<T>[];
  placeholder: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  onChange: (value: T | '') => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const selected = options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(keyword) ||
        option.value.toLowerCase().includes(keyword),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open && searchable) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open, searchable]);

  return (
    <div ref={rootRef} className='relative'>
      <button
        type='button'
        className='flex min-h-12 w-full items-center justify-between border border-[#9b7a5d] bg-[#fff9ea] px-4 text-left text-[18px] text-[#2d2118] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] transition hover:border-[#704f36] focus:border-[#8b2d24] focus:outline-none focus:ring-2 focus:ring-[#8b2d24]/15'
        onClick={() => setOpen((next) => !next)}
      >
        <span className={selected ? '' : 'text-[#8f7b66]'}>
          {selected?.label ?? placeholder}
        </span>
        <span
          className={`ml-3 text-[20px] leading-none transition ${open ? 'rotate-180' : ''}`}
        >
          ⌄
        </span>
      </button>
      {open && (
        <div className='absolute left-0 right-0 top-[calc(100%+6px)] z-20 border border-[#8b6a4c] bg-[#fffaf0] py-1 shadow-[0_18px_38px_rgba(54,35,18,0.2)]'>
          {searchable && (
            <div className='sticky top-0 z-10 border-b border-[#8b6a4c]/30 bg-[#fffaf0] p-2'>
              <input
                ref={searchRef}
                value={query}
                placeholder={searchPlaceholder}
                className='h-10 w-full border border-[#b29273] bg-[#fff9ea] px-3 text-[16px] text-[#2d2118] outline-none placeholder:text-[#9a8066] focus:border-[#8b2d24] focus:ring-2 focus:ring-[#8b2d24]/15'
                onChange={(event) => setQuery(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setOpen(false);
                    setQuery('');
                  }
                }}
              />
            </div>
          )}
          <div className='max-h-72 overflow-auto'>
            <button
              type='button'
              className='block min-h-11 w-full px-4 text-left text-[17px] text-[#806851] transition hover:bg-[#efe1c6]'
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange('');
                setQuery('');
                setOpen(false);
              }}
            >
              {placeholder}
            </button>
            {filteredOptions.map((option) => (
              <button
                key={option.value}
                type='button'
                className={`block min-h-11 w-full px-4 text-left text-[17px] transition ${option.value === value ? 'bg-[#5f3928] text-[#fffaf0]' : 'text-[#2d2118] hover:bg-[#efe1c6]'}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  setQuery('');
                  setOpen(false);
                }}
              >
                {option.value === value ? '✓ ' : ''}
                {option.label}
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <div className='px-4 py-3 text-[16px] text-[#806851]'>
                无匹配结果
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

