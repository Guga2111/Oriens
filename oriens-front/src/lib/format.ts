/**
 * Formatação monetária única do app (SPEC §11.5): toda tela que exibe dinheiro
 * passa por aqui, para que o símbolo, o separador e as casas sejam os mesmos.
 */
const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number): string {
  return brlFormatter.format(value);
}
