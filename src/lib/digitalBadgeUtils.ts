import QRCode from 'qrcode';
import { DigitalBadge, CreateBadgeInput } from '@/types/digitalBadge';
import { BADGE_PRESETS } from './badgeAssets';

export { BADGE_PRESETS };

export const CANONICAL_HOST = 'https://www.awssbgcuup.tech';
export const DEFAULT_ISSUER_NAME = 'AWS Student Builder Group – Chandigarh University Uttar Pradesh';
export const DEFAULT_ISSUER_LOGO = '/logos/aws-sbg-logo.png';

/**
 * Returns the public badge profile URL
 */
export function getBadgeUrl(credentialId: string): string {
  const cleanId = String(credentialId || '').trim().toUpperCase();
  return `${CANONICAL_HOST}/badge/${cleanId}`;
}

/**
 * Returns the public badge verification URL (Encoded inside QR code)
 */
export function getBadgeVerificationUrl(credentialId: string): string {
  const cleanId = String(credentialId || '').trim().toUpperCase();
  return `${CANONICAL_HOST}/verify-badge/${cleanId}`;
}

/**
 * Generates a high-resolution QR code data URL encoding ONLY the canonical verification URL
 */
export async function generateBadgeQrDataUrl(credentialId: string, width: number = 256): Promise<string> {
  const url = getBadgeVerificationUrl(credentialId);
  return await QRCode.toDataURL(url, {
    width,
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 8,
    color: {
      dark: '#07131F',
      light: '#FFFFFF'
    }
  });
}

/**
 * Generates an SVG string of the verification QR code
 */
export async function generateBadgeQrSvg(credentialId: string, width: number = 256): Promise<string> {
  const url = getBadgeVerificationUrl(credentialId);
  return await QRCode.toString(url, {
    width,
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    color: {
      dark: '#07131F',
      light: '#FFFFFF'
    }
  });
}

/**
 * Generates a PNG Buffer of the verification QR code
 */
export async function generateBadgeQrBuffer(credentialId: string, width: number = 256): Promise<Buffer> {
  const url = getBadgeVerificationUrl(credentialId);
  return await QRCode.toBuffer(url, {
    width,
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 8,
    color: {
      dark: '#07131F',
      light: '#FFFFFF'
    }
  });
}

/**
 * Formats a display date string
 */
export function formatDisplayDate(dateStr?: string | Date | null): string {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return String(dateStr);
  }
}

/**
 * Constructs the standard LinkedIn "Add to Profile" certification URL
 */
export function getLinkedInAddCertUrl(badge: DigitalBadge): string {
  try {
    const d = new Date(badge.issueDate || badge.issuedAt || badge.createdAt);
    const issueYear = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
    const issueMonth = isNaN(d.getMonth()) ? new Date().getMonth() + 1 : d.getMonth() + 1;

    const params = new URLSearchParams({
      startTask: 'CERTIFICATION_NAME',
      name: badge.badgeTitle || 'AWS Digital Badge',
      organizationName: badge.issuerName || DEFAULT_ISSUER_NAME,
      issueYear: String(issueYear),
      issueMonth: String(issueMonth),
      certUrl: badge.credentialUrl || getBadgeUrl(badge.credentialId),
      certId: badge.credentialId
    });

    return `https://www.linkedin.com/profile/add?${params.toString()}`;
  } catch {
    return 'https://www.linkedin.com/profile/add';
  }
}

/**
 * Parses and sanitizes skills array from user input
 */
export function parseSkillsInput(input?: string[] | string): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((s) => String(s).trim()).filter(Boolean);
  }
  return String(input)
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Validates whether a credential ID matches the standard pattern BADGE-CUUP-000001
 */
export function isValidCredentialIdFormat(credentialId: string): boolean {
  if (!credentialId) return false;
  return /^BADGE-CUUP-\d{6}$/i.test(credentialId.trim());
}

