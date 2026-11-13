import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PeriodOverview } from "@/components/financial/PeriodOverview";
import type { EntryDTO } from "@/types/financial";

const entries: EntryDTO[] = [
  { id: 1, amount: 1500.5, entryDate: "2026-11-05", tagId: 1 },
  { id: 2, amount: 500, entryDate: "2026-11-10", tagId: 1 },
  { id: 3, amount: -700.25, entryDate: "2026-11-12", tagId: 2 },
  { id: 4, amount: -300.75, entryDate: "2026-11-20", tagId: 2 },
  // Valor zero não conta nem como receita nem como gasto.
  { id: 5, amount: 0, entryDate: "2026-11-21", tagId: 2 },
  // Outro mês entra só no saldo acumulado.
  { id: 6, amount: 1000, entryDate: "2026-10-01", tagId: 1 },
];

type Props = React.ComponentProps<typeof PeriodOverview>;

function renderOverview(overrides: Partial<Props> = {}) {
  const props: Props = {
    entries,
    period: { month: 10, year: 2026 },
    isLoadingMonth: false,
    isLoadingAccumulated: false,
    onNewEntry: vi.fn(),
    onPreviousMonth: vi.fn(),
    ...overrides,
  };

  render(<PeriodOverview {...props} />);
  return props;
}

describe("PeriodOverview — resumo do mês", () => {
  it("mostra saldo do mês, receitas, gastos e o acumulado", () => {
    renderOverview();

    // receitas = 1500.50 + 500 = 2000.50
    expect(screen.getByText("+ R$ 2.000,50")).toBeInTheDocument();
    // gastos = |−700.25 + −300.75| = 1001.00
    expect(screen.getByText("− R$ 1.001,00")).toBeInTheDocument();
    // saldo do mês = receitas − gastos = 999.50
    expect(screen.getByText("R$ 999,50")).toBeInTheDocument();
    // acumulado inclui os 1000.00 de outubro
    expect(screen.getByText("R$ 1.999,50")).toBeInTheDocument();
  });

  it("usa --negative quando o saldo do mês é negativo", () => {
    renderOverview({
      entries: [{ id: 7, amount: -100, entryDate: "2026-11-01", tagId: 2 }],
    });

    const balanceLabel = screen.getByText("Saldo do mês");
    const balance = within(balanceLabel.parentElement!).getByText(
      /-R\$\s*100,00/
    );

    expect(balance).toHaveClass("text-negative");
  });

  it("oculta os quatro valores ao mascarar", async () => {
    const user = userEvent.setup();
    renderOverview();

    await user.click(screen.getByRole("button", { name: "Ocultar valores" }));

    expect(screen.queryByText("R$ 999,50")).toBeNull();
    expect(screen.queryByText("R$ 1.999,50")).toBeNull();
    expect(screen.getAllByText("R$ ••••••")).toHaveLength(4);

    await user.click(screen.getByRole("button", { name: "Exibir valores" }));
    expect(screen.getByText("R$ 999,50")).toBeInTheDocument();
  });

  it("mostra Skeleton inline no acumulado enquanto o histórico carrega", () => {
    renderOverview({ isLoadingAccumulated: true });

    expect(screen.getByTestId("accumulated-skeleton")).toBeInTheDocument();
    expect(screen.queryByText("R$ 1.999,50")).toBeNull();
  });

  it("usa Empty com as duas ações quando o mês não tem entradas", async () => {
    const user = userEvent.setup();
    const props = renderOverview({
      entries: [{ id: 8, amount: 100, entryDate: "2026-10-01", tagId: 1 }],
      period: { month: 11, year: 2026 },
    });

    expect(screen.getByText("Nenhuma entrada em dezembro")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Nova entrada" }));
    expect(props.onNewEntry).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Ver outro mês" }));
    expect(props.onPreviousMonth).toHaveBeenCalledTimes(1);
  });

  it("marca o card como ocupado durante a primeira carga", () => {
    renderOverview({ isLoadingMonth: true });

    expect(
      screen.getByRole("region", { name: "Resumo do mês" })
    ).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("Saldo do mês")).toBeNull();
  });
});
