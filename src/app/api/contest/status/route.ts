import { NextRequest, NextResponse } from 'next/server';
import { getContestState, CONTEST_CONFIG } from '@/lib/contestConfig';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Controlled test clock support (active for development and automated test suites)
    const testClockHeader = req.headers.get('x-test-contest-clock');
    const { searchParams } = new URL(req.url);
    const testClockParam = searchParams.get('testTime');
    const overrideDate = testClockHeader || testClockParam || null;

    const state = getContestState(overrideDate);

    return NextResponse.json({
      success: true,
      ...state,
      config: {
        eventId: CONTEST_CONFIG.eventId,
        eventName: CONTEST_CONFIG.eventName,
        launchDateIstString: CONTEST_CONFIG.launchDateIstString,
        endDateIstString: CONTEST_CONFIG.endDateIstString,
        timezone: CONTEST_CONFIG.timezone
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
