import { NextResponse } from 'next/server';
import { validateBase64Image } from '@/lib/digitalIdUtils';

export const dynamic = 'force-dynamic';

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
    const { base64Data } = body;

    if (!base64Data) {
      return NextResponse.json(
        { error: 'Missing photo data.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const validation = validateBase64Image(base64Data);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid photo format.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    return NextResponse.json(
      { success: true, photoUrl: base64Data },
      { headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error in photo upload:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process photo upload.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
