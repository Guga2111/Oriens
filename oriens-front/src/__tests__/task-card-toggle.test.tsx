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
  title: "Tarefa de caracterização",
  description: "descrição",
  startTime: "09:00:00",
  dueDate: "2026-11-11",
  priority: "MEDIUM",
  status: "PENDING",
};

/** Card da tarefa (raiz com a classe mb-2 aplicada pelo TaskCard). */
function taskCard(): HTMLElement {
  const title = screen.getByText(task.title);
  const card = title.closest("div.mb-2");
  expect(card).not.toBeNull();
  return card as HTMLElement;
}

/** Primeiro botão do card = toggle circular de status (antes do menu). */
function toggleButton(): HTMLElement {
  return within(taskCard()).getAllByRole("button")[0];
}

beforeEach(() => {
  vi.mocked(apiClient.put).mockResolvedValue({ data: task } as never);
});

describe("TaskCard — toggle de status", () => {
  it("envia PUT /task/:id com o objeto inteiro e status alternado", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(
      <TaskCard task={task} onUpdate={onUpdate} onEdit={vi.fn()} viewMode="day" />
    );

    await user.click(toggleButton());

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith("/task/42", {
        ...task,
        status: "CONCLUDED",
      })
    );
    expect(onUpdate).toHaveBeenCalled();
  });

  it("volta para PENDING ao desmarcar uma tarefa concluída", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(
      <TaskCard
        task={{ ...task, status: "CONCLUDED" }}
        onUpdate={onUpdate}
        onEdit={vi.fn()}
        viewMode="day"
      />
    );

    await user.click(toggleButton());

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith("/task/42", {
        ...task,
        status: "PENDING",
      })
    );
    expect(onUpdate).toHaveBeenCalled();
  });
});
