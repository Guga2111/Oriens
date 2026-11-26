import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PeriodOverview } from "@/components/financial/PeriodOverview";
import type { EntryDTO, TagDTO } from "@/types/financial";

const tags: TagDTO[] = [
  { id: 1, name: "Salário", color: "#111111" },
  { id: 2, name: "Mercado", color: "#222222" },
  { id: 3, name: "Casa", color: "#333333" },
];

const entries: EntryDTO[] = [
  { id: 1, version: 0, amount: 1500.5, entryDate: "2026-11-05", tagId: 1 },
  // Rendimento recebido é uma receita comum na data do recebimento.
  { id: 2, version: 0, amount: 500, entryDate: "2026-11-10", tagId: 1 },
  { id: 3, version: 0, amount: -700.25, entryDate: "2026-11-12", tagId: 2 },
  { id: 4, version: 0, amount: -300.75, entryDate: "2026-11-20", tagId: 3 },
  { id: 5, version: 0, amount: 0, entryDate: "2026-11-21", tagId: 2 },
  // Outro mês entra só no saldo disponível.
  { id: 6, version: 0, amount: 1000, entryDate: "2026-10-01", tagId: 1 },
  // Lançamento futuro não entra no saldo de novembro.
  { id: 7, version: 0, amount: -50, entryDate: "2026-12-02", tagId: 2 },
];

type Props = React.ComponentProps<typeof PeriodOverview>;

function renderOverview(overrides: Partial<Props> = {}) {
  const props: Props = {
    entries,
    tags,
    period: { month: 10, year: 2026 },
    isLoading: false,
    error: null,
    onRetry: vi.fn(),
    onNewEntry: vi.fn(),
    onSelectCategory: vi.fn(),
    onViewMonth: vi.fn(),
    ...overrides,
  };

  render(<PeriodOverview {...props} />);
  return props;
}

function metric(label: string) {
  return screen.getByText(label, { selector: "dt" }).nextElementSibling;
}

describe("PeriodOverview — indicadores do mês", () => {
  it("mostra receitas, despesas, resultado e saldo disponível até o fim do mês", () => {
    renderOverview();

    expect(metric("Receitas")).toHaveTextContent("R$ 2.000,50");
    expect(metric("Despesas")).toHaveTextContent("R$ 1.001,00");
    expect(metric("Resultado do mês")).toHaveTextContent("R$ 999,50");
    expect(metric("Saldo disponível")).toHaveTextContent("R$ 1.999,50");
    expect(screen.getByText("Acumulado até 30 de novembro de 2026, com aportes e resgates")).toBeInTheDocument();
  });

  it("muda indicadores e acumulado com o mês selecionado", () => {
    renderOverview({ period: { month: 11, year: 2026 } });

    expect(metric("Receitas")).toHaveTextContent("R$ 0,00");
    expect(metric("Despesas")).toHaveTextContent("R$ 50,00");
    expect(metric("Saldo disponível")).toHaveTextContent("R$ 1.949,50");
  });

  it("usa --negative quando o resultado do mês é negativo", () => {
    renderOverview({
      entries: [{ id: 8, version: 0, amount: -100, entryDate: "2026-11-01", tagId: 2 }],
    });

    expect(metric("Resultado do mês")).toHaveClass("text-negative");
  });

  it("oculta os quatro valores ao mascarar", async () => {
    const user = userEvent.setup();
    renderOverview();

    await user.click(screen.getByRole("button", { name: "Ocultar valores" }));
    expect(screen.getAllByText("R$ ••••••")).toHaveLength(4);

    await user.click(screen.getByRole("button", { name: "Exibir valores" }));
    expect(metric("Resultado do mês")).toHaveTextContent("R$ 999,50");
  });
});

describe("PeriodOverview — composição por categoria", () => {
  it("abre o histórico da categoria pelo teclado", async () => {
    const user = userEvent.setup();
    const props = renderOverview();

    const mercado = screen.getByRole("button", { name: /^Mercado: R\$\s700,25, 70% das despesas/ });
    const casa = screen.getByRole("button", { name: /^Casa: R\$\s300,75, 30% das despesas/ });
    expect(mercado.compareDocumentPosition(casa) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    mercado.focus();
    await user.keyboard("{Enter}");
    expect(props.onSelectCategory).toHaveBeenCalledWith(2);

    await user.click(screen.getByRole("button", { name: "Ver lançamentos do mês" }));
    expect(props.onViewMonth).toHaveBeenCalledTimes(1);
  });

  it("não lista receitas na composição de despesas", () => {
    renderOverview();
    expect(screen.queryByRole("button", { name: /^Salário/ })).toBeNull();
  });
});

describe("PeriodOverview — carregamento, vazio e erro", () => {
  it("marca a seção como ocupada e não mostra valores durante a carga", () => {
    renderOverview({ entries: undefined, isLoading: true });

    expect(screen.getByRole("region", { name: "Resumo do mês" })).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("Receitas")).toBeNull();
  });

  it("sem leitura completa mostra o erro com tentar novamente e nenhum total", async () => {
    const user = userEvent.setup();
    const props = renderOverview({ entries: undefined, error: new Error("offline") });

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Saldo disponível")).toBeNull();
    expect(screen.queryByText(/R\$/)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(props.onRetry).toHaveBeenCalledTimes(1);
  });

  it("falha na atualização avisa que os valores são da última leitura completa", () => {
    renderOverview({ error: new Error("offline") });

    expect(screen.getByText(/valores exibidos são da última leitura completa/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });

  it("mês sem lançamentos mantém o saldo e oferece Nova entrada", async () => {
    const user = userEvent.setup();
    const props = renderOverview({ period: { month: 0, year: 2027 } });

    expect(screen.getByText("Nenhum lançamento em janeiro")).toBeInTheDocument();
    expect(metric("Saldo disponível")).toHaveTextContent("R$ 1.949,50");

    await user.click(screen.getByRole("button", { name: "Nova entrada" }));
    expect(props.onNewEntry).toHaveBeenCalledTimes(1);
  });
});
