import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { describe, expect, it, vi } from "vitest";
import { WeekView } from "@/components/dashboard/WeekView";
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

const today = new Date();
const weekStart = startOfWeek(today, { locale: ptBR });
const anotherDay = isSameDay(weekStart, today)
  ? addDays(weekStart, 1)
  : weekStart;

const task: Task = {
  id: 11,
  title: "Tarefa da semana",
  startTime: "09:00:00",
  dueDate: format(today, "yyyy-MM-dd"),
  priority: "LOW",
  status: "PENDING",
};

function renderWeek(onSelectDay = vi.fn()) {
  render(
    <WeekView
      tasks={[task]}
      currentDate={today}
      onUpdateTasks={vi.fn()}
      onEditTask={vi.fn()}
      onSelectDay={onSelectDay}
    />
  );
  return onSelectDay;
}

describe("WeekView — grade semanal", () => {
  it("tem 7 cabeçalhos de dia como botões e marca hoje com aria-current", () => {
    renderWeek();

    const headers = screen.getAllByRole("button", { name: /^Ver / });
    expect(headers).toHaveLength(7);

    const todayHeader = headers.find(
      (header) => header.getAttribute("aria-current") === "date"
    );
    expect(todayHeader).toBeDefined();
    expect(todayHeader).toHaveAccessibleName(
      `Ver ${format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}`
    );
  });

  it("clicar no cabeçalho do dia leva à visão dia daquela data", async () => {
    const user = userEvent.setup();
    const onSelectDay = renderWeek();

    await user.click(
      screen.getByRole("button", {
        name: `Ver ${format(anotherDay, "EEEE, d 'de' MMMM", { locale: ptBR })}`,
      })
    );

    expect(onSelectDay).toHaveBeenCalledTimes(1);
    expect(format(onSelectDay.mock.calls[0][0], "yyyy-MM-dd")).toBe(
      format(anotherDay, "yyyy-MM-dd")
    );
  });

  it("mostra a tarefa do dia no chip e 'Sem tarefas' nos dias vazios", () => {
    renderWeek();

    expect(screen.getByText("Tarefa da semana")).toBeInTheDocument();
    expect(screen.getAllByText("Sem tarefas")).toHaveLength(6);
  });

  it("abaixo de 1024 vira agenda vertical com TaskRow (SPEC §11.2)", () => {
    const originalWidth = window.innerWidth;
    window.innerWidth = 390;

    try {
      renderWeek();

      expect(
        screen.getByRole("region", { name: "Agenda semanal" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("checkbox", { name: /Concluir Tarefa da semana/ })
      ).toBeInTheDocument();
      expect(screen.getAllByText("Sem tarefas")).toHaveLength(6);
    } finally {
      window.innerWidth = originalWidth;
    }
  });
});
