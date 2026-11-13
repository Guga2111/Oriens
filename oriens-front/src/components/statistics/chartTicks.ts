/** Ticks inteiros para 4 gridlines horizontais (SPEC §11.6). */
export function integerTicks(maxValue: number, count = 4): number[] {
  const safeMax = Math.max(0, Math.ceil(maxValue));
  let step = 1;

  if (safeMax > count - 1) {
    const rough = safeMax / (count - 1);
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const normalized = rough / magnitude;
    const nice =
      normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

    step = Math.max(1, Math.ceil(nice * magnitude));
  }

  return Array.from({ length: count }, (_, index) => index * step);
}

/**
 * Escolhe entre 4 e 8 rótulos no eixo X, sempre incluindo o primeiro e o
 * último ponto da série (SPEC §11.6).
 */
export function pickDateTicks<T extends { date: string }>(
  data: T[],
  maxLabels = 6
): string[] {
  if (data.length === 0) return [];
  if (data.length <= maxLabels) return data.map((point) => point.date);

  const lastIndex = data.length - 1;
  const indexes = new Set<number>();

  for (let index = 0; index < maxLabels; index += 1) {
    indexes.add(Math.round((index * lastIndex) / (maxLabels - 1)));
  }

  return [...indexes]
    .sort((a, b) => a - b)
    .map((index) => data[index].date);
}
