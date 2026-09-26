import { db } from '@/lib/db';
import { DigitalBadge } from '@/types/digitalBadge';
import { EmailSendResult } from '@/types/email';
import { sendEmail } from '@/lib/email/service';
import { getSenderForEmailType, OFFICIAL_SENDERS } from '@/lib/email/senders';
import { isValidEmail, normalizeEmail } from '@/lib/email/validation';
import { renderEmailLayout } from '@/lib/email/templates';
import { generateDigitalBadgePdfBuffer } from '@/lib/digitalBadgePdf';
import { getBadgeUrl, getBadgeVerificationUrl, formatDisplayDate } from '@/lib/digitalBadgeUtils';
import { logEmailAudit } from '@/lib/email/logger';

export interface SendDigitalBadgeEmailOptions {
  badgeOrCredentialId: DigitalBadge | string;
  recipientEmail?: string;
  adminId?: string;
}

export interface SendDigitalBadgeEmailResult {
  success: boolean;
  message?: string;
  error?: string;
  status?: number;
  sendResult?: EmailSendResult;
  badge?: DigitalBadge;
  recipient?: string;
  pdfFilename?: string;
}

/**
 * Authoritative Server-Side Helper to Send Digital Badge Email with attached PDF Credential.
 * Uses the existing centralized Resend email infrastructure.
 */
