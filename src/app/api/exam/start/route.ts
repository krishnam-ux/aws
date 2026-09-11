import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateRemainingSeconds, logSecurityEvent } from '@/lib/exam';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { attemptId, token } = body;

    if (!attemptId || !token) {
      return NextResponse.json(
        { error: 'Attempt ID and session token are required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const attempt = await db.examAttempts.getById(attemptId);
    if (!attempt || attempt.sessionToken !== token) {
      return NextResponse.json(
        { error: 'Invalid or expired session.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const exam = await db.exams.getById(attempt.examId);
    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found.' },
        { status: 404, headers: noStoreHeaders }
      );
    }

    if (attempt.status === 'LOCKED') {
      return NextResponse.json(
        { error: 'Exam is currently locked. Please wait for the proctor to verify and unlock your attempt.' },
        { status: 403, headers: noStoreHeaders }
      );
    }

    if (attempt.status === 'VERIFIED') {
      return NextResponse.json(
        { error: 'Identity verified. Please wait for the proctor to unlock the exam session.' },
        { status: 403, headers: noStoreHeaders }
      );
    }

    if (attempt.status === 'SUBMITTED' || attempt.status === 'REVIEW_REQUIRED') {
      return NextResponse.json(
        { error: 'This exam attempt has already been submitted.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const now = new Date();
    let startedAt = attempt.startedAt;
    let expiresAt = attempt.expiresAt;

    if (!startedAt || attempt.status === 'UNLOCKED') {
      startedAt = now.toISOString();
      const totalMinutes = exam.durationMinutes + (attempt.extendedMinutes || 0);
      expiresAt = new Date(now.getTime() + totalMinutes * 60 * 1000).toISOString();

      await db.examAttempts.updateOne(attemptId, {
        status: 'IN_EXAM',
        startedAt,
        expiresAt
      });
    }

    const updatedAttempt = await db.examAttempts.getById(attemptId);
    const remainingSeconds = calculateRemainingSeconds(updatedAttempt, exam);

    return NextResponse.json(
      {
        success: true,
        status: 'IN_EXAM',
        startedAt,
        expiresAt,
        remainingSeconds
      },
      { headers: noStoreHeaders }
    );
  } catch (error: any) {
    console.error('Exam start error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start exam.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
