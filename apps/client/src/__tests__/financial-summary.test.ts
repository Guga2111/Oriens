import { describe, expect, it } from "vitest";
import {
  byTag,
  entriesInMonth,
  monthRange,
  summarizeMonth,
  summarizeThrough,
  weeklyFlow,
} from "@/lib/financialSummary";
import type { EntryDTO, TagDTO } from "@/types/financial";

let nextId = 1;
function entry(amount: number, entryDate: string, tagId = 1): EntryDTO {
  return { id: nextId++, version: 0, amount, entryDate, tagId };
}
const november = { month: 10, year: 2026 };

describe("financialSummary — somas em centavos", () => {
  it("reconcilia receitas − despesas = resultado com os valores arredondados", () => {
    const entries = [
      entry(0.1, "2026-11-01"),
      entry(0.2, "2026-11-02"),
      entry(-0.1, "2026-11-03", 2),
    ];

    expect(summarizeMonth(entries, november)).toEqual({
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

    expect(summarizeMonth(entries, november)).toEqual({
      income: 100,
      expenses: 0,
      balance: 100,
    });
  });

  it("ignora entradas de valor zero", () => {
    const entries = [entry(0, "2026-11-01"), entry(-10, "2026-11-02")];

    expect(summarizeMonth(entries, november)).toEqual({
      income: 0,
      expenses: 10,
      balance: -10,
    });
  });

  it("confere em centavos uma massa maior que várias páginas da API", () => {
    // 1.200 lançamentos: 400 receitas de R$ 10,01 e 800 despesas de R$ 3,33.
    const entries = Array.from({ length: 1200 }, (_, index) =>
      index % 3 === 0
        ? entry(10.01, `2026-11-${String((index % 28) + 1).padStart(2, "0")}`)
        : entry(-3.33, `2026-11-${String((index % 28) + 1).padStart(2, "0")}`, 2)
    );

    expect(summarizeMonth(entries, november)).toEqual({
      income: 4004,
      expenses: 2664,
      balance: 1340,
    });
    const weeks = weeklyFlow(entries);
    const cents = (values: number[]) => values.reduce((sum, value) => sum + Math.round(value * 100), 0);
    expect(cents(weeks.map((week) => week.income))).toBe(400400);
    expect(cents(weeks.map((week) => week.expenses))).toBe(266400);
    expect(byTag(entries, [{ id: 2, name: "Casa", color: "#222222" }])[0].amount).toBe(2664);
  });
});

describe("financialSummary — saldo disponível", () => {
  const entries = [
    entry(1000, "2026-10-01"),
    entry(-250.5, "2026-11-30"),
    entry(-400, "2026-12-01"),
  ];

  it("acumula até o fim do mês selecionado, sem lançamentos futuros", () => {
    expect(summarizeThrough(entries, november).balance).toBe(749.5);
  });

  it("inclui lançamentos já registrados para meses futuros ao navegar até eles", () => {
    expect(summarizeThrough(entries, { month: 11, year: 2026 }).balance).toBe(349.5);
  });

  it("vira o ano pelo prefixo yyyy-MM", () => {
    expect(summarizeThrough(entries, { month: 0, year: 2027 }).balance).toBe(349.5);
    expect(summarizeThrough(entries, { month: 8, year: 2026 }).balance).toBe(0);
  });
});

describe("financialSummary — byTag", () => {
  const tags: TagDTO[] = [
    { id: 1, name: "Casa", color: "#111111" },
    { id: 2, name: "Mercado", color: "#222222" },
    { id: 3, name: "Sem gastos", color: "#333333" },
  ];

  it("soma apenas despesas, em módulo, com participação e da maior para a menor", () => {
    const entries = [
      entry(-100, "2026-11-01", 1),
      entry(-50, "2026-11-02", 1),
      entry(-250, "2026-11-03", 2),
      entry(1000, "2026-11-04", 2),
    ];

    expect(byTag(entries, tags)).toEqual([
      { tagId: 2, name: "Mercado", color: "#222222", amount: 250, percent: 63 },
      { tagId: 1, name: "Casa", color: "#111111", amount: 150, percent: 38 },
    ]);
  });

  it("mantém a despesa de tag ainda não carregada para a soma fechar com o total", () => {
    expect(byTag([entry(-40, "2026-11-01", 9)], [])).toEqual([
      { tagId: 9, name: "Categoria indisponível", color: "hsl(var(--muted-foreground))", amount: 40, percent: 100 },
    ]);
  });
});

describe("financialSummary — datas do mês", () => {
  it("compara o prefixo yyyy-MM sem parse de data", () => {
    const entries = [
      entry(10, "2026-11-01"),
      entry(20, "2026-11-30"),
      entry(30, "2026-12-01"),
    ];

    expect(entriesInMonth(entries, november)).toHaveLength(2);
  });

  it("monthRange devolve o último dia correto, inclusive em fevereiro bissexto", () => {
    expect(monthRange(november)).toEqual({ start: "2026-11-01", end: "2026-11-30" });
    expect(monthRange({ month: 1, year: 2028 })).toEqual({ start: "2028-02-01", end: "2028-02-29" });
  });

  it("weeklyFlow agrupa do dia 22 ao fim na última faixa", () => {
    const weeks = weeklyFlow([
      entry(10, "2026-11-07"),
      entry(-5, "2026-11-08"),
      entry(-7, "2026-11-22"),
      entry(3, "2026-11-30"),
    ]);

    expect(weeks).toEqual([
      { label: "1–7", income: 10, expenses: 0 },
      { label: "8–14", income: 0, expenses: 5 },
      { label: "15–21", income: 0, expenses: 0 },
      { label: "22–fim", income: 3, expenses: 7 },
    ]);
  });
});
