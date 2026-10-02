import { NextResponse } from 'next/server';
import { runScheduledEmailReminders } from '@/lib/email/scheduled';

import { isAuthorizedAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isAuthorized(request: Request): boolean {
  if (isAuthorizedAdmin(request)) return true;
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
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
