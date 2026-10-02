import { NextResponse } from 'next/server';
import { isAuthorizedAdmin, unauthorizedAdminResponse } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return unauthorizedAdminResponse();
  }

  return NextResponse.json({
    status: 'healthy',
    hasDatabase: !!process.env.DATABASE_URL || !!process.env.POSTGRES_URL,
    hasKvStore: !!process.env.KV_REST_API_URL,
    hasResend: !!process.env.RESEND_API_KEY,
    timestamp: new Date().toISOString()
  });
}
