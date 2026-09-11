import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateRemainingSeconds } from '@/lib/exam';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get('attemptId');
    const token = searchParams.get('token');

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

    const remainingSeconds = calculateRemainingSeconds(attempt, exam);

    // If attempt is submitted or review required, do not leak score/verdict
    if (attempt.status === 'SUBMITTED' || attempt.status === 'REVIEW_REQUIRED') {
      return NextResponse.json(
        {
          status: 'SUBMITTED',
          studentName: attempt.studentName,
          rollNumber: attempt.rollNumber,
          examId: exam.id,
          examTitle: exam.title,
          examCode: exam.examCode,
          message: 'Exam Submitted Successfully. Your response has been recorded. Your result will be communicated by email.'
        },
        { headers: noStoreHeaders }
      );
    }

    return NextResponse.json(
      {
        status: attempt.status,
        verifiedAt: attempt.verifiedAt,
        unlockedAt: attempt.unlockedAt,
        startedAt: attempt.startedAt,
        studentName: attempt.studentName,
        rollNumber: attempt.rollNumber,
        examId: exam.id,
        examTitle: exam.title,
        examCode: exam.examCode,
        durationMinutes: exam.durationMinutes + (attempt.extendedMinutes || 0),
        remainingSeconds
      },
      { headers: noStoreHeaders }
    );
  } catch (error: any) {
    console.error('Lobby status error:', error);
    return NextResponse.json(
      { error: error.message || 'Status check failed.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
