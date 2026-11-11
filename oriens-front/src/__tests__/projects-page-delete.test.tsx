import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectsPage from "@/pages/ProjectsPage";
import type { ProjectDTO } from "@/components/projects/ProjectCard";
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

/** Abre o dropdown do card do projeto e clica em "Deletar". */
async function openDeleteDialog(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText(project.title);
  const card = screen
    .getByText(project.title)
    .closest("div.rounded-lg") as HTMLElement;
  const trigger = card.querySelector('[aria-haspopup="menu"]');
  expect(trigger).not.toBeNull();
  await user.click(trigger as HTMLElement);
  await user.click(await screen.findByRole("menuitem", { name: "Deletar" }));
  expect(await screen.findByText("Você tem certeza?")).toBeInTheDocument();
}

describe("ProjectsPage — AlertDialog de excluir projeto", () => {
  it("não chama DELETE antes da confirmação e chama após confirmar", async () => {
    const user = userEvent.setup();
    render(<ProjectsPage />);

    await openDeleteDialog(user);
    expect(apiClient.delete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await waitFor(() =>
      expect(apiClient.delete).toHaveBeenCalledWith("/project/9")
    );
  });

  it("não chama DELETE ao cancelar", async () => {
    const user = userEvent.setup();
    render(<ProjectsPage />);

    await openDeleteDialog(user);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByText("Você tem certeza?")).toBeNull();
    expect(apiClient.delete).not.toHaveBeenCalled();
  });
});
