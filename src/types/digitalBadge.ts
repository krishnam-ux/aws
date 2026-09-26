export type BadgeStatus = 'ACTIVE' | 'REVOKED';

export type BadgeAuditEventType =
  | 'BADGE_ISSUED'
  | 'BADGE_UPDATED'
  | 'BADGE_VIEWED'
  | 'BADGE_VERIFIED'
  | 'BADGE_EMAIL_SENT'
  | 'BADGE_EMAIL_FAILED'
  | 'BADGE_REVOKED';

export interface DigitalBadge {
  id: string; // Internal UUID
  credentialId: string; // Format: BADGE-CUUP-000001
  recipientName: string;
  recipientEmail: string;
  badgeTitle: string;
  category?: string;
  series?: string;
  badgeDescription: string;
  badgeImage?: string; // SVG data URL or image link
  issueDate: string; // YYYY-MM-DD or display date
  issuerName: string; // "AWS Student Builder Group – Chandigarh University Uttar Pradesh"
  issuerLogo?: string;
  skills: string[];
  earningCriteria: string;
  credentialUrl?: string; // Canonical URL: https://www.awssbgcuup.tech/badge/BADGE-CUUP-XXXXXX
  verificationUrl?: string; // Canonical URL: https://www.awssbgcuup.tech/verify-badge/BADGE-CUUP-XXXXXX
  status: BadgeStatus;
  issuedAt: string; // ISO 8601
  revokedAt?: string | null;
  revokedReason?: string | null;
  revokedBy?: string | null;
  additionalInformation?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface DigitalBadgeEvent {
  id: string;
  credentialId: string;
  eventType: BadgeAuditEventType;
  timestamp: string; // ISO 8601
  adminIdentity?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateBadgeInput {
  recipientName: string;
  recipientEmail: string;
  badgeTitle: string;
  category?: string;
  series?: string;
  badgeDescription: string;
  issueDate: string;
  earningCriteria: string;
  skills?: string[] | string;
  badgeImage?: string;
  issuerName?: string;
  issuerLogo?: string;
  additionalInformation?: string;
}

export interface UpdateBadgeInput {
  recipientName?: string;
  recipientEmail?: string;
  badgeTitle?: string;
  badgeDescription?: string;
  issueDate?: string;
  earningCriteria?: string;
  skills?: string[] | string;
  badgeImage?: string;
  issuerName?: string;
  issuerLogo?: string;
  additionalInformation?: string;
}

export interface DigitalBadgeStats {
  total: number;
  active: number;
  revoked: number;
  recentlyIssued: DigitalBadge[];
}
