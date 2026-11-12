import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskCard, type Task } from "@/components/dashboard/TaskCard";
import apiClient from "@/services/api";

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/hooks/useSound", () => ({
  useSound: () => vi.fn(),
}));

const task: Task = {
  id: 42,
  title: "Tarefa a excluir",
  startTime: "09:00:00",
  dueDate: "2026-11-11",
  priority: "MEDIUM",
  status: "PENDING",
};

beforeEach(() => {
  vi.mocked(apiClient.delete).mockResolvedValue({ data: undefined } as never);
});

// A8 (P0.3): excluir tarefa exigia 2 cliques e chamava DELETE direto.
describe("TaskCard — A8 exclusão com confirmação", () => {
  it("não chama DELETE antes da confirmação e exclui após confirmar", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(
      <TaskCard task={task} onUpdate={onUpdate} onEdit={vi.fn()} viewMode="day" />
    );

    // Abre o menu da tarefa e escolhe Deletar.
    const card = screen.getByText(task.title).closest("div.mb-2") as HTMLElement;
    await user.click(within(card).getAllByRole("button")[1]);
    await user.click(await screen.findByRole("menuitem", { name: "Deletar" }));

    // O diálogo de confirmação aparece e NADA foi excluído ainda.
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/Excluir tarefa\?/)).toBeInTheDocument();
    expect(apiClient.delete).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    await waitFor(() =>
      expect(apiClient.delete).toHaveBeenCalledWith("/task/42")
    );
    expect(onUpdate).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("cancelar mantém a tarefa e não chama DELETE", async () => {
    const user = userEvent.setup();
    render(
      <TaskCard task={task} onUpdate={vi.fn()} onEdit={vi.fn()} viewMode="day" />
    );

    const card = screen.getByText(task.title).closest("div.mb-2") as HTMLElement;
    await user.click(within(card).getAllByRole("button")[1]);
    await user.click(await screen.findByRole("menuitem", { name: "Deletar" }));

    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(apiClient.delete).not.toHaveBeenCalled();
  });
});
