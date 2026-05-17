import { useEffect, useState } from 'react';
import type { RhymeDict } from '@poem/parser/kernel';
import { RhymeDictType } from '@poem/parser/kernel';
import { createBrowserDict } from '../utils/rhymeDict';

type BrowserDictState = {
  type: RhymeDictType;
  dict: RhymeDict;
};

export function useBrowserDict(rhymeType: RhymeDictType): {
  dict: RhymeDict | null;
  dictError: string;
} {
  const [dictState, setDictState] = useState<BrowserDictState | null>(null);
  const [dictError, setDictError] = useState('');

  useEffect(() => {
    let alive = true;
    createBrowserDict(rhymeType)
      .then((loadedDict) => {
        if (alive) {
          setDictError('');
          setDictState({ type: rhymeType, dict: loadedDict });
        }
      })
      .catch((error: unknown) => {
        if (!alive) return;
        const message = error instanceof Error ? error.message : String(error);
        setDictState(null);
        setDictError(`韵书加载失败：${message}`);
      });
    return () => {
      alive = false;
    };
  }, [rhymeType]);

  return {
    dict: dictState?.type === rhymeType ? dictState.dict : null,
    dictError,
  };
}
