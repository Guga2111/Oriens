/** Decimal money stays exact; floating point is used only for chart geometry. */
export function moneyCents(value: string | number): bigint {
  const text = String(value);
  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) throw new Error('Valor monetário inválido.');
  const [whole, fraction = ''] = text.replace('-', '').split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  return text.startsWith('-') ? -cents : cents;
}
export function centsAmount(cents: bigint): string {
  const abs = cents < 0n ? -cents : cents;
  return `${cents < 0n ? '-' : ''}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`;
}
