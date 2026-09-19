import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  calculateRemainingSeconds,
  calculateAuthoritativeRemainingSeconds,
  calculateQuizEligibilityMetrics,
  autoSubmitExpiredAttemptsForQuiz,
  convertScheduleToUtc,
  calculateScoreAndResults,
  calculateIntegrityRating,
  logWeeklyQuizAuditAction,
  logWeeklyQuizSecurityEvent
} from '@/lib/weeklyQuiz';
import { getCandidateSignalForAdmin } from '@/lib/webrtcSignaling';
import { WeeklyQuiz, WeeklyQuizAttempt, WeeklyQuizSecurityEvent } from '@/types/weeklyQuiz';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token === SECURE_TOKEN || token.startsWith('adm_') || token.includes('session')) return true;
  }
  const cookie = request.headers.get('cookie') || '';
  if (cookie.includes('adminToken=') || cookie.includes('admin_token=')) {
    return true;
  }
  return false;
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
    const action = searchParams.get('action') || 'get-dashboard-data';
    const quizId = searchParams.get('quizId');
    const attemptId = searchParams.get('attemptId');

    const quizzes: WeeklyQuiz[] = await db.weeklyQuizzes.getAll();
    const attempts: WeeklyQuizAttempt[] = await db.weeklyQuizAttempts.getAll();
    const settings = await db.weeklyQuizSettings.getSettings();
    const eventsList = await db.events.getAll();

    // Auto submit any expired attempts for the requested quiz or all quizzes
    if (quizId) {
      await autoSubmitExpiredAttemptsForQuiz(quizId);
    }

    if (action === 'get-timeline' && attemptId) {
      const events: WeeklyQuizSecurityEvent[] = await db.weeklyQuizSecurityEvents.getByAttemptId(attemptId);
      const attempt = attempts.find(a => a.id === attemptId);
      return NextResponse.json(
        {
          success: true,
          attempt,
          events: events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        },
        { status: 200, headers: noStoreHeaders }
      );
    }

    if (action === 'get-candidate-details' && attemptId) {
      const attempt = attempts.find(a => a.id === attemptId);
      if (!attempt) {
        return NextResponse.json(
          { error: 'Attempt not found.' },
          { status: 404, headers: noStoreHeaders }
        );
      }
      const quiz = quizzes.find(q => q.id === attempt.quizId);
      const events = await db.weeklyQuizSecurityEvents.getByAttemptId(attemptId);
      const signaling = getCandidateSignalForAdmin(attemptId);

      const remainingSeconds = quiz ? calculateAuthoritativeRemainingSeconds(attempt, quiz) : 0;

      return NextResponse.json(
        {
          success: true,
          candidate: {
            attemptId: attempt.id,
            candidateId: attempt.candidateId,
            studentName: attempt.studentName,
            rollNumber: attempt.rollNumber,
            email: attempt.email,
            quizId: attempt.quizId,
            quizTitle: quiz?.title || 'Weekly AWS Quiz',
            sessionId: attempt.sessionId || quiz?.sessionId,
            sessionTitle: quiz?.sessionTitle,
            status: attempt.status,
            startedAt: attempt.startedAt,
            expiresAt: attempt.expiresAt,
            submittedAt: attempt.submittedAt,
            submissionReason: attempt.submissionReason,
            remainingSeconds,
            extendedMinutes: attempt.extendedMinutes || 0,
            cameraStatus: attempt.cameraStatus,
            screenStatus: attempt.screenStatus || 'ACTIVE',
            faceStatus: attempt.faceStatus,
            focusStatus: attempt.focusStatus,
            fullscreenStatus: attempt.fullscreenStatus,
            connectionStatus: attempt.connectionStatus || 'CONNECTED',
            violationCount: attempt.violationCount || 0,
            violationHistory: attempt.violationHistory || [],
            integritySummary: attempt.integritySummary || calculateIntegrityRating(events, attempt),
            score: attempt.score,
            totalMarks: attempt.totalMarks,
            percentage: attempt.percentage,
            passed: attempt.passed,
            adminNotes: attempt.adminNotes,
            hasLiveStream: Boolean(signaling?.offer || signaling?.cameraPreviewFrame || signaling?.screenOffer || signaling?.screenPreviewFrame),
            hasCameraStream: Boolean(signaling?.offer || signaling?.cameraPreviewFrame),
            hasScreenStream: Boolean(signaling?.screenOffer || signaling?.screenPreviewFrame),
            cameraPreviewFrame: signaling?.cameraPreviewFrame || signaling?.previewFrame || null,
            screenPreviewFrame: signaling?.screenPreviewFrame || null,
            previewFrame: signaling?.cameraPreviewFrame || signaling?.previewFrame || null
          },
          events: events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        },
        { status: 200, headers: noStoreHeaders }
      );
    }

    // Default dashboard data
    const activeQuizId = quizId || (quizzes.length > 0 ? quizzes[0].id : undefined);
    const selectedQuiz = quizzes.find(q => q.id === activeQuizId);
    
    // Filter attempts strictly by the selected quiz and its linked session
    let filteredAttempts = attempts;
    if (activeQuizId) {
      filteredAttempts = attempts.filter(a => a.quizId === activeQuizId);
    }

    // Calculate eligibility metrics for the active quiz
    const eligibilityMetrics = activeQuizId ? await calculateQuizEligibilityMetrics(activeQuizId) : null;

    // Top metrics
    const totalCandidates = filteredAttempts.length;
    const waiting = filteredAttempts.filter(a => a.status === 'WAITING' || a.status === 'LOCKED').length;
    const inProgress = filteredAttempts.filter(a => a.status === 'IN_PROGRESS' || a.status === 'PAUSED').length;
    const submitted = filteredAttempts.filter(a => a.status === 'SUBMITTED' || a.status === 'REVIEW_REQUIRED').length;
    const cameraIssues = filteredAttempts.filter(a => a.cameraStatus === 'DISCONNECTED' || a.cameraStatus === 'ERROR').length;
    const screenIssues = filteredAttempts.filter(a => a.screenStatus === 'DISCONNECTED' || a.screenStatus === 'ERROR').length;
    const securityAlerts = filteredAttempts.filter(a =>
      a.integritySummary?.integrityRating === 'ATTENTION' || a.integritySummary?.integrityRating === 'REVIEW_REQUIRED' || (a.violationCount || 0) > 0
    ).length;

    // Enrich attempt rows with live authoritative timer and quiz/session title
    const enrichedAttempts = filteredAttempts.map(att => {
      const quiz = quizzes.find(q => q.id === att.quizId);
      const remainingSeconds = quiz ? calculateAuthoritativeRemainingSeconds(att, quiz) : 0;
      const signaling = getCandidateSignalForAdmin(att.id);

      return {
        id: att.id,
        candidateId: att.candidateId,
        studentName: att.studentName,
        rollNumber: att.rollNumber,
        email: att.email,
        quizId: att.quizId,
        quizTitle: quiz?.title || 'Weekly AWS Quiz',
        sessionId: att.sessionId || quiz?.sessionId,
        sessionTitle: quiz?.sessionTitle,
        durationMinutes: quiz?.durationMinutes || 20,
        status: att.status,
        startedAt: att.startedAt,
        expiresAt: att.expiresAt,
        submittedAt: att.submittedAt,
        submissionReason: att.submissionReason,
        remainingSeconds,
        extendedMinutes: att.extendedMinutes || 0,
        cameraStatus: att.cameraStatus,
        screenStatus: att.screenStatus || 'ACTIVE',
        faceStatus: att.faceStatus,
        focusStatus: att.focusStatus,
        fullscreenStatus: att.fullscreenStatus,
        connectionStatus: att.connectionStatus || 'CONNECTED',
        violationCount: att.violationCount || 0,
        violationHistory: att.violationHistory || [],
        securityEventsCount: att.integritySummary?.securityEventsCount ?? 0,
        faceEventsCount: att.integritySummary?.faceEventsCount ?? 0,
        focusEventsCount: att.integritySummary?.focusEventsCount ?? 0,
        screenEventsCount: att.integritySummary?.screenEventsCount ?? 0,
        integrityRating: att.integritySummary?.integrityRating || 'NORMAL',
        score: att.score,
        totalMarks: att.totalMarks,
        percentage: att.percentage,
        passed: att.passed,
        adminNotes: att.adminNotes,
        hasLiveStream: Boolean(signaling?.offer || signaling?.cameraPreviewFrame || signaling?.screenOffer || signaling?.screenPreviewFrame),
        hasCameraStream: Boolean(signaling?.offer || signaling?.cameraPreviewFrame),
        hasScreenStream: Boolean(signaling?.screenOffer || signaling?.screenPreviewFrame),
        cameraPreviewFrame: signaling?.cameraPreviewFrame || signaling?.previewFrame || null,
        screenPreviewFrame: signaling?.screenPreviewFrame || null,
        previewFrame: signaling?.cameraPreviewFrame || signaling?.previewFrame || null
      };
    });

    return NextResponse.json(
      {
        success: true,
        metrics: {
          totalCandidates,
          waiting,
          inProgress,
          submitted,
          cameraIssues,
          screenIssues,
          securityAlerts
        },
        eligibilityMetrics,
        quizzes,
        events: eventsList.map(e => ({
          id: e.id,
          title: e.title,
          eventNumber: e.eventNumber,
          date: e.date,
          status: e.status
        })),
        attempts: enrichedAttempts,
        settings
      },
      { status: 200, headers: noStoreHeaders }
    );
  } catch (error: any) {
    console.error('Admin weekly quiz GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch admin weekly quiz data.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized administrative access.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const body = await request.json();
    const { action, quizId, attemptId, minutes, adminNotes, quiz, settings } = body;
    const adminUser = 'awsadmin@culko.in';

    // 1. Pause Candidate Quiz
    if (action === 'pause-candidate') {
      if (!attemptId) {
        return NextResponse.json({ error: 'Attempt ID required.' }, { status: 400, headers: noStoreHeaders });
      }
      const attempt = await db.weeklyQuizAttempts.getById(attemptId);
      if (!attempt) {
        return NextResponse.json({ error: 'Attempt not found.' }, { status: 404, headers: noStoreHeaders });
      }

      const quiz = await db.weeklyQuizzes.getById(attempt.quizId);
      const remainingSeconds = quiz ? calculateAuthoritativeRemainingSeconds(attempt, quiz) : 0;

      await db.weeklyQuizAttempts.updateOne(attemptId, {
        status: 'PAUSED',
        pausedAt: new Date().toISOString(),
        pausedRemainingSeconds: remainingSeconds,
        updatedAt: new Date().toISOString()
      });

      await logWeeklyQuizAuditAction({
        quizId: attempt.quizId,
        attemptId,
        adminUser,
        action: 'PAUSE_QUIZ',
        details: { remainingSeconds }
      });

      return NextResponse.json({ success: true, status: 'PAUSED' }, { status: 200, headers: noStoreHeaders });
    }

    // 2. Resume Candidate Quiz
    if (action === 'resume-candidate') {
      if (!attemptId) {
        return NextResponse.json({ error: 'Attempt ID required.' }, { status: 400, headers: noStoreHeaders });
      }
      const attempt = await db.weeklyQuizAttempts.getById(attemptId);
      if (!attempt) {
        return NextResponse.json({ error: 'Attempt not found.' }, { status: 404, headers: noStoreHeaders });
      }

      const remainingSec = attempt.pausedRemainingSeconds || 60;
      const newExpiresAt = new Date(Date.now() + remainingSec * 1000).toISOString();

      await db.weeklyQuizAttempts.updateOne(attemptId, {
        status: 'IN_PROGRESS',
        expiresAt: newExpiresAt,
        pausedAt: undefined,
        pausedRemainingSeconds: undefined,
        updatedAt: new Date().toISOString()
      });

      await logWeeklyQuizAuditAction({
        quizId: attempt.quizId,
        attemptId,
        adminUser,
        action: 'RESUME_QUIZ',
        details: { newExpiresAt, remainingSec }
      });

      return NextResponse.json({ success: true, status: 'IN_PROGRESS' }, { status: 200, headers: noStoreHeaders });
    }

    // 3. Lock Candidate
    if (action === 'lock-candidate') {
      if (!attemptId) {
        return NextResponse.json({ error: 'Attempt ID required.' }, { status: 400, headers: noStoreHeaders });
      }
      const attempt = await db.weeklyQuizAttempts.getById(attemptId);
      if (!attempt) {
        return NextResponse.json({ error: 'Attempt not found.' }, { status: 404, headers: noStoreHeaders });
      }

      await db.weeklyQuizAttempts.updateOne(attemptId, {
        status: 'LOCKED',
        updatedAt: new Date().toISOString()
      });

      await logWeeklyQuizAuditAction({
        quizId: attempt.quizId,
        attemptId,
        adminUser,
        action: 'LOCK_CANDIDATE',
        details: { previousStatus: attempt.status }
      });

      return NextResponse.json({ success: true, status: 'LOCKED' }, { status: 200, headers: noStoreHeaders });
    }

    // 4. Extend Assessment Time
    if (action === 'extend-time') {
      if (!attemptId || !minutes) {
        return NextResponse.json({ error: 'Attempt ID and extension minutes required.' }, { status: 400, headers: noStoreHeaders });
      }
      const attempt = await db.weeklyQuizAttempts.getById(attemptId);
      if (!attempt) {
        return NextResponse.json({ error: 'Attempt not found.' }, { status: 404, headers: noStoreHeaders });
      }

      const extraMinutes = Number(minutes);
      const currentExpiresAt = attempt.expiresAt ? new Date(attempt.expiresAt).getTime() : Date.now();
      const newExpiresAt = new Date(currentExpiresAt + extraMinutes * 60 * 1000).toISOString();
      const currentExtended = attempt.extendedMinutes || 0;

      await db.weeklyQuizAttempts.updateOne(attemptId, {
        expiresAt: newExpiresAt,
        extendedMinutes: currentExtended + extraMinutes,
        updatedAt: new Date().toISOString()
      });

      await logWeeklyQuizAuditAction({
        quizId: attempt.quizId,
        attemptId,
        adminUser,
        action: 'EXTEND_TIME',
        details: { extraMinutes, newExpiresAt }
      });

      return NextResponse.json(
        { success: true, extendedMinutes: currentExtended + extraMinutes, expiresAt: newExpiresAt },
        { status: 200, headers: noStoreHeaders }
      );
    }

    // 5. Force Submit Candidate Quiz
    if (action === 'force-submit') {
      if (!attemptId) {
        return NextResponse.json({ error: 'Attempt ID required.' }, { status: 400, headers: noStoreHeaders });
      }
      const attempt = await db.weeklyQuizAttempts.getById(attemptId);
      if (!attempt) {
        return NextResponse.json({ error: 'Attempt not found.' }, { status: 404, headers: noStoreHeaders });
      }

      const quiz = await db.weeklyQuizzes.getById(attempt.quizId);
      if (!quiz) {
        return NextResponse.json({ error: 'Quiz not found.' }, { status: 404, headers: noStoreHeaders });
      }

      const results = calculateScoreAndResults(attempt, quiz);
      const events = await db.weeklyQuizSecurityEvents.getByAttemptId(attemptId);
      const integritySummary = calculateIntegrityRating(events, attempt);

      await db.weeklyQuizAttempts.updateOne(attemptId, {
        status: 'SUBMITTED',
        score: results.score,
        totalMarks: results.totalMarks,
        percentage: results.percentage,
        passed: results.passed,
        submittedAt: new Date().toISOString(),
        submissionReason: 'ADMIN_FORCE_SUBMIT',
        integritySummary,
        updatedAt: new Date().toISOString()
      });

      await logWeeklyQuizAuditAction({
        quizId: attempt.quizId,
        attemptId,
        adminUser,
        action: 'END_SESSION',
        details: { reason: 'ADMIN_FORCE_SUBMIT', score: results.score }
      });

      return NextResponse.json({ success: true, status: 'SUBMITTED' }, { status: 200, headers: noStoreHeaders });
    }

    // 6. Save or Update Weekly Quiz
    if (action === 'save-quiz') {
      if (!quiz || !quiz.title) {
        return NextResponse.json({ error: 'Quiz details required.' }, { status: 400, headers: noStoreHeaders });
      }

      const timezone = quiz.timezone || 'Asia/Kolkata';
      let scheduledStartAt = quiz.scheduledStartAt;
      let scheduledEndAt = quiz.scheduledEndAt;

      if (quiz.scheduledDate && quiz.startTime) {
        scheduledStartAt = convertScheduleToUtc(quiz.scheduledDate, quiz.startTime, timezone);
      }
      if (quiz.scheduledDate && quiz.endTime) {
        scheduledEndAt = convertScheduleToUtc(quiz.scheduledDate, quiz.endTime, timezone);
      }

      // Resolve session title if session ID provided
      let sessionTitle = quiz.sessionTitle;
      if (quiz.sessionId && !sessionTitle) {
        const allEvents = await db.events.getAll();
        const matchingEvent = allEvents.find((e: any) => e.id === quiz.sessionId);
        if (matchingEvent) {
          sessionTitle = matchingEvent.title;
        }
      }

      if (quiz.id) {
        const existing = await db.weeklyQuizzes.getById(quiz.id);
        if (existing) {
          const updated = await db.weeklyQuizzes.updateOne(quiz.id, {
            ...quiz,
            sessionId: quiz.sessionId || existing.sessionId,
            sessionTitle: sessionTitle || existing.sessionTitle,
            scheduledDate: quiz.scheduledDate || existing.scheduledDate,
            startTime: quiz.startTime || existing.startTime,
            endTime: quiz.endTime || existing.endTime,
            timezone,
            scheduledStartAt: scheduledStartAt || existing.scheduledStartAt,
            scheduledEndAt: scheduledEndAt || existing.scheduledEndAt,
            lateEntryGraceMinutes: quiz.lateEntryGraceMinutes !== undefined ? Number(quiz.lateEntryGraceMinutes) : existing.lateEntryGraceMinutes,
            updatedAt: new Date().toISOString()
          });
          await logWeeklyQuizAuditAction({
            quizId: quiz.id,
            adminUser,
            action: 'UPDATE_QUIZ',
            details: { title: quiz.title, sessionId: quiz.sessionId, scheduledStartAt, scheduledEndAt }
          });
          return NextResponse.json({ success: true, quiz: updated }, { status: 200, headers: noStoreHeaders });
        }
      }

      const newQuiz: WeeklyQuiz = {
        id: quiz.id || `quiz-aws-week-${Date.now().toString().slice(-4)}`,
        quizCode: quiz.quizCode || `AWS-WEEK-${Date.now().toString().slice(-2)}`,
        title: quiz.title,
        topic: quiz.topic || 'AWS Learning Assessment',
        description: quiz.description || '',
        sessionId: quiz.sessionId || 'event-01',
        sessionTitle: sessionTitle || 'Introduction to AWS Cloud & Architecture',
        scheduledDate: quiz.scheduledDate || '2026-09-25',
        startTime: quiz.startTime || '10:00',
        endTime: quiz.endTime || '10:30',
        timezone,
        scheduledStartAt: scheduledStartAt || convertScheduleToUtc('2026-09-25', '10:00', timezone),
        scheduledEndAt: scheduledEndAt || convertScheduleToUtc('2026-09-25', '10:30', timezone),
        lateEntryGraceMinutes: quiz.lateEntryGraceMinutes !== undefined ? Number(quiz.lateEntryGraceMinutes) : 0,
        availableFrom: scheduledStartAt || quiz.availableFrom || new Date().toISOString(),
        availableUntil: scheduledEndAt || quiz.availableUntil || new Date(Date.now() + 7 * 86400000).toISOString(),
        durationMinutes: Number(quiz.durationMinutes) || 20,
        totalQuestionsToSelect: Number(quiz.totalQuestionsToSelect) || 20,
        passingPercentage: Number(quiz.passingPercentage) || 60,
        maxAttempts: 1,
        status: quiz.status || 'Live',
        settings: quiz.settings || {
          requireWebcam: true,
          requireMicrophone: true,
          requireFaceDetection: true,
          detectMultipleFaces: true,
          requireFullscreen: true,
          monitorFocus: true,
          noFaceThresholdSeconds: 6,
          multipleFacesThresholdSeconds: 4,
          cameraGracePeriodSeconds: 30,
          fullscreenGracePeriodSeconds: 15
        },
        questionBank: Array.isArray(quiz.questionBank) ? quiz.questionBank : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.weeklyQuizzes.insertOne(newQuiz);
      await logWeeklyQuizAuditAction({
        quizId: newQuiz.id,
        adminUser,
        action: 'CREATE_QUIZ',
        details: { title: newQuiz.title, sessionId: newQuiz.sessionId, scheduledStartAt, scheduledEndAt }
      });

      return NextResponse.json({ success: true, quiz: newQuiz }, { status: 200, headers: noStoreHeaders });
    }

    // 7. Delete Weekly Quiz
    if (action === 'delete-quiz') {
      if (!quizId) {
        return NextResponse.json({ error: 'Quiz ID required.' }, { status: 400, headers: noStoreHeaders });
      }
      await db.weeklyQuizzes.deleteOne(quizId);
      await logWeeklyQuizAuditAction({
        quizId,
        adminUser,
        action: 'DELETE_QUIZ',
        details: { quizId }
      });
      return NextResponse.json({ success: true }, { status: 200, headers: noStoreHeaders });
    }

    // 8. Update Proctoring Settings
    if (action === 'update-settings') {
      if (!settings) {
        return NextResponse.json({ error: 'Settings payload required.' }, { status: 400, headers: noStoreHeaders });
      }
      const updated = await db.weeklyQuizSettings.updateSettings(settings);
      await logWeeklyQuizAuditAction({
        quizId: 'GLOBAL_SETTINGS',
        adminUser,
        action: 'UPDATE_SETTINGS',
        details: settings
      });
      return NextResponse.json({ success: true, settings: updated }, { status: 200, headers: noStoreHeaders });
    }

    // 9. Update Candidate Admin Notes
    if (action === 'update-admin-notes') {
      if (!attemptId) {
        return NextResponse.json({ error: 'Attempt ID required.' }, { status: 400, headers: noStoreHeaders });
      }
      await db.weeklyQuizAttempts.updateOne(attemptId, { adminNotes });
      return NextResponse.json({ success: true }, { status: 200, headers: noStoreHeaders });
    }

    // 10. Send Proctor Warning
    if (action === 'send-warning') {
      if (!attemptId) {
        return NextResponse.json({ error: 'Attempt ID required.' }, { status: 400, headers: noStoreHeaders });
      }
      const attempt = await db.weeklyQuizAttempts.getById(attemptId);
      if (!attempt) {
        return NextResponse.json({ error: 'Attempt not found.' }, { status: 404, headers: noStoreHeaders });
      }

      const warningMessage = body.message || 'Please ensure you remain focused on your exam screen.';
      const countViolation = Boolean(body.countViolation);

      await logWeeklyQuizSecurityEvent({
        attemptId: attempt.id,
        quizId: attempt.quizId,
        candidateId: attempt.candidateId,
        studentName: attempt.studentName,
        email: attempt.email,
        eventType: 'PROCTOR_WARNING',
        severity: 'WARNING',
        metadata: { reason: warningMessage, adminUser, countViolation }
      });

      await logWeeklyQuizAuditAction({
        quizId: attempt.quizId,
        attemptId,
        adminUser,
        action: 'SEND_WARNING',
        details: { warningMessage, countViolation }
      });

      return NextResponse.json({ success: true, message: 'Warning dispatched to candidate.' }, { status: 200, headers: noStoreHeaders });
    }

    return NextResponse.json({ error: 'Invalid action requested.' }, { status: 400, headers: noStoreHeaders });
  } catch (error: any) {
    console.error('Admin weekly quiz POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process admin action.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
