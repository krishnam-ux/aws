import { EmailRecipient } from '@/types/email';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validates an email address format strictly.
 */
export function isValidEmail(email: unknown): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim();
  if (clean.length === 0 || clean.length > 254) return false;
  return EMAIL_REGEX.test(clean);
}

/**
 * Normalizes email address to lowercase and trimmed string.
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Sanitizes headers (Subject, From, To, CC, BCC) to prevent CRLF injection attacks.
 */
export function sanitizeEmailHeaders(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/[\r\n\t]/g, ' ').trim();
}

/**
 * Deduplicates and validates an array of recipient strings or EmailRecipient objects.
 */
export function validateRecipients(recipients: Array<EmailRecipient | string>): {
  valid: EmailRecipient[];
  invalid: string[];
} {
  const validMap = new Map<string, EmailRecipient>();
  const invalid: string[] = [];

  for (const item of recipients) {
    const rawEmail = typeof item === 'string' ? item : item.email;
    const normalized = normalizeEmail(rawEmail);

    if (isValidEmail(normalized)) {
      if (!validMap.has(normalized)) {
        if (typeof item === 'string') {
          validMap.set(normalized, { email: normalized });
        } else {
          validMap.set(normalized, { ...item, email: normalized });
        }
      }
    } else {
      invalid.push(rawEmail || 'EMPTY');
    }
  }

  return {
    valid: Array.from(validMap.values()),
    invalid
  };
}

// In-memory sliding rate limiter (e.g. 50 requests per minute per IP / caller)
const rateLimitMap = new Map<string, number[]>();

export function checkRateLimit(key: string, limit: number = 60, windowMs: number = 60000): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(key) || []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    return false;
  }

  timestamps.push(now);
  rateLimitMap.set(key, timestamps);
  return true;
}
