import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KpiCard } from "@/components/statistics/KpiCard";

/** Pílula de variação (o div pai do texto da porcentagem). */
function pill(percentText: string): HTMLElement {
  return screen.getByText(percentText).closest("div") as HTMLElement;
}

// A10 (P0.3): `isPositive = change >= 0` pintava "Tarefas Atrasadas +100%"
// de verde. A cor agora segue goodDirection, e 0% fica neutro.
describe("KpiCard — A10 goodDirection", () => {
  it("com goodDirection 'down', alta é ruim (cor negativa; seta segue o sinal)", () => {
    const { container } = render(
      <KpiCard
        title="Tarefas Atrasadas"
        value="12"
        change={100}
        description="Você está com muitas tarefas atrasadas."
        goodDirection="down"
      />
    );

    const p = pill("+100%");
    expect(p.className).toContain("text-negative");
    expect(p.className).not.toContain("text-positive");
    // A seta segue o sinal da variação (§11.6); só a cor é corrigida.
    expect(container.querySelector(".lucide-trending-up")).not.toBeNull();
  });

  it("com goodDirection 'down', queda é boa (cor positiva e seta para baixo)", () => {
    const { container } = render(
      <KpiCard
        title="Tarefas Atrasadas"
        value="4"
        change={-20}
        description="Menos atrasos que no período anterior."
        goodDirection="down"
      />
    );

    const p = pill("-20.00%");
    expect(p.className).toContain("text-positive");
    expect(container.querySelector(".lucide-trending-down")).not.toBeNull();
  });

  it("com goodDirection 'up', alta é boa (verde e seta para cima)", () => {
    const { container } = render(
      <KpiCard
        title="Tarefas Concluídas (Este Mês)"
        value="40"
        change={12.5}
        description="Você está produzindo bem."
        goodDirection="up"
      />
    );

    const p = pill("+12.50%");
    expect(p.className).toContain("text-positive");
    expect(container.querySelector(".lucide-trending-up")).not.toBeNull();
  });

  it("variação 0% fica neutra (cinza)", () => {
    const { container } = render(
      <KpiCard
        title="Tarefas Atrasadas"
        value="0"
        change={0}
        description="Sem variação."
        goodDirection="down"
      />
    );

    const p = pill("0%");
    expect(p.className).toContain("text-muted-foreground");
    expect(p.className).not.toContain("text-positive");
    expect(p.className).not.toContain("text-negative");
    expect(container.querySelector(".lucide-minus")).not.toBeNull();
  });

  it("sem variação (change indefinido) não mostra pílula", () => {
    render(
      <KpiCard
        title="Projetos Ativos"
        value="3"
        description="Projetos em andamento."
        goodDirection="up"
      />
    );

    expect(screen.queryByText("%")).toBeNull();
  });
});
