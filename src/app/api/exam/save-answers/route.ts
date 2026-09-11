import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateRemainingSeconds } from '@/lib/exam';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { attemptId, token, answers, markedForReview } = body;

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

    if (attempt.status !== 'IN_EXAM') {
      return NextResponse.json(
        { error: `Cannot save answers. Current attempt status is ${attempt.status}.` },
        { status: 403, headers: noStoreHeaders }
      );
    }

    const exam = await db.exams.getById(attempt.examId);
    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found.' },
        { status: 404, headers: noStoreHeaders }
      );
    }

    const remaining = calculateRemainingSeconds(attempt, exam);
    if (remaining <= 0) {
      return NextResponse.json(
        { error: 'Exam time has expired.' },
        { status: 403, headers: noStoreHeaders }
      );
    }

    // Merge or overwrite sanitized answers
    const safeAnswers: Record<string, number> = { ...(attempt.answers || {}) };
    if (answers && typeof answers === 'object') {
      for (const [qId, val] of Object.entries(answers)) {
        if (typeof val === 'number') {
          safeAnswers[qId] = val;
        }
      }
    }

    const safeMarked: string[] = Array.isArray(markedForReview)
      ? markedForReview.filter((item): item is string => typeof item === 'string')
      : attempt.markedForReview || [];

    await db.examAttempts.updateOne(attemptId, {
      answers: safeAnswers,
      markedForReview: safeMarked
    });

    return NextResponse.json(
      {
        success: true,
        savedAt: new Date().toISOString(),
        remainingSeconds: remaining
      },
      { headers: noStoreHeaders }
    );
  } catch (error: any) {
    console.error('Save answers error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save answers.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
