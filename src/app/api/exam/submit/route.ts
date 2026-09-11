import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { evaluateExamSubmission } from '@/lib/exam';
import { SubmissionReason } from '@/types/exam';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { attemptId, token, answers, reason = 'MANUAL' } = body;

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

    if (attempt.status === 'SUBMITTED' || attempt.status === 'REVIEW_REQUIRED') {
      // Replay / duplicate submission response: strictly no score or pass/fail
      return NextResponse.json(
        {
          success: true,
          alreadySubmitted: true,
          status: 'SUBMITTED',
          message: 'Exam Submitted Successfully. Your response has been recorded. Your result will be communicated by email.'
        },
        { headers: noStoreHeaders }
      );
    }

    const exam = await db.exams.getById(attempt.examId);
    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found.' },
        { status: 404, headers: noStoreHeaders }
      );
    }

    // Save final answers if provided
    const finalAnswers: Record<string, number> = { ...(attempt.answers || {}) };
    if (answers && typeof answers === 'object') {
      for (const [qId, val] of Object.entries(answers)) {
        if (typeof val === 'number') {
          finalAnswers[qId] = val;
        }
      }
    }

    const attemptWithFinalAnswers = {
      ...attempt,
      answers: finalAnswers
    };

    const validReason: SubmissionReason = [
      'MANUAL',
      'TIME_EXPIRED',
      'SECURITY_VIOLATION',
      'LOCKDOWN_VIOLATION',
      'ADMIN_FORCE_SUBMIT'
    ].includes(reason)
      ? reason
      : 'MANUAL';

    // Server-side scoring for Admin & result email dispatch
    const result = await evaluateExamSubmission(exam, attemptWithFinalAnswers, validReason);

    const submissionStatus = validReason === 'SECURITY_VIOLATION' || validReason === 'LOCKDOWN_VIOLATION'
      ? 'REVIEW_REQUIRED'
      : 'SUBMITTED';

    await db.examAttempts.updateOne(attemptId, {
      status: submissionStatus,
      answers: finalAnswers,
      submittedAt: new Date().toISOString(),
      submissionReason: validReason,
      score: result.score,
      totalMarks: result.totalMarks,
      percentage: result.percentage,
      passed: result.passed
    });

    // Student response MUST NOT expose score, percentage, or pass/fail verdict
    return NextResponse.json(
      {
        success: true,
        status: 'SUBMITTED',
        message: 'Exam Submitted Successfully. Your response has been recorded. Your result will be communicated by email.'
      },
      { headers: noStoreHeaders }
    );
  } catch (error: any) {
    console.error('Exam submit error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit exam.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
