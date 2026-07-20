// Shared date/time formatting for UI display.
//
// Locale AND timeZone are fixed explicitly so the string a component
// renders is identical whether it's produced on the server (which
// usually runs in UTC) or on the client (a browser in Pakistan,
// Asia/Karachi). Calling `.toLocaleDateString()` / `.toLocaleTimeString()` /
// `.toLocaleString()` with no arguments (or without an explicit timeZone)
// picks up whatever locale/timezone the *rendering* environment happens to
// have, which differs between server and client — React then reports a
// hydration mismatch ("Text content does not match server-rendered HTML").
//
// Always format dates/times for display through these helpers instead of
// calling toLocaleDateString/toLocaleTimeString/toLocaleString directly.

const LOCALE = "en-PK";
const TIME_ZONE = "Asia/Karachi";

export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(date).toLocaleDateString(LOCALE, {
    timeZone: TIME_ZONE,
    ...options,
  });
}

export function formatTime(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(date).toLocaleTimeString(LOCALE, {
    timeZone: TIME_ZONE,
    ...options,
  });
}

export function formatDateTime(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(date).toLocaleString(LOCALE, {
    timeZone: TIME_ZONE,
    ...options,
  });
}
