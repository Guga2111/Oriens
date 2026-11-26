import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AppHeader } from "@/components/common/AppHeader";
import { HeaderActionsProvider } from "@/components/common/HeaderActions";
import { SidebarProvider } from "@/components/ui/sidebar";
import AllDataPage from "@/pages/AllDataPage";
import api from "@/services/api";
import { pageOf, project, renderWork, task } from "./work-fixtures";

vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock("@/components/layout/AppLayout", () => ({ useSidebarProjects: () => ({ refreshSidebarProjects: vi.fn() }) }));
vi.mock("@/services/api", () => ({ default: { get: vi.fn(), patch: vi.fn() } }));

const fetchPage = vi.mocked(api.get);
const baseWidth = window.innerWidth;

beforeEach(() => {
  fetchPage.mockReset();
  fetchPage.mockImplementation(async url => ({ data: pageOf(url === "/task/user/7/all" ? [task] : [project]) }));
});

afterEach(() => { window.innerWidth = baseWidth; });

it("mostra a busca e os filtros da aba ativa junto ao breadcrumb", async () => {
  const user = userEvent.setup();
  renderWork(
    <SidebarProvider>
      <HeaderActionsProvider>
        <AppHeader />
        <AllDataPage />
      </HeaderActionsProvider>
    </SidebarProvider>,
    "/all-data?archived=1",
  );

  const header = within(screen.getByRole("banner"));
  expect(header.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("Explorar");
  expect(header.getByRole("search", { name: "Buscar tarefas" })).toBeInTheDocument();
  expect(header.getByRole("button", { name: "Filtros" })).toBeInTheDocument();
  expect(header.queryByRole("searchbox")).not.toBeInTheDocument();
  expect(within(screen.getByRole("tabpanel")).queryByRole("search")).not.toBeInTheDocument();

  await user.click(header.getByRole("button", { name: "Buscar tarefas" }));
  expect(header.getByRole("searchbox", { name: "Buscar por título" })).toHaveFocus();
  await user.keyboard("{Escape}");
  expect(header.queryByRole("searchbox")).not.toBeInTheDocument();
  await waitFor(() => expect(header.getByRole("button", { name: "Buscar tarefas" })).toHaveFocus());

  await user.click(screen.getByRole("tab", { name: "Projetos" }));
  expect(header.getByRole("search", { name: "Buscar projetos" })).toBeInTheDocument();
  expect(header.getByRole("button", { name: "Filtros (1 ativo)" })).toBeInTheDocument();
  expect(header.queryByRole("search", { name: "Buscar tarefas" })).not.toBeInTheDocument();
});

it("envia a busca da barra para o servidor e volta à primeira página", async () => {
  fetchPage.mockImplementation(async (url, config) => {
    if (url !== "/task/user/7/all") return { data: pageOf([project]) };
    const { page, search } = config?.params as { page: number; search?: string };
    return { data: search ? pageOf([]) : { ...pageOf([task]), number: page, totalElements: 21, totalPages: 2 } };
  });
  const user = userEvent.setup();
  renderWork(<AllDataPage />, "/all-data");
  await user.click(await screen.findByRole("button", { name: "Próxima página" }));
  await screen.findByText("Página 2 de 2");

  await user.click(screen.getByRole("button", { name: "Buscar tarefas" }));
  const search = screen.getByRole("searchbox", { name: "Buscar por título" });
  await user.type(search, "Sem correspondência");
  expect(fetchPage).not.toHaveBeenCalledWith("/task/user/7/all", expect.objectContaining({
    params: expect.objectContaining({ search: "Sem correspondência" }),
  }));
  await user.keyboard("{Enter}");
  expect(await screen.findByText("Nenhum resultado encontrado")).toBeInTheDocument();
  expect(fetchPage).toHaveBeenCalledWith("/task/user/7/all", expect.objectContaining({
    params: expect.objectContaining({ page: 0, size: 20, search: "Sem correspondência" }),
  }));

  await user.click(screen.getByRole("button", { name: "Limpar filtros" }));
  expect(await screen.findByText("Página 1 de 2")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Buscar tarefas" }));
  expect(screen.getByRole("searchbox", { name: "Buscar por título" })).toHaveValue("");
});

it("ordena tarefas no servidor, volta à primeira página e mantém o foco no cabeçalho", async () => {
  fetchPage.mockImplementation(async url => ({ data: url === "/task/user/7/all"
    ? { ...pageOf([task]), totalElements: 21, totalPages: 2 }
    : pageOf([project]) }));
  const user = userEvent.setup();
  renderWork(<AllDataPage />, "/all-data");
  await user.click(await screen.findByRole("button", { name: "Próxima página" }));
  await screen.findByText("Página 2 de 2");

  const priority = screen.getByRole("columnheader", { name: "Prioridade" });
  const sort = within(priority).getByRole("button");
  await user.click(sort);
  expect(priority).toHaveAttribute("aria-sort", "descending");
  expect(sort).toHaveFocus();
  expect(await screen.findByText("Página 1 de 2")).toBeInTheDocument();
  expect(fetchPage).toHaveBeenCalledWith("/task/user/7/all", expect.objectContaining({
    params: expect.objectContaining({ page: 0, sortBy: "priority", direction: "DESC" }),
  }));

  await user.keyboard("{Enter}");
  expect(priority).toHaveAttribute("aria-sort", "ascending");
  await waitFor(() => expect(fetchPage).toHaveBeenCalledWith("/task/user/7/all", expect.objectContaining({
    params: expect.objectContaining({ page: 0, sortBy: "priority", direction: "ASC" }),
  })));
});

it("aplica a ordenação da lista de projetos pelos filtros da API", async () => {
  const user = userEvent.setup();
  renderWork(<AllDataPage />, "/all-data?tab=projects&archived=1");

  await user.click(screen.getByRole("button", { name: "Ordenar" }));
  await user.click(screen.getByRole("menuitemradio", { name: "Favorito" }));
  await waitFor(() => expect(fetchPage).toHaveBeenCalledWith("/project/user/7", expect.objectContaining({
    params: expect.objectContaining({ includeArchived: true, page: 0, sortBy: "favorite", direction: "DESC" }),
  })));
});

it("mantém a busca na tela e mostra os filtros de projetos no Sheet em largura estreita", async () => {
  window.innerWidth = 390;
  const user = userEvent.setup();
  renderWork(<AllDataPage />, "/all-data?tab=projects&archived=1");

  expect(screen.getByRole("button", { name: "Buscar projetos" })).toBeInTheDocument();
  const trigger = screen.getByRole("button", { name: "Filtros (1 ativo)" });
  await user.click(trigger);
  const filters = screen.getByRole("dialog", { name: "Filtros" });
  const archived = within(filters).getByRole("switch", { name: "Mostrar arquivados" });
  expect(archived).toBeChecked();
  expect(within(filters).queryByRole("searchbox")).not.toBeInTheDocument();

  await user.click(archived);
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog", { name: "Filtros" })).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  expect(fetchPage).toHaveBeenCalledWith("/project/user/7", expect.objectContaining({
    params: expect.objectContaining({ includeArchived: false }),
  }));
});

it("mantém os controles durante o carregamento e permite tentar novamente após erro", async () => {
  fetchPage.mockImplementation(async url => {
    if (url === "/task/user/7/all") throw new Error("Falha temporária");
    return { data: pageOf([project]) };
  });
  const user = userEvent.setup();
  renderWork(<AllDataPage />, "/all-data");

  expect(screen.getByRole("status")).toHaveTextContent("Carregando tarefas");
  expect(screen.getByRole("button", { name: "Buscar tarefas" })).toBeEnabled();
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("Não foi possível atualizar as tarefas.");

  fetchPage.mockResolvedValue({ data: pageOf([task]) });
  await user.click(within(alert).getByRole("button", { name: "Tentar novamente" }));
  expect(await within(screen.getByRole("table", { name: "Tarefas" })).findByText(task.title)).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
});
