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

/**
 * Returns the real UTC instant corresponding to a PKT wall-clock time.
 * Use this for Prisma DB comparisons — the returned Date is the actual
 * moment when the specified PKT time occurs in UTC.
 *
 * Example: getPKTDayBoundaryUTC(0, false) = midnight PKT = 19:00 UTC prev day
 */
export function getPKTDayBoundaryUTC(daysOffset: number, endOfDay: boolean): Date {
  const pktNow = new Date(Date.now() + PKT_OFFSET_MS);
  const year = pktNow.getUTCFullYear();
  const month = pktNow.getUTCMonth();
  const day = pktNow.getUTCDate() + daysOffset;

  const boundaryInPKT = endOfDay
    ? new Date(Date.UTC(year, month, day, 23, 59, 59, 999))
    : new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

  return new Date(boundaryInPKT.getTime() - PKT_OFFSET_MS);
}

/**
 * Returns a Date representing "today + daysToAdd" in PKT, fixed at
 * 12:00 PM PKT (noon). Storing at noon (instead of midnight or "now")
 * guarantees the calendar date never shifts when the value is later
 * converted to/from UTC anywhere in the stack — regardless of the
 * server's system timezone.
 */
export function getPKTFutureDate(daysToAdd: number): Date {
  const pktNow = new Date(Date.now() + PKT_OFFSET_MS);
  const year = pktNow.getUTCFullYear();
  const month = pktNow.getUTCMonth();
  const day = pktNow.getUTCDate() + daysToAdd;
  const noonPKT = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
  return new Date(noonPKT.getTime() - PKT_OFFSET_MS);
}
