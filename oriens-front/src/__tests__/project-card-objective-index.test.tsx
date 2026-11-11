import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectCard, type ProjectDTO } from "@/components/projects/ProjectCard";
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

// 3º objetivo pendente com um concluído antes dele: o toggle precisa usar o
// índice ORIGINAL (2), não a posição visual na lista (1).
const project: ProjectDTO = {
  id: 7,
  title: "Projeto Objetivos",
  progress: 33,
  totalObjectives: 3,
  favorite: false,
  archived: false,
  objectives: [
    { title: "Primeiro (concluído)", status: "CONCLUDED" },
    { title: "Segundo (pendente)", status: "PENDING" },
    { title: "Terceiro (pendente)", status: "PENDING" },
  ],
};

/** Botão de toggle (Circle/CheckCircle2) do objetivo com o título dado. */
function toggleFor(title: string): HTMLElement {
  const label = screen.getByText(title);
  const textBlock = label.parentElement as HTMLElement; // div.space-y-1
  const row = textBlock.parentElement as HTMLElement; // div.flex.items-start
  return within(row).getByRole("button");
}

beforeEach(() => {
  vi.mocked(apiClient.patch).mockResolvedValue({ data: project } as never);
});

describe("ProjectCard — endereçamento de objetivo pelo índice original", () => {
  it("alterna o 3º objetivo pelo índice original (PATCH .../objective/2)", async () => {
    const user = userEvent.setup();
    const onProjectUpdate = vi.fn();
    render(
      <ProjectCard
        project={project}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onProjectUpdate={onProjectUpdate}
      />
    );

    // Fora do colapso só os 2 primeiros objetivos aparecem.
    expect(screen.queryByText("Terceiro (pendente)")).toBeNull();

    await user.click(
      screen.getByRole("button", { name: /Ver mais 1 objetivo/ })
    );
    expect(screen.getByText("Terceiro (pendente)")).toBeInTheDocument();

    await user.click(toggleFor("Terceiro (pendente)"));

    expect(apiClient.patch).toHaveBeenCalledWith(
      "/project/7/objective/2",
      { status: "CONCLUDED" }
    );
    expect(onProjectUpdate).toHaveBeenCalledWith(project);
  });

  it("alterna o 2º objetivo visível pelo índice 1", async () => {
    const user = userEvent.setup();
    render(
      <ProjectCard
        project={project}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onProjectUpdate={vi.fn()}
      />
    );

    await user.click(toggleFor("Segundo (pendente)"));

    expect(apiClient.patch).toHaveBeenCalledWith(
      "/project/7/objective/1",
      { status: "CONCLUDED" }
    );
  });
});
