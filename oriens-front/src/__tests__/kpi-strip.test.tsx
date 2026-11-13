import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KpiStrip, type KpiStripItem } from "@/components/statistics/KpiStrip";

const items: KpiStripItem[] = [
  {
    label: "Tarefas concluídas (este mês)",
    value: "12",
    change: 12.5,
    goodDirection: "up",
    description: "Ritmo forte este mês",
    additionalDescription: "Comparado ao mês anterior",
  },
  {
    label: "Taxa de produtividade (semanal)",
    value: "80%",
    change: -5,
    goodDirection: "up",
    description: "Metas caíram de rendimento",
    additionalDescription: "Média da última semana",
  },
  {
    label: "Projetos ativos",
    value: "3",
    change: null,
    goodDirection: "up",
    description: "Projetos NÃO arquivados",
    additionalDescription: "Total de projetos ativos",
  },
  {
    label: "Tarefas atrasadas",
    value: "4",
    change: 100,
    goodDirection: "down",
    description: "Melhora de 100.0% nas pendências",
    additionalDescription: "Continue com o ritmo assim",
  },
];

describe("KpiStrip — SPEC §11.6/D12", () => {
  it("mostra os quatro KPIs com valor de 24 px e rótulo de 14 px", () => {
    render(<KpiStrip items={items} />);

    for (const item of items) {
      expect(screen.getByText(item.label)).toHaveClass("text-sm");
    }

    expect(screen.getByText("12")).toHaveClass("text-2xl");
    expect(screen.getByText("80%")).toHaveClass("text-2xl");
  });

  it("exibe description e additionalDescription do backend sem alteração (D12)", () => {
    render(<KpiStrip items={items} />);

    expect(screen.getByText("Ritmo forte este mês")).toBeInTheDocument();
    expect(
      screen.getByText("Comparado ao mês anterior")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Metas caíram de rendimento")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Melhora de 100.0% nas pendências")
    ).toBeInTheDocument();
    expect(screen.getByText("Continue com o ritmo assim")).toBeInTheDocument();
  });

  it("mostra '—' em cinza quando a variação é indefinida", () => {
    render(<KpiStrip items={items} />);

    const neutral = screen.getByLabelText("Sem variação");
    expect(neutral).toHaveTextContent("—");
    expect(neutral.className).toContain("text-muted-foreground");
  });

  it("em loading, mantém as quatro colunas com skeletons", () => {
    const { container } = render(<KpiStrip items={[]} isLoading />);

    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(16);
  });
});
