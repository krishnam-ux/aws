import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  calculateRemainingSeconds,
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

      const remainingSeconds = quiz ? calculateRemainingSeconds(attempt, quiz.durationMinutes) : 0;

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
            status: attempt.status,
            startedAt: attempt.startedAt,
            expiresAt: attempt.expiresAt,
            submittedAt: attempt.submittedAt,
            remainingSeconds,
            extendedMinutes: attempt.extendedMinutes || 0,
            cameraStatus: attempt.cameraStatus,
            faceStatus: attempt.faceStatus,
            focusStatus: attempt.focusStatus,
            fullscreenStatus: attempt.fullscreenStatus,
            integritySummary: attempt.integritySummary || calculateIntegrityRating(events, attempt),
            score: attempt.score,
            totalMarks: attempt.totalMarks,
            percentage: attempt.percentage,
            passed: attempt.passed,
            adminNotes: attempt.adminNotes,
            hasLiveStream: Boolean(signaling?.offer || signaling?.previewFrame),
            previewFrame: signaling?.previewFrame || null
          },
          events: events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        },
        { status: 200, headers: noStoreHeaders }
      );
    }

    // Default dashboard data
    const filteredAttempts = quizId ? attempts.filter(a => a.quizId === quizId) : attempts;

    // Top metrics
    const totalCandidates = filteredAttempts.length;
    const waiting = filteredAttempts.filter(a => a.status === 'WAITING' || a.status === 'LOCKED').length;
    const inProgress = filteredAttempts.filter(a => a.status === 'IN_PROGRESS' || a.status === 'PAUSED').length;
    const submitted = filteredAttempts.filter(a => a.status === 'SUBMITTED' || a.status === 'REVIEW_REQUIRED').length;
    const cameraIssues = filteredAttempts.filter(a => a.cameraStatus === 'DISCONNECTED' || a.cameraStatus === 'ERROR').length;
    const securityAlerts = filteredAttempts.filter(a =>
      a.integritySummary?.integrityRating === 'ATTENTION' || a.integritySummary?.integrityRating === 'REVIEW_REQUIRED'
    ).length;

    // Enrich attempt rows with live timer and quiz title
    const enrichedAttempts = filteredAttempts.map(att => {
      const quiz = quizzes.find(q => q.id === att.quizId);
      const remainingSeconds = quiz ? calculateRemainingSeconds(att, quiz.durationMinutes) : 0;
      const signaling = getCandidateSignalForAdmin(att.id);

      return {
        id: att.id,
        candidateId: att.candidateId,
        studentName: att.studentName,
        rollNumber: att.rollNumber,
        email: att.email,
        quizId: att.quizId,
        quizTitle: quiz?.title || 'Weekly AWS Quiz',
        durationMinutes: quiz?.durationMinutes || 20,
        status: att.status,
        startedAt: att.startedAt,
        expiresAt: att.expiresAt,
        submittedAt: att.submittedAt,
        remainingSeconds,
        extendedMinutes: att.extendedMinutes || 0,
        cameraStatus: att.cameraStatus,
        faceStatus: att.faceStatus,
        focusStatus: att.focusStatus,
        fullscreenStatus: att.fullscreenStatus,
        securityEventsCount: att.integritySummary?.securityEventsCount ?? 0,
        faceEventsCount: att.integritySummary?.faceEventsCount ?? 0,
        focusEventsCount: att.integritySummary?.focusEventsCount ?? 0,
        integrityRating: att.integritySummary?.integrityRating || 'NORMAL',
        score: att.score,
        totalMarks: att.totalMarks,
        percentage: att.percentage,
        passed: att.passed,
        hasLiveStream: Boolean(signaling?.offer || signaling?.previewFrame),
        previewFrame: signaling?.previewFrame || null
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
          securityAlerts
        },
        quizzes,
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
      const remainingSeconds = quiz ? calculateRemainingSeconds(attempt, quiz.durationMinutes) : 0;

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

      if (quiz.id) {
        const existing = await db.weeklyQuizzes.getById(quiz.id);
        if (existing) {
          const updated = await db.weeklyQuizzes.updateOne(quiz.id, {
            ...quiz,
            updatedAt: new Date().toISOString()
          });
          await logWeeklyQuizAuditAction({
            quizId: quiz.id,
            adminUser,
            action: 'UPDATE_QUIZ',
            details: { title: quiz.title }
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
        availableFrom: quiz.availableFrom || new Date().toISOString(),
        availableUntil: quiz.availableUntil || new Date(Date.now() + 7 * 86400000).toISOString(),
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
        details: { title: newQuiz.title }
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

    return NextResponse.json({ error: 'Invalid action requested.' }, { status: 400, headers: noStoreHeaders });
  } catch (error: any) {
    console.error('Admin weekly quiz POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process admin action.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
