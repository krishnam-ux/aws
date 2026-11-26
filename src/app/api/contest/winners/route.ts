import { NextRequest, NextResponse } from 'next/server';
import { readShutdownState, updateVerifiedWinners, VerifiedWinner } from '@/lib/contestShutdown';
import { getContestState } from '@/lib/contestConfig';
import { isAuthorizedAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

export async function GET(req: NextRequest) {
  try {
    const testClockHeader = req.headers.get('x-test-contest-clock');
    const { searchParams } = new URL(req.url);
    const testClockParam = searchParams.get('testTime');
    const overrideDate = testClockHeader || testClockParam || null;

    const contestState = getContestState(overrideDate);
    const shutdownState = readShutdownState();

    return NextResponse.json(
      {
        success: true,
        contestStatus: contestState.status,
        isEnded: contestState.isEnded,
        verificationStatus: shutdownState.winnersVerificationStatus,
        winners: shutdownState.verifiedWinners,
        statusLabel: shutdownState.winnersVerificationStatus === 'OFFICIALLY_CONFIRMED'
          ? 'Official Winners Confirmed'
          : 'Winner Announcement — Coming Soon',
        mainMessage:
          'Thank you to everyone who participated in AWS Card Clash! Our team is currently reviewing and verifying the final leaderboard. The Top 5 winners will be announced here soon.',
        supportingMessage:
          'Selected winners will also receive an official confirmation email on their registered email address with further details about their AWS Certified AI Practitioner exam voucher.'
      },
      { headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error fetching winners:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve winners' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

/**
 * Secure admin endpoint to officially publish and confirm the 5 verified winners.
 */
export async function POST(req: NextRequest) {
  try {
    // Admin authorization check (always enforced in production)
    if (!isAuthorizedAdmin(req) && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin credentials required.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { winners, status } = body;

    if (!Array.isArray(winners) || winners.length !== 5) {
      return NextResponse.json(
        { success: false, error: 'Must provide exactly 5 verified winners (Rank 1 through 5).' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    // Validate and normalize winners
    const sanitizedWinners: VerifiedWinner[] = winners.map((w: any, idx: number) => ({
      rank: idx + 1,
      name: (w.name && typeof w.name === 'string') ? w.name.trim() : 'To Be Announced',
      department: (w.department && typeof w.department === 'string') ? w.department.trim() : undefined,
      university: (w.university && typeof w.university === 'string') ? w.university.trim() : 'Chandigarh University – Uttar Pradesh',
      studentIdMasked: (w.studentIdMasked && typeof w.studentIdMasked === 'string') ? w.studentIdMasked.trim() : undefined,
      prize: 'AWS Certified AI Practitioner exam voucher',
      status: (status === 'OFFICIALLY_CONFIRMED') ? 'VERIFIED' : 'PENDING',
      notes: w.notes
    }));

    const updatedState = updateVerifiedWinners(
      sanitizedWinners,
      status === 'OFFICIALLY_CONFIRMED' ? 'OFFICIALLY_CONFIRMED' : 'PENDING_VERIFICATION'
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Contest winners updated successfully.',
        verificationStatus: updatedState.winnersVerificationStatus,
        winners: updatedState.verifiedWinners
      },
      { headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error updating verified winners:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update winners.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
