/**
 * Event Date, Time, and Timezone (IST / Asia/Kolkata) Utility Module
 * 
 * Provides deterministic parsing, validation, formatting, and legacy normalization
 * for community event scheduling.
 */

export const ALLOWED_EVENT_STATUSES = [
  'Draft',
  'Planned',
  'Upcoming',
  'Ongoing',
  'Completed',
  'Cancelled',
  'Unpublished'
] as const;

export type EventStatus = typeof ALLOWED_EVENT_STATUSES[number];

export const ALLOWED_REGISTRATION_STATUSES = [
  'Open',
  'Not Open',
  'Closed',
  'Full'
] as const;

export type RegistrationStatus = typeof ALLOWED_REGISTRATION_STATUSES[number];

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
] as const;

/**
 * Checks if a string is a strictly valid calendar date in YYYY-MM-DD format.
 * Validates actual calendar days per month, including leap years.
 */
export function isValidCalendarDate(dateStr: string | null | undefined): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (year < 1000 || year > 9999) return false;
  if (month < 1 || month > 12) return false;

  // Days in months: [Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec]
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  const maxDay = daysInMonth[month - 1];
  return day >= 1 && day <= maxDay;
}

/**
 * Checks if a string is a valid time string.
 * Supports:
 * - 12-hour: "10:00 AM", "08:30 PM", "12:00 PM", "1:30 pm"
 * - 24-hour: "10:00", "18:30", "09:15"
 * - "TBA"
 */
export function isValidTimeString(timeStr: string | null | undefined): boolean {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const trimmed = timeStr.trim();
  if (trimmed.toUpperCase() === 'TBA') return true;

  // 12-hour with AM/PM
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
  if (match12) {
    const hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    return hours >= 1 && hours <= 12 && minutes >= 0 && minutes <= 59;
  }

  // 24-hour HH:mm
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
  }

  return false;
}

/**
 * Converts a valid time string to minutes since midnight (0 - 1439).
 * Returns null if the string cannot be parsed.
 */
export function parseTimeToMinutes(timeStr: string | null | undefined): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim();
  if (trimmed.toUpperCase() === 'TBA') return null;

  // 12-hour with AM/PM
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();

    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // 24-hour HH:mm
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  return null;
}

/**
 * Verifies that end time is strictly after start time.
 * If either time is missing, TBA, or cannot be parsed to minutes, returns true to avoid blocking.
 */
export function isEndTimeAfterStartTime(
  startTimeStr: string | null | undefined,
  endTimeStr: string | null | undefined
): boolean {
  if (!startTimeStr || !endTimeStr) return true;
  const startMinutes = parseTimeToMinutes(startTimeStr);
  const endMinutes = parseTimeToMinutes(endTimeStr);

  if (startMinutes === null || endMinutes === null) return true;
  return endMinutes > startMinutes;
}

/**
 * Derives the English month name (e.g. "September") from a date or month string.
 */
export function getEventMonthName(
  dateOrMonthStr: string | null | undefined,
  fallbackMonth: string = 'September'
): string {
  if (!dateOrMonthStr || typeof dateOrMonthStr !== 'string') return fallbackMonth;
  const trimmed = dateOrMonthStr.trim();

  // If YYYY-MM-DD
  const matchIso = trimmed.match(/^\d{4}-(\d{2})-\d{2}/);
  if (matchIso) {
    const monthNum = parseInt(matchIso[1], 10);
    if (monthNum >= 1 && monthNum <= 12) {
      return MONTH_NAMES[monthNum - 1];
    }
  }

  // Check if string contains any full month name
  for (const month of MONTH_NAMES) {
    if (trimmed.toLowerCase().includes(month.toLowerCase())) {
      return month;
    }
  }

  return fallbackMonth;
}

/**
 * Formats a canonical or legacy date string for public UI display.
 * Example:
 * - "2026-09-20" -> "September 20, 2026"
 * - "September 2026" -> "September 2026"
 * - "August" -> "August"
 */
export function formatDisplayDate(
  dateStr: string | null | undefined,
  fallbackMonth?: string
): string {
  if (!dateStr || typeof dateStr !== 'string') {
    return fallbackMonth || 'TBA';
  }
  const trimmed = dateStr.trim();
  if (!trimmed) return fallbackMonth || 'TBA';

  // If YYYY-MM-DD
  const matchIso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchIso) {
    const year = matchIso[1];
    const monthNum = parseInt(matchIso[2], 10);
    const day = parseInt(matchIso[3], 10);
    if (monthNum >= 1 && monthNum <= 12) {
      const monthName = MONTH_NAMES[monthNum - 1];
      return `${monthName} ${day}, ${year}`;
    }
  }

  return trimmed;
}

/**
 * Parses event date and time into deterministic IST (UTC+05:30) millisecond timestamp.
 * Avoids browser/server local timezone drift.
 */
