import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { listAllTemplates, findCiTune } from "@poem/parser/catalog";
import { loadMeterTemplates } from "@poem/parser/kernel";
import type { ToneConstraint, CiTemplate } from "@poem/parser/kernel";
import { RhymeDictType } from "@poem/parser/kernel";
import { createBrowserDict } from "./rhymeDict.ts";
import type { RhymeDict } from "@poem/parser/kernel";
import Composer from "./Composer.tsx";
import heroImage from "./assets/hero.png";
import "./style.css";

const RHYME_OPTIONS = [
  { value: RhymeDictType.Pingshui, label: "平水韵" },
  { value: RhymeDictType.Cilin, label: "词林正韵" },
  { value: RhymeDictType.Zhonghua, label: "中华新韵" },
] as const;

type SelectOption<T extends string> = {
  value: T;
  label: string;
};

function CustomSelect<T extends string>({
  value,
  options,
  placeholder,
  onChange,
}: {
  value: T | "";
  options: SelectOption<T>[];
  placeholder: string;
  onChange: (value: T | "") => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-between border border-[#9b7a5d] bg-[#fff9ea] px-4 text-left text-[18px] text-[#2d2118] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] transition hover:border-[#704f36] focus:border-[#8b2d24] focus:outline-none focus:ring-2 focus:ring-[#8b2d24]/15"
        onClick={() => setOpen((next) => !next)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
      >
        <span className={selected ? "" : "text-[#8f7b66]"}>{selected?.label ?? placeholder}</span>
        <span className={`ml-3 text-[20px] leading-none transition ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-72 overflow-auto border border-[#8b6a4c] bg-[#fffaf0] py-1 shadow-[0_18px_38px_rgba(54,35,18,0.2)]">
          <button
            type="button"
            className="block min-h-11 w-full px-4 text-left text-[17px] text-[#806851] transition hover:bg-[#efe1c6]"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            {placeholder}
          </button>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`block min-h-11 w-full px-4 text-left text-[17px] transition ${option.value === value ? "bg-[#5f3928] text-[#fffaf0]" : "text-[#2d2118] hover:bg-[#efe1c6]"}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.value === value ? "✓ " : ""}
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const allTemplates = listAllTemplates();
const meterMap = new Map(loadMeterTemplates().map((t) => [t.id, t]));

// 懒加载词牌完整格律（8.7MB，gzip ~2MB，fetch 一次全缓存）
let ciBundlePromise: Promise<Record<string, CiTemplate>> | null = null;
function loadCiBundle(): Promise<Record<string, CiTemplate>> {
  if (!ciBundlePromise) {
    ciBundlePromise = fetch("/data/ci-tunes-bundle.json").then((r) => r.json());
  }
  return ciBundlePromise;
}

/** 从词牌变体中提取平仄 pattern */
function ciVariantPattern(tune: CiTemplate, variantId: string): ToneConstraint[][] {
  const v = tune.variants.find((v) => v.id === variantId);
  if (!v) return [];
  return v.sections.flatMap((s) => s.lines.map((l) => l.pattern));
}

export default function App() {
  const [genre, setGenre] = useState<"meter" | "ci">("meter");
  const [selectedTune, setSelectedTune] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [rhymeType, setRhymeType] = useState<RhymeDictType>(RhymeDictType.Pingshui);
  const [dictState, setDictState] = useState<{ type: RhymeDictType; dict: RhymeDict } | null>(null);
  const [chars, setChars] = useState<string[][]>([]);
  const [analyzeResult, setAnalyzeResult] = useState("");
  const [ciPatternState, setCiPatternState] = useState<{
    key: string;
    pattern: ToneConstraint[][];
  } | null>(null);
  const ciBundleRef = useRef<Record<string, CiTemplate> | null>(null);
  const dict = dictState?.type === rhymeType ? dictState.dict : null;

  // 加载浏览器韵书
  useEffect(() => {
    let alive = true;
    createBrowserDict(rhymeType).then((loadedDict) => {
      if (alive) setDictState({ type: rhymeType, dict: loadedDict });
    });
    return () => {
      alive = false;
    };
  }, [rhymeType]);

  const meterOptions = useMemo(() => allTemplates.filter((t) => t.genre === "meter"), []);
  const ciOptions = useMemo(() => allTemplates.filter((t) => t.genre === "ci"), []);
  const currentTemplates = genre === "meter" ? meterOptions : ciOptions;
  const selectedCatalog = currentTemplates.find((t) => t.name === selectedTune);
  const tuneDetail = genre === "ci" ? findCiTune(selectedTune) : undefined;
  const templateOptions = useMemo<SelectOption<string>[]>(() => currentTemplates.map((t) => ({
    value: t.name,
    label: `${t.name}（${t.variantCount} 体）`,
  })), [currentTemplates]);
  const variantOptions = useMemo<SelectOption<string>[]>(() => {
    if (genre === "ci" && tuneDetail) {
      return tuneDetail.variants.map((v) => ({
        value: v.id,
        label: `${v.author} · ${v.sketch}（${v.charCount}字）`,
      }));
    }

    if (genre === "meter" && selectedCatalog) {
      return selectedCatalog.variants.map((v) => ({
        value: v.id,
        label: `${v.rhymeFirst ? "首句押韵" : "首句不押韵"} · ${v.author}`,
      }));
    }

    return [];
  }, [genre, selectedCatalog, tuneDetail]);

  // ci 变体变化时加载完整格律
  useEffect(() => {
    if (genre !== "ci" || !selectedVariant) return;
    const key = `${selectedTune}::${selectedVariant}`;
    let alive = true;
    (async () => {
      const bundle = await loadCiBundle();
      ciBundleRef.current = bundle;
      const tune = bundle[selectedTune];
      if (!tune) return;
      if (alive) setCiPatternState({ key, pattern: ciVariantPattern(tune, selectedVariant) });
    })();
    return () => {
      alive = false;
    };
  }, [genre, selectedTune, selectedVariant]);

  // 获取当前模板的 pattern
  const pattern: ToneConstraint[][] = useMemo(() => {
    if (!selectedVariant) return [];
    if (genre === "meter") {
      const t = meterMap.get(selectedVariant);
      return t?.pattern ?? [];
    }
    const key = `${selectedTune}::${selectedVariant}`;
    return ciPatternState?.key === key ? ciPatternState.pattern : [];
  }, [genre, selectedTune, selectedVariant, ciPatternState]);

  const handleAnalyze = useCallback(async () => {
    if (!dict || !selectedVariant || !pattern.length) return;
    const text = chars.map((row) => row.join("")).join("\n");
    if (!text.trim()) return;

    const tpl = genre === "meter"
      ? meterMap.get(selectedVariant)
      : ciBundleRef.current?.[selectedTune];
    if (!tpl) return;

    try {
      const { analyzeSync } = await import("@poem/parser/kernel");
      const r = analyzeSync(text, tpl, dict, { variantId: selectedVariant });
      setAnalyzeResult(
        `合律率: ${(r.complianceRate * 100).toFixed(0)}% | ` +
        `完全合律: ${r.fullyCompliant ? "是" : "否"} | ` +
        `多音字: ${r.ambiguities.map((a) => a.char).join(", ") || "无"}`,
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setAnalyzeResult(`错误: ${message}`);
    }
  }, [dict, selectedVariant, chars, pattern, genre, selectedTune]);

  return (
    <main className="mx-auto w-[min(1180px,calc(100%_-_32px))] py-7 max-[820px]:w-[min(calc(100%_-_20px),720px)] max-[820px]:pt-2.5">
      <section className="hero-panel" aria-label="诗词创作">
        <div>
          <p className="eyebrow">诗律 · 词谱 · 韵检</p>
          <h1>诗词创作</h1>
          <p className="hero-copy">按格入字，随写随验平仄与韵脚。</p>
        </div>
        <img src={heroImage} alt="" className="hero-seal" />
      </section>

      <section className="mt-[18px] grid grid-cols-[300px_minmax(0,1fr)] items-start gap-[18px] max-[820px]:grid-cols-1">
        <aside className="grid gap-[18px] border border-[#5c3f22]/25 bg-[#fff9eb]/85 p-5 shadow-[0_14px_34px_rgba(60,40,21,0.08)]">
          <div>
            <span className="grid gap-2 text-sm font-bold text-[#5e4735]">体裁</span>
            <div className="mt-2 grid grid-cols-2 border border-[#8b6a4c]">
              <button type="button" className={`min-h-[42px] border-r border-[#8b6a4c] text-[22px] transition ${genre === "meter" ? "bg-[#5f3928] text-[#fffaf0]" : "bg-transparent text-[#5b402f] hover:bg-[#efe1c6]"}`} onClick={() => { setGenre("meter"); setSelectedTune(""); setSelectedVariant(""); }}>诗</button>
              <button type="button" className={`min-h-[42px] text-[22px] transition ${genre === "ci" ? "bg-[#5f3928] text-[#fffaf0]" : "bg-transparent text-[#5b402f] hover:bg-[#efe1c6]"}`} onClick={() => { setGenre("ci"); setSelectedTune(""); setSelectedVariant(""); }}>词</button>
            </div>
          </div>

          <div className="grid gap-2 text-sm font-bold text-[#5e4735]">
            模板
            <CustomSelect
              value={selectedTune}
              options={templateOptions}
              placeholder="请选择"
              onChange={(next) => {
                setSelectedTune(next);
                setSelectedVariant("");
              }}
            />
          </div>

          {variantOptions.length > 0 && (
            <div className="grid gap-2 text-sm font-bold text-[#5e4735]">
              变体
              <CustomSelect
                value={selectedVariant}
                options={variantOptions}
                placeholder="请选择"
                onChange={setSelectedVariant}
              />
            </div>
          )}

          <div className="grid gap-2 text-sm font-bold text-[#5e4735]">
            韵书
            <CustomSelect
              value={rhymeType}
              options={[...RHYME_OPTIONS]}
              placeholder="请选择"
              onChange={(next) => {
                if (next) setRhymeType(next);
              }}
            />
          </div>

          <div className="flex flex-wrap gap-4 text-[13px] text-[#725c47]">
            <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 border border-[#4d7a35] bg-[#e8f1df]" />合</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 border border-[#a43c2f] bg-[#f6e2dc]" />误</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 border border-[#9b7a5d] bg-[#fffaf0]" />待填</span>
          </div>
        </aside>

        <section className="min-h-[430px] border border-[#5c3f22]/25 bg-[#fff9eb]/85 p-6 shadow-[0_14px_34px_rgba(60,40,21,0.08)] max-[820px]:overflow-x-auto max-[820px]:px-3.5 max-[820px]:py-[18px]">
          {!dict && <p className="loading-text">加载韵书中...</p>}

          {genre === "ci" && selectedVariant && pattern.length === 0 && (
            <p className="loading-text">加载词牌格律中...</p>
          )}

          {pattern.length === 0 && (
            <div className="empty-state">择一格律，即可开始填字。</div>
          )}

          {pattern.length > 0 && dict && (
            <>
              <Composer pattern={pattern} dict={dict} onChange={setChars} />
              <div className="analysis-bar">
                <button className="primary-button" onClick={handleAnalyze}>
                  分析
                </button>
                {analyzeResult && <span className="analysis-result">{analyzeResult}</span>}
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}
