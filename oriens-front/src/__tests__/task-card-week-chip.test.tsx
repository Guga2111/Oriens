import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskCard, type Task } from "@/components/dashboard/TaskCard";

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
  title: "Revisar pull request de requisições urgentes do sprint",
  startTime: "09:00:00",
  dueDate: "2026-11-11",
  priority: "MEDIUM",
  status: "PENDING",
};

// A6 (P0.3, paliativo até P1.2): no chip semanal os títulos partiam letra a
// letra (break-words) e o badge "MEDIUM" com text-[10px] vazava a coluna.
describe("TaskCard — A6 chip semanal", () => {
  it("título da semana usa line-clamp-2 e não break-words", () => {
    render(
      <TaskCard
        task={longTitleTask}
        onUpdate={vi.fn()}
        onEdit={vi.fn()}
        viewMode="week"
      />
    );

    const title = screen.getByText(longTitleTask.title);
    expect(title).toHaveClass("line-clamp-2");
    expect(title).not.toHaveClass("break-words");
  });

  it("não renderiza badge de texto no modo semana", () => {
    render(
      <TaskCard
        task={longTitleTask}
        onUpdate={vi.fn()}
        onEdit={vi.fn()}
        viewMode="week"
      />
    );

    expect(screen.queryByText("MEDIUM")).toBeNull();
    // O horário continua visível no chip.
    expect(screen.getByText("09:00")).toBeInTheDocument();
  });

  it("modo dia mantém o badge de prioridade", () => {
    render(
      <TaskCard
        task={longTitleTask}
        onUpdate={vi.fn()}
        onEdit={vi.fn()}
        viewMode="day"
      />
    );

    expect(screen.getByText("MEDIUM")).toBeInTheDocument();
  });
});
