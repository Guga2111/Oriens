import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "@/pages/DashboardPage";
import apiClient from "@/services/api";

// Dependências de shell/API mockadas: o comportamento sob teste é o
// agrupamento de tarefas por período (getTasksForPeriod do DashboardPage).
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

vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({
    preferences: { theme: "light", sound: false, notifications: false },
    updatePreference: vi.fn(),
    isUpdating: false,
  }),
}));

vi.mock("@/hooks/useSound", () => ({
  useSound: () => vi.fn(),
}));

interface Task {
  id: number;
  title: string;
  startTime: string;
  dueDate: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "ON_DOING" | "CONCLUDED";
}

// Fronteiras dos períodos: 11:59:59/12:00:00 e 17:59:59/18:00:00.
const tasks: Task[] = [
  { id: 1, title: "Início da manhã", startTime: "00:00:00", dueDate: "2026-11-11", priority: "LOW", status: "PENDING" },
  { id: 2, title: "Fim da manhã", startTime: "11:59:59", dueDate: "2026-11-11", priority: "LOW", status: "PENDING" },
  { id: 3, title: "Início da tarde", startTime: "12:00:00", dueDate: "2026-11-11", priority: "MEDIUM", status: "PENDING" },
  { id: 4, title: "Fim da tarde", startTime: "17:59:59", dueDate: "2026-11-11", priority: "MEDIUM", status: "PENDING" },
  { id: 5, title: "Início da noite", startTime: "18:00:00", dueDate: "2026-11-11", priority: "HIGH", status: "PENDING" },
  { id: 6, title: "Fim da noite", startTime: "23:59:59", dueDate: "2026-11-11", priority: "HIGH", status: "PENDING" },
];

/** Container da seção do TaskSection (raiz acima do header com o h3). */
function sectionContainer(title: "Manhã" | "Tarde" | "Noite"): HTMLElement {
  const heading = screen.getByRole("heading", { level: 3, name: title });
  const headerRow = heading.closest("div.flex.items-center.justify-between");
  expect(headerRow).not.toBeNull();
  return headerRow!.parentElement as HTMLElement;
}

beforeEach(() => {
  vi.mocked(apiClient.get).mockImplementation(((url: string) => {
    if (url.startsWith("/task/user/1?")) {
      return Promise.resolve({ data: tasks });
    }
    if (url === "/user/1") {
      return Promise.resolve({ data: { phoneNumber: null } });
    }
    if (url.includes("/summary/weekly-counts")) {
      return Promise.resolve({ data: { completedTasks: 0, totalTasks: 0 } });
    }
    return Promise.resolve({ data: [] });
  }) as typeof apiClient.get);
});

describe("DashboardPage — agrupamento de tarefas por período", () => {
  it("respeita as fronteiras 11:59:59/12:00:00 e 17:59:59/18:00:00", async () => {
    render(<DashboardPage />);
    await screen.findByRole("heading", { level: 3, name: "Manhã" });

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

  it("mostra a contagem de concluídas por seção", async () => {
    render(<DashboardPage />);
    await screen.findByRole("heading", { level: 3, name: "Manhã" });

    for (const title of ["Manhã", "Tarde", "Noite"] as const) {
      expect(
        within(sectionContainer(title)).getByText("0 de 2 concluídas")
      ).toBeInTheDocument();
    }
  });
});
