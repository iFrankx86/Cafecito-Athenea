/**
 * Date and time utilities configured for Peru (America/Lima, UTC-5).
 */

export const PERU_TIMEZONE = 'America/Lima';

/**
 * Returns today's date formatted as YYYY-MM-DD in America/Lima
 */
export function getTodayLimaDate(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: PERU_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    const now = new Date();
    // UTC-5 offset fallback
    const utc5 = new Date(now.getTime() - 5 * 3600 * 1000);
    return utc5.toISOString().slice(0, 10);
  }
}

/**
 * Format date for friendly Spanish display: "Miércoles, 11 de noviembre"
 */
export function formatFriendlyDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day, 12, 0, 0);
      return new Intl.DateTimeFormat('es-PE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date);
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Format timestamp to 12-hour or 24-hour time in Lima: "10:30 AM"
 */
export function formatTimeInLima(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: PERU_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Format full date and time for receipt/auditing: "11/11/2026, 10:30 AM"
 */
export function formatDateTimeInLima(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: PERU_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Check if a date string is yesterday in Lima
 */
export function getYesterdayLimaDate(): string {
  const parts = getTodayLimaDate().split('-');
  const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10) - 1);
  return date.toISOString().slice(0, 10);
}
