import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { db } from '@/lib/db';
import {
  EmailPayload,
  EmailSendResult,
  EmailBatchSummary,
  EmailLog,
  EmailType,
  EmailRecipient
} from '@/types/email';
import {
  DEFAULT_EMAIL_TEMPLATES,
  interpolateVariables,
  renderEmailLayout,
  escapeHtml
} from './templates';

export const SENDER_NAME = 'AWS Student Builder Group (CU-UP)';
export const DEFAULT_FROM = process.env.SMTP_FROM || 'AWS SBG CU-UP <notifications@awssbgcuup.tech>';
export const DEFAULT_REPLY_TO = process.env.SMTP_REPLY_TO || 'support@awssbgcuup.tech';

let cachedTransporter: Transporter | null = null;

/**
 * Initializes and returns a cached nodemailer transporter
 */
export function getEmailTransporter(): { transporter: Transporter | null; isReal: boolean } {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    if (!cachedTransporter) {
      cachedTransporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
      });
    }
    return { transporter: cachedTransporter, isReal: true };
  }

  return { transporter: null, isReal: false };
}

/**
 * Validates an email address format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim();
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(clean);
}

/**
 * Normalizes email address (lowercase, trimmed)
 */
export function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Core single email dispatcher
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
  const rawRecipient = Array.isArray(payload.to) ? payload.to[0] : payload.to;
  const recipient = normalizeEmail(rawRecipient);

  if (!isValidEmail(recipient)) {
    const errorMsg = `Invalid recipient email address: "${rawRecipient}"`;
    return {
      success: false,
      status: 'FAILED',
      recipient,
      error: errorMsg,
      timestamp: new Date().toISOString()
    };
  }

  const { transporter, isReal } = getEmailTransporter();
  const subject = payload.subject;
  const htmlContent = payload.html;
  const textContent = payload.text || '';
  const from = DEFAULT_FROM;
  const replyTo = payload.replyTo || DEFAULT_REPLY_TO;

  let messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  let status: 'SENT' | 'FAILED' | 'SIMULATED' = 'SENT';
  let errorDetail: string | undefined;

  try {
    if (isReal && transporter) {
      const mailOptions: SendMailOptions = {
        from,
        to: recipient,
        cc: payload.cc,
        bcc: payload.bcc,
        replyTo,
        subject,
        html: htmlContent,
        text: textContent
      };

      if (payload.attachments && payload.attachments.length > 0) {
        mailOptions.attachments = payload.attachments.map((att) => ({
          filename: att.filename,
          content: att.content,
          path: att.path,
          contentType: att.contentType
        }));
      }

      const info = await transporter.sendMail(mailOptions);
      messageId = info.messageId || messageId;
      status = 'SENT';
    } else {
      // Simulation / Fallback Mode (Production & Dev safe)
      status = 'SIMULATED';
      messageId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }
  } catch (err: any) {
    status = 'FAILED';
    errorDetail = err.message || 'SMTP delivery failed.';
    console.error('Email delivery error:', err);
  }

  // 1. Log to database `email_logs` (unless marked as preview test)
  if (!payload.isTest) {
    try {
      const emailLog: EmailLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        recipient,
        subject,
        type: payload.type || 'admin_manual_message',
        category: payload.category || 'COMMUNITY',
        status: status === 'SIMULATED' ? 'SENT' : status,
        sentAt: new Date().toISOString(),
        providerId: messageId,
        errorMessage: errorDetail,
        triggeredBy: payload.triggeredBy || 'SYSTEM_AUTO',
        adminId: payload.adminId,
        templateId: payload.templateId,
        metadata: payload.metadata,
        createdAt: new Date().toISOString()
      };

      await db.emailLogs.insertOne(emailLog);
    } catch (logErr) {
      console.error('Failed to write email delivery log:', logErr);
    }

    // 2. Also log to notifications for community activity
    try {
      const notifs = await db.notifications.getAll();
      notifs.unshift({
        id: `notif_mail_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: payload.type || 'email_dispatch',
        title: `Email: ${subject}`,
        description: `Delivered to ${recipient} [${status}]`,
        recipientEmail: recipient,
        message: textContent || subject,
        status: 'unread',
        date: new Date().toISOString()
      });
      await db.notifications.saveAll(notifs.slice(0, 500));
    } catch (notifErr) {
      console.error('Failed to log in-app notification:', notifErr);
    }
  }

  return {
    success: status === 'SENT' || status === 'SIMULATED',
    status: status === 'SIMULATED' ? 'SENT' : status,
    messageId,
    recipient,
    error: errorDetail,
    provider: isReal ? 'SMTP_TRANS' : 'SIMULATED_TRANS',
    timestamp: new Date().toISOString()
  };
}

/**
 * High-performance batch email sender with deduplication and concurrency control
 */
export async function sendBatchEmails(params: {
  recipients: Array<string | EmailRecipient>;
  subject: string;
  templateId?: string;
  type?: EmailType;
  customHtml?: string;
  customText?: string;
  variablesGenerator?: (rec: EmailRecipient) => Record<string, any>;
  triggeredBy?: string;
  adminId?: string;
  concurrency?: number;
}): Promise<EmailBatchSummary> {
  const {
    recipients,
    subject,
    templateId,
    type = 'admin_custom_announcement',
    customHtml,
    customText,
    variablesGenerator,
    triggeredBy = 'ADMIN',
    adminId,
    concurrency = 5
  } = params;

  // Deduplicate and normalize recipients
  const seenEmails = new Set<string>();
  const cleanRecipients: EmailRecipient[] = [];

  for (const r of recipients) {
    const email = typeof r === 'string' ? normalizeEmail(r) : normalizeEmail(r.email);
    if (email && isValidEmail(email) && !seenEmails.has(email)) {
      seenEmails.add(email);
      cleanRecipients.push(typeof r === 'string' ? { email, name: email.split('@')[0] } : { ...r, email });
    }
  }

  const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let sentCount = 0;
  let failedCount = 0;
  let simulatedCount = 0;
  const errors: Array<{ recipient: string; error: string }> = [];

  // Load template if provided
  const templates = await db.emailTemplates.getAll();
  const template = templateId ? templates.find((t: any) => t.id === templateId || t.type === type) : null;

  // Process in chunks
  for (let i = 0; i < cleanRecipients.length; i += concurrency) {
    const chunk = cleanRecipients.slice(i, i + concurrency);
    const promises = chunk.map(async (recipient) => {
      const vars = variablesGenerator
        ? variablesGenerator(recipient)
        : { studentName: recipient.name || 'Student Builder', email: recipient.email };

      let renderedSubject = subject;
      let renderedHtml = customHtml || '';
      let renderedText = customText || '';

      if (template) {
        renderedSubject = interpolateVariables(template.subject || subject, vars);
        const interpolatedBody = interpolateVariables(template.bodyHtml, vars);
        renderedHtml = renderEmailLayout({
          title: renderedSubject,
          contentHtml: interpolatedBody
        });
        renderedText = interpolateVariables(template.bodyText, vars);
      } else if (customHtml) {
        renderedHtml = renderEmailLayout({
          title: renderedSubject,
          contentHtml: interpolateVariables(customHtml, vars)
        });
        renderedText = interpolateVariables(customText || '', vars);
      }

      try {
        const result = await sendEmail({
          to: recipient.email,
          subject: renderedSubject,
          html: renderedHtml,
          text: renderedText,
          type,
          templateId: template?.id,
          triggeredBy,
          adminId,
          metadata: { batchId, studentId: recipient.studentId, rollNumber: recipient.rollNumber }
        });

        if (result.success) {
          sentCount++;
          if (result.provider === 'SIMULATED_TRANS') simulatedCount++;
        } else {
          failedCount++;
          errors.push({ recipient: recipient.email, error: result.error || 'Delivery failed' });
        }
      } catch (err: any) {
        failedCount++;
        errors.push({ recipient: recipient.email, error: err.message || 'Unknown error' });
      }
    });

    await Promise.all(promises);

    // Minor throttle between chunks (50ms) to respect SMTP rate limits
    if (i + concurrency < cleanRecipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  return {
    total: cleanRecipients.length,
    sent: sentCount,
    failed: failedCount,
    simulated: simulatedCount,
    errors,
    batchId
  };
}

/**
 * Sends an email using a predefined template with variables
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
    return {
      success: false,
      status: 'FAILED',
      recipient: to,
      error: `Template not found for type: ${type}`,
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
    isTest,
    metadata: { variables }
  });
}

/**
 * Retries sending a previously failed email log
 */
export async function retryFailedEmail(logId: string): Promise<EmailSendResult> {
  const log = await db.emailLogs.getById(logId);
  if (!log) {
    return {
      success: false,
      status: 'FAILED',
      recipient: '',
      error: 'Log entry not found',
      timestamp: new Date().toISOString()
    };
  }

  const result = await sendEmail({
    to: log.recipient,
    subject: log.subject,
    html: `<p>Retry of message: ${escapeHtml(log.subject)}</p>`,
    type: log.type,
    category: log.category,
    templateId: log.templateId,
    triggeredBy: 'ADMIN_RETRY',
    metadata: { previousLogId: log.id, retryCount: (log.metadata?.retryCount || 0) + 1 }
  });

  if (result.success) {
    await db.emailLogs.updateOne(logId, {
      status: 'SENT',
      errorMessage: undefined,
      providerId: result.messageId,
      sentAt: new Date().toISOString()
    });
  }

  return result;
}