/**
 * Strips dangerous HTML tags and scripts to prevent XSS
 */
export function sanitizeText(val?: string | null): string {
  if (!val) return '';
  return String(val)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Sanitizes all input fields of a badge creation/update payload
 */
export function sanitizeBadgeInput(input: Partial<CreateBadgeInput>): Partial<CreateBadgeInput> {
  const sanitized: Partial<CreateBadgeInput> = { ...input };

  if (input.recipientName !== undefined) {
    sanitized.recipientName = sanitizeText(input.recipientName);
  }
  if (input.recipientEmail !== undefined) {
    sanitized.recipientEmail = String(input.recipientEmail || '').trim().toLowerCase();
  }
  if (input.badgeTitle !== undefined) {
    sanitized.badgeTitle = sanitizeText(input.badgeTitle);
  }
  if (input.badgeDescription !== undefined) {
    sanitized.badgeDescription = sanitizeText(input.badgeDescription);
  }
  if (input.earningCriteria !== undefined) {
    sanitized.earningCriteria = sanitizeText(input.earningCriteria);
  }
  if (input.issuerName !== undefined) {
    sanitized.issuerName = sanitizeText(input.issuerName) || DEFAULT_ISSUER_NAME;
  }
  if (input.issuerLogo !== undefined) {
    sanitized.issuerLogo = String(input.issuerLogo || '').trim() || DEFAULT_ISSUER_LOGO;
  }
  if (input.badgeImage !== undefined) {
    sanitized.badgeImage = String(input.badgeImage || '').trim();
  }
  if (input.additionalInformation !== undefined) {
    sanitized.additionalInformation = sanitizeText(input.additionalInformation);
  }
  if (input.issueDate !== undefined) {
    sanitized.issueDate = String(input.issueDate || '').trim();
  }
  if (input.skills !== undefined) {
    sanitized.skills = parseSkillsInput(input.skills);
  }

  return sanitized;
}

/**
 * Validates badge creation input fields
 */
export function validateBadgeInput(input: Partial<CreateBadgeInput>): {
  valid: boolean;
  error?: string;
} {
  if (!input.recipientName || !input.recipientName.trim()) {
    return { valid: false, error: 'Recipient Name is required.' };
  }
  if (!input.recipientEmail || !input.recipientEmail.trim()) {
    return { valid: false, error: 'Recipient Email is required.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input.recipientEmail.trim())) {
    return { valid: false, error: 'Invalid recipient email format.' };
  }
  if (!input.badgeTitle || !input.badgeTitle.trim()) {
    return { valid: false, error: 'Badge Title is required.' };
  }
  if (!input.badgeDescription || !input.badgeDescription.trim()) {
    return { valid: false, error: 'Badge Description is required.' };
  }
  if (!input.earningCriteria || !input.earningCriteria.trim()) {
    return { valid: false, error: 'Earning Criteria is required.' };
  }

  return { valid: true };
}

/**
 * Returns safe public badge data without exposing database internals
 */
export function getPublicBadgeData(badge: DigitalBadge): Partial<DigitalBadge> {
  return {
    id: badge.id,
    credentialId: badge.credentialId,
    recipientName: badge.recipientName,
    badgeTitle: badge.badgeTitle,
    badgeDescription: badge.badgeDescription,
    badgeImage: badge.badgeImage,
    issueDate: badge.issueDate,
    issuerName: badge.issuerName || DEFAULT_ISSUER_NAME,
    issuerLogo: badge.issuerLogo || DEFAULT_ISSUER_LOGO,
    skills: badge.skills || [],
    earningCriteria: badge.earningCriteria,
    credentialUrl: badge.credentialUrl || getBadgeUrl(badge.credentialId),
    verificationUrl: badge.verificationUrl || getBadgeVerificationUrl(badge.credentialId),
    status: badge.status,
    issuedAt: badge.issuedAt,
    revokedAt: badge.revokedAt,
    revokedReason: badge.revokedReason
  };
}
