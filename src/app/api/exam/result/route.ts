import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get('attemptId');
    const token = searchParams.get('token');

    if (!attemptId || !token) {
      return NextResponse.json({ error: 'Attempt ID and session token are required.' }, { status: 400 });
    }

    const attempt = await db.examAttempts.getById(attemptId);
    if (!attempt || attempt.sessionToken !== token) {
      return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
    }

    const exam = await db.exams.getById(attempt.examId);
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });
    }

    return NextResponse.json({
      attemptId: attempt.id,
      studentName: attempt.studentName,
      rollNumber: attempt.rollNumber,
      email: attempt.email,
      examTitle: exam.title,
      examCode: exam.examCode,
      status: attempt.status,
      score: attempt.score,
      totalMarks: attempt.totalMarks,
      percentage: attempt.percentage,
      passed: attempt.passed,
      passingPercentage: exam.passingPercentage,
      certificateId: attempt.certificateId,
      submissionReason: attempt.submissionReason,
      submittedAt: attempt.submittedAt,
      securityViolationsCount: attempt.securityViolationsCount || 0
    });
  } catch (error: any) {
    console.error('Exam result error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch result.' }, { status: 500 });
  }
}
