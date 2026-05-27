/**
 * 从词林正韵数据构建叶韵 family 索引。
 *
 * 词林正韵 19 部：
 *   第 1-14 部：平声 + 仄声（上/去），同部不同调可叶韵
 *   第 15-19 部：入声独立，入声字符仅可与人声叶韵
 *
 * 输出：yun-family-index.json —— char → { family, tone } 映射
 *
 * 用法：node scripts/build-yun-family.mjs
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../data");
const INPUT = resolve(DATA_DIR, "rhyme-char-index.json");
const OUTPUT = resolve(DATA_DIR, "yun-family-index.json");

const BU_PATTERN = /^第(.+?)部-(平声|仄声|入声)$/;

const CN_NUM = { 一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10,
  十一:11,十二:12,十三:13,十四:14,十五:15,十六:16,十七:17,十八:18,十九:19 };

function buNumber(cn) { return CN_NUM[cn] ?? cn; }

async function main() {
  const raw = JSON.parse(await readFile(INPUT, "utf8"));

  /** @type {Record<string, { family: string; tone: "ping" | "ze" | "ru" }>} */
  const index = Object.create(null);

  const stats = { total: 0, ping: 0, ze: 0, ru: 0, families: new Set() };

  for (const [char, entries] of Object.entries(raw)) {
    for (const e of entries) {
      if (e.dictType !== "cilin") continue;

      const m = e.rhymeGroup.match(BU_PATTERN);
      if (!m) continue;

      const buNum = m[1]; // "一" → "十九"
      const toneLabel = m[2]; // "平声" | "仄声" | "入声"

      let tone;
      if (toneLabel === "入声") {
        tone = "ru";
      } else if (toneLabel === "平声") {
        tone = "ping";
      } else {
        tone = "ze";
      }

      const num = buNumber(buNum);
      const family = tone === "ru" ? `ru-${String(num).padStart(2, "0")}` : `bu-${String(num).padStart(2, "0")}`;

      // 一个字可能属于多个 cilin 部（多音字），取第一个
      if (!index[char]) {
        index[char] = { family, tone };
        stats.total++;
        if (tone === "ping") stats.ping++;
        else if (tone === "ze") stats.ze++;
        else stats.ru++;
        stats.families.add(family);
      }
    }
  }

  await writeFile(OUTPUT, JSON.stringify(index, null, 2), "utf8");

  console.log(`Generated ${OUTPUT}`);
  console.log(`  Characters indexed: ${stats.total}`);
  console.log(`    ping: ${stats.ping}, ze: ${stats.ze}, ru: ${stats.ru}`);
  console.log(`  Families: ${stats.families.size}`);
  console.log(`  ${[...stats.families].sort().join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
