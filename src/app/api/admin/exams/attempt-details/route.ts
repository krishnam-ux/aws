import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateRemainingSeconds } from '@/lib/exam';
import { ExamAttempt, Exam, Question } from '@/types/exam';

export const dynamic = 'force-dynamic';

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  return authHeader.substring(7) === SECURE_TOKEN;
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized administrative access.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get('attemptId');

    if (!attemptId) {
      return NextResponse.json({ error: 'Attempt ID is required.' }, { status: 400 });
    }

    const attempt: ExamAttempt | null = await db.examAttempts.getById(attemptId);
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found.' }, { status: 404 });
    }

    const exam: Exam | null = await db.exams.getById(attempt.examId);
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });
    }

    const securityEvents = await db.examSecurityLogs.getByAttemptId(attemptId);
    const auditLogs = (await db.examAuditLogs.getByExamId(attempt.examId)).filter(
      (l: any) => l.attemptId === attemptId
    );

    const remainingSeconds = calculateRemainingSeconds(attempt, exam);

    // Detail breakdown of questions
    const questionsBreakdown = (exam.questions || []).map((q: Question, idx: number) => {
      const studentAnswer = attempt.answers?.[q.id];
      const isAnswered = studentAnswer !== undefined;
      const isCorrect = isAnswered && studentAnswer === q.correctOptionIndex;
      return {
        number: idx + 1,
        id: q.id,
        question: q.question,
        options: q.options,
        marks: q.marks,
        correctOptionIndex: q.correctOptionIndex,
        studentSelectedOptionIndex: isAnswered ? studentAnswer : null,
        isAnswered,
        isCorrect,
        explanation: q.explanation || ''
      };
    });

    return NextResponse.json({
      attempt: {
        ...attempt,
        remainingSeconds
      },
      exam: {
        id: exam.id,
        title: exam.title,
        examCode: exam.examCode,
        durationMinutes: exam.durationMinutes,
        passingPercentage: exam.passingPercentage
      },
      questionsBreakdown,
      securityEvents,
      auditLogs
    });
  } catch (error: any) {
    console.error('Attempt details error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch details.' }, { status: 500 });
  }
}
