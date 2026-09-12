export type EmailType =
  // Events
  | 'event_registration_confirmation'
  | 'event_24h_reminder'
  | 'event_1h_reminder'
  | 'event_updated'
  | 'event_rescheduled'
  | 'event_cancelled'
  | 'event_starting_soon'
  | 'event_thank_you'
  | 'event_feedback_request'
  | 'event_certificate_available'
  // Opportunities
  | 'opportunity_published'
  | 'opportunity_application_received'
  | 'opportunity_under_review'
  | 'opportunity_shortlisted'
  | 'opportunity_selected'
  | 'opportunity_rejected'
  | 'opportunity_deadline_reminder'
  // Certification Exams
  | 'exam_registration_confirmation'
  | 'exam_lobby_invitation'
  | 'exam_reminder'
  | 'exam_instructions'
  | 'exam_submitted_confirmation'
  | 'exam_result'
  | 'exam_selected_qualified'
  | 'exam_certificate_available'
  // General & Admin
  | 'feedback_received_acknowledgement'
  | 'admin_custom_announcement'
  | 'admin_manual_message'
  | 'founding_members_announcement'
  | 'founding_members_meeting'
  | 'founding_members_coordination'
  | 'founding_members_recognition'
  | 'founding_members_update'
  | 'system_test_email';

export type EmailDeliveryStatus = 'SENT' | 'FAILED' | 'PENDING' | 'SIMULATED';

export type EmailCategory = 'EVENTS' | 'OPPORTUNITIES' | 'EXAMS' | 'COMMUNITY' | 'ADMIN' | 'TEAM';

export interface EmailAttachment {
  filename: string;
  content?: string; // Base64 or utf-8
  path?: string;
  contentType?: string;
}

export interface EmailRecipient {
  id?: string;
  email: string;
  name?: string;
  role?: string;
  domain?: string;
  studentId?: string;
  rollNumber?: string;
  source?: 'EVENT' | 'OPPORTUNITY' | 'EXAM' | 'MANUAL' | 'TEAM' | 'FOUNDING_MEMBERS';
}

export interface EmailPayload {
  from?: string;
  to: string | string[];
  recipientName?: string;
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  type?: EmailType;
  category?: EmailCategory;
  templateId?: string;
  triggeredBy?: string; // admin user / system trigger
  adminId?: string;
  isTest?: boolean;
  metadata?: Record<string, any>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  status: EmailDeliveryStatus;
  recipient: string;
  error?: string;
  provider?: string;
  timestamp: string;
}

export interface EmailBatchSummary {
  total: number;
  sent: number;
  failed: number;
  simulated: number;
  errors: Array<{
    recipient: string;
    error: string;
    registrationId?: string;
    memberId?: string;
    name?: string;
    role?: string;
    domain?: string;
  }>;
  batchId: string;
}

export interface EmailLog {
  id: string;
  recipient: string;
  recipientName?: string;
  subject: string;
  type: EmailType;
  category: EmailCategory;
  status: EmailDeliveryStatus;
  sentAt: string;
  providerId?: string;
  errorMessage?: string;
  triggeredBy: string; // 'SYSTEM_AUTO' | 'ADMIN' | admin username
  adminId?: string;
  templateId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  type: EmailType;
  category: EmailCategory;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  variables: string[]; // e.g. ['studentName', 'eventName', 'eventDate', 'venue']
  description: string;
  isActive: boolean;
  updatedAt: string;
}

export interface EmailAutomationSetting {
  id: string;
  category: EmailCategory;
  eventType: EmailType;
  title: string;
  description: string;
  isEnabled: boolean;
  defaultTemplateId: string;
  updatedAt: string;
}
