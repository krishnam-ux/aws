import QRCode from 'qrcode';
import { DigitalIdType, DigitalIdentity, DigitalIdFormData } from '@/types/digitalIdentity';

export const DIGITAL_ID_PREFIXES: Record<DigitalIdType, string> = {
  'Founding Member': 'FMB-CUUP-',
  'Core Team': 'CT-CUUP-',
  'Anchor & Speaker': 'AS-CUUP-',
  'Other': 'DID-CUUP-'
};

export const CANONICAL_BASE_URL = 'https://www.awssbgcuup.tech';

/**
 * Returns the canonical public verification URL for a given Digital ID.
 */
export function getVerificationUrl(publicId: string): string {
  const cleanId = String(publicId || '').trim();
  return `${CANONICAL_BASE_URL}/verify/${cleanId}`;
}

/**
 * Returns the canonical card display URL for a given Digital ID.
 */
export function getCardUrl(publicId: string): string {
  const cleanId = String(publicId || '').trim();
  return `${CANONICAL_BASE_URL}/id/${cleanId}`;
}

/**
 * Strips dangerous HTML tags and trims whitespace to prevent XSS.
 */
export function sanitizeInput(value: string | undefined | null): string {
  if (!value) return '';
  return String(value)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .trim();
}

/**
 * Generates a formatted Public ID from member type and sequential counter number.
 */
export function generatePublicId(type: DigitalIdType, counter: number): string {
  const prefix = DIGITAL_ID_PREFIXES[type] || 'DID-CUUP-';
  return `${prefix}${String(counter).padStart(3, '0')}`;
}

/**
 * Validates the digital ID form payload server-side.
 */
export function validateDigitalIdPayload(payload: Partial<DigitalIdFormData>): {
  valid: boolean;
  error?: string;
  errors: string[];
  sanitized?: DigitalIdFormData;
} {
  const errors: string[] = [];

  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Invalid form payload.', errors: ['Invalid form payload.'] };
  }

  const fullName = sanitizeInput(payload.fullName);
  if (!fullName || fullName.length < 2) {
    errors.push('Full Name is required and must be at least 2 characters.');
  } else if (fullName.length > 100) {
    errors.push('Full Name cannot exceed 100 characters.');
  }

  const role = sanitizeInput(payload.role);
  if (!role || role.length < 2) {
    errors.push('Role / Position is required.');
  } else if (role.length > 120) {
    errors.push('Role / Position cannot exceed 120 characters.');
  }

  const allowedTypes: DigitalIdType[] = [
    'Founding Member',
    'Core Team',
    'Anchor & Speaker',
    'Other'
  ];
  const memberType = payload.memberType as DigitalIdType;
  if (!memberType || !allowedTypes.includes(memberType)) {
    errors.push('Invalid Member Type selected.');
  }

  const photoUrl = String(payload.photoUrl || '').trim();
  if (!photoUrl) {
    // Photo can be optional in editing or partial form payload, but if provided it must be valid
  } else if (photoUrl.startsWith('data:image/')) {
    const photoValidation = validateBase64Image(photoUrl);
    if (!photoValidation.valid) {
      errors.push(photoValidation.error || 'Invalid photo format.');
    }
  } else if (!photoUrl.startsWith('/') && !photoUrl.startsWith('http://') && !photoUrl.startsWith('https://')) {
    errors.push('Invalid profile photo URL or data.');
  }

  // Optional fields validation & sanitization
  const email = payload.email ? sanitizeInput(payload.email).toLowerCase() : '';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Invalid email address format.');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      error: errors[0],
      errors
    };
  }

  const domain = sanitizeInput(payload.domain || '');
  const university = sanitizeInput(payload.university || 'Chandigarh University – Uttar Pradesh');
  const course = sanitizeInput(payload.course || '');
  const branch = sanitizeInput(payload.branch || '');
  const currentYear = sanitizeInput(payload.currentYear || '');
  const joiningDate = sanitizeInput(payload.joiningDate || '');
  const additionalInformation = sanitizeInput(payload.additionalInformation || '');
  const linkedin = sanitizeInput(payload.linkedin || '');

  return {
    valid: true,
    errors: [],
    sanitized: {
      fullName,
      photoUrl,
      memberType,
      role,
      domain,
      university,
      course,
      branch,
      currentYear,
      email,
      linkedin,
      joiningDate,
      additionalInformation
    }
  };
}

/**
 * Validates a base64 image data string: checks MIME type, size limit (max 2MB), and basic image header.
 */
export function validateBase64Image(base64Data: string): { valid: boolean; error?: string; mimeType?: string } {
  if (!base64Data || typeof base64Data !== 'string') {
    return { valid: true }; // empty is allowed/optional
  }

  const matches = base64Data.match(/^data:([a-zA-Z0-9\/\-+.]+);base64,(.+)$/);
  if (!matches) {
    return { valid: false, error: 'Invalid image format encoding.' };
  }

  const mimeType = matches[1].toLowerCase();
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedMimeTypes.includes(mimeType)) {
    return { valid: false, error: 'Only JPG, JPEG, PNG, and WebP images are allowed.' };
  }

  const rawBase64 = matches[2];
  const approxSizeBytes = Math.round((rawBase64.length * 3) / 4);
  const maxSizeBytes = 2 * 1024 * 1024; // 2 MB

  if (approxSizeBytes > maxSizeBytes) {
    return { valid: false, error: 'Image file size exceeds maximum allowed 2MB.' };
  }

  return { valid: true, mimeType };
}

export const sanitizeText = sanitizeInput;
export const validateBase64Photo = validateBase64Image;

/**
 * Generates high quality QR code data for the canonical verification URL.
 */
export async function generateQrCodeDataUrl(publicId: string): Promise<string> {
  const url = getVerificationUrl(publicId);
  return await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 400,
    color: {
      dark: '#081A2A',
      light: '#FFFFFF'
    }
  });
}

/**
 * Generates an SVG string representation of the QR code.
 */
export async function generateQrCodeSvg(publicId: string): Promise<string> {
  const url = getVerificationUrl(publicId);
  return await QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 400,
    color: {
      dark: '#081A2A',
      light: '#FFFFFF'
    }
  });
}

/**
 * Formats date into readable string, e.g., "23 September 2026".
 */
export function formatDisplayDate(dateStr?: string | Date): string {
  if (!dateStr) return '';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return String(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}
