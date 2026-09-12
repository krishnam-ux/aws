import { db } from '@/lib/db';
import {
  EmailPayload,
  EmailSendResult,
  EmailBatchSummary,
  EmailLog,
  EmailRecipient,
  EmailType,
  EmailCategory,
  EmailDeliveryStatus
} from '@/types/email';
import { getResendClient } from './client';
import { getSenderForEmailType, BRAND_SENDER_NAME } from './senders';
import {
  isValidEmail,
  normalizeEmail,
  sanitizeEmailHeaders,
  validateRecipients
} from './validation';
import {
  DEFAULT_EMAIL_TEMPLATES,
  interpolateVariables,
  renderEmailLayout,
  htmlToPlainText
} from './templates';
import { logEmailDelivery } from './logger';

/**
 * Core function to send an email through Resend (or simulated fallback if unconfigured).
 * Performs validation, header sanitization, plain-text fallback, retries, and persistence.
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
  const rawRecipient = Array.isArray(payload.to) ? payload.to[0] : payload.to;
  const recipient = normalizeEmail(rawRecipient || '');

  if (!isValidEmail(recipient)) {
    const errorMsg = `Invalid recipient email address: "${rawRecipient}"`;
    await logEmailDelivery({
      recipient: recipient || 'UNKNOWN',
      subject: payload.subject || 'No Subject',
      type: payload.type,
      category: payload.category,
      status: 'FAILED',
      errorMessage: errorMsg,
      triggeredBy: payload.triggeredBy,
      adminId: payload.adminId,
      templateId: payload.templateId,
      metadata: payload.metadata
    });

    return {
      success: false,
      status: 'FAILED',
      recipient: recipient || rawRecipient,
      error: errorMsg,
      provider: 'RESEND',
      timestamp: new Date().toISOString()
    };
  }

  // 1. Resolve Sender
  const fromAddress = getSenderForEmailType(payload.type, payload.category, payload.from);
  const sanitizedSubject = sanitizeEmailHeaders(payload.subject || 'Notification from AWS SBG CU-UP');
  const htmlContent = payload.html || `<p>${sanitizedSubject}</p>`;
  const textContent = payload.text || htmlToPlainText(htmlContent);

  const { resend, isConfigured } = getResendClient();

  let messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let status: EmailDeliveryStatus = 'SENT';
  let errorDetail: string | undefined;

  // 2. Dispatch via Resend SDK
  if (isConfigured && resend) {
    let attempts = 0;
    const maxRetries = 2;
    let sentSuccessfully = false;

    while (attempts <= maxRetries && !sentSuccessfully) {
      attempts++;
      try {
        const emailParams: any = {
          from: fromAddress,
          to: Array.isArray(payload.to) ? payload.to.map(normalizeEmail) : [recipient],
          subject: sanitizedSubject,
          html: htmlContent,
          text: textContent
        };

        if (payload.replyTo) {
          emailParams.reply_to = payload.replyTo;
        }

        if (payload.cc) {
          emailParams.cc = Array.isArray(payload.cc) ? payload.cc.map(normalizeEmail) : [normalizeEmail(payload.cc)];
        }

        if (payload.bcc) {
          emailParams.bcc = Array.isArray(payload.bcc) ? payload.bcc.map(normalizeEmail) : [normalizeEmail(payload.bcc)];
        }

        if (payload.attachments && payload.attachments.length > 0) {
          emailParams.attachments = payload.attachments.map((att) => ({
            filename: att.filename,
            content: att.content,
            path: att.path
          }));
        }

        const res = await resend.emails.send(emailParams);

        if (res.error) {
          throw new Error(res.error.message || 'Resend provider error');
        }

        if (res.data?.id) {
          messageId = res.data.id;
        }

        status = 'SENT';
        sentSuccessfully = true;
      } catch (err: any) {
        errorDetail = err.message || 'Unknown provider error';
        if (attempts <= maxRetries) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, attempts * 400));
        } else {
          status = 'FAILED';
        }
      }
    }
  } else {
    // Simulated Environment (for test runs or missing API keys)
    status = 'SIMULATED';
    messageId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  // 3. Log to DB
  await logEmailDelivery({
    recipient,
    recipientName: payload.recipientName || payload.metadata?.studentName || payload.metadata?.recipientName,
    subject: sanitizedSubject,
    type: payload.type,
    category: payload.category,
    status,
    providerId: messageId,
    errorMessage: errorDetail,
    triggeredBy: payload.triggeredBy || 'SYSTEM_AUTO',
    adminId: payload.adminId,
    templateId: payload.templateId,
    metadata: payload.metadata
  });

  return {
    success: status !== 'FAILED',
    messageId,
    status,
    recipient,
    error: errorDetail,
    provider: isConfigured ? 'RESEND' : 'SIMULATED',
    timestamp: new Date().toISOString()
  };
}

/**
 * Sends a structured email using a predefined template.
 */
