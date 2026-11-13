import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EntryHistoryTable } from "@/components/financial/EntryHistoryTable";
import type { EntryDTO, TagDTO } from "@/types/financial";

const tags: TagDTO[] = [
  { id: 1, name: "Salário", color: "#111111" },
  { id: 2, name: "Compras", color: "#222222" },
];

const entries: EntryDTO[] = [
  {
    id: 1,
    amount: 1000,
    entryDate: "2026-11-05",
    description: "Salário",
    tagId: 1,
  },
  {
    id: 2,
    amount: -250,
    entryDate: "2026-11-06",
    description: "Mercado",
    tagId: 2,
  },
];

function renderTable(overrides: Partial<React.ComponentProps<typeof EntryHistoryTable>> = {}) {
  const props: React.ComponentProps<typeof EntryHistoryTable> = {
    entries,
    tags,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    pagination: { page: 0, totalPages: 2, totalElements: 25 },
    onPageChange: vi.fn(),
    filters: {
      periodFilter: "all",
      customStartDate: undefined,
      customEndDate: undefined,
      tagFilter: "all",
      searchQuery: "",
    },
    onFilterChange: vi.fn(),
    ...overrides,
  };

  render(<EntryHistoryTable {...props} />);
  return props;
}

describe("EntryHistoryTable — histórico independente do mês", () => {
  it("alinha os valores à direita com sinal e tokens de cor", () => {
    renderTable();

    const table = screen.getByRole("table");
    expect(within(table).getByText("+ R$ 1.000,00")).toHaveClass(
      "text-positive"
    );
    expect(within(table).getByText("− R$ 250,00")).toHaveClass("text-negative");
  });

  it("usa Pagination com página atual e navegação", async () => {
    const user = userEvent.setup();
    const props = renderTable();

    expect(screen.getByText("Mostrando 1 a 20 de 25 entradas")).toBeInTheDocument();
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Próxima página" }));
    expect(props.onPageChange).toHaveBeenCalledWith(1);
  });

  it("só exclui depois da confirmação", async () => {
    const user = userEvent.setup();
    const props = renderTable();

    await user.click(
      within(screen.getByRole("table")).getByRole("button", {
        name: "Excluir entrada: Mercado",
      })
    );

    const dialog = await screen.findByRole("alertdialog");
    expect(props.onDelete).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));
    expect(props.onDelete).toHaveBeenCalledWith(2);
  });
});
