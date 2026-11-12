import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SummaryAside } from "@/components/dashboard/SummaryAside";

// A7 (P0.3): o CTA de WhatsApp abria um diálogo inexistente
// (isWhatsAppDialogOpen nunca era consumido) — nenhuma ação sem efeito.
describe("SummaryAside — A7 CTA morto", () => {
  it("não renderiza 'Conectar WhatsApp' nem 'Alterar Número'", () => {
    render(
      <SummaryAside
        totalTasks={3}
        concludedTasks={1}
        pendingTasks={2}
        progress={33}
        userPhoneNumber={null}
      />
    );

    expect(screen.queryByRole("button", { name: "Conectar WhatsApp" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Alterar Número" })).toBeNull();
    // O card continua informativo.
    expect(screen.getByText("Integração WhatsApp")).toBeInTheDocument();
  });

  it("com número conectado, também não mostra ação sem efeito", () => {
    render(
      <SummaryAside
        totalTasks={3}
        concludedTasks={1}
        pendingTasks={2}
        progress={33}
        userPhoneNumber="+5511999999999"
      />
    );

    expect(screen.queryByRole("button", { name: "Alterar Número" })).toBeNull();
    expect(screen.getByText("WhatsApp Conectado")).toBeInTheDocument();
    expect(screen.getByText("+5511999999999")).toBeInTheDocument();
  });
});
