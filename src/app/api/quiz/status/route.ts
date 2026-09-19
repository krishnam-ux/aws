import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  calculateRemainingSeconds,
  calculateScoreAndResults,
  calculateIntegrityRating,
  logWeeklyQuizSecurityEvent
} from '@/lib/weeklyQuiz';
import { WeeklyQuiz, WeeklyQuizAttempt } from '@/types/weeklyQuiz';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get('attemptId');
    const token = searchParams.get('token');

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

    const quiz: WeeklyQuiz = await db.weeklyQuizzes.getById(attempt.quizId);
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found.' },
        { status: 404, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const remainingSeconds = calculateRemainingSeconds(attempt, quiz.durationMinutes, quiz);

    // Auto-submit if time expired and still IN_PROGRESS
    if (remainingSeconds <= 0 && attempt.status === 'IN_PROGRESS') {
      const results = calculateScoreAndResults(attempt, quiz);
      const events = await db.weeklyQuizSecurityEvents.getByAttemptId(attempt.id);
      const integritySummary = calculateIntegrityRating(events, attempt);

      const submittedAttempt = await db.weeklyQuizAttempts.updateOne(attempt.id, {
        status: 'SUBMITTED',
        score: results.score,
        totalMarks: results.totalMarks,
        percentage: results.percentage,
        passed: results.passed,
        submittedAt: new Date().toISOString(),
        submissionReason: 'TIME_EXPIRED',
        integritySummary,
        updatedAt: new Date().toISOString()
      });

      await logWeeklyQuizSecurityEvent({
        attemptId: attempt.id,
        quizId: quiz.id,
        candidateId: attempt.candidateId,
        studentName: attempt.studentName,
        email: attempt.email,
        eventType: 'QUIZ_SUBMITTED',
        severity: 'INFO',
        metadata: { reason: 'TIME_EXPIRED' }
      });

      return NextResponse.json(
        {
          success: true,
          status: 'SUBMITTED',
          remainingSeconds: 0,
          submissionReason: 'TIME_EXPIRED',
          submittedAt: submittedAttempt?.submittedAt || new Date().toISOString()
        },
        { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    return NextResponse.json(
      {
        success: true,
        status: attempt.status,
        remainingSeconds,
        extendedMinutes: attempt.extendedMinutes || 0,
        cameraStatus: attempt.cameraStatus,
        screenStatus: attempt.screenStatus || 'ACTIVE',
        faceStatus: attempt.faceStatus,
        focusStatus: attempt.focusStatus,
        fullscreenStatus: attempt.fullscreenStatus,
        connectionStatus: attempt.connectionStatus || 'CONNECTED',
        violationCount: attempt.violationCount || 0,
        violationHistory: attempt.violationHistory || [],
        submissionReason: attempt.submissionReason,
        adminNotes: attempt.adminNotes,
        submittedAt: attempt.submittedAt
      },
      { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error: any) {
    console.error('Weekly quiz status check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check status.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}
