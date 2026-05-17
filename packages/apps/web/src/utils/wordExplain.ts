type WordExplainEntry = {
  pronunciation?: string;
  explains: string[];
};

type WordExplainIndex = Record<string, WordExplainEntry[]>;

let wordExplainCache: WordExplainIndex | null = null;

async function loadWordExplainIndex(): Promise<WordExplainIndex> {
  if (wordExplainCache) return wordExplainCache;
  const response = await fetch('/data/word-explain-cleaned.json');
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  wordExplainCache = (await response.json()) as WordExplainIndex;
  return wordExplainCache;
}

export async function lookupWordExplain(
  char: string,
): Promise<WordExplainEntry[]> {
  const target = [...char.trim()][0];
  if (!target) return [];
  const index = await loadWordExplainIndex();
  return index[target] ?? [];
}
