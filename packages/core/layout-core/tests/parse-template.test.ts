import { describe, expect, it } from "vitest";
import {
  POEM_EXPORT_RATIOS,
  POEM_EXPORT_TEMPLATES,
  parsePoemExportTemplate,
} from "../src/templates.js";

// 递归收集所有数值叶子，断言解析后不残留 NaN/Infinity。
// （颜色/文本/对齐等字符串是合法配置，跳过。）
function collectNumbers(value: unknown, path: string, out: [string, number][]) {
  if (typeof value === "number") {
    out.push([path, value]);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => collectNumbers(item, `${path}[${i}]`, out));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) {
      collectNumbers(v, `${path}.${key}`, out);
    }
  }
}

describe("parsePoemExportTemplate", () => {
  it.each(POEM_EXPORT_TEMPLATES.map((t) => t.id))(
    "%s 模板的所有位置量都解析为有限数值",
    (templateId) => {
      const { config } = parsePoemExportTemplate({ templateId });
      const numbers: [string, number][] = [];
      collectNumbers(config, "config", numbers);
      expect(numbers.length).toBeGreaterThan(0);
      for (const [path, n] of numbers) {
        expect(Number.isFinite(n), `${path} = ${n} 非有限`).toBe(true);
      }
    },
  );

  it("自引用字段按已解析值计算（body.lineHeight = fontSize × 系数）", () => {
    const { config } = parsePoemExportTemplate({ templateId: "modern-whitespace" });
    // modern-whitespace: lineHeight = "body.fontSize * 1.9"
    expect(config.body.lineHeight).toBeCloseTo(config.body.fontSize * 1.9, 1);
    // sectionGap = "body.lineHeight * 1.15"，依赖上一步写入的 lineHeight
    expect(config.body.sectionGap).toBeCloseTo(config.body.lineHeight * 1.15, 1);
  });

  it("百分比随画布比例缩放", () => {
    const wide = parsePoemExportTemplate({ templateId: "compact-paper", ratioId: "1:1" });
    const tall = parsePoemExportTemplate({ templateId: "compact-paper", ratioId: "9:16" });
    // paper.x = "canvas.left + 4%"，横向基准是画布宽度，两种比例宽度不同则结果不同。
    const oneToOne = POEM_EXPORT_RATIOS.find((r) => r.id === "1:1")!;
    const nineToSixteen = POEM_EXPORT_RATIOS.find((r) => r.id === "9:16")!;
    expect(wide.config.paper.x).toBeCloseTo(oneToOne.width * 0.04, 1);
    expect(tall.config.paper.x).toBeCloseTo(nineToSixteen.width * 0.04, 1);
  });

  it("未知比例回退到默认比例", () => {
    const { canvas } = parsePoemExportTemplate({
      templateId: "modern-whitespace",
      // @ts-expect-error 故意传入非法 ratioId 触发回退
      ratioId: "not-a-ratio",
    });
    expect(canvas.id).toBe("3:4");
  });
});
