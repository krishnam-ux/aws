import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logAdminAudit } from '@/lib/exam';
import { Exam } from '@/types/exam';

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

    const exams = await db.exams.getAll();
    const attempts = await db.examAttempts.getAll();

    const examsWithStats = exams.map((exam: Exam) => {
      const examAttempts = attempts.filter((a: any) => a.examId === exam.id);
      return {
        ...exam,
        stats: {
          totalCandidates: examAttempts.length,
          waiting: examAttempts.filter((a: any) => a.status === 'LOCKED').length,
          verified: examAttempts.filter((a: any) => a.status === 'VERIFIED').length,
          unlocked: examAttempts.filter((a: any) => a.status === 'UNLOCKED').length,
          inExam: examAttempts.filter((a: any) => a.status === 'IN_EXAM').length,
          submitted: examAttempts.filter((a: any) => a.status === 'SUBMITTED' || a.status === 'REVIEW_REQUIRED').length,
          passed: examAttempts.filter((a: any) => a.passed).length,
          failed: examAttempts.filter((a: any) => (a.status === 'SUBMITTED' || a.status === 'REVIEW_REQUIRED') && !a.passed).length,
          violations: examAttempts.filter((a: any) => (a.securityViolationsCount || 0) > 0).length
        }
      };
    });

    return NextResponse.json({ exams: examsWithStats });
  } catch (error: any) {
    console.error('Admin exams fetch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch exams.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized administrative access.' }, { status: 401 });
    }

    const body = await request.json();
    const { action, exam, examId } = body;

    if (action === 'create' || action === 'update') {
      if (!exam || !exam.title?.trim() || !exam.examCode?.trim()) {
        return NextResponse.json({ error: 'Exam title and code are required.' }, { status: 400 });
      }

      const id = exam.id?.trim() || `exam-${Date.now()}`;
      const cleanExam: Exam = {
        id,
        examCode: String(exam.examCode).trim().toUpperCase(),
        password: String(exam.password || '').trim(),
        title: String(exam.title).trim(),
        description: String(exam.description || '').trim(),
        category: String(exam.category || 'Cloud Foundations').trim(),
        durationMinutes: Number(exam.durationMinutes) || 30,
        passingPercentage: Number(exam.passingPercentage) || 70,
        maxAttempts: Number(exam.maxAttempts) || 1,
        status: ['Draft', 'Published', 'Live', 'Archived'].includes(exam.status) ? exam.status : 'Live',
        requireSecureBrowser: Boolean(exam.requireSecureBrowser),
        maxSecurityViolations: Number(exam.maxSecurityViolations) || 3,
        questions: Array.isArray(exam.questions)
          ? exam.questions.map((q: any, idx: number) => ({
              id: q.id || `q-${idx + 1}`,
              question: String(q.question || '').trim(),
              options: Array.isArray(q.options) ? q.options.map((o: any) => String(o).trim()) : [],
              correctOptionIndex: Number(q.correctOptionIndex) || 0,
              marks: Number(q.marks) || 10,
              explanation: String(q.explanation || '').trim()
            }))
          : [],
        createdAt: exam.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.exams.insertOne(cleanExam);
      await logAdminAudit(cleanExam.id, 'admin', action === 'create' ? 'CREATE_EXAM' : 'UPDATE_EXAM', {
        title: cleanExam.title,
        questionsCount: cleanExam.questions.length
      });

      return NextResponse.json({ success: true, exam: cleanExam });
    }

    if (action === 'delete') {
      if (!examId) {
        return NextResponse.json({ error: 'Exam ID is required.' }, { status: 400 });
      }
      await db.exams.deleteOne(examId);
      await logAdminAudit(examId, 'admin', 'DELETE_EXAM', { examId });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin exams error:', error);
    return NextResponse.json({ error: error.message || 'Operation failed.' }, { status: 500 });
  }
}
