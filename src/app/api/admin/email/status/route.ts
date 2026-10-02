import { NextResponse } from 'next/server';
import { getResendClient } from '@/lib/email/client';
import { OFFICIAL_SENDERS, BRAND_SENDER_NAME } from '@/lib/email/senders';

import { isAuthorizedAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isAuthorized(request: Request): boolean {
  return isAuthorizedAdmin(request);
}

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized administrative access.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const { isConfigured, providerName } = getResendClient();

    return NextResponse.json(
      {
        provider: providerName,
        isConfigured,
        verifiedDomain: 'awssbgcuup.tech',
        brandName: BRAND_SENDER_NAME,
        senders: OFFICIAL_SENDERS,
        timestamp: new Date().toISOString()
      },
      { headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error fetching email status:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch email status' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
