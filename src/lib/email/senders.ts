import { EmailType, EmailCategory } from '@/types/email';

export const OFFICIAL_SENDERS = {
  COMMUNICATION: 'communication@awssbgcuup.tech',
  EVENTS: 'events@awssbgcuup.tech',
  NOTIFICATIONS: 'notifications@awssbgcuup.tech',
  NOREPLY: 'noreply@awssbgcuup.tech',
  CAREER: 'career@awssbgcuup.tech'
} as const;

export const BRAND_SENDER_NAME = 'AWS Student Builder Group (CU-UP)';

export interface SenderOption {
  email: string;
  label: string;
  description: string;
  formatted: string;
}

export const SUPPORTED_SENDERS: SenderOption[] = [
  {
    email: OFFICIAL_SENDERS.EVENTS,
    label: 'Events Desk (events@)',
    description: 'Event registrations, calendar invitations, updates & reminders',
    formatted: `${BRAND_SENDER_NAME} <${OFFICIAL_SENDERS.EVENTS}>`
  },
  {
    email: OFFICIAL_SENDERS.CAREER,
    label: 'Career & Opportunities (career@)',
    description: 'Core team applications, review updates, shortlisted & selection notices',
    formatted: `${BRAND_SENDER_NAME} <${OFFICIAL_SENDERS.CAREER}>`
  },
  {
    email: OFFICIAL_SENDERS.NOTIFICATIONS,
    label: 'Official Notifications (notifications@)',
    description: 'Certification exam credentials, scorecards, security & announcements',
    formatted: `${BRAND_SENDER_NAME} <${OFFICIAL_SENDERS.NOTIFICATIONS}>`
  },
  {
    email: OFFICIAL_SENDERS.COMMUNICATION,
    label: 'General Communication (communication@)',
    description: 'Community outreach, partner inquiries, feedback responses',
    formatted: `${BRAND_SENDER_NAME} <${OFFICIAL_SENDERS.COMMUNICATION}>`
  },
  {
    email: OFFICIAL_SENDERS.NOREPLY,
    label: 'Automated Service (noreply@)',
    description: 'Automated receipts and system transactions where replies are not accepted',
    formatted: `${BRAND_SENDER_NAME} <${OFFICIAL_SENDERS.NOREPLY}>`
  }
];

/**
 * Returns formatted sender string: "AWS Student Builder Group (CU-UP) <email@awssbgcuup.tech>"
 */
export function formatSenderAddress(email: string, displayName: string = BRAND_SENDER_NAME): string {
  const cleanEmail = email.trim().toLowerCase();
  return `${displayName} <${cleanEmail}>`;
}

/**
 * Automatically resolves the designated official sender identity for a given email type or category.
 */
export function getSenderForEmailType(
  type?: EmailType,
  category?: EmailCategory,
  customSender?: string
): string {
  if (customSender && customSender.trim()) {
    const clean = customSender.trim();
    if (clean.includes('<') && clean.includes('>')) {
      return clean;
    }
    return formatSenderAddress(clean);
  }

  // 1. Events Routing
  if (type?.startsWith('event_') || category === 'EVENTS') {
    return formatSenderAddress(OFFICIAL_SENDERS.EVENTS);
  }

  // 2. Career / Opportunities Routing
  if (type?.startsWith('opportunity_') || category === 'OPPORTUNITIES') {
    return formatSenderAddress(OFFICIAL_SENDERS.CAREER);
  }

  // 3. Exam & System Notifications Routing
  if (type?.startsWith('exam_') || category === 'EXAMS') {
    return formatSenderAddress(OFFICIAL_SENDERS.NOTIFICATIONS);
  }

  // 4. Feedback & General Communication
  if (type?.startsWith('feedback_') || category === 'COMMUNITY') {
    return formatSenderAddress(OFFICIAL_SENDERS.COMMUNICATION);
  }

  // 5. Admin Manual
  if (type === 'admin_manual_message' || type === 'admin_custom_announcement') {
    return formatSenderAddress(OFFICIAL_SENDERS.COMMUNICATION);
  }

  // 6. Digital Identity Routing (Official Automated Service)
  if (type?.startsWith('digital_id_') || category === 'IDENTITY') {
    return formatSenderAddress(OFFICIAL_SENDERS.NOREPLY);
  }

  // Default fallback
  return formatSenderAddress(OFFICIAL_SENDERS.NOTIFICATIONS);
}
