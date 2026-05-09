import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { listAllTemplates, findCiTune } from "@poem/parser/catalog";
import { loadMeterTemplates } from "@poem/parser/kernel";
import type { ToneConstraint, CiTemplate } from "@poem/parser/kernel";
import { RhymeDictType } from "@poem/parser/kernel";
import { createBrowserDict } from "./rhymeDict.ts";
import type { RhymeDict } from "@poem/parser/kernel";
import Composer from "./Composer.tsx";

const RHYME_OPTIONS = [
  { value: RhymeDictType.Pingshui, label: "平水韵" },
  { value: RhymeDictType.Cilin, label: "词林正韵" },
  { value: RhymeDictType.Zhonghua, label: "中华新韵" },
] as const;

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
  const [rhymeType, setRhymeType] = useState<string>(RhymeDictType.Pingshui);
  const [dict, setDict] = useState<RhymeDict | null>(null);
  const [chars, setChars] = useState<string[][]>([]);
  const [analyzeResult, setAnalyzeResult] = useState("");
  const [ciPattern, setCiPattern] = useState<ToneConstraint[][]>([]);
  const ciBundleRef = useRef<Record<string, CiTemplate> | null>(null);

  // 加载浏览器韵书
  useEffect(() => {
    setDict(null);
    createBrowserDict().then(setDict);
  }, []);

  const meterOptions = useMemo(() => allTemplates.filter((t) => t.genre === "meter"), []);
  const ciOptions = useMemo(() => allTemplates.filter((t) => t.genre === "ci"), []);
  const currentTemplates = genre === "meter" ? meterOptions : ciOptions;
  const selectedCatalog = currentTemplates.find((t) => t.name === selectedTune);
  const tuneDetail = genre === "ci" ? findCiTune(selectedTune) : undefined;

  // ci 变体变化时加载完整格律
  useEffect(() => {
    if (genre !== "ci" || !selectedVariant) { setCiPattern([]); return; }
    (async () => {
      const bundle = await loadCiBundle();
      ciBundleRef.current = bundle;
      const tune = bundle[selectedTune];
      if (!tune) return;
      setCiPattern(ciVariantPattern(tune, selectedVariant));
    })();
  }, [genre, selectedTune, selectedVariant]);

  // 获取当前模板的 pattern
  const pattern: ToneConstraint[][] = useMemo(() => {
    if (!selectedVariant) return [];
    if (genre === "meter") {
      const t = meterMap.get(selectedVariant);
      return t?.pattern ?? [];
    }
    return ciPattern;
  }, [genre, selectedVariant, ciPattern]);

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
    } catch (e: any) {
      setAnalyzeResult(`错误: ${e.message}`);
    }
  }, [dict, selectedVariant, chars, pattern, genre, selectedTune]);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      <h1>诗词创作</h1>

      <fieldset>
        <legend>体裁</legend>
        <label style={{ marginRight: 16 }}>
          <input type="radio" checked={genre === "meter"} onChange={() => { setGenre("meter"); setSelectedTune(""); setSelectedVariant(""); }} /> 诗
        </label>
        <label>
          <input type="radio" checked={genre === "ci"} onChange={() => { setGenre("ci"); setSelectedTune(""); setSelectedVariant(""); }} /> 词
        </label>
      </fieldset>

      <p>
        <label>模板：{" "}
          <select value={selectedTune} onChange={(e) => { setSelectedTune(e.target.value); setSelectedVariant(""); }}>
            <option value="">-- 请选择 --</option>
            {currentTemplates.map((t) => (
              <option key={t.name} value={t.name}>{t.name}（{t.variantCount} 体）</option>
            ))}
          </select>
        </label>
        {" "}
        {genre === "ci" && tuneDetail && (
          <label>
            变体：{" "}
            <select value={selectedVariant} onChange={(e) => setSelectedVariant(e.target.value)}>
              <option value="">-- 请选择 --</option>
              {tuneDetail.variants.map((v) => (
                <option key={v.id} value={v.id}>{v.author} · {v.sketch}（{v.charCount}字）</option>
              ))}
            </select>
          </label>
        )}
        {genre === "meter" && selectedCatalog && (
          <label>
            变体：{" "}
            <select value={selectedVariant} onChange={(e) => setSelectedVariant(e.target.value)}>
              <option value="">-- 请选择 --</option>
              {selectedCatalog.variants.map((v) => (
                <option key={v.id} value={v.id}>{v.sketch}</option>
              ))}
            </select>
          </label>
        )}
        {" "}
        <label>
          韵书：{" "}
          <select value={rhymeType} onChange={(e) => setRhymeType(e.target.value)}>
            {RHYME_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </label>
      </p>

      {!dict && <p>加载韵书中…</p>}

      {genre === "ci" && selectedVariant && ciPattern.length === 0 && (
        <p>加载词牌格律中…</p>
      )}
      {pattern.length > 0 && dict && (
        <>
          <Composer pattern={pattern} dict={dict} onChange={setChars} />
          <p>
            <button onClick={handleAnalyze} style={{ padding: "8px 24px", fontSize: 16 }}>
              分析
            </button>
            {" "}{analyzeResult && <span style={{ color: "#666" }}>{analyzeResult}</span>}
          </p>
        </>
      )}
    </div>
  );
}
