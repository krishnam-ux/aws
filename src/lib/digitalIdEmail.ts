import { db } from '@/lib/db';
import { DigitalIdentity } from '@/types/digitalIdentity';
import { EmailSendResult } from '@/types/email';
import { sendEmail } from '@/lib/email/service';
import { getSenderForEmailType, OFFICIAL_SENDERS } from '@/lib/email/senders';
import { isValidEmail, normalizeEmail } from '@/lib/email/validation';
import {
  DEFAULT_EMAIL_TEMPLATES,
  interpolateVariables,
  renderEmailLayout
} from '@/lib/email/templates';
import { generateDigitalIdPdfBuffer } from '@/lib/digitalIdPdf';
import { getVerificationUrl, getCardUrl, formatDisplayDate } from '@/lib/digitalIdUtils';
import { logEmailAudit } from '@/lib/email/logger';

export interface SendDigitalIdEmailOptions {
  identityOrPublicId: DigitalIdentity | string;
  recipientEmail?: string;
  adminId?: string;
}

export interface SendDigitalIdEmailResult {
  success: boolean;
  message?: string;
  error?: string;
  status?: number;
  sendResult?: EmailSendResult;
  identity?: DigitalIdentity;
  recipient?: string;
  pdfFilename?: string;
}

/**
 * Authoritative Server-Side Helper to Send Digital ID Email.
 * Validates identity active state, validates recipient address, generates PDF card attachment,
 * renders branded layout matching Digital ID design, and dispatches through the centralized Resend email system.
 */
