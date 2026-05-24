import { useEffect, useMemo, useRef, useState } from 'react';

export type SelectOption<T extends string> = {
  value: T;
  label: string;
};

export function CustomSelect<T extends string>({
  value,
  options,
  placeholder,
  disabled = false,
  searchable = false,
  searchPlaceholder = '搜索',
  onChange,
}: {
  value: T | '';
  options: readonly SelectOption<T>[];
  placeholder: string;
  disabled?: boolean;
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
        className='select-trigger'
        disabled={disabled}
        onClick={() => setOpen((next) => !next)}
      >
        <span className={selected ? '' : 'select-placeholder'}>
          {selected?.label ?? placeholder}
        </span>
        <span
          className={`ml-3 text-[20px] leading-none transition ${open ? 'rotate-180' : ''}`}
        >
          ⌄
        </span>
      </button>
      {open && !disabled && (
        <div className='select-popover'>
          {searchable && (
            <div className='select-search-wrap'>
              <input
                ref={searchRef}
                value={query}
                placeholder={searchPlaceholder}
                className='line-input'
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
          <div className='select-options'>
            <button
              type='button'
              className='select-option is-placeholder'
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
                className={`select-option${option.value === value ? ' is-selected' : ''}`}
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
              <div className='select-empty'>
                无匹配结果
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
