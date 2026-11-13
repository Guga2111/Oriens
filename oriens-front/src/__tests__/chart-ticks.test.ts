import { describe, expect, it } from "vitest";
import {
  integerTicks,
  pickDateTicks,
} from "@/components/statistics/chartTicks";

describe("integerTicks — 4 gridlines com ticks inteiros", () => {
  it("sempre devolve 4 ticks inteiros", () => {
    for (const max of [0, 1, 3, 4, 10, 37, 100, 999]) {
      const ticks = integerTicks(max);
      expect(ticks).toHaveLength(4);
      expect(ticks.every(Number.isInteger)).toBe(true);
      expect(ticks[0]).toBe(0);
    }
  });

  it("cobre o máximo da série", () => {
    for (const max of [0, 1, 3, 4, 10, 37, 100, 999]) {
      const ticks = integerTicks(max);
      expect(Math.max(...ticks)).toBeGreaterThanOrEqual(max);
    }
  });

  it("usa passos legíveis para séries pequenas", () => {
    expect(integerTicks(0)).toEqual([0, 1, 2, 3]);
    expect(integerTicks(4)).toEqual([0, 2, 4, 6]);
    expect(integerTicks(10)).toEqual([0, 5, 10, 15]);
  });
});

describe("pickDateTicks — 4 a 8 rótulos no eixo X", () => {
  const series = Array.from({ length: 30 }, (_, index) => ({
    date: `2026-11-${String(index + 1).padStart(2, "0")}`,
  }));

  it("reduz uma série longa a 6 rótulos, incluindo primeiro e último", () => {
    const ticks = pickDateTicks(series);

    expect(ticks).toHaveLength(6);
    expect(ticks[0]).toBe(series[0].date);
    expect(ticks[ticks.length - 1]).toBe(series[series.length - 1].date);
  });

  it("mantém todos os rótulos quando a série já é curta", () => {
    expect(pickDateTicks(series.slice(0, 4))).toHaveLength(4);
    expect(pickDateTicks(series.slice(0, 6))).toHaveLength(6);
    expect(pickDateTicks(series.slice(0, 8))).toHaveLength(6);
    expect(pickDateTicks([])).toEqual([]);
  });
});
