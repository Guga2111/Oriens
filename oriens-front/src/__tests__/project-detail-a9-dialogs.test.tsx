import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const project: ProjectDTO = {
  id: 5,
  title: "Projeto A9",
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

// A9 (P0.3): asteriscos literais na exclusão e botão vazio absoluto
// "Limpar data" fora do PopoverContent.
describe("ProjectDetailPage — A9 diálogos", () => {
  it("exibe o título do projeto em <strong> na confirmação de exclusão, sem **", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Objetivo com vencimento");

    await user.click(screen.getByRole("button", { name: "Ações do projeto" }));
    await user.click(await screen.findByRole("menuitem", { name: "Excluir" }));

    const dialog = await screen.findByRole("alertdialog");
    const strong = dialog.querySelector("strong");
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe("Projeto A9");
    expect(dialog.textContent).not.toContain("**");
  });

  it("não tem botão vazio absoluto e oferece 'Limpar data' dentro do PopoverContent", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Objetivo com vencimento");

    // Abre o diálogo de editar objetivo pelo menu da linha do objetivo.
    await user.click(
      screen.getByRole("button", {
        name: "Ações do objetivo: Objetivo com vencimento",
      })
    );
    await user.click(await screen.findByRole("menuitem", { name: "Editar" }));

    await screen.findByText("Editar Objetivo");

    // Regressão A9: nenhum botão absoluto vazio no diálogo.
    expect(document.querySelector("button.absolute.right-12")).toBeNull();

    // O gatilho do calendário abre o PopoverContent com a opção de limpar.
    const dateTrigger = Array.from(
      document.querySelectorAll("button")
    ).find(
      (button) =>
        button.textContent?.includes("2026") ||
        button.textContent?.includes("Escolha uma data")
    );
    expect(dateTrigger).toBeDefined();
    await user.click(dateTrigger as HTMLElement);

    const clearButton = await screen.findByRole("button", { name: "Limpar data" });
    await user.click(clearButton);

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Limpar data" })).toBeNull()
    );
    expect(screen.getByText("Escolha uma data")).toBeInTheDocument();
  });
});
