import { NextResponse } from 'next/server';
import { sendDigitalIdEmail } from '@/lib/digitalIdEmail';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ') && authHeader.substring(7) === SECURE_TOKEN) {
    return true;
  }
  const cookieHeader = request.headers.get('cookie') || '';
  if (cookieHeader.includes(`admin_token=${SECURE_TOKEN}`) || cookieHeader.includes(`adminToken=${SECURE_TOKEN}`)) {
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
    const { publicId, id, email, recipientEmail, adminId } = body;
    const targetId = publicId || id;

    if (!targetId) {
      return NextResponse.json(
        { error: 'Digital ID (publicId or id) is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const result = await sendDigitalIdEmail({
      identityOrPublicId: targetId,
      recipientEmail: recipientEmail || email,
      adminId: adminId || 'admin'
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to send Digital ID email.',
          identity: result.identity
        },
        { status: result.status || 400, headers: noStoreHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message || `Digital ID sent successfully to ${result.recipient}.`,
        recipient: result.recipient,
        pdfFilename: result.pdfFilename,
        sendResult: result.sendResult
      },
      { headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error in POST /api/admin/digital-ids/send:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error while sending Digital ID email.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