export async function sendTemplateEmail(params: {
  type: EmailType;
  to: string;
  variables: Record<string, any>;
  triggeredBy?: string;
  adminId?: string;
  ctaText?: string;
  ctaUrl?: string;
  isTest?: boolean;
}): Promise<EmailSendResult> {
  const { type, to, variables, triggeredBy = 'SYSTEM_AUTO', adminId, ctaText, ctaUrl, isTest = false } = params;

  const allTemplates = await db.emailTemplates.getAll();
  const template =
    allTemplates.find((t: any) => t.type === type && t.isActive) ||
    DEFAULT_EMAIL_TEMPLATES.find((t) => t.type === type);

  if (!template) {
    const errorMsg = `Template not found for type: ${type}`;
    return {
      success: false,
      status: 'FAILED',
      recipient: to,
      error: errorMsg,
      provider: 'RESEND',
      timestamp: new Date().toISOString()
    };
  }

  const subject = interpolateVariables(template.subject, variables);
  const bodyHtml = interpolateVariables(template.bodyHtml, variables);
  const bodyText = interpolateVariables(template.bodyText, variables);

  const fullHtml = renderEmailLayout({
    title: subject,
    contentHtml: bodyHtml,
    ctaText,
    ctaUrl
  });

  return await sendEmail({
    to,
    subject,
    html: fullHtml,
    text: bodyText,
    type,
    category: template.category,
    templateId: template.id,
    triggeredBy,
    adminId,
    isTest
  });
}

/**
 * Sends batch emails with deduplication, validation, rate limiting, and summary.
 */
export async function sendBatchEmails(params: {
  recipients: Array<EmailRecipient | string>;
  from?: string;
  subject: string;
  templateId?: string;
  type?: EmailType;
  category?: EmailCategory;
  customHtml?: string;
  customText?: string;
  triggeredBy?: string;
  adminId?: string;
  rateLimitDelayMs?: number;
}): Promise<EmailBatchSummary> {
  const {
    recipients,
    from,
    subject,
    templateId,
    type = 'admin_manual_message',
    category = 'ADMIN',
    customHtml,
    customText,
    triggeredBy = 'ADMIN_BATCH',
    adminId,
    rateLimitDelayMs = 25
  } = params;

  const batchId = `batch_${Date.now()}`;
  const { valid, invalid } = validateRecipients(recipients);

  const summary: EmailBatchSummary = {
    total: valid.length,
    sent: 0,
    failed: 0,
    simulated: 0,
    errors: invalid.map((inv) => ({ recipient: inv, error: 'Invalid email address' })),
    batchId
  };

  let template: any = null;
  if (templateId) {
    const allTemplates = await db.emailTemplates.getAll();
    template = allTemplates.find((t: any) => t.id === templateId || t.type === templateId);
  }

  for (const item of valid) {
    try {
      const vars: Record<string, any> = {
        studentName: item.name || 'Student',
        recipientName: item.name || 'Student',
        email: item.email,
        studentId: item.studentId || item.rollNumber || '',
        rollNumber: item.rollNumber || item.studentId || '',
        messageContent: customHtml || ''
      };

      let emailHtml = customHtml || `<p>${subject}</p>`;
      let emailText = customText;

      if (template) {
        const bodyContent = interpolateVariables(template.bodyHtml, vars);
        emailHtml = renderEmailLayout({
          title: interpolateVariables(template.subject, vars),
          contentHtml: bodyContent
        });
        emailText = interpolateVariables(template.bodyText, vars);
      } else {
        emailHtml = renderEmailLayout({
          title: subject,
          contentHtml: emailHtml
        });
      }

      const result = await sendEmail({
        from,
        to: item.email,
        subject,
        html: emailHtml,
        text: emailText,
        type,
        category,
        templateId: template?.id,
        triggeredBy,
        adminId,
        metadata: { batchId, studentId: item.studentId }
      });

      if (result.success) {
        summary.sent++;
      } else {
        summary.failed++;
        summary.errors.push({ recipient: item.email, error: result.error || 'Dispatch error' });
      }

      // Small throttling delay to stay within rate limit bounds
      if (rateLimitDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, rateLimitDelayMs));
      }
    } catch (err: any) {
      summary.failed++;
      summary.errors.push({ recipient: item.email, error: err.message || 'Exception in batch item' });
    }
  }

  return summary;
}

/**
 * Retries a previously failed email delivery from db logs.
 */
export async function retryFailedEmail(logId: string): Promise<EmailSendResult> {
  const logs = await db.emailLogs.getAll();
  const targetLog = logs.find((l: any) => l.id === logId);

  if (!targetLog) {
    return {
      success: false,
      status: 'FAILED',
      recipient: 'UNKNOWN',
      error: 'Log entry not found',
      provider: 'RESEND',
      timestamp: new Date().toISOString()
    };
  }

  const result = await sendEmail({
    to: targetLog.recipient,
    subject: targetLog.subject,
    html: `<p>${targetLog.subject}</p>`,
    type: targetLog.type,
    category: targetLog.category,
    triggeredBy: 'ADMIN_RETRY',
    metadata: { retriedFromLogId: logId }
  });

  if (result.success) {
    await db.emailLogs.updateOne(logId, {
      status: 'SENT',
      errorMessage: undefined,
      providerId: result.messageId
    });
  }

  return result;
}
