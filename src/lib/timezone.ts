/**
 * Asia/Kolkata timezone utility for Pathology Lab Management System.
 * Ensures consistent daily numbering, billing dates, and report timestamps in IST.
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Get current date in IST formatted as YYYY-MM-DD
 */
export function getTodayISTDateString(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now); // en-CA gives YYYY-MM-DD format
}

/**
 * Given a YYYY-MM-DD string (in IST), return UTC Date bounds for MongoDB querying
 */
export function getISTDayBounds(dateString: string): { start: Date; end: Date } {
  // dateString is "YYYY-MM-DD"
  // 00:00:00 IST is equivalent to previous day 18:30:00 UTC
  // 23:59:59.999 IST is equivalent to same day 18:29:59.999 UTC
  const [year, month, day] = dateString.split('-').map(Number);
  
  // IST is UTC + 5:30
  // So IST 00:00:00 on YYYY-MM-DD is UTC: YYYY-MM-(DD-1) 18:30:00
  const startIST = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  // Subtract 5 hours 30 mins to convert IST start to UTC
  const startUTC = new Date(startIST.getTime() - 5.5 * 60 * 60 * 1000);
  
  const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start: startUTC, end: endUTC };
}

/**
 * Format date for display in IST (e.g. "26 Oct 2026, 03:15 PM")
 */
export function formatISTDateTime(dateInput: string | Date | undefined): string {
  if (!dateInput) return '—';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Format date only in IST (e.g. "26 Oct 2026")
 */
export function formatISTDate(dateInput: string | Date | undefined): string {
  if (!dateInput) return '—';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Format time only in IST (e.g. "03:15 PM")
 */
export function formatISTTime(dateInput: string | Date | undefined): string {
  if (!dateInput) return '—';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Format currency into INR (₹)
 */
export function formatCurrencyINR(amount: number | undefined | null): string {
  const value = amount || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}
