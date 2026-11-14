export const PRODUCT_TIMEZONE = 'America/Recife';
export function productNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PRODUCT_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return { date: `${value('year')}-${value('month')}-${value('day')}`,
    time: `${value('hour')}:${value('minute')}:${value('second')}` };
}

/** A calendar date carrier for date-fns; never converts a stored day through UTC. */
export function productDate(date = productNow().date) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}
