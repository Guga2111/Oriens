import { describe, expect, it } from "vitest";
import {
  byTag,
  entriesInMonth,
  summarizeAll,
  summarizeMonth,
} from "@/lib/financialSummary";
import type { EntryDTO, TagDTO } from "@/types/financial";

function entry(amount: number, entryDate: string, tagId = 1): EntryDTO {
  return { amount, entryDate, tagId };
}

describe("financialSummary — somas em centavos", () => {
  it("reconcilia receitas − gastos = saldo com os valores arredondados", () => {
    const entries = [
      entry(0.1, "2026-11-01"),
      entry(0.2, "2026-11-02"),
      entry(-0.1, "2026-11-03", 2),
    ];

    expect(summarizeMonth(entries, { month: 10, year: 2026 })).toEqual({
      income: 0.3,
      expenses: 0.1,
      balance: 0.2,
    });
  });

  it("considera só as entradas do mês selecionado", () => {
    const entries = [
      entry(100, "2026-11-01"),
      entry(50, "2026-10-01"),
      entry(-20, "2026-12-01"),
    ];

    expect(summarizeMonth(entries, { month: 10, year: 2026 })).toEqual({
      income: 100,
      expenses: 0,
      balance: 100,
    });
  });

  it("ignora entradas de valor zero", () => {
    const entries = [entry(0, "2026-11-01"), entry(-10, "2026-11-02")];

    expect(summarizeMonth(entries, { month: 10, year: 2026 })).toEqual({
      income: 0,
      expenses: 10,
      balance: -10,
    });
  });

  it("summarizeAll soma todo o histórico carregado", () => {
    const entries = [
      entry(1000, "2026-10-01"),
      entry(-250.5, "2026-11-01"),
    ];

    expect(summarizeAll(entries)).toEqual({
      income: 1000,
      expenses: 250.5,
      balance: 749.5,
    });
  });
});

describe("financialSummary — byTag", () => {
  const tags: TagDTO[] = [
    { id: 1, name: "Casa", color: "#111111" },
    { id: 2, name: "Mercado", color: "#222222" },
    { id: 3, name: "Sem gastos", color: "#333333" },
  ];

  it("soma apenas gastos, em módulo, e ordena do maior para o menor", () => {
    const entries = [
      entry(-100, "2026-11-01", 1),
      entry(-50, "2026-11-02", 1),
      entry(-200, "2026-11-03", 2),
      entry(1000, "2026-11-04", 2),
    ];

    expect(byTag(entries, tags)).toEqual([
      { tagId: 2, name: "Mercado", color: "#222222", amount: 200 },
      { tagId: 1, name: "Casa", color: "#111111", amount: 150 },
    ]);
  });
});

describe("financialSummary — entriesInMonth", () => {
  it("compara o prefixo yyyy-MM sem parse de data", () => {
    const entries = [
      entry(10, "2026-11-01"),
      entry(20, "2026-11-30"),
      entry(30, "2026-12-01"),
    ];

    expect(entriesInMonth(entries, { month: 10, year: 2026 })).toHaveLength(2);
  });
});
