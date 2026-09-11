import { NextResponse } from 'next/server';
import { sendEmail, sendBatchEmails } from '@/lib/email';
import { EmailRecipient, EmailType } from '@/types/email';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ') && authHeader.substring(7) === SECURE_TOKEN) {
    return true;
  }
  const cookieHeader = request.headers.get('cookie') || '';
  if (cookieHeader.includes(`admin_token=${SECURE_TOKEN}`)) {
    return true;
  }
  return false;
}

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized administrative access.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const body = await request.json();
    const {
      mode = 'single', // 'single' | 'batch'
      from,
      to,
      cc,
      bcc,
      recipients, // Array<EmailRecipient | string> for batch
      subject,
      contentHtml,
      contentText,
      templateId,
      type = 'admin_manual_message' as EmailType,
      attachments,
      adminId = 'admin',
      isTest = false
    } = body;

    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return NextResponse.json(
        { error: 'Email subject is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    if (mode === 'batch') {
      if (!Array.isArray(recipients) || recipients.length === 0) {
        return NextResponse.json(
          { error: 'Recipients list is required for batch email dispatch.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      const summary = await sendBatchEmails({
        recipients,
        from,
        subject: subject.trim(),
        templateId,
        type,
        customHtml: contentHtml,
        customText: contentText,
        triggeredBy: 'ADMIN_MANUAL_BATCH',
        adminId
      });

      return NextResponse.json(
        {
          success: true,
          message: `Batch complete: ${summary.sent} sent, ${summary.failed} failed.`,
          summary
        },
        { headers: noStoreHeaders }
      );
    }

    // Single send
    if (!to || (typeof to !== 'string' && !Array.isArray(to))) {
      return NextResponse.json(
        { error: 'Recipient "to" address is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const result = await sendEmail({
      from,
      to,
      cc,
      bcc,
      subject: subject.trim(),
      html: contentHtml || `<p>${subject}</p>`,
      text: contentText,
      templateId,
      type,
      attachments,
      triggeredBy: 'ADMIN_MANUAL',
      adminId,
      isTest
    });

    return NextResponse.json(
      {
        success: result.success,
        result
      },
      { headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error in /api/admin/email/send:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error while sending email.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
