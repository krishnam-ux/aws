import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyCandidateSessionEligibility } from '@/lib/weeklyQuiz';
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

    if (!targetQuiz) {
      return NextResponse.json(
        { error: 'No active Weekly Quiz found.' },
        { status: 404, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    // 3. Verify Candidate Session Eligibility & Schedule
    const eligibility = await verifyCandidateSessionEligibility({
      email: cleanEmail,
      quizId: targetQuiz.id
    });

    return NextResponse.json(
      {
        success: true,
        isEligible: eligibility.isEligible,
        eligibilityReason: eligibility.reason,
        eligibilityMessage: eligibility.message,
        candidate: {
          id: candidateId,
          studentName: candidateName,
          rollNumber: candidateRoll,
          email: cleanEmail
        },
        registration: eligibility.registration || null,
        quiz: eligibility.quiz || {
          id: targetQuiz.id,
          quizCode: targetQuiz.quizCode,
          title: targetQuiz.title,
          topic: targetQuiz.topic,
          description: targetQuiz.description,
          sessionId: targetQuiz.sessionId,
          sessionTitle: targetQuiz.sessionTitle,
          durationMinutes: targetQuiz.durationMinutes,
          totalQuestions: targetQuiz.totalQuestionsToSelect || 20,
          passingPercentage: targetQuiz.passingPercentage,
          scheduledDate: targetQuiz.scheduledDate,
          startTime: targetQuiz.startTime,
          endTime: targetQuiz.endTime,
          timezone: targetQuiz.timezone,
          scheduledStartAt: targetQuiz.scheduledStartAt,
          scheduledEndAt: targetQuiz.scheduledEndAt,
          scheduleStatus: 'LIVE'
        },
        availableQuizzes: liveQuizzes.map(q => ({
          id: q.id,
          quizCode: q.quizCode,
          title: q.title,
          topic: q.topic,
          sessionId: q.sessionId,
          sessionTitle: q.sessionTitle,
          scheduledDate: q.scheduledDate,
          startTime: q.startTime,
          endTime: q.endTime,
          timezone: q.timezone,
          scheduledStartAt: q.scheduledStartAt,
          scheduledEndAt: q.scheduledEndAt,
          durationMinutes: q.durationMinutes,
          totalQuestionsToSelect: q.totalQuestionsToSelect,
          status: q.status
        })),
        existingAttempt: eligibility.existingAttempt || null,
        serverTime: eligibility.serverTime
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
