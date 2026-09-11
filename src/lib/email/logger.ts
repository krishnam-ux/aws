import { db } from '@/lib/db';
import { EmailLog, EmailType, EmailCategory, EmailDeliveryStatus } from '@/types/email';

export async function logEmailDelivery(params: {
  id?: string;
  recipient: string;
  recipientName?: string;
  subject: string;
  type?: EmailType;
  category?: EmailCategory;
  status: EmailDeliveryStatus;
  providerId?: string;
  errorMessage?: string;
  triggeredBy?: string;
  adminId?: string;
  templateId?: string;
  metadata?: Record<string, any>;
}): Promise<EmailLog> {
  const log: EmailLog = {
    id: params.id || `elog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    recipient: params.recipient,
    recipientName: params.recipientName,
    subject: params.subject,
    type: params.type || 'system_test_email',
    category: params.category || 'COMMUNITY',
    status: params.status,
    sentAt: new Date().toISOString(),
    providerId: params.providerId,
    errorMessage: params.errorMessage,
    triggeredBy: params.triggeredBy || 'SYSTEM_AUTO',
    adminId: params.adminId,
    templateId: params.templateId,
    metadata: params.metadata,
    createdAt: new Date().toISOString()
  };

  try {
    await db.emailLogs.insertOne(log);
  } catch (err) {
    console.error('[Email Logger] Failed to persist email delivery log:', err);
  }

  return log;
}

export async function logEmailAudit(params: {
  adminUser: string;
  action: string;
  details: Record<string, any>;
}): Promise<void> {
  try {
    const notifications = await db.notifications.getAll();
    notifications.push({
      id: `notif-email-audit-${Date.now()}`,
      title: `Email Action: ${params.action}`,
      description: `Admin ${params.adminUser} performed ${params.action}. ${JSON.stringify(params.details).slice(0, 150)}`,
      status: 'unread',
      date: new Date().toISOString()
    });
    await db.notifications.saveAll(notifications);
  } catch (err) {
    console.error('[Email Logger] Failed to persist audit record:', err);
  }
}
