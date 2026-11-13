import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectDetailPage from "@/pages/ProjectDetailPage";
import type { ProjectDTO } from "@/types/project";
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

// 2026-11-15T00:00:00.000Z = 14/11 às 21h em America/Sao_Paulo.
// O parse atual usa a parte de data do string (sem fuso) e renderiza 15/11.
const project: ProjectDTO = {
  id: 5,
  title: "Projeto com data",
  progress: 0,
  totalObjectives: 1,
  favorite: false,
  archived: false,
  objectives: [
    {
      title: "Objetivo com vencimento",
      status: "PENDING",
      dueDate: "2026-11-15T00:00:00.000Z",
    },
  ],
};

beforeEach(() => {
  vi.mocked(apiClient.get).mockImplementation(((url: string) => {
    if (url === "/project/5") {
      return Promise.resolve({ data: project });
    }
    if (url.includes("/summary/weekly-counts")) {
      return Promise.resolve({ data: { completedTasks: 0, totalTasks: 0 } });
    }
    if (url.includes("/sidebar")) {
      return Promise.resolve({ data: [] });
    }
    if (url === "/user/1") {
      return Promise.resolve({ data: { phoneNumber: null } });
    }
    return Promise.resolve({ data: [] });
  }) as typeof apiClient.get);
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/tasks/project/5"]}>
      <Routes>
        <Route path="/tasks/project/:id" element={<ProjectDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProjectDetailPage — parse local de dueDate", () => {
  it("renderiza a data do string sem deslocamento de fuso", async () => {
    renderPage();

    expect(
      await screen.findByText(/Vence em 15\/11/)
    ).toBeInTheDocument();
    // Regressão: um new Date(dueDate) ingênuo mostraria 14/11 em BRT.
    expect(screen.queryByText(/14\/11/)).toBeNull();
  });
});
