import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectsPage from "@/pages/ProjectsPage";
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
  id: 9,
  title: "Projeto Excluir",
  progress: 0,
  totalObjectives: 1,
  favorite: false,
  archived: false,
  objectives: [{ title: "Objetivo único", status: "PENDING" }],
};

beforeEach(() => {
  vi.mocked(apiClient.get).mockImplementation(((url: string) => {
    if (url.includes("?page=")) {
      return Promise.resolve({ data: { content: [project], last: true } });
    }
    return Promise.resolve({ data: [] });
  }) as typeof apiClient.get);
  vi.mocked(apiClient.delete).mockResolvedValue({ data: undefined } as never);
});

/** Abre o dropdown do card do projeto e clica em "Excluir". */
async function openDeleteDialog(user: ReturnType<typeof userEvent.setup>) {
  const heading = await screen.findByRole("heading", { name: project.title });
  const card = heading.closest("div.rounded-lg") as HTMLElement;
  const trigger = within(card).getByRole("button", {
    name: `Ações do projeto: ${project.title}`,
  });
  await user.click(trigger);
  await user.click(await screen.findByRole("menuitem", { name: "Excluir" }));
  expect(await screen.findByText("Excluir projeto?")).toBeInTheDocument();
}

describe("ProjectsPage — AlertDialog de excluir projeto", () => {
  it("não chama DELETE antes da confirmação e chama após confirmar", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>
    );

    await openDeleteDialog(user);
    expect(apiClient.delete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Excluir" }));

    await waitFor(() =>
      expect(apiClient.delete).toHaveBeenCalledWith("/project/9")
    );
  });

  it("não chama DELETE ao cancelar", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>
    );

    await openDeleteDialog(user);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByText("Excluir projeto?")).toBeNull();
    expect(apiClient.delete).not.toHaveBeenCalled();
  });
});