export async function sendDigitalIdEmail(
  options: SendDigitalIdEmailOptions
): Promise<SendDigitalIdEmailResult> {
  const { identityOrPublicId, recipientEmail, adminId = 'admin' } = options;

  // 1. Resolve authoritative identity from database
  let identity: DigitalIdentity | null = null;
  if (typeof identityOrPublicId === 'string') {
    const cleanId = identityOrPublicId.trim().toUpperCase();
    identity = (await db.digitalIdentities.getByPublicId(cleanId)) || (await db.digitalIdentities.getById(cleanId));
  } else if (identityOrPublicId && typeof identityOrPublicId === 'object') {
    identity = await db.digitalIdentities.getByPublicId(identityOrPublicId.publicId) || identityOrPublicId;
  }

  if (!identity) {
    return {
      success: false,
      error: 'Digital ID record not found in the official registry.',
      status: 404
    };
  }

  // 2. Validate ACTIVE status (Reject suspended or revoked credentials)
  if (identity.status !== 'ACTIVE') {
    const reason = identity.status === 'SUSPENDED'
      ? `Digital ID ${identity.publicId} is currently SUSPENDED. Please reactivate the ID before sending.`
      : identity.status === 'REVOKED'
      ? `Digital ID ${identity.publicId} has been REVOKED (${identity.revokedReason || 'Revoked'}). Revoked credentials cannot be emailed.`
      : `Digital ID ${identity.publicId} has status "${identity.status}". Only ACTIVE Digital IDs can be emailed.`;

    return {
      success: false,
      error: reason,
      status: 400,
      identity
    };
  }

  // 3. Resolve & validate recipient email
  const targetEmail = normalizeEmail(recipientEmail || identity.email || '');

  if (!targetEmail) {
    return {
      success: false,
      error: `Registered email address is missing for ${identity.fullName} (${identity.publicId}). Please provide a valid recipient email.`,
      status: 400,
      identity
    };
  }

  if (!isValidEmail(targetEmail)) {
    return {
      success: false,
      error: `Invalid recipient email address format: "${recipientEmail || identity.email}".`,
      status: 400,
      identity,
      recipient: targetEmail
    };
  }

  // 4. Generate official PDF badge attachment
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateDigitalIdPdfBuffer(identity);
  } catch (pdfErr: any) {
    console.error(`[Send Digital ID] Failed to generate PDF for ${identity.publicId}:`, pdfErr);
    return {
      success: false,
      error: `Failed to generate official PDF credential: ${pdfErr.message || 'PDF engine error'}`,
      status: 500,
      identity
    };
  }

  const cleanName = (identity.fullName || 'Member').replace(/[^a-zA-Z0-9_-]/g, '_');
  const pdfFilename = `DigitalID-${identity.publicId}-${cleanName}.pdf`;

  // 5. Construct email variables & canonical links
  const cardUrl = getCardUrl(identity.publicId);
  const verificationUrl = getVerificationUrl(identity.publicId);
  const issuedDate = formatDisplayDate(identity.issuedAt || identity.createdAt);

  const variables: Record<string, any> = {
    memberName: identity.fullName,
    fullName: identity.fullName,
    studentName: identity.fullName,
    name: identity.fullName,
    recipientName: identity.fullName,
    publicId: identity.publicId,
    digitalId: identity.publicId,
    memberRole: identity.role || 'Member',
    role: identity.role || 'Member',
    memberType: identity.memberType || 'Core Team',
    type: identity.memberType || 'Core Team',
    domain: identity.domain || 'Cloud & Technology',
    memberDomain: identity.domain || 'Cloud & Technology',
    email: targetEmail,
    issuedDate,
    cardUrl,
    verificationUrl
  };

  // 6. Template & Layout Resolution
  const allTemplates = await db.emailTemplates.getAll();
  const template =
    allTemplates.find((t: any) => t.type === 'digital_id_card_delivery' && t.isActive) ||
    DEFAULT_EMAIL_TEMPLATES.find((t) => t.type === 'digital_id_card_delivery');

  const rawSubject = template?.subject || 'Your Official Digital ID: {{publicId}} – AWS Student Builder Group';
  const rawBodyHtml = template?.bodyHtml || `<p>Your Digital ID {{publicId}} is active.</p>`;
  const rawBodyText = template?.bodyText || `Your Digital ID {{publicId}} is active.`;

  const finalSubject = interpolateVariables(rawSubject, variables);
  const finalBodyHtml = interpolateVariables(rawBodyHtml, variables);
  const finalBodyText = interpolateVariables(rawBodyText, variables);

  const fullHtml = finalBodyHtml.includes('<!DOCTYPE html')
    ? finalBodyHtml
    : renderEmailLayout({
        title: finalSubject,
        contentHtml: finalBodyHtml
      });

  const fromSender = getSenderForEmailType('digital_id_card_delivery', 'IDENTITY', OFFICIAL_SENDERS.NOREPLY);

  // 7. Dispatch via Centralized Resend Email System
  const sendResult = await sendEmail({
    from: fromSender,
    to: targetEmail,
    recipientName: identity.fullName,
    subject: finalSubject,
    html: fullHtml,
    text: finalBodyText,
    type: 'digital_id_card_delivery',
    category: 'IDENTITY',
    templateId: template?.id,
    triggeredBy: `Admin (${adminId})`,
    adminId,
    attachments: [
      {
        filename: pdfFilename,
        content: pdfBuffer.toString('base64'),
        contentType: 'application/pdf'
      }
    ],
    metadata: {
      digitalId: identity.publicId,
      publicId: identity.publicId,
      memberType: identity.memberType,
      memberName: identity.fullName,
      hasPdfAttachment: true,
      pdfFilename,
      verificationUrl,
      cardUrl,
      triggeredBy: `Admin (${adminId})`,
      adminId
    }
  });

  // 8. Log Admin Audit record
  await logEmailAudit({
    adminUser: adminId,
    action: 'SEND_DIGITAL_ID_EMAIL',
    details: {
      publicId: identity.publicId,
      recipient: targetEmail,
      memberName: identity.fullName,
      memberType: identity.memberType,
      status: sendResult.status,
      messageId: sendResult.messageId
    }
  });

  if (!sendResult.success) {
    return {
      success: false,
      error: sendResult.error || 'Failed to dispatch email through provider.',
      status: 502,
      sendResult,
      identity,
      recipient: targetEmail,
      pdfFilename
    };
  }

  return {
    success: true,
    message: `Digital ID ${identity.publicId} sent successfully to ${targetEmail}.`,
    sendResult,
    identity,
    recipient: targetEmail,
    pdfFilename
  };
}
