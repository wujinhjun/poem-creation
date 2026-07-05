import { describe, expect, it } from "vitest";
import {
  createLayoutContext,
  evaluateLayoutExpression,
} from "../src/templates.js";
import type { PoemExportRatio } from "../src/schema.js";

// 宽 1200 × 高 900：short=900, long=1200，便于校验各轴向百分比基准。
const canvas: PoemExportRatio = {
  id: "3:4",
  label: "3:4",
  width: 1200,
  height: 900,
};
const ctx = createLayoutContext(canvas);
const evalX = (expr: string) => evaluateLayoutExpression(expr, ctx, "x");

describe("evaluateLayoutExpression", () => {
  it("百分比按轴向取基准（x→宽 / y→高 / size→短边）", () => {
    expect(evaluateLayoutExpression("10%", ctx, "x")).toBe(120);
    expect(evaluateLayoutExpression("10%", ctx, "y")).toBe(90);
    expect(evaluateLayoutExpression("10%", ctx, "size")).toBe(90);
  });

  it("支持 slot 引用", () => {
    expect(evalX("canvas.width")).toBe(1200);
    expect(evalX("canvas.height")).toBe(900);
    expect(evalX("canvas.short")).toBe(900);
    expect(evalX("canvas.left + 6%")).toBe(72);
  });

  it("遵守运算符优先级与括号", () => {
    expect(evalX("2 + 3 * 4")).toBe(14);
    expect(evalX("(2 + 3) * 4")).toBe(20);
    expect(evalX("canvas.width / 2")).toBe(600);
  });

  it("支持一元负号", () => {
    expect(evalX("-5 + 10")).toBe(5);
    expect(evalX("10 - -5")).toBe(15);
  });

  it("结果保留两位小数", () => {
    expect(evalX("1 / 3")).toBe(0.33);
  });

  it("除以零时报错", () => {
    expect(() => evalX("10 / 0")).toThrow(/除以零/);
  });

  it("遇到非法字符报错（不再静默丢弃）", () => {
    expect(() => evalX("canvas.left & 8%")).toThrow(/非法字符/);
  });

  it("引用未知 slot 报错", () => {
    expect(() => evalX("panel.left")).toThrow(/未知导出版式引用/);
  });

  it("括号不匹配报错", () => {
    expect(() => evalX("(1 + 2")).toThrow(/缺少右括号/);
  });

  it("残留 token（缺运算符）报错", () => {
    expect(() => evalX("1 2")).toThrow(/无法解析/);
  });
});
