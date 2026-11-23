import { NextRequest, NextResponse } from 'next/server';
import { getContestState, CONTEST_CONFIG } from '@/lib/contestConfig';

export const dynamic = 'force-dynamic';

/**
 * Validates whether contest participation and actions are accessible.
 * Strictly prevents direct API access before 24 November 2026, 9:00 AM IST.
 */
export async function GET(req: NextRequest) {
  try {
    const testClockHeader = req.headers.get('x-test-contest-clock');
    const { searchParams } = new URL(req.url);
    const testClockParam = searchParams.get('testTime');
    const overrideDate = testClockHeader || testClockParam || null;

    const state = getContestState(overrideDate);

    if (state.isLocked) {
      return NextResponse.json(
        {
          success: false,
          isLocked: true,
          isLive: false,
          error: `Contest participation is locked until ${CONTEST_CONFIG.launchDateIstString}. Early access is prohibited.`,
          launchDateIstString: CONTEST_CONFIG.launchDateIstString,
          timeRemainingMs: state.timeRemainingMs
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      isLocked: false,
      isLive: true,
      status: state.status,
      message: 'Contest is officially LIVE. Access permitted.',
      launchTime: CONTEST_CONFIG.launchDateIstString,
      endTime: CONTEST_CONFIG.endDateIstString
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to verify contest access status.' },
      { status: 500 }
    );
  }
}
