import { NextRequest, NextResponse } from 'next/server';
import { getContestState, CONTEST_CONFIG } from '@/lib/contestConfig';
import { executeContestShutdown, readShutdownState } from '@/lib/contestShutdown';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Controlled test clock support (active for development and automated test suites)
    const testClockHeader = req.headers.get('x-test-contest-clock');
    const { searchParams } = new URL(req.url);
    const testClockParam = searchParams.get('testTime');
    const overrideDate = testClockHeader || testClockParam || null;

    const state = getContestState(overrideDate);

    // If the contest has ended, ensure server-side shutdown is executed idempotently
    if (state.isEnded) {
      await executeContestShutdown({ overrideTime: overrideDate });
    }

    const shutdownState = readShutdownState();

    return NextResponse.json({
      success: true,
      ...state,
      config: {
        eventId: CONTEST_CONFIG.eventId,
        eventName: CONTEST_CONFIG.eventName,
        launchDateIstString: CONTEST_CONFIG.launchDateIstString,
        endDateIstString: CONTEST_CONFIG.endDateIstString,
        timezone: CONTEST_CONFIG.timezone
      },
      shutdownState: {
        hasShutdown: shutdownState.hasShutdown,
        shutdownAt: shutdownState.shutdownAt,
        winnersVerificationStatus: shutdownState.winnersVerificationStatus,
        verifiedWinners: shutdownState.verifiedWinners
      }
    });
  } catch (error: any) {
    console.error('Error fetching contest status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve contest status' },
      { status: 500 }
    );
  }
}
