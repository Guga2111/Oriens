/** Numeric(12,2), with zero preserved. Reject extra precision before converting the input. */
export function financialAmountError(value: string): string | null {
  if (!value.trim()) return 'Informe o valor da entrada.';
  if (!/^-?\d{1,10}(\.\d{1,2})?$/.test(value) || !Number.isFinite(Number(value)) || Math.abs(Number(value)) > 9999999999.99)
    return 'Use um valor de até 9.999.999.999,99, com no máximo duas casas decimais.';
  return null;
}
