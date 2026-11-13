import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectCard } from "@/components/projects/ProjectCard";
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

vi.mock("@/hooks/useSound", () => ({
  useSound: () => vi.fn(),
}));

// O 3º pendente por ordem de vencimento é o índice 2 em project.objectives:
// há um concluído antes dele e a lista visual é ordenada por dueDate.
const project: ProjectDTO = {
  id: 7,
  title: "Projeto Objetivos",
  progress: 33,
  totalObjectives: 4,
  favorite: false,
  archived: false,
  objectives: [
    { title: "Primeiro (concluído)", status: "CONCLUDED" },
    { title: "Segundo (vence depois)", status: "PENDING", dueDate: "2026-11-20" },
    { title: "Terceiro (vence antes)", status: "PENDING", dueDate: "2026-11-10" },
    { title: "Quarto (sem data)", status: "PENDING" },
  ],
};

function renderCard(overrides: Partial<ProjectDTO> = {}) {
  const onProjectUpdate = vi.fn();
  render(
    <MemoryRouter>
      <ProjectCard
        project={{ ...project, ...overrides }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onProjectUpdate={onProjectUpdate}
      />
    </MemoryRouter>
  );
  return { onProjectUpdate };
}

beforeEach(() => {
  vi.mocked(apiClient.patch).mockResolvedValue({ data: project } as never);
});

describe("ProjectCard — endereçamento de objetivo pelo índice original", () => {
  it("ordena os pendentes por vencimento e alterna o 3º pelo índice original (PATCH .../objective/2)", async () => {
    const user = userEvent.setup();
    const { onProjectUpdate } = renderCard();

    // Concluídos não aparecem nos próximos objetivos.
    expect(screen.queryByText("Primeiro (concluído)")).toBeNull();

    // A ordem visual é por dueDate; sem data vai por último.
    const toggles = screen.getAllByRole("button", {
      name: /^Concluir objetivo:/,
    });
    expect(toggles.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Concluir objetivo: Terceiro (vence antes)",
      "Concluir objetivo: Segundo (vence depois)",
      "Concluir objetivo: Quarto (sem data)",
    ]);

    await user.click(toggles[0]);

    expect(apiClient.patch).toHaveBeenCalledWith(
      "/project/7/objective/2",
      { status: "CONCLUDED" }
    );
    expect(onProjectUpdate).toHaveBeenCalledWith(project);
  });

  it("envia o índice original de um objetivo sem data (PATCH .../objective/3)", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(
      screen.getByRole("button", {
        name: "Concluir objetivo: Quarto (sem data)",
      })
    );

    expect(apiClient.patch).toHaveBeenCalledWith(
      "/project/7/objective/3",
      { status: "CONCLUDED" }
    );
  });

  it("lê o progresso de project.progress e a contagem real de objetivos (D10)", () => {
    renderCard();

    expect(screen.getByText("33%")).toBeInTheDocument();
    expect(screen.getByText("1 de 4 objetivos concluídos")).toBeInTheDocument();
  });

  it("não reserva placeholder quando o projeto não tem imagem", () => {
    renderCard();

    expect(screen.queryByText("Sem imagem")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