export async function sendDigitalBadgeEmail(
  options: SendDigitalBadgeEmailOptions
): Promise<SendDigitalBadgeEmailResult> {
  const { badgeOrCredentialId, recipientEmail, adminId = 'admin' } = options;

  // 1. Resolve authoritative badge from database
  let badge: DigitalBadge | null = null;
  if (typeof badgeOrCredentialId === 'string') {
    const cleanId = badgeOrCredentialId.trim().toUpperCase();
    badge = (await db.digitalBadges.getByCredentialId(cleanId)) || (await db.digitalBadges.getById(cleanId));
  } else if (badgeOrCredentialId && typeof badgeOrCredentialId === 'object') {
    badge = await db.digitalBadges.getByCredentialId(badgeOrCredentialId.credentialId) || badgeOrCredentialId;
  }

  if (!badge) {
    return {
      success: false,
      error: 'Digital Badge record not found in the official registry.',
      status: 404
    };
  }

  // 2. Validate ACTIVE status (Reject revoked credentials)
  if (badge.status !== 'ACTIVE') {
    const reason = `Digital Badge ${badge.credentialId} has been REVOKED (${badge.revokedReason || 'Revoked'}). Revoked credentials cannot be emailed.`;
    return {
      success: false,
      error: reason,
      status: 400,
      badge
    };
  }

  // 3. Resolve & validate recipient email
  const targetEmail = normalizeEmail(recipientEmail || badge.recipientEmail || '');

  if (!targetEmail) {
    return {
      success: false,
      error: `Recipient email address is missing for ${badge.recipientName} (${badge.credentialId}). Please provide a valid recipient email.`,
      status: 400,
      badge
    };
  }

  if (!isValidEmail(targetEmail)) {
    return {
      success: false,
      error: `Invalid recipient email address format: "${recipientEmail || badge.recipientEmail}".`,
      status: 400,
      badge,
      recipient: targetEmail
    };
  }

  // 4. Generate official PDF badge attachment
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateDigitalBadgePdfBuffer(badge);
  } catch (pdfErr: any) {
    console.error(`[Send Digital Badge] Failed to generate PDF for ${badge.credentialId}:`, pdfErr);
    return {
      success: false,
      error: `Failed to generate official PDF credential: ${pdfErr.message || 'PDF engine error'}`,
      status: 500,
      badge
    };
  }

  const pdfFilename = `Digital-Badge-${badge.credentialId}.pdf`;

  // 5. Construct canonical URLs & email content
  const badgeUrl = badge.credentialUrl || getBadgeUrl(badge.credentialId);
  const verifyUrl = badge.verificationUrl || getBadgeVerificationUrl(badge.credentialId);
  const formattedDate = formatDisplayDate(badge.issueDate || badge.issuedAt);

  const skillsHtml = Array.isArray(badge.skills) && badge.skills.length > 0
    ? badge.skills
        .map(
          (s) =>
            `<span style="display:inline-block;background-color:#0D2235;color:#FF9900;border:1px solid rgba(255,153,0,0.3);padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;margin:3px 4px 3px 0;">${s}</span>`
        )
        .join(' ')
    : `<span style="color:#94A3B8;font-size:12px;">Cloud Computing, AWS Architecture</span>`;

  const emailSubject = `🏅 Congratulations, ${badge.recipientName}! You've Earned the "${badge.badgeTitle}" Digital Badge`;

  const emailBodyHtml = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;line-height:1.6;">
      <!-- Hero Header -->
      <div style="background:linear-gradient(135deg, #07131F 0%, #0D2235 100%);padding:32px 24px;border-radius:12px;text-align:center;border:1px solid rgba(255,153,0,0.3);margin-bottom:24px;">
        <div style="display:inline-block;background:rgba(255,153,0,0.15);border:1px solid #FF9900;color:#FF9900;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:800;letter-spacing:1px;margin-bottom:12px;">
          OFFICIAL VERIFIED CREDENTIAL
        </div>
        <h1 style="color:#FFFFFF;font-size:24px;margin:0 0 8px 0;font-weight:800;">
          Congratulations, ${badge.recipientName}!
        </h1>
        <p style="color:#CBD5E1;font-size:14px;margin:0;max-width:480px;margin-left:auto;margin-right:auto;">
          You have successfully demonstrated technical competency and earned the official <strong>${badge.badgeTitle}</strong> digital credential from AWS Student Builder Group.
        </p>
      </div>

      <!-- Credential Summary Card -->
      <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:24px;margin-bottom:24px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#64748B;font-size:12px;font-weight:700;text-transform:uppercase;width:140px;">Credential ID:</td>
            <td style="padding:8px 0;font-family:monospace;font-size:14px;font-weight:800;color:#0F172A;">${badge.credentialId}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748B;font-size:12px;font-weight:700;text-transform:uppercase;">Badge Title:</td>
            <td style="padding:8px 0;font-size:14px;font-weight:800;color:#FF9900;">${badge.badgeTitle}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748B;font-size:12px;font-weight:700;text-transform:uppercase;">Issuing Body:</td>
            <td style="padding:8px 0;font-size:13px;color:#0F172A;font-weight:600;">${badge.issuerName || 'AWS Student Builder Group – Chandigarh University Uttar Pradesh'}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748B;font-size:12px;font-weight:700;text-transform:uppercase;">Issued On:</td>
            <td style="padding:8px 0;font-size:13px;color:#0F172A;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748B;font-size:12px;font-weight:700;text-transform:uppercase;">Status:</td>
            <td style="padding:8px 0;"><span style="background:#ECFDF5;color:#059669;border:1px solid #A7F3D0;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">✓ ACTIVE & VERIFIED</span></td>
          </tr>
        </table>

        <!-- Earning Criteria -->
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #F1F5F9;">
          <div style="color:#64748B;font-size:11px;font-weight:700;text-transform:uppercase;margin-bottom:6px;">Earning Criteria:</div>
          <p style="font-size:13px;color:#334155;margin:0;line-height:1.5;">${badge.earningCriteria || badge.badgeDescription}</p>
        </div>

        <!-- Verified Skills -->
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #F1F5F9;">
          <div style="color:#64748B;font-size:11px;font-weight:700;text-transform:uppercase;margin-bottom:8px;">Verified Skills & Competencies:</div>
          <div>${skillsHtml}</div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="text-align:center;margin:32px 0;padding:0 12px;">
        <a href="${badgeUrl}" style="display:inline-block;background:#FF9900;color:#FFFFFF;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:800;margin:0 8px 8px 0;box-shadow:0 4px 12px rgba(255,153,0,0.35);">
          View Digital Badge &rarr;
        </a>
        <a href="${verifyUrl}" style="display:inline-block;background:#07131F;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:700;border:1px solid #334155;">
          Verify Credential
        </a>
      </div>

      <!-- PDF Attachment Notice -->
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0;font-size:12px;color:#475569;line-height:1.5;">
          📎 <strong>Official PDF Attached:</strong> Your high-resolution certificate <code>${pdfFilename}</code> is attached to this email. You can download and share it on LinkedIn, your resume, or personal portfolio.
        </p>
      </div>

      <!-- Footer Info -->
      <div style="font-size:11px;color:#94A3B8;text-align:center;border-top:1px solid #E2E8F0;padding-top:16px;">
        <p style="margin:0 0 4px 0;">This email was sent by AWS Student Builder Group at Chandigarh University – Uttar Pradesh.</p>
        <p style="margin:0;">Permanent Credential Verification: <a href="${verifyUrl}" style="color:#FF9900;text-decoration:none;">${verifyUrl}</a></p>
      </div>
    </div>
  `;

  const emailBodyText = `Congratulations, ${badge.recipientName}!\n\nYou have earned: ${badge.badgeTitle}\nIssued by: ${badge.issuerName || 'AWS Student Builder Group – Chandigarh University Uttar Pradesh'}\nCredential ID: ${badge.credentialId}\nIssued on: ${formattedDate}\n\nView Digital Badge: ${badgeUrl}\nVerify Credential: ${verifyUrl}\n\nYour official certificate PDF (${pdfFilename}) is attached to this email.`;

  const fullHtml = renderEmailLayout({
    title: emailSubject,
    contentHtml: emailBodyHtml
  });

  const fromSender = getSenderForEmailType('digital_id_card_delivery', 'IDENTITY', OFFICIAL_SENDERS.NOREPLY);

  // 6. Dispatch via Centralized Resend Email System
  let sendResult: EmailSendResult;
  try {
    sendResult = await sendEmail({
      from: fromSender,
      to: targetEmail,
      recipientName: badge.recipientName,
      subject: emailSubject,
      html: fullHtml,
      text: emailBodyText,
      type: 'digital_badge_delivery',
      category: 'IDENTITY',
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
        credentialId: badge.credentialId,
        badgeTitle: badge.badgeTitle,
        recipientName: badge.recipientName,
        recipientEmail: targetEmail,
        hasPdfAttachment: true,
        pdfFilename,
        verificationUrl: verifyUrl,
        badgeUrl,
        triggeredBy: `Admin (${adminId})`,
        adminId
      }
    });
  } catch (sendErr: any) {
    console.error(`[Send Digital Badge] Resend dispatch error for ${badge.credentialId}:`, sendErr);

    // Record audit event for failure
    await db.digitalBadges.logEvent({
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      credentialId: badge.credentialId,
      eventType: 'BADGE_EMAIL_FAILED',
      timestamp: new Date().toISOString(),
      adminIdentity: adminId,
      details: {
        recipientEmail: targetEmail,
        error: sendErr.message || 'Email dispatch failed'
      }
    });

    return {
      success: false,
      error: sendErr.message || 'Email service error while sending digital badge.',
      status: 500,
      badge,
      recipient: targetEmail
    };
  }

  // 7. Log Admin Audit record & Badge Event
  await logEmailAudit({
    adminUser: adminId,
    action: 'SEND_DIGITAL_BADGE_EMAIL',
    details: {
      targetEmail,
      credentialId: badge.credentialId,
      badgeTitle: badge.badgeTitle,
      recipientName: badge.recipientName,
      success: sendResult.success,
      messageId: sendResult.messageId,
      error: sendResult.error
    }
  });

  await db.digitalBadges.logEvent({
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    credentialId: badge.credentialId,
    eventType: sendResult.success ? 'BADGE_EMAIL_SENT' : 'BADGE_EMAIL_FAILED',
    timestamp: new Date().toISOString(),
    adminIdentity: adminId,
    details: {
      recipientEmail: targetEmail,
      messageId: sendResult.messageId,
      status: sendResult.status,
      error: sendResult.error
    }
  });

  if (!sendResult.success) {
    return {
      success: false,
      error: sendResult.error || 'Failed to deliver Digital Badge email.',
      status: 500,
      sendResult,
      badge,
      recipient: targetEmail
    };
  }

  return {
    success: true,
    message: `Digital Badge successfully sent to ${targetEmail}.`,
    sendResult,
    badge,
    recipient: targetEmail,
    pdfFilename
  };
}
