import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskRow } from "@/components/dashboard/TaskRow";
import apiClient from "@/services/api";
import type { Task } from "@/types/task";

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
  title: "Tarefa de caracterização",
  description: "descrição",
  startTime: "09:00:00",
  dueDate: "2026-11-11",
  priority: "MEDIUM",
  status: "PENDING",
};

function renderRow(overrides: Partial<Task> = {}, onUpdate = vi.fn()) {
  const currentTask = { ...task, ...overrides };
  const utils = render(
    <ul>
      <TaskRow task={currentTask} onUpdate={onUpdate} onEdit={vi.fn()} />
    </ul>
  );
  return { ...utils, onUpdate, currentTask };
}

function rowFor(title: string): HTMLElement {
  return screen.getByText(title).closest("li") as HTMLElement;
}

beforeEach(() => {
  vi.mocked(apiClient.put).mockResolvedValue({ data: task } as never);
  vi.mocked(apiClient.delete).mockResolvedValue({ data: undefined } as never);
});

describe("TaskRow — ciclo de status (D9)", () => {
  it("PENDING → CONCLUDED envia o objeto inteiro no PUT", async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderRow();

    await user.click(
      within(rowFor(task.title)).getByRole("checkbox", {
        name: `Concluir ${task.title}`,
      })
    );

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith("/task/42", {
        ...task,
        status: "CONCLUDED",
      })
    );
    expect(onUpdate).toHaveBeenCalled();
  });

  it("ON_DOING → CONCLUDED e checkbox indeterminate com aria-checked=mixed", async () => {
    const user = userEvent.setup();
    renderRow({ status: "ON_DOING" });

    const checkbox = within(rowFor(task.title)).getByRole("checkbox", {
      name: `Concluir ${task.title} (em andamento)`,
    });
    expect(checkbox).toHaveAttribute("aria-checked", "mixed");
    expect(within(rowFor(task.title)).getByText("Em andamento")).toBeInTheDocument();

    await user.click(checkbox);

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith("/task/42", {
        ...task,
        status: "CONCLUDED",
      })
    );
  });

  it("CONCLUDED → PENDING ao desmarcar", async () => {
    const user = userEvent.setup();
    renderRow({ status: "CONCLUDED" });

    await user.click(
      within(rowFor(task.title)).getByRole("checkbox", {
        name: `Concluir ${task.title}`,
      })
    );

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith("/task/42", {
        ...task,
        status: "PENDING",
      })
    );
  });

  it("menu marca como em andamento", async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderRow();

    await user.click(
      within(rowFor(task.title)).getByRole("button", {
        name: `Ações da tarefa ${task.title}`,
      })
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "Marcar como em andamento" })
    );

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith("/task/42", {
        ...task,
        status: "ON_DOING",
      })
    );
    expect(onUpdate).toHaveBeenCalled();
  });

  it("menu volta uma tarefa em andamento para a fazer", async () => {
    const user = userEvent.setup();
    renderRow({ status: "ON_DOING" });

    await user.click(
      within(rowFor(task.title)).getByRole("button", {
        name: `Ações da tarefa ${task.title}`,
      })
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "Voltar para a fazer" })
    );

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith("/task/42", {
        ...task,
        status: "PENDING",
      })
    );
  });

  it("excluir só chama DELETE após a confirmação", async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderRow();

    await user.click(
      within(rowFor(task.title)).getByRole("button", {
        name: `Ações da tarefa ${task.title}`,
      })
    );
    await user.click(await screen.findByRole("menuitem", { name: "Excluir" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByText(/Excluir a tarefa/)
    ).toBeInTheDocument();
    expect(apiClient.delete).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    await waitFor(() =>
      expect(apiClient.delete).toHaveBeenCalledWith("/task/42")
    );
    expect(onUpdate).toHaveBeenCalled();
  });
});