export function parseEventDateTimeToMs(
  dateStr: string | null | undefined,
  timeStr: string | null | undefined = '10:00 AM'
): number | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmedDate = dateStr.trim();

  // Extract YYYY-MM-DD
  let ymd = '';
  const matchIso = trimmedDate.match(/^(\d{4}-\d{2}-\d{2})/);
  if (matchIso) {
    ymd = matchIso[1];
  } else {
    // Legacy format e.g. "September 2026"
    for (let i = 0; i < MONTH_NAMES.length; i++) {
      const monthName = MONTH_NAMES[i];
      if (trimmedDate.toLowerCase().includes(monthName.toLowerCase())) {
        const yearMatch = trimmedDate.match(/\b(20\d\d)\b/);
        const year = yearMatch ? yearMatch[1] : '2026';
        const mm = String(i + 1).padStart(2, '0');
        ymd = `${year}-${mm}-01`;
        break;
      }
    }
  }

  if (!ymd) return null;

  // Convert time to 24-hour HH:mm:ss
  const minutes = parseTimeToMinutes(timeStr) ?? 600; // default 10:00 AM (600 mins)
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');

  // Construct strict ISO string with IST offset (+05:30)
  const istIso = `${ymd}T${hh}:${mm}:00+05:30`;
  const timestamp = new Date(istIso).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

/**
 * Normalizes legacy event records safely.
 * If the record already has a valid YYYY-MM-DD date, it is preserved.
 * If it has a month string like "September 2026", it keeps it without crashing.
 */
export function normalizeLegacyEventDate(
  rawDate: any,
  fallbackMonth?: string
): { canonicalDate: string; month: string; isLegacyMonthOnly: boolean } {
  const str = String(rawDate ?? '').trim();
  if (isValidCalendarDate(str)) {
    return {
      canonicalDate: str,
      month: getEventMonthName(str),
      isLegacyMonthOnly: false
    };
  }

  // Check if string is an ISO string with timestamp
  const matchIso = str.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (matchIso && isValidCalendarDate(matchIso[1])) {
    return {
      canonicalDate: matchIso[1],
      month: getEventMonthName(matchIso[1]),
      isLegacyMonthOnly: false
    };
  }

  const month = getEventMonthName(str, fallbackMonth || 'September');
  return {
    canonicalDate: str, // keep string for compatibility
    month,
    isLegacyMonthOnly: true
  };
}

export interface EventValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  error?: string;
  field?: string;
}

/**
 * Validates an event payload for create or update operations.
 */
export function validateEventPayload(
  event: any,
  options: { isNew?: boolean; isStrictDateRequired?: boolean } = {}
): EventValidationResult {
  const errors: Record<string, string> = {};

  if (!event || typeof event !== 'object') {
    return {
      valid: false,
      errors: { general: 'Event payload is required.' },
      error: 'Event payload is required.',
      field: 'general'
    };
  }

  const title = String(event.title ?? '').trim();
  if (!title) {
    errors.title = 'Title cannot be empty.';
  }

  const date = String(event.date ?? '').trim();
  const isStrictDate = options.isStrictDateRequired ?? options.isNew ?? false;

  if (isStrictDate) {
    if (!date) {
      errors.date = 'Event date is required and must be a valid date (YYYY-MM-DD).';
    } else if (!isValidCalendarDate(date)) {
      errors.date = 'Date must be a valid calendar date in YYYY-MM-DD format.';
    }
  } else if (date) {
    // If date is provided in an update, validate it unless it's a legacy month-only string
    const isLegacy = normalizeLegacyEventDate(date).isLegacyMonthOnly;
    if (!isLegacy && !isValidCalendarDate(date)) {
      errors.date = 'Date must be a valid calendar date in YYYY-MM-DD format.';
    }
  }

  const time = String(event.time ?? '').trim();
  if (time && time.toUpperCase() !== 'TBA') {
    if (!isValidTimeString(time)) {
      errors.time = 'Start time must be a valid time (e.g. 10:00 AM or 14:00).';
    }
  }

  const endTime = String(event.endTime ?? '').trim();
  if (endTime && endTime.toUpperCase() !== 'TBA') {
    if (!isValidTimeString(endTime)) {
      errors.endTime = 'End time must be a valid time (e.g. 12:00 PM or 16:00).';
    } else if (time && time.toUpperCase() !== 'TBA' && isValidTimeString(time)) {
      if (!isEndTimeAfterStartTime(time, endTime)) {
        errors.endTime = 'End time must be after start time.';
      }
    }
  }

  const venue = String(event.venue ?? '').trim();
  if (!venue && options.isNew) {
    errors.venue = 'Venue should not be empty.';
  }

  const format = String(event.format ?? event.eventFormat ?? '').trim();
  if (!format && options.isNew) {
    errors.format = 'Event format is required.';
  }

  const status = String(event.status ?? 'Draft');
  if (status && !ALLOWED_EVENT_STATUSES.includes(status as any)) {
    errors.status = `Event status is invalid. Allowed: ${ALLOWED_EVENT_STATUSES.join(', ')}`;
  }

  const registrationStatus = String(event.registrationStatus ?? 'Not Open');
  if (registrationStatus && !ALLOWED_REGISTRATION_STATUSES.includes(registrationStatus as any)) {
    errors.registrationStatus = `Registration status is invalid. Allowed: ${ALLOWED_REGISTRATION_STATUSES.join(', ')}`;
  }

  const firstErrorKey = Object.keys(errors)[0];
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    error: firstErrorKey ? errors[firstErrorKey] : undefined,
    field: firstErrorKey
  };
}
