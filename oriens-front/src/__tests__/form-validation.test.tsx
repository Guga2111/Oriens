import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { CreateTaskDialog } from "@/components/dashboard/CreateTaskDialog";
import { EditTaskDialog } from "@/components/dashboard/EditTaskDialog";
import { CreateEntryDialog } from "@/components/financial/CreateEntryDialog";
import { EditEntryDialog } from "@/components/financial/EditEntryDialog";
import { TagManagementDialog } from "@/components/financial/TagManagementDialog";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { createTag, getCustomTags, getDefaultTags } from "@/services/financialService";
import apiClient from "@/services/api";
import type { Task } from "@/types/task";

vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock("@/hooks/useGoogleMapsScript", () => ({ useGoogleMapsScript: () => ({ isLoaded: false }) }));
vi.mock("@/services/api", () => ({ default: { post: vi.fn(), put: vi.fn() } }));
vi.mock("@/services/financialService", () => ({
  getDefaultTags: vi.fn(), getCustomTags: vi.fn(), createTag: vi.fn(),
  updateTag: vi.fn(), deleteTag: vi.fn(), createEntry: vi.fn(), updateEntry: vi.fn(),
}));

const task: Task = { id: 1, title: "Tarefa", description: "", dueDate: "2026-11-13", startTime: "09:00:00", priority: "MEDIUM", status: "ON_DOING" };
const callbacks = { open: true, onOpenChange: vi.fn(), onSuccess: vi.fn() };

beforeEach(() => {
  vi.mocked(getDefaultTags).mockResolvedValue([]);
  vi.mocked(getCustomTags).mockResolvedValue([]);
});

it("nova tarefa associa os erros aos campos e impede envio inválido", async () => {
  render(<CreateTaskDialog {...callbacks} onTaskCreated={vi.fn()} />);
  await userEvent.click(screen.getByRole("button", { name: "Salvar Tarefa" }));
  expect(screen.getByLabelText("Título")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByLabelText("Título")).toHaveAccessibleDescription("Informe o título da tarefa.");
  expect(screen.getByRole("button", { name: "Data" })).toHaveAccessibleDescription("Escolha a data da tarefa.");
  expect(apiClient.post).not.toHaveBeenCalled();
});

it("edição de tarefa mantém status e payload completo e mostra falha inline", async () => {
  vi.mocked(apiClient.put).mockRejectedValueOnce(new Error("offline"));
  render(<EditTaskDialog {...callbacks} task={task} onTaskUpdated={vi.fn()} />);
  await userEvent.click(screen.getByRole("button", { name: "Salvar Alterações" }));
  await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith("/task/1", task));
  expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível salvar");
});

it.each(["create", "edit"])("entrada %s expõe validação inline de valor e tag", async (mode) => {
  render(mode === "create"
    ? <CreateEntryDialog {...callbacks} tags={[]} />
    : <EditEntryDialog {...callbacks} tags={[]} entry={{ id: 1, amount: 0, entryDate: "2026-11-13", tagId: 0, description: "" }} />);
  await userEvent.click(screen.getByRole("button", { name: mode === "create" ? "Criar Entrada" : "Salvar Alterações" }));
  expect(screen.getByLabelText("Valor")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByLabelText("Valor")).toHaveAccessibleDescription("Informe o valor da entrada.");
  expect(screen.getByRole("combobox")).toHaveAccessibleDescription("Selecione uma tag.");
});

it("projeto não envia título em branco e associa o erro inline", async () => {
  render(<CreateProjectDialog {...callbacks} />);
  await userEvent.type(screen.getByLabelText("Título do Projeto"), "   ");
  await userEvent.click(screen.getByRole("button", { name: "Criar Projeto" }));
  expect(screen.getByLabelText("Título do Projeto")).toHaveAccessibleDescription("Informe o título do projeto.");
  expect(apiClient.post).not.toHaveBeenCalled();
});

it("BE6: 403 ao criar tag permanece no formulário sem perder os dados", async () => {
  vi.mocked(createTag).mockRejectedValueOnce({ isAxiosError: true, response: { status: 403 } });
  render(<TagManagementDialog {...callbacks} userId={7} onTagsChange={vi.fn()} />);
  await screen.findByText("Nenhuma tag personalizada criada");
  await userEvent.click(screen.getByRole("button", { name: "Nova Tag" }));
  await userEvent.type(screen.getByLabelText("Nome"), "Transporte");
  await userEvent.click(screen.getByRole("button", { name: "Criar" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Você não tem permissão para criar tags");
  expect(screen.getByLabelText("Nome")).toHaveValue("Transporte");
  expect(callbacks.onSuccess).not.toHaveBeenCalled();
});
