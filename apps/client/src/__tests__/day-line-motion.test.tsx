import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { DayLine } from "@/components/dashboard/DayLine";
import type { Task } from "@/types/task";

it.each([false, true])("linha do dia respeita reduced-motion=%s ao rolar até a tarefa", async (reducedMotion) => {
  const original = window.matchMedia;
  const media = vi.spyOn(window, "matchMedia").mockImplementation((query) => ({ ...original(query), matches: reducedMotion }));
  const scroll = vi.spyOn(Element.prototype, "scrollIntoView");
  const task: Task = { id: 3, title: "Planejar", startTime: "09:00:00", dueDate: "2026-11-13", priority: "MEDIUM", status: "PENDING" };
  try {
    render(<><DayLine tasks={[task]} date={new Date()} /><div id="task-row-3" tabIndex={-1} /></>);
    await userEvent.click(screen.getByRole("button", { name: /Planejar/ }));
    expect(scroll).toHaveBeenCalledWith({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    expect(document.activeElement).toHaveAttribute("id", "task-row-3");
  } finally {
    media.mockRestore();
    scroll.mockRestore();
  }
});
