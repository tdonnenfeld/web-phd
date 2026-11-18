export function dateKey(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}
export function utcDate(key: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error("Invalid date");
  const date = new Date(key + "T00:00:00.000Z");
  if (Number.isNaN(date.getTime()) || dateKey(date) !== key) throw new Error("Invalid date");
  return date;
}
export function monthBounds(month: string): { start: Date; end: Date } {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("Invalid month");
  const [year, m] = month.split("-").map(Number);
  if (m < 1 || m > 12) throw new Error("Invalid month");
  return { start: new Date(Date.UTC(year, m - 1, 1)), end: new Date(Date.UTC(year, m, 1)) };
}
