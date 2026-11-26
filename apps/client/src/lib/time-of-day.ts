/** Times of day as `HH:mm` on the 24-hour clock, the form a task's start time takes without seconds. */

const pad = (value: number) => String(value).padStart(2, "0");
const toTime = (hour: number, minute: number) => (hour < 24 && minute < 60 ? `${pad(hour)}:${pad(minute)}` : null);

/** The hours `00`–`23` and minutes `00`–`59`, as the columns of a time picker show them. */
export const HOURS = Array.from({ length: 24 }, (_, hour) => pad(hour));
export const MINUTES = Array.from({ length: 60 }, (_, minute) => pad(minute));

/** Every half hour of the day, `00:00` to `23:30`. */
export const HALF_HOURS = Array.from({ length: 48 }, (_, index) => `${pad(Math.floor(index / 2))}:${pad((index % 2) * 30)}`);

/**
 * Reads a time typed the way people write it in pt-BR: `9`, `9h`, `9h30`, `930`, `09:30`, `21.15`,
 * `meio-dia`. Returns `HH:mm`, or `null` when the text is not a time of day.
 */
export function parseTimeOfDay(text: string): string | null {
  const typed = text.trim().toLowerCase().replace(/\s+/g, "");
  if (typed === "meio-dia" || typed === "meiodia") return "12:00";
  if (typed === "meia-noite" || typed === "meianoite") return "00:00";
  const digits = /^\d{1,4}$/.exec(typed)?.[0];
  if (digits) return digits.length <= 2 ? toTime(Number(digits), 0) : toTime(Number(digits.slice(0, -2)), Number(digits.slice(-2)));
  const parts = /^(\d{1,2})[:h.](?:(\d{2})(?:min)?)?$/.exec(typed);
  return parts ? toTime(Number(parts[1]), Number(parts[2] ?? 0)) : null;
}

/** The first half hour at or after `time` (`HH:mm` or `HH:mm:ss`), kept within the day. */
export function nextHalfHour(time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  return HALF_HOURS[Math.min(Math.ceil((hour * 60 + minute) / 30), HALF_HOURS.length - 1)];
}
