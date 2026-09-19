import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  generateWeeklyQuizSessionToken,
  generateWeeklyQuizAttemptId,
  selectAndRandomizeQuestions,
  sanitizeQuestionsForStudent,
  calculateRemainingSeconds,
  calculateAuthoritativeRemainingSeconds,
  verifyCandidateSessionEligibility,
  logWeeklyQuizSecurityEvent
} from '@/lib/weeklyQuiz';
import { WeeklyQuiz, WeeklyQuizAttempt } from '@/types/weeklyQuiz';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { quizId, email, studentName, rollNumber, candidateId, consentGiven } = body;

    if (!quizId || !email) {
      return NextResponse.json(
        { error: 'Quiz ID and Registered Email are required.' },
        { status: 400, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    if (!consentGiven) {
      return NextResponse.json(
        { error: 'Candidate consent is required to start the proctored assessment.' },
        { status: 400, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Authoritative Server-Side Session Eligibility & Schedule Verification
    const eligibility = await verifyCandidateSessionEligibility({
      email: cleanEmail,
      quizId: quizId.trim()
    });

    if (!eligibility.isEligible) {
      return NextResponse.json(
        {
          error: eligibility.message,
          reason: eligibility.reason,
          serverTime: eligibility.serverTime,
          quiz: eligibility.quiz || null
        },
        { status: 403, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const quiz: WeeklyQuiz = await db.weeklyQuizzes.getById(quizId.trim());
    if (!quiz) {
      return NextResponse.json(
        { error: 'Weekly Quiz not found.' },
        { status: 404, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    // Check for existing attempt (resume existing)
    const existingAttempt: WeeklyQuizAttempt | null = await db.weeklyQuizAttempts.getByEmailAndQuiz(cleanEmail, quiz.id);

    if (existingAttempt) {
      if (existingAttempt.status === 'SUBMITTED' || existingAttempt.status === 'REVIEW_REQUIRED') {
        return NextResponse.json(
          { error: 'You have already submitted this assessment. Only 1 attempt is allowed.' },
          { status: 403, headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
      }

      // Resume existing active or paused attempt
      const remainingSeconds = calculateRemainingSeconds(existingAttempt, quiz.durationMinutes, quiz);
      const sanitizedQuestions = sanitizeQuestionsForStudent(
        existingAttempt.selectedQuestionIds,
        existingAttempt.shuffledOptions,
        quiz.questionBank
      );

      return NextResponse.json(
        {
          success: true,
          token: existingAttempt.sessionToken,
          attemptId: existingAttempt.id,
          status: existingAttempt.status,
          remainingSeconds,
          answers: existingAttempt.answers,
          markedForReview: existingAttempt.markedForReview,
          quiz: {
            id: quiz.id,
            quizCode: quiz.quizCode,
            title: quiz.title,
            topic: quiz.topic,
            description: quiz.description,
            sessionId: quiz.sessionId,
            sessionTitle: quiz.sessionTitle,
            scheduledDate: quiz.scheduledDate,
            startTime: quiz.startTime,
            endTime: quiz.endTime,
            timezone: quiz.timezone,
            scheduledStartAt: quiz.scheduledStartAt,
            scheduledEndAt: quiz.scheduledEndAt,
            durationMinutes: quiz.durationMinutes,
            totalQuestions: sanitizedQuestions.length,
            passingPercentage: quiz.passingPercentage,
            settings: quiz.settings,
            questions: sanitizedQuestions
          },
          attempt: {
            id: existingAttempt.id,
            studentName: existingAttempt.studentName,
            rollNumber: existingAttempt.rollNumber,
            email: existingAttempt.email,
            status: existingAttempt.status,
            startedAt: existingAttempt.startedAt,
            expiresAt: existingAttempt.expiresAt,
            remainingSeconds,
            answers: existingAttempt.answers,
            markedForReview: existingAttempt.markedForReview,
            cameraStatus: existingAttempt.cameraStatus,
            screenStatus: existingAttempt.screenStatus || 'ACTIVE',
            faceStatus: existingAttempt.faceStatus,
            focusStatus: existingAttempt.focusStatus,
            connectionStatus: existingAttempt.connectionStatus || 'CONNECTED',
            violationCount: existingAttempt.violationCount || 0
          }
        },
        { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    // Create a new attempt
    const token = generateWeeklyQuizSessionToken();
    const attemptId = generateWeeklyQuizAttemptId();
    const now = new Date();

    // End time calculation bounded by scheduledEndAt
    let expiresAtTime = now.getTime() + quiz.durationMinutes * 60 * 1000;
    if (quiz.scheduledEndAt) {
      const scheduledEndMs = new Date(quiz.scheduledEndAt).getTime();
      if (scheduledEndMs < expiresAtTime) {
        expiresAtTime = scheduledEndMs;
      }
    }
    const expiresAt = new Date(expiresAtTime).toISOString();
    const initialRemainingSeconds = Math.max(0, Math.floor((expiresAtTime - now.getTime()) / 1000));

    const { selectedQuestionIds, shuffledOptions } = selectAndRandomizeQuestions(
      quiz.questionBank,
      quiz.totalQuestionsToSelect || 20
    );

    const cleanName = studentName?.trim() || cleanEmail.split('@')[0];
    const cleanRoll = rollNumber?.trim()?.toUpperCase() || `CU-${Date.now().toString().slice(-6)}`;
    const cId = candidateId || `cand_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const registrationId = eligibility.registration?.id || `reg_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

    const newAttempt: WeeklyQuizAttempt = {
      id: attemptId,
      quizId: quiz.id,
      sessionId: quiz.sessionId,
      registrationId,
      candidateId: cId,
      studentName: cleanName,
      rollNumber: cleanRoll,
      email: cleanEmail,
      sessionToken: token,
      status: 'IN_PROGRESS',
      selectedQuestionIds,
      shuffledOptions,
      answers: {},
      markedForReview: [],
      score: 0,
      totalMarks: 0,
      percentage: 0,
      passed: false,
      startedAt: now.toISOString(),
      expiresAt,
      extendedMinutes: 0,
      cameraStatus: 'ACTIVE',
      screenStatus: 'ACTIVE',
      faceStatus: 'ONE_FACE',
      focusStatus: 'FOCUSED',
      fullscreenStatus: 'FULLSCREEN',
      connectionStatus: 'CONNECTED',
      violationCount: 0,
      violationHistory: [],
      integritySummary: {
        cameraStatus: 'ACTIVE',
        screenStatus: 'ACTIVE',
        faceStatus: 'ONE_FACE',
        focusStatus: 'FOCUSED',
        fullscreenStatus: 'FULLSCREEN',
        connectionStatus: 'CONNECTED',
        violationCount: 0,
        faceEventsCount: 0,
        focusEventsCount: 0,
        securityEventsCount: 0,
        screenEventsCount: 0,
        reconnectsCount: 0,
        integrityRating: 'NORMAL'
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    await db.weeklyQuizAttempts.insertOne(newAttempt);

    // Log initial proctoring start events
    await logWeeklyQuizSecurityEvent({
      attemptId,
      quizId: quiz.id,
      candidateId: cId,
      studentName: cleanName,
      email: cleanEmail,
      eventType: 'QUIZ_STARTED',
      severity: 'INFO'
    });

    await logWeeklyQuizSecurityEvent({
      attemptId,
      quizId: quiz.id,
      candidateId: cId,
      studentName: cleanName,
      email: cleanEmail,
      eventType: 'WEBCAM_PERMISSION_GRANTED',
      severity: 'INFO'
    });

    await logWeeklyQuizSecurityEvent({
      attemptId,
      quizId: quiz.id,
      candidateId: cId,
      studentName: cleanName,
      email: cleanEmail,
      eventType: 'SCREEN_SHARE_PERMISSION_GRANTED',
      severity: 'INFO'
    });

    await logWeeklyQuizSecurityEvent({
      attemptId,
      quizId: quiz.id,
      candidateId: cId,
      studentName: cleanName,
      email: cleanEmail,
      eventType: 'WEBCAM_CONNECTED',
      severity: 'INFO'
    });

    await logWeeklyQuizSecurityEvent({
      attemptId,
      quizId: quiz.id,
      candidateId: cId,
      studentName: cleanName,
      email: cleanEmail,
      eventType: 'SCREEN_SHARE_STARTED',
      severity: 'INFO'
    });

    const sanitizedQuestions = sanitizeQuestionsForStudent(
      selectedQuestionIds,
      shuffledOptions,
      quiz.questionBank
    );

    return NextResponse.json(
      {
        success: true,
        token,
        attemptId,
        status: 'IN_PROGRESS',
        remainingSeconds: initialRemainingSeconds,
        quiz: {
          id: quiz.id,
          quizCode: quiz.quizCode,
          title: quiz.title,
          topic: quiz.topic,
          description: quiz.description,
          sessionId: quiz.sessionId,
          sessionTitle: quiz.sessionTitle,
          scheduledDate: quiz.scheduledDate,
          startTime: quiz.startTime,
          endTime: quiz.endTime,
          timezone: quiz.timezone,
          scheduledStartAt: quiz.scheduledStartAt,
          scheduledEndAt: quiz.scheduledEndAt,
          durationMinutes: quiz.durationMinutes,
          totalQuestions: sanitizedQuestions.length,
          passingPercentage: quiz.passingPercentage,
          settings: quiz.settings,
          questions: sanitizedQuestions
        },
        attempt: {
          id: attemptId,
          studentName: cleanName,
          rollNumber: cleanRoll,
          email: cleanEmail,
          status: 'IN_PROGRESS',
          startedAt: now.toISOString(),
          expiresAt,
          remainingSeconds: initialRemainingSeconds,
          answers: {},
          markedForReview: [],
          cameraStatus: 'ACTIVE',
          screenStatus: 'ACTIVE',
          faceStatus: 'ONE_FACE',
          focusStatus: 'FOCUSED',
          connectionStatus: 'CONNECTED',
          violationCount: 0
        }
      },
      { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error: any) {
    console.error('Weekly quiz start error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start weekly quiz assessment.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}
