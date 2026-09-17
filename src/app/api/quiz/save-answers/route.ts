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

    if (attempt.status === 'SUBMITTED' || attempt.status === 'REVIEW_REQUIRED') {
      return NextResponse.json(
        { error: 'Cannot save answers on a submitted assessment.' },
        { status: 400, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
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
