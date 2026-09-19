import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { WeeklyQuizAttempt } from '@/types/weeklyQuiz';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { attemptId, token, answers, markedForReview } = body;

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

    if (attempt.status === 'SUBMITTED' || attempt.status === 'REVIEW_REQUIRED' || attempt.status === 'LOCKED') {
      return NextResponse.json(
        { error: 'Cannot save answers on a submitted assessment.' },
        { status: 400, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const quiz = await db.weeklyQuizzes.getById(attempt.quizId);
    if (quiz) {
      const nowMs = Date.now();
      const quizEndMs = quiz.scheduledEndAt
        ? new Date(quiz.scheduledEndAt).getTime()
        : quiz.availableUntil
        ? new Date(quiz.availableUntil).getTime()
        : Number.MAX_SAFE_INTEGER;
      const attemptExpiresMs = attempt.expiresAt ? new Date(attempt.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;

      if (nowMs >= quizEndMs || nowMs >= attemptExpiresMs) {
        // Auto-submit expired attempt
        const { autoSubmitExpiredAttemptsForQuiz } = await import('@/lib/weeklyQuiz');
        await autoSubmitExpiredAttemptsForQuiz(quiz.id);
        return NextResponse.json(
          { error: 'Assessment time has expired. Your answers have been automatically submitted.' },
          { status: 403, headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
      }
    }

    const updatedAnswers = {
      ...(attempt.answers || {}),
      ...(answers || {})
    };

    const updatedMarked = Array.isArray(markedForReview)
      ? markedForReview
      : attempt.markedForReview || [];

    await db.weeklyQuizAttempts.updateOne(attempt.id, {
      answers: updatedAnswers,
      markedForReview: updatedMarked,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json(
      {
        success: true,
        savedAt: new Date().toISOString()
      },
      { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error: any) {
    console.error('Save answers error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save answers.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}
