import { NextResponse } from 'next/server';
import { sendDigitalBadgeEmail } from '@/lib/digitalBadgeEmail';

import { isAuthorizedAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isAuthorized(request: Request): boolean {
  return isAuthorizedAdmin(request);
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
    const { credentialId, id, recipientEmail, adminId = 'admin' } = body;

    const target = credentialId || id;
    if (!target) {
      return NextResponse.json(
        { error: 'Credential ID or Badge ID is required to send badge email.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const result = await sendDigitalBadgeEmail({
      badgeOrCredentialId: target,
      recipientEmail,
      adminId
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to deliver digital badge email.',
          details: result
        },
        { status: result.status || 500, headers: noStoreHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message || `Digital badge successfully sent to ${result.recipient}.`,
        credentialId: result.badge?.credentialId,
        recipient: result.recipient,
        pdfFilename: result.pdfFilename,
        messageId: result.sendResult?.messageId
      },
      { headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error in POST /api/admin/digital-badges/email:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error while sending digital badge email.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
