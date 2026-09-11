import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { unlockExamAttempt, sanitizeExamForStudent, calculateRemainingSeconds } from '@/lib/exam';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { attemptId, token, unlockPassword } = body;

    if (!attemptId || !token || !unlockPassword) {
      return NextResponse.json(
        { error: 'Attempt ID, session token, and unlock password are required.' },
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

    if (attempt.status !== 'EXAM_LOCKED') {
      return NextResponse.json(
        {
          success: true,
          status: attempt.status,
          message: 'Exam attempt is not currently locked.'
        },
        { headers: noStoreHeaders }
      );
    }

    const exam = await db.exams.getById(attempt.examId);
    if (!exam) {
      return NextResponse.json(
        { error: 'Associated exam record not found.' },
        { status: 404, headers: noStoreHeaders }
      );
    }

    // Verify exam-specific unlock password
    const expectedPassword = (exam.examUnlockPassword || 'UNLOCK-AWS-2026').trim().toUpperCase();
    const enteredPassword = String(unlockPassword).trim().toUpperCase();

    if (enteredPassword !== expectedPassword) {
      return NextResponse.json(
        { error: 'Incorrect Invigilator Unlock Password. Please contact your exam proctor.' },
        { status: 403, headers: noStoreHeaders }
      );
    }

    // Unlock candidate attempt and resume exam
    const unlockedAttempt = await unlockExamAttempt(attemptId, 'STUDENT_PASSWORD');
    const sanitizedExam = sanitizeExamForStudent(exam);
    const remainingSeconds = calculateRemainingSeconds(unlockedAttempt || attempt, exam);

    return NextResponse.json(
      {
        success: true,
        status: 'IN_EXAM',
        message: 'Exam session unlocked successfully. You may now continue your assessment.',
        remainingSeconds,
        questions: sanitizedExam.questions,
        answers: unlockedAttempt?.answers || attempt.answers || {}
      },
      { headers: noStoreHeaders }
    );
  } catch (error: any) {
    console.error('Recover lock error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to unlock exam session.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
