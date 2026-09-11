import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateRemainingSeconds } from '@/lib/exam';
import { ExamAttempt, Exam } from '@/types/exam';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  return authHeader.substring(7) === SECURE_TOKEN;
}

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized administrative access.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');

    const allExams = await db.exams.getAll();
    const targetExam = examId ? allExams.find((e: Exam) => e.id === examId || e.examCode?.toLowerCase() === examId.toLowerCase()) : allExams[0];

    const allAttempts: ExamAttempt[] = await db.examAttempts.getAll();
    const attempts = targetExam ? allAttempts.filter((a: ExamAttempt) => a.examId === targetExam.id) : allAttempts;

    // Enhance attempts with real-time remaining time
    const enrichedAttempts = attempts.map((attempt: ExamAttempt) => {
      const exam = allExams.find((e: Exam) => e.id === attempt.examId) || targetExam;
      const remainingSeconds = exam ? calculateRemainingSeconds(attempt, exam) : 0;
      return {
        ...attempt,
        remainingSeconds,
        answeredCount: Object.keys(attempt.answers || {}).length,
        totalQuestions: exam?.questions?.length || 0
      };
    });

    const stats = {
      totalCandidates: attempts.length,
      waiting: attempts.filter((a: ExamAttempt) => a.status === 'LOCKED').length,
      verified: attempts.filter((a: ExamAttempt) => a.status === 'VERIFIED').length,
      unlocked: attempts.filter((a: ExamAttempt) => a.status === 'UNLOCKED').length,
      inExam: attempts.filter((a: ExamAttempt) => a.status === 'IN_EXAM').length,
      examLocked: attempts.filter((a: ExamAttempt) => a.status === 'EXAM_LOCKED').length,
      paused: attempts.filter((a: ExamAttempt) => a.status === 'PAUSED').length,
      submitted: attempts.filter((a: ExamAttempt) => a.status === 'SUBMITTED' || a.status === 'REVIEW_REQUIRED').length,
      passed: attempts.filter((a: ExamAttempt) => a.passed).length,
      failed: attempts.filter((a: ExamAttempt) => (a.status === 'SUBMITTED' || a.status === 'REVIEW_REQUIRED') && !a.passed).length,
      securityViolations: attempts.filter((a: ExamAttempt) => (a.securityViolationsCount || 0) > 0).length,
      reviewRequired: attempts.filter((a: ExamAttempt) => a.status === 'REVIEW_REQUIRED').length
    };

    if (targetExam && !targetExam.examUnlockPassword) {
      targetExam.examUnlockPassword = 'UNLOCK-' + (targetExam.examCode || 'AWS').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4) + '-2026';
    }

    return NextResponse.json(
      {
        exam: targetExam || null,
        examUnlockPassword: targetExam?.examUnlockPassword,
        stats,
        candidates: enrichedAttempts
      },
      { headers: noStoreHeaders }
    );

  } catch (error: any) {
    console.error('Admin live exam error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch live exam data.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
