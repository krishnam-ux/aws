import { NextResponse } from 'next/server';
import { runScheduledEmailReminders } from '@/lib/email/scheduled';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ') && authHeader.substring(7) === SECURE_TOKEN) {
    return true;
  }
  // Vercel Cron authorization header support
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
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
      return NextResponse.json({ error: 'Unauthorized scheduled job trigger.' }, { status: 401, headers: noStoreHeaders });
    }

    const summary = await runScheduledEmailReminders();
    return NextResponse.json({ success: true, summary }, { headers: noStoreHeaders });
  } catch (err: any) {
    console.error('Error in scheduled email reminders cron:', err);
    return NextResponse.json({ error: err.message || 'Scheduled job execution failed.' }, { status: 500, headers: noStoreHeaders });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
