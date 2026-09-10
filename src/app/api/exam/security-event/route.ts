import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logSecurityEvent, evaluateExamSubmission } from '@/lib/exam';
import { SecurityEventType, SecuritySeverity } from '@/types/exam';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { attemptId, token, eventType, severity = 'WARNING', metadata = {} } = body;

    if (!attemptId || !token || !eventType) {
      return NextResponse.json({ error: 'Attempt ID, session token, and event type are required.' }, { status: 400 });
    }

    const attempt = await db.examAttempts.getById(attemptId);
    if (!attempt || attempt.sessionToken !== token) {
      return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
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
        passed: result.passed,
        certificateId: result.certificateId
      });

      return NextResponse.json({
        success: true,
        autoSubmitted: true,
        violationCount,
        warningsRemaining: 0,
        status: 'REVIEW_REQUIRED',
        message: 'Submitted — Review Required due to security event thresholds.'
      });
    }

    return NextResponse.json({
      success: true,
      autoSubmitted: false,
      violationCount,
      warningsRemaining
    });
  } catch (error: any) {
    console.error('Security event error:', error);
    return NextResponse.json({ error: error.message || 'Failed to record security event.' }, { status: 500 });
  }
}
