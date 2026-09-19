import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logWeeklyQuizSecurityEvent } from '@/lib/weeklyQuiz';
import { WeeklyQuizAttempt, WeeklyQuizEventType, WeeklyQuizEventSeverity } from '@/types/weeklyQuiz';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { attemptId, token, eventType, severity, durationSeconds, metadata } = body;

    if (!attemptId || !token || !eventType) {
      return NextResponse.json(
        { error: 'Attempt ID, session token, and eventType are required.' },
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

    const result = await logWeeklyQuizSecurityEvent({
      attemptId: attempt.id,
      quizId: attempt.quizId,
      candidateId: attempt.candidateId,
      studentName: attempt.studentName,
      email: attempt.email,
      eventType: eventType as WeeklyQuizEventType,
      severity: severity as WeeklyQuizEventSeverity,
      durationSeconds: typeof durationSeconds === 'number' ? durationSeconds : undefined,
      metadata: metadata || {}
    });

    return NextResponse.json(
      {
        success: true,
        eventId: result.event.id,
        timestamp: result.event.timestamp,
        isWarning: result.isWarning,
        isAutoSubmitted: result.isAutoSubmitted,
        violationCount: result.violationCount,
        message: result.message
      },
      { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error: any) {
    console.error('Log security event error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to log event.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}
