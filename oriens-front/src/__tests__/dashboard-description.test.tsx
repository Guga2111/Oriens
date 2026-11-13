import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "@/pages/DashboardPage";
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

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    userEmail: "teste@oriens.test",
    username: "Teste",
    userId: 1,
    profileImageUrl: null,
    token: "token-fake",
    role: "USER",
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    updateProfileImage: vi.fn(),
  }),
}));

vi.mock("@/hooks/useSound", () => ({
  useSound: () => vi.fn(),
}));

function task(overrides: Partial<Task> & Pick<Task, "id" | "title">): Task {
  return {
    startTime: "09:00:00",
    dueDate: "2026-11-11",
    priority: "MEDIUM",
    status: "PENDING",
    ...overrides,
  };
}

function mockTasks(tasks: Task[]) {
  vi.mocked(apiClient.get).mockImplementation(((url: string) => {
    if (url.startsWith("/task/user/1?")) {
      return Promise.resolve({ data: tasks });
    }
    return Promise.resolve({ data: [] });
  }) as typeof apiClient.get);
}

beforeEach(() => {
  mockTasks([]);
});

describe("DashboardPage — descrição do PageHeader", () => {
  it("mostra concluídas, em andamento e a próxima tarefa", async () => {
    mockTasks([
      task({ id: 1, title: "Academia", startTime: "07:00:00", status: "CONCLUDED" }),
      task({ id: 2, title: "Reunião", startTime: "09:00:00", status: "ON_DOING" }),
      task({ id: 3, title: "Spec", startTime: "15:00:00", status: "CONCLUDED" }),
    ]);

    render(<DashboardPage />);

    expect(
      await screen.findByText(
        "2 de 3 concluídas · 1 em andamento · próxima às 09:00 — Reunião"
      )
    ).toBeInTheDocument();
  });

  it("mostra 'Tudo concluído' quando não há próxima tarefa", async () => {
    mockTasks([
      task({ id: 1, title: "Academia", status: "CONCLUDED" }),
      task({ id: 2, title: "Reunião", startTime: "10:00:00", status: "CONCLUDED" }),
    ]);

    render(<DashboardPage />);

    expect(
      await screen.findByText("2 de 2 concluídas · Tudo concluído")
    ).toBeInTheDocument();
  });

  it("mostra 'Nenhuma tarefa' quando o dia está vazio", async () => {
    render(<DashboardPage />);

    expect(await screen.findByText("Nenhuma tarefa")).toBeInTheDocument();
  });
});
