import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateRemainingSeconds } from '@/lib/exam';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get('attemptId');
    const token = searchParams.get('token');

    if (!attemptId || !token) {
      return NextResponse.json({ error: 'Attempt ID and session token are required.' }, { status: 400 });
    }

    const attempt = await db.examAttempts.getById(attemptId);
    if (!attempt || attempt.sessionToken !== token) {
      return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
    }

    const exam = await db.exams.getById(attempt.examId);
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });
    }

    const remainingSeconds = calculateRemainingSeconds(attempt, exam);

    return NextResponse.json({
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
      remainingSeconds,
      passed: attempt.passed,
      score: attempt.score,
      percentage: attempt.percentage,
      certificateId: attempt.certificateId
    });
  } catch (error: any) {
    console.error('Lobby status error:', error);
    return NextResponse.json({ error: error.message || 'Status check failed.' }, { status: 500 });
  }
}
