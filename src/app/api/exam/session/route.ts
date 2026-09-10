import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sanitizeExamForStudent, calculateRemainingSeconds, evaluateExamSubmission } from '@/lib/exam';

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

    // Check if time expired while IN_EXAM
    let remainingSeconds = calculateRemainingSeconds(attempt, exam);
    let currentStatus = attempt.status;

    if (currentStatus === 'IN_EXAM' && remainingSeconds <= 0) {
      // Auto-submit due to timer expiration
      const result = await evaluateExamSubmission(exam, attempt, 'TIME_EXPIRED');
      await db.examAttempts.updateOne(attemptId, {
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString(),
        submissionReason: 'TIME_EXPIRED',
        score: result.score,
        totalMarks: result.totalMarks,
        percentage: result.percentage,
        passed: result.passed
      });
      currentStatus = 'SUBMITTED';
      remainingSeconds = 0;
    }

    const sanitizedExam = sanitizeExamForStudent(exam);

    return NextResponse.json({
      exam: sanitizedExam,
      attempt: {
        id: attempt.id,
        studentName: attempt.studentName,
        rollNumber: attempt.rollNumber,
        email: attempt.email,
        status: currentStatus,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        remainingSeconds,
        answers: attempt.answers || {},
        markedForReview: attempt.markedForReview || [],
        securityViolationsCount: attempt.securityViolationsCount || 0
      }
    });
  } catch (error: any) {
    console.error('Exam session error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch session.' }, { status: 500 });
  }
}
