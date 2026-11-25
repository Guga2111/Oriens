import { renderWork as render } from './work-fixtures';
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "@/pages/DashboardPage";
import apiClient from "@/services/api";
import type { Task } from "@/types/task";

// Dependências de shell/API mockadas: o comportamento sob teste é o
// agrupamento de tarefas por período e a descrição do PageHeader.
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

// Fronteiras dos períodos: 11:59:59/12:00:00 e 17:59:59/18:00:00.
const tasks: Task[] = [
  { id: 1, title: "Início da manhã", startTime: "00:00:00", dueDate: "2026-11-11", priority: "LOW", status: "PENDING" },
  { id: 2, title: "Fim da manhã", startTime: "11:59:59", dueDate: "2026-11-11", priority: "LOW", status: "PENDING" },
  { id: 3, title: "Início da tarde", startTime: "12:00:00", dueDate: "2026-11-11", priority: "MEDIUM", status: "PENDING" },
  { id: 4, title: "Fim da tarde", startTime: "17:59:59", dueDate: "2026-11-11", priority: "MEDIUM", status: "PENDING" },
  { id: 5, title: "Início da noite", startTime: "18:00:00", dueDate: "2026-11-11", priority: "HIGH", status: "PENDING" },
  { id: 6, title: "Fim da noite", startTime: "23:59:59", dueDate: "2026-11-11", priority: "HIGH", status: "PENDING" },
];

function sectionContainer(title: "Manhã" | "Tarde" | "Noite"): HTMLElement {
  const heading = screen.getByRole("heading", { level: 2, name: title });
  const section = heading.closest("section");
  expect(section).not.toBeNull();
  return section as HTMLElement;
}

beforeEach(() => {
  vi.mocked(apiClient.get).mockImplementation(((url: string) => {
    if (url === "/task/user/1") {
      return Promise.resolve({ data: {
        date: '2026-11-14', timezone: 'America/Recife',
        planned: tasks.filter(t => t.status !== 'CONCLUDED'),
        completed: tasks.filter(t => t.status === 'CONCLUDED'),
        previousPlans: [], deadlineAttention: [],
      } });
    }
    return Promise.resolve({ data: [] });
  }) as typeof apiClient.get);
});

describe("DashboardPage — agrupamento de tarefas por período", () => {
  it("lista os períodos do dia antes das tarefas sem horário", async () => {
    render(<DashboardPage />);
    await screen.findByText(/0 de 6 concluídas/);
    const titles = screen.getAllByRole("heading", { level: 2 }).map(heading => heading.textContent);
    expect(titles.indexOf("Sem horário")).toBe(titles.indexOf("Noite") + 1);
    expect(titles.indexOf("Manhã")).toBeLessThan(titles.indexOf("Tarde"));
    expect(titles.indexOf("Tarde")).toBeLessThan(titles.indexOf("Noite"));
  });

  it("respeita as fronteiras 11:59:59/12:00:00 e 17:59:59/18:00:00", async () => {
    render(<DashboardPage />);
    await screen.findByText(/0 de 6 concluídas/);

    const manha = sectionContainer("Manhã");
    const tarde = sectionContainer("Tarde");
    const noite = sectionContainer("Noite");

    // Manhã: 00:00:00 até 11:59:59
    expect(within(manha).getByText("Início da manhã")).toBeInTheDocument();
    expect(within(manha).getByText("Fim da manhã")).toBeInTheDocument();
    expect(within(manha).queryByText("Início da tarde")).toBeNull();

    // Tarde: 12:00:00 até 17:59:59
    expect(within(tarde).getByText("Início da tarde")).toBeInTheDocument();
    expect(within(tarde).getByText("Fim da tarde")).toBeInTheDocument();
    expect(within(tarde).queryByText("Início da noite")).toBeNull();

    // Noite: 18:00:00 até 23:59:59
    expect(within(noite).getByText("Início da noite")).toBeInTheDocument();
    expect(within(noite).getByText("Fim da noite")).toBeInTheDocument();
    expect(within(noite).queryByText("Fim da tarde")).toBeNull();
  });

  it("mostra a quantidade de tarefas ativas em cada período", async () => {
    render(<DashboardPage />);
    await screen.findByText(/0 de 6 concluídas/);

    for (const title of ["Manhã", "Tarde", "Noite"] as const) {
      expect(
        within(sectionContainer(title)).getByText("2 tarefas")
      ).toBeInTheDocument();
    }
  });
});

describe("DashboardPage — seções recolhíveis", () => {
  it("recolhe e reabre a lista de um período pelo título", async () => {
    render(<DashboardPage />);
    await screen.findByText(/0 de 6 concluídas/);
    const manha = sectionContainer("Manhã");
    const toggle = within(manha).getByRole("button", { name: "Manhã" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(manha).getByText("Início da manhã")).toBeInTheDocument();

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(within(manha).queryByText("Início da manhã")).not.toBeInTheDocument();
    expect(within(manha).getByText("2 tarefas")).toBeInTheDocument();

    await userEvent.click(toggle);
    expect(within(manha).getByText("Início da manhã")).toBeInTheDocument();
  });
});
