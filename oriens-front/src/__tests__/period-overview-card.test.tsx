import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PeriodOverviewCard } from "@/components/financial/PeriodOverviewCard";
import type { EntryDTO } from "@/types/financial";

const entries: EntryDTO[] = [
  { id: 1, amount: 1500.5, entryDate: "2026-11-05", tagId: 1 },
  { id: 2, amount: 500, entryDate: "2026-11-10", tagId: 1 },
  { id: 3, amount: -700.25, entryDate: "2026-11-12", tagId: 2 },
  { id: 4, amount: -300.75, entryDate: "2026-11-20", tagId: 2 },
  // Valor zero não conta nem como receita nem como gasto.
  { id: 5, amount: 0, entryDate: "2026-11-21", tagId: 2 },
];

describe("PeriodOverviewCard — somas do período", () => {
  it("soma receitas, gastos e saldo do período", () => {
    render(
      <PeriodOverviewCard
        entries={entries}
        period={{ month: 10, year: 2026 }}
        onPeriodChange={vi.fn()}
      />
    );

    // receitas = 1500.50 + 500 = 2000.50
    expect(screen.getByText("R$ 2.000,50")).toBeInTheDocument();
    // gastos = |−700.25 + −300.75| = 1001.00
    expect(screen.getByText("R$ 1.001,00")).toBeInTheDocument();
    // saldo = receitas − gastos = 999.50
    expect(screen.getByText("R$ 999,50")).toBeInTheDocument();
  });

  it("oculta os valores quando o saldo está mascarado", () => {
    render(
      <PeriodOverviewCard
        entries={entries}
        period={{ month: 10, year: 2026 }}
        onPeriodChange={vi.fn()}
      />
    );

    expect(screen.getByText("R$ 999,50")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ocultar saldo" }));
    expect(screen.queryByText("R$ 999,50")).toBeNull();
    expect(screen.getAllByText("R$ ••••••")).toHaveLength(3);
  });
});
