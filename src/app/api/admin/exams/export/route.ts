import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ExamAttempt, Exam } from '@/types/exam';

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
    const examId = searchParams.get('examId');

    const allExams = await db.exams.getAll();
    const exam = examId ? allExams.find((e: Exam) => e.id === examId) : allExams[0];

    const allAttempts: ExamAttempt[] = await db.examAttempts.getAll();
    const attempts = exam ? allAttempts.filter((a: ExamAttempt) => a.examId === exam.id) : allAttempts;

    const headers = [
      'Candidate Name',
      'Roll Number / Student ID',
      'Email',
      'Exam Title',
      'Exam Code',
      'Status',
      'Score',
      'Total Marks',
      'Percentage',
      'Result',
      'Submission Reason',
      'Security Violations',
      'Selection Status / Notes',
      'Started At',
      'Submitted At'
    ];

    const rows = attempts.map((a: ExamAttempt) => {
      const parentExam = allExams.find((e: Exam) => e.id === a.examId) || exam;
      return [
        `"${(a.studentName || '').replace(/"/g, '""')}"`,
        `"${(a.rollNumber || '').replace(/"/g, '""')}"`,
        `"${(a.email || '').replace(/"/g, '""')}"`,
        `"${(parentExam?.title || '').replace(/"/g, '""')}"`,
        `"${(parentExam?.examCode || '').replace(/"/g, '""')}"`,
        `"${a.status}"`,
        a.score ?? 0,
        a.totalMarks ?? 0,
        `${a.percentage ?? 0}%`,
        a.passed ? 'PASSED' : a.status === 'SUBMITTED' || a.status === 'REVIEW_REQUIRED' ? 'FAILED' : 'IN_PROGRESS',
        `"${a.submissionReason || 'N/A'}"`,
        a.securityViolationsCount || 0,
        `"${(a.adminNotes || '').replace(/"/g, '""')}"`,
        `"${a.startedAt || ''}"`,
        `"${a.submittedAt || ''}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const fileName = `Exam_Results_${(exam?.examCode || 'All').replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (error: any) {
    console.error('Admin export error:', error);
    return NextResponse.json({ error: error.message || 'Failed to export results.' }, { status: 500 });
  }
}

