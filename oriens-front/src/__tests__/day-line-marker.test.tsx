import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { DayLine } from "@/components/dashboard/DayLine";
import type { Task, TaskStatus } from "@/types/task";

const task = (id: number, title: string, startTime: string, status: TaskStatus): Task => ({
  id, title, startTime, dueDate: "2026-11-13", priority: "MEDIUM", status,
});

// D7 (docs/plans/2026-11-22-design-system-plane-so-orange-design.md): in progress is the primary
// accent and concluded is neutral, so neither marker relies on orange vs. --now hue alone.
it.each([
  ["Revisar", "ON_DOING", "bg-primary"],
  ["Enviar", "CONCLUDED", "bg-muted-foreground"],
  ["Planejar", "PENDING", "bg-foreground/40"],
] as const)("marcador de tarefa %s (%s) usa %s", (title, status, markerClass) => {
  render(<DayLine tasks={[task(1, title, "09:00:00", status)]} date={new Date(2026, 10, 13)} />);

  const marker = screen.getByRole("button", { name: new RegExp(title) }).querySelector("span");

  expect(marker).toHaveClass(markerClass);
  expect(marker).not.toHaveClass("bg-now");
});
