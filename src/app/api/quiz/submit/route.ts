import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  calculateScoreAndResults,
  calculateIntegrityRating,
  logWeeklyQuizSecurityEvent
} from '@/lib/weeklyQuiz';
import { WeeklyQuiz, WeeklyQuizAttempt } from '@/types/weeklyQuiz';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { attemptId, token, answers, reason } = body;

    if (!attemptId || !token) {
      return NextResponse.json(
        { error: 'Attempt ID and session token are required.' },
        { status: 400, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const attempt: WeeklyQuizAttempt | null = await db.weeklyQuizAttempts.getById(attemptId);
    if (!attempt || attempt.sessionToken !== token) {
      return NextResponse.json(
        { error: 'Invalid assessment session.' },
        { status: 401, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    if (attempt.status === 'SUBMITTED' || attempt.status === 'REVIEW_REQUIRED') {
      return NextResponse.json(
        {
          success: true,
          message: 'Quiz already submitted.',
          submittedAt: attempt.submittedAt,
          referenceId: `WQ-SUB-${attempt.id.slice(-8).toUpperCase()}`
        },
        { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const quiz: WeeklyQuiz = await db.weeklyQuizzes.getById(attempt.quizId);
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found.' },
        { status: 404, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const finalAnswers = {
      ...(attempt.answers || {}),
      ...(answers || {})
    };

    const tempAttempt: WeeklyQuizAttempt = {
      ...attempt,
      answers: finalAnswers
    };

    const results = calculateScoreAndResults(tempAttempt, quiz);
    const events = await db.weeklyQuizSecurityEvents.getByAttemptId(attempt.id);
    const integritySummary = calculateIntegrityRating(events, tempAttempt);

    const submissionReason = reason || 'MANUAL';
    const submittedAt = new Date().toISOString();

    const updated = await db.weeklyQuizAttempts.updateOne(attempt.id, {
      status: 'SUBMITTED',
      answers: finalAnswers,
      score: results.score,
      totalMarks: results.totalMarks,
      percentage: results.percentage,
      passed: results.passed,
      submittedAt,
      submissionReason,
      integritySummary,
      updatedAt: submittedAt
    });

    await logWeeklyQuizSecurityEvent({
      attemptId: attempt.id,
      quizId: quiz.id,
      candidateId: attempt.candidateId,
      studentName: attempt.studentName,
      email: attempt.email,
      eventType: 'QUIZ_SUBMITTED',
      severity: 'INFO',
      metadata: { submissionReason }
    });

    return NextResponse.json(
      {
        success: true,
        referenceId: `WQ-SUB-${attempt.id.slice(-8).toUpperCase()}`,
        submittedAt,
        message: 'Quiz submitted successfully. Your response has been recorded.'
      },
      { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error: any) {
    console.error('Quiz submit error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit quiz.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}
