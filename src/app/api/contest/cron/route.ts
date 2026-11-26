import { NextRequest, NextResponse } from 'next/server';
import { runContestEngagementScheduler } from '@/lib/contestEngagementScheduler';
import { isAuthorizedAdmin } from '@/lib/adminAuth';
import { getContestState } from '@/lib/contestConfig';
import { executeContestShutdown } from '@/lib/contestShutdown';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

function isAuthorized(req: NextRequest): boolean {
  if (isAuthorizedAdmin(req)) return true;
  const authHeader = req.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  // Development / local testing support
  if (process.env.NODE_ENV !== 'production') return true;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { error: 'Unauthorized contest cron trigger.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    // Support controlled test clock override
    const testClockHeader = req.headers.get('x-test-contest-clock');
    const { searchParams } = new URL(req.url);
    const testClockParam = searchParams.get('testTime');
    const forceSend = searchParams.get('force') === 'true';
    const overrideTime = testClockHeader || testClockParam || null;

    const contestState = getContestState(overrideTime);
    if (contestState.isEnded) {
      const shutdownResult = await executeContestShutdown({ overrideTime });
      return NextResponse.json({
        success: true,
        summary: {
          success: true,
          processedCount: 0,
          sentCount: 0,
          skippedCount: 0,
          failedCount: 0,
          errors: [],
          executionTimeIso: new Date().toISOString(),
          message: 'Contest officially concluded on 4 December 2026. Engagement campaign terminated and contest shutdown verified.'
        },
        shutdownResult
      }, { headers: noStoreHeaders });
    }

    const summary = await runContestEngagementScheduler({
      overrideTime,
      forceSend
    });

    return NextResponse.json({ success: true, summary }, { headers: noStoreHeaders });
  } catch (err: any) {
    console.error('Error running contest engagement cron:', err);
    return NextResponse.json(
      { error: err?.message || 'Contest cron execution failed.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
