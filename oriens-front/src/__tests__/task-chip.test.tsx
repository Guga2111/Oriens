import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskChip } from "@/components/dashboard/TaskChip";
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

const longTitleTask: Task = {
  id: 7,
  title: "Revisar pull request de requisições urgentíssimas do sprint",
  startTime: "09:00:00",
  dueDate: "2026-11-11",
  priority: "MEDIUM",
  status: "PENDING",
};

function renderChip(overrides: Partial<Task> = {}) {
  const task = { ...longTitleTask, ...overrides };
  render(<TaskChip task={task} onUpdate={vi.fn()} onEdit={vi.fn()} />);
  return task;
}

beforeEach(() => {
  vi.mocked(apiClient.put).mockResolvedValue({ data: longTitleTask } as never);
});

describe("TaskChip — visão semanal", () => {
  it("usa line-clamp e não parte palavras; prioridade é só um ponto com texto sr-only", () => {
    renderChip();

    const title = screen.getByText(longTitleTask.title);
    expect(title).toHaveClass("line-clamp-3");
    expect(title).not.toHaveClass("break-words");
    expect(title).not.toHaveClass("break-all");

    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByText("Média")).toHaveClass("sr-only");
  });

  it("conclui pelo checkbox enviando o objeto inteiro", async () => {
    const user = userEvent.setup();
    renderChip();

    await user.click(
      screen.getByRole("checkbox", {
        name: `Concluir ${longTitleTask.title}`,
      })
    );

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith("/task/7", {
        ...longTitleTask,
        status: "CONCLUDED",
      })
    );
  });

  it("ON_DOING usa checkbox indeterminate", () => {
    renderChip({ status: "ON_DOING" });

    expect(
      screen.getByRole("checkbox", {
        name: `Concluir ${longTitleTask.title} (em andamento)`,
      })
    ).toHaveAttribute("aria-checked", "mixed");
  });

  it("menu marca a tarefa como em andamento", async () => {
    const user = userEvent.setup();
    renderChip();

    await user.click(
      screen.getByRole("button", {
        name: `Ações da tarefa ${longTitleTask.title}`,
      })
    );
    await user.click(
      await screen.findByRole("menuitem", {
        name: "Marcar como em andamento",
      })
    );

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith("/task/7", {
        ...longTitleTask,
        status: "ON_DOING",
      })
    );
  });

  it("excluir só chama DELETE após a confirmação", async () => {
    const user = userEvent.setup();
    renderChip();

    await user.click(
      screen.getByRole("button", {
        name: `Ações da tarefa ${longTitleTask.title}`,
      })
    );
    await user.click(await screen.findByRole("menuitem", { name: "Excluir" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(apiClient.delete).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    await waitFor(() =>
      expect(apiClient.delete).toHaveBeenCalledWith("/task/7")
    );
  });
});
