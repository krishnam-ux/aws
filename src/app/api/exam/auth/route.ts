import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSessionToken, generateAttemptId } from '@/lib/exam';
import { ExamAttempt } from '@/types/exam';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { examId, password, studentName, rollNumber, email } = body;

    if (!examId || !password) {
      return NextResponse.json({ error: 'Exam ID and Exam Password are required.' }, { status: 400 });
    }

    if (!studentName?.trim() || !rollNumber?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Full Name, Roll Number/Student ID, and Email are required.' }, { status: 400 });
    }

    const exam = await db.exams.getById(examId.trim());
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found. Please check the Exam ID.' }, { status: 404 });
    }

    if (exam.status === 'Draft' || exam.status === 'Archived') {
      return NextResponse.json({ error: 'This exam is currently not accepting candidates.' }, { status: 403 });
    }

    if (exam.password && exam.password.trim() !== password.trim()) {
      return NextResponse.json({ error: 'Incorrect Exam Password. Please check with your exam proctor.' }, { status: 401 });
    }

    // Check for existing attempt with same roll number and exam
    const cleanRoll = rollNumber.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = studentName.trim();

    const existingAttempts = (await db.examAttempts.getByExamId(exam.id)).filter(
      (a: ExamAttempt) => a.rollNumber.toUpperCase() === cleanRoll
    );

    // If there is an in-progress or locked/unlocked attempt, resume it
    const activeAttempt = existingAttempts.find(
      (a: ExamAttempt) => a.status !== 'SUBMITTED' && a.status !== 'REVIEW_REQUIRED'
    );

    if (activeAttempt) {
      return NextResponse.json({
        success: true,
        token: activeAttempt.sessionToken,
        attemptId: activeAttempt.id,
        status: activeAttempt.status,
        studentName: activeAttempt.studentName,
        rollNumber: activeAttempt.rollNumber,
        examTitle: exam.title,
        examCode: exam.examCode,
        durationMinutes: exam.durationMinutes
      });
    }

    // Check max attempts limit if completed
    const completedAttempts = existingAttempts.filter(
      (a: ExamAttempt) => a.status === 'SUBMITTED' || a.status === 'REVIEW_REQUIRED'
    );

    if (completedAttempts.length >= (exam.maxAttempts || 1)) {
      return NextResponse.json(
        { error: `You have reached the maximum number of attempts (${exam.maxAttempts || 1}) for this examination.` },
        { status: 403 }
      );
    }

    // Create new attempt initialized to LOCKED (in lobby)
    const token = generateSessionToken();
    const attemptId = generateAttemptId();

    const newAttempt: ExamAttempt = {
      id: attemptId,
      examId: exam.id,
      studentName: cleanName,
      rollNumber: cleanRoll,
      email: cleanEmail,
      sessionToken: token,
      status: 'LOCKED',
      extendedMinutes: 0,
      answers: {},
      markedForReview: [],
      score: 0,
      totalMarks: 0,
      percentage: 0,
      passed: false,
      securityViolationsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.examAttempts.insertOne(newAttempt);

    return NextResponse.json({
      success: true,
      token,
      attemptId,
      status: 'LOCKED',
      studentName: cleanName,
      rollNumber: cleanRoll,
      examTitle: exam.title,
      examCode: exam.examCode,
      durationMinutes: exam.durationMinutes
    });
  } catch (error: any) {
    console.error('Exam auth error:', error);
    return NextResponse.json({ error: error.message || 'Authentication failed.' }, { status: 500 });
  }
}
