const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi" });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-PK", { timeZone: "Asia/Karachi" });
}

export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi" });
}

export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", day: "2-digit", month: "short" });
}

export function getPKTDate(daysOffset = 0): Date {
  const pktNow = new Date(Date.now() + PKT_OFFSET_MS);
  const year = pktNow.getUTCFullYear();
  const month = pktNow.getUTCMonth();
  const day = pktNow.getUTCDate() + daysOffset;
  return new Date(Date.UTC(year, month, day));
}

export function getPKTDayBoundary(daysOffset: number, endOfDay: boolean): Date {
  const pktNow = new Date(Date.now() + PKT_OFFSET_MS);
  const year = pktNow.getUTCFullYear();
  const month = pktNow.getUTCMonth();
  const day = pktNow.getUTCDate() + daysOffset;
  if (endOfDay) {
    return new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  }
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}
