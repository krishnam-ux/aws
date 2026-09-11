import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logSecurityEvent, evaluateExamSubmission, lockExamAttempt } from '@/lib/exam';
import { SecurityEventType, SecuritySeverity } from '@/types/exam';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { attemptId, token, eventType, severity = 'WARNING', metadata = {} } = body;

    if (!attemptId || !token || !eventType) {
      return NextResponse.json(
        { error: 'Attempt ID, session token, and event type are required.' },
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

    const { violationCount, shouldAutoSubmit } = await logSecurityEvent(
      attemptId,
      eventType as SecurityEventType,
      severity as SecuritySeverity,
      metadata
    );

    const exam = await db.exams.getById(attempt.examId);
    const maxViolations = exam?.maxSecurityViolations || 3;
    const warningsRemaining = Math.max(0, maxViolations - violationCount);

    const isLockdownInterruption =
      eventType === 'FULLSCREEN_EXIT' ||
      eventType === 'ESC_FULLSCREEN_EXIT' ||
      eventType === 'SEB_LOCKDOWN_VIOLATION' ||
      eventType === 'LOCKDOWN_VIOLATION';

    if (attempt.status === 'IN_EXAM' && isLockdownInterruption) {
      const lockedAttempt = await lockExamAttempt(attemptId, eventType, 'SYSTEM');
      return NextResponse.json(
        {
          success: true,
          locked: true,
          status: 'EXAM_LOCKED',
          lockCount: lockedAttempt?.lockCount || 1,
          lockReason: eventType,
          violationCount,
          autoSubmitted: false,
          message: 'Exam session locked due to secure environment interruption.'
        },
        { headers: noStoreHeaders }
      );
    }

    if (shouldAutoSubmit && (attempt.status === 'IN_EXAM' || attempt.status === 'UNLOCKED')) {
      // Evaluate and lock attempt as REVIEW_REQUIRED
      const result = await evaluateExamSubmission(exam, attempt, 'SECURITY_VIOLATION');
      await db.examAttempts.updateOne(attemptId, {
        status: 'REVIEW_REQUIRED',
        submittedAt: new Date().toISOString(),
        submissionReason: 'SECURITY_VIOLATION',
        score: result.score,
        totalMarks: result.totalMarks,
        percentage: result.percentage,
        passed: result.passed
      });

      return NextResponse.json(
        {
          success: true,
          autoSubmitted: true,
          violationCount,
          warningsRemaining: 0,
          status: 'REVIEW_REQUIRED',
          message: 'Submitted — Review Required due to security event thresholds.'
        },
        { headers: noStoreHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        autoSubmitted: false,
        violationCount,
        warningsRemaining
      },
      { headers: noStoreHeaders }
    );

  } catch (error: any) {
    console.error('Security event error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record security event.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
