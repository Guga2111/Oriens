import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import AdminSupportPage from "@/pages/AdminSupportPage";
import AdminManagementPage from "@/pages/AdminManagementPage";
import apiClient from "@/services/api";

vi.mock("@/services/api", () => ({ default: { get: vi.fn(), patch: vi.fn() } }));

it.each([390, 1440])("admin mantém ações e badges em %ipx com dados simulados", async (width) => {
  const originalWidth = window.innerWidth;
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  vi.mocked(apiClient.get).mockImplementation(async (path) => ({ data:
    path === "/support/admin/stats" ? { totalTickets: 1, openTickets: 1, inProgressTickets: 0, closedTickets: 0, averageResolutionTime: 0 }
    : path === "/support/admin/tickets" ? [{ id: 1, subject: "Ajuda & planejamento?", userEmail: "exemplo@oriens.test", status: "OPEN", priority: "HIGH", createdAt: "2026-11-13" }]
    : [{ id: 2, name: "Exemplo", email: "exemplo@oriens.test", role: "USER", createdAt: "2026-11-13" }],
  } as never));
  try {
    const support = render(<AdminSupportPage />);
    await screen.findByText("Ajuda & planejamento?");
    expect(screen.getByRole(width < 768 ? "list" : "table", width < 768 ? { name: "Lista de tickets" } : {})).toBeVisible();
    expect(screen.getByRole("link", { name: /Responder por e-mail/ })).toHaveAttribute("href", `mailto:exemplo@oriens.test?subject=${encodeURIComponent("Re: Ajuda & planejamento?")}`);
    expect(screen.getByRole("button", { name: "Iniciar" })).toBeVisible();
    support.unmount();

    render(<AdminManagementPage />);
    await screen.findByText("Exemplo");
    expect(screen.getByRole(width < 768 ? "list" : "table", width < 768 ? { name: "Lista de usuários" } : {})).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Alterar" }));
    expect(screen.getByRole("dialog", { name: "Alterar permissão" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog", { name: "Alterar permissão" })).not.toBeInTheDocument();
    expect(apiClient.patch).not.toHaveBeenCalled();
  } finally {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
  }
});
