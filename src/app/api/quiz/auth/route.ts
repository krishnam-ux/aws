import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { WeeklyQuiz, WeeklyQuizAttempt } from '@/types/weeklyQuiz';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, studentName, rollNumber, quizId } = body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Registered University Email is required.' },
        { status: 400, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = typeof password === 'string' ? password.trim() : '';

    // 1. Look up candidate by email in existing candidate database (reuse existing identity)
    const existingCandidates = await db.examCandidates.getByEmail(cleanEmail);
    let candidateName = studentName?.trim() || '';
    let candidateRoll = rollNumber?.trim()?.toUpperCase() || '';
    let candidateId = `cand_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

    if (existingCandidates && existingCandidates.length > 0) {
      const primary = existingCandidates[0];
      candidateId = primary.id;
      if (!candidateName) candidateName = primary.studentName;
      if (!candidateRoll) candidateRoll = primary.rollNumber;
    }

    if (!candidateName) {
      // Fallback to name extracted from email username
      const localPart = cleanEmail.split('@')[0];
      candidateName = localPart
        .split('.')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    }

    if (!candidateRoll) {
      candidateRoll = `CU-${cleanEmail.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    }

    // 2. Fetch available weekly quizzes
    const allQuizzes: WeeklyQuiz[] = await db.weeklyQuizzes.getAll();
    const liveQuizzes = allQuizzes.filter(q => q.status === 'Live' || q.status === 'Published');

    let targetQuiz: WeeklyQuiz | null = null;
    if (quizId && typeof quizId === 'string' && quizId.trim()) {
      targetQuiz = (await db.weeklyQuizzes.getById(quizId.trim())) || null;
    } else if (liveQuizzes.length > 0) {
      targetQuiz = liveQuizzes[0];
    }

    // 3. Check for existing attempts by this candidate for the target quiz
    let existingAttempt: WeeklyQuizAttempt | null = null;
    if (targetQuiz) {
      existingAttempt = await db.weeklyQuizAttempts.getByEmailAndQuiz(cleanEmail, targetQuiz.id);
    }

    return NextResponse.json(
      {
        success: true,
        candidate: {
          id: candidateId,
          studentName: candidateName,
          rollNumber: candidateRoll,
          email: cleanEmail
        },
        quiz: targetQuiz
          ? {
              id: targetQuiz.id,
              quizCode: targetQuiz.quizCode,
              title: targetQuiz.title,
              topic: targetQuiz.topic,
              description: targetQuiz.description,
              durationMinutes: targetQuiz.durationMinutes,
              totalQuestionsToSelect: targetQuiz.totalQuestionsToSelect,
              passingPercentage: targetQuiz.passingPercentage,
              maxAttempts: targetQuiz.maxAttempts || 1,
              status: targetQuiz.status,
              settings: targetQuiz.settings
            }
          : null,
        availableQuizzes: liveQuizzes.map(q => ({
          id: q.id,
          quizCode: q.quizCode,
          title: q.title,
          topic: q.topic,
          durationMinutes: q.durationMinutes,
          totalQuestionsToSelect: q.totalQuestionsToSelect,
          status: q.status
        })),
        existingAttempt: existingAttempt
          ? {
              id: existingAttempt.id,
              status: existingAttempt.status,
              sessionToken: existingAttempt.sessionToken,
              score: existingAttempt.score,
              totalMarks: existingAttempt.totalMarks,
              percentage: existingAttempt.percentage,
              passed: existingAttempt.passed,
              submittedAt: existingAttempt.submittedAt
            }
          : null
      },
      { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error: any) {
    console.error('Weekly quiz auth error:', error);
    return NextResponse.json(
      { error: error.message || 'Authentication failed.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}
