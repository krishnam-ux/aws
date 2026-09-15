import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSessionToken, generateAttemptId, provisionExamCandidate } from '@/lib/exam';
import { ExamAttempt, ExamCandidate } from '@/types/exam';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { examId, password, studentName, rollNumber, email } = body;

    const isPortalPublished = await db.settings.getExamPortalPublished();
    if (!isPortalPublished) {
      return NextResponse.json(
        { error: 'The examination portal is currently unpublished by administrators.' },
        { status: 403, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Registered University Email is required.' },
        { status: 400, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = (typeof password === 'string' ? password.trim() : '');

    // 1. PRIMARY FLOW: Look up Candidate Credentials by Registered Email (User ID)
    const candidateCredentials = await db.examCandidates.getByEmail(cleanEmail);
    let matchedCandidate: ExamCandidate | null = null;
    let matchedExam: any = null;

    if (candidateCredentials && candidateCredentials.length > 0) {
      // Find active candidate matching password and optional examId
      for (const cand of candidateCredentials) {
        if (cand.status === 'Active' && cleanPassword && cand.password === cleanPassword) {
          if (!examId || cand.examId === examId.trim()) {
            matchedCandidate = cand;
            matchedExam = await db.exams.getById(cand.examId);
            if (matchedExam) break;
          }
        }
      }
    }

    // 2. FALLBACK / LEGACY FLOW: Direct exam ID + exam password (backward compatibility for open exams and automated test fixtures)
    if (!matchedCandidate && examId && typeof examId === 'string' && examId.trim()) {
      const cleanExamId = examId.trim();
      const exam = await db.exams.getById(cleanExamId);

      if (exam) {
        const examHasPassword = !!(exam.password && exam.password.trim());
        const passwordMatches = !examHasPassword || (cleanPassword && exam.password.trim() === cleanPassword);

        if (passwordMatches) {
          matchedExam = exam;
          const cleanName = studentName?.trim() || cleanEmail.split('@')[0];
          const cleanRoll = rollNumber?.trim()?.toUpperCase() || `CAND-${Date.now().toString().slice(-6)}`;

          // Auto-provision or update candidate credentials
          matchedCandidate = await provisionExamCandidate({
            examId: exam.id,
            studentName: cleanName,
            rollNumber: cleanRoll,
            email: cleanEmail,
            customPassword: cleanPassword || exam.password || undefined
          });
        }
      }
    }

    if (!cleanPassword && (!matchedExam || (matchedExam.password && matchedExam.password.trim()))) {
      return NextResponse.json(
        { error: 'Exam Password is required.' },
        { status: 400, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    // If neither primary credentials nor fallback matched:
    if (!matchedCandidate || !matchedExam) {
      // Check if candidate exists with revoked status or wrong password for clearer error
      const anyCandidate = candidateCredentials?.find((c: ExamCandidate) => c.status === 'Revoked');
      if (anyCandidate) {
        return NextResponse.json(
          { error: 'Your examination access has been revoked by the administrator. Please contact your proctor.' },
          { status: 403, headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
      }

      return NextResponse.json(
        { error: 'Invalid University Email or Exam Password. Please verify your credentials or contact the examination administrator.' },
        { status: 401, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const exam = matchedExam;
    const candidate = matchedCandidate;

    if (exam.status === 'Archived' || exam.status === 'Draft') {
      return NextResponse.json(
        { error: 'This examination is currently not accepting candidates.' },
        { status: 403, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const cleanRoll = candidate.rollNumber.trim().toUpperCase();
    const cleanName = candidate.studentName.trim();

    // Check for existing attempts with same roll number / email and exam
    const allAttempts = await db.examAttempts.getByExamId(exam.id);
    const existingAttempts = allAttempts.filter(
      (a: ExamAttempt) =>
        a.rollNumber.toUpperCase() === cleanRoll ||
        a.email?.toLowerCase() === cleanEmail
    );

    // If there is an in-progress or locked/unlocked attempt, resume it
    const activeAttempt = existingAttempts.find(
      (a: ExamAttempt) => a.status !== 'SUBMITTED' && a.status !== 'REVIEW_REQUIRED'
    );

    if (activeAttempt) {
      return NextResponse.json(
        {
          success: true,
          token: activeAttempt.sessionToken,
          attemptId: activeAttempt.id,
          status: activeAttempt.status,
          studentName: activeAttempt.studentName,
          rollNumber: activeAttempt.rollNumber,
          email: activeAttempt.email || cleanEmail,
          examId: exam.id,
          examTitle: exam.title,
          examCode: exam.examCode,
          durationMinutes: exam.durationMinutes,
          category: exam.category,
          passingPercentage: exam.passingPercentage,
          requireSecureBrowser: exam.requireSecureBrowser,
          maxSecurityViolations: exam.maxSecurityViolations || 3,
          questionsCount: (exam.questions || []).length,
          candidate: {
            id: candidate.id,
            studentName: cleanName,
            email: cleanEmail,
            rollNumber: cleanRoll,
            examId: exam.id
          }
        },
        { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    // Check max attempts limit if completed
    const completedAttempts = existingAttempts.filter(
      (a: ExamAttempt) => a.status === 'SUBMITTED' || a.status === 'REVIEW_REQUIRED'
    );

    if (completedAttempts.length >= (exam.maxAttempts || 1)) {
      return NextResponse.json(
        { error: `You have reached the maximum number of attempts (${exam.maxAttempts || 1}) for this examination.` },
        { status: 403, headers: { 'Cache-Control': 'no-store, max-age=0' } }
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

    return NextResponse.json(
      {
        success: true,
        token,
        attemptId,
        status: 'LOCKED',
        studentName: cleanName,
        rollNumber: cleanRoll,
        email: cleanEmail,
        examId: exam.id,
        examTitle: exam.title,
        examCode: exam.examCode,
        durationMinutes: exam.durationMinutes,
        category: exam.category,
        passingPercentage: exam.passingPercentage,
        requireSecureBrowser: exam.requireSecureBrowser,
        maxSecurityViolations: exam.maxSecurityViolations || 3,
        questionsCount: (exam.questions || []).length,
        candidate: {
          id: candidate.id,
          studentName: cleanName,
          email: cleanEmail,
          rollNumber: cleanRoll,
          examId: exam.id
        }
      },
      { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error: any) {
    console.error('Exam auth error:', error);
    return NextResponse.json(
      { error: error.message || 'Authentication failed.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}
