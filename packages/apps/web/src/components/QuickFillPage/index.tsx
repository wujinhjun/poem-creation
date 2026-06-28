import { useState } from 'react';

type QuickFillPageProps = {
  onRecognize: (input: {
    title: string;
    author: string;
    lines: string[];
  }) => Promise<void>;
  onReturn: () => void;
};

function normalizeLineCount(lines: string[], minLength = 4): string[] {
  const targetLength = Math.max(1, minLength);
  return Array.from({ length: targetLength }, (_, index) => lines[index] ?? '');
}

export function QuickFillPage({ onRecognize, onReturn }: QuickFillPageProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [lines, setLines] = useState<string[]>(() =>
    normalizeLineCount(['', '', '', '']),
  );
  const [recognizing, setRecognizing] = useState(false);
  const [recognitionStatus, setRecognitionStatus] = useState('');
  const hasContent = lines.some((line) => line.trim());

  const updateLine = (index: number, value: string) => {
    setLines((current) => {
      const next = [...current];
      next[index] = value;
      return normalizeLineCount(next, current.length);
    });
  };

  const addLineAfter = (index: number) => {
    setLines((current) => {
      const next = [...current];
      next.splice(index + 1, 0, '');
      return normalizeLineCount(next, next.length);
    });
  };

  const removeLine = (index: number) => {
    setLines((current) => {
      const next = current.filter((_, lineIndex) => lineIndex !== index);
      return normalizeLineCount(next, Math.max(1, next.length));
    });
  };

  const clearDraft = () => {
    setTitle('');
    setAuthor('');
    setLines(normalizeLineCount(['', '', '', '']));
    setRecognitionStatus('');
  };

  const handleRecognize = async () => {
    setRecognizing(true);
    setRecognitionStatus('识别中...');
    try {
      await onRecognize({ title, author, lines });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setRecognitionStatus(`识别失败：${message}`);
    } finally {
      setRecognizing(false);
    }
  };

  return (
    <main className='page page-quickfill'>
      <section className='quickfill-layout'>
        <section className='quickfill-sheet'>
          <div className='quickfill-meta'>
            <span>题目（可空）</span>
            <input
              value={title}
              placeholder='点击命名'
              onChange={(event) => setTitle(event.currentTarget.value)}
            />
            <input
              value={author}
              placeholder='作者（可空）'
              onChange={(event) => setAuthor(event.currentTarget.value)}
            />
          </div>

          <div className='quickfill-lines' aria-label='快填正文'>
            {lines.map((line, index) => (
              <div key={index} className='quickfill-line-row'>
                <span>{index + 1}</span>
                <input
                  value={line}
                  placeholder={index === 0 ? '先写，不用先想规则。' : ''}
                  onChange={(event) => updateLine(index, event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addLineAfter(index);
                    }
                  }}
                />
                <button
                  type='button'
                  className='quickfill-remove-line'
                  aria-label={`删除第 ${index + 1} 行`}
                  disabled={lines.length <= 1}
                  onClick={() => removeLine(index)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className='quickfill-toolbar'>
            <button type='button' className='ghost-button' onClick={clearDraft}>
              清空
            </button>
            <button
              type='button'
              className='ghost-button'
              onClick={() => addLineAfter(lines.length - 1)}
            >
              加一行
            </button>
          </div>
        </section>

        <aside className='panel quickfill-aside'>
          <div className='panel-heading'>
            <div>
              <p className='section-kicker'>稍后识别</p>
              <h2>轻提示</h2>
            </div>
            <button type='button' className='ghost-button' onClick={onReturn}>
              返回
            </button>
          </div>
          <div className='quickfill-note'>
            <p>先按句意分行写下草稿，行数可以随时增减。</p>
            <p>完成后自动判断诗、词、格律和变体。</p>
          </div>
          <ol className='quickfill-flow'>
            <li><span>1</span>完成分行草稿</li>
            <li><span>2</span>识别诗 / 词</li>
            <li><span>3</span>匹配格律或词牌</li>
            <li><span>4</span>保存到作品</li>
          </ol>
          {recognitionStatus && (
            <div className='notice-inline'>{recognitionStatus}</div>
          )}
          <button
            type='button'
            className='primary-button'
            disabled={!hasContent || recognizing}
            onClick={() => void handleRecognize()}
          >
            {recognizing ? '识别中' : '识别并归档'}
          </button>
        </aside>
      </section>
    </main>
  );
}
