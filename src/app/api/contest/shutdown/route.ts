import { NextRequest, NextResponse } from 'next/server';
import { executeContestShutdown, readShutdownState } from '@/lib/contestShutdown';
import { isAuthorizedAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

function isAuthorized(req: NextRequest): boolean {
  if (isAuthorizedAdmin(req)) return true;
  const authHeader = req.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  if (process.env.NODE_ENV !== 'production') return true;
  return false;
}

export async function GET(req: NextRequest) {
  try {
    const testClockHeader = req.headers.get('x-test-contest-clock');
    const { searchParams } = new URL(req.url);
    const testClockParam = searchParams.get('testTime');
    const forceParam = searchParams.get('force') === 'true';
    const overrideTime = testClockHeader || testClockParam || null;

    // Check if triggering shutdown or just querying state
    const action = searchParams.get('action');
    if (action === 'trigger') {
      if (!isAuthorized(req)) {
        return NextResponse.json({ error: 'Unauthorized shutdown trigger' }, { status: 401, headers: noStoreHeaders });
      }
      const result = await executeContestShutdown({ overrideTime, force: forceParam });
      return NextResponse.json(result, { headers: noStoreHeaders });
    }

    const state = readShutdownState();
    return NextResponse.json({ success: true, shutdownState: state }, { headers: noStoreHeaders });
  } catch (err: any) {
    console.error('Error in contest shutdown API:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Contest shutdown query failed' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized shutdown trigger' }, { status: 401, headers: noStoreHeaders });
    }

    const testClockHeader = req.headers.get('x-test-contest-clock');
    const { searchParams } = new URL(req.url);
    const testClockParam = searchParams.get('testTime');
    const forceParam = searchParams.get('force') === 'true';
    const overrideTime = testClockHeader || testClockParam || null;

    const result = await executeContestShutdown({ overrideTime, force: forceParam });
    return NextResponse.json(result, { headers: noStoreHeaders });
  } catch (err: any) {
    console.error('Error executing contest shutdown API:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Contest shutdown execution failed' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
