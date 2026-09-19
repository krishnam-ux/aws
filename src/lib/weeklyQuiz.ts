import crypto from 'crypto';
import { db } from '@/lib/db';
import {
  WeeklyQuiz,
  WeeklyQuizAttempt,
  WeeklyQuizQuestion,
  WeeklyQuizSecurityEvent,
  WeeklyQuizEventType,
  WeeklyQuizEventSeverity,
  WeeklyQuizAuditLog,
  WeeklyQuizAdminAction,
  WeeklyQuizIntegritySummary,
  IntegrityRating,
  WeeklyQuizViolationRecord
} from '@/types/weeklyQuiz';

export function generateWeeklyQuizSessionToken(): string {
  return `wq_sess_${crypto.randomBytes(32).toString('hex')}`;
}

export function generateWeeklyQuizAttemptId(): string {
  return `wq_att_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Fisher-Yates array shuffle helper
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Randomly selects N questions from the question bank and shuffles their options per attempt.
 */
export function selectAndRandomizeQuestions(
  questionBank: WeeklyQuizQuestion[],
  count: number
): {
  selectedQuestionIds: string[];
  shuffledOptions: Record<string, number[]>;
} {
  const countToSelect = Math.min(count, questionBank.length);
  const shuffledBank = shuffleArray(questionBank);
  const selected = shuffledBank.slice(0, countToSelect);

  const selectedQuestionIds: string[] = [];
  const shuffledOptions: Record<string, number[]> = {};

  for (const q of selected) {
    selectedQuestionIds.push(q.id);
    const optionIndices = q.options.map((_, idx) => idx);
    shuffledOptions[q.id] = shuffleArray(optionIndices);
  }

  return {
    selectedQuestionIds,
    shuffledOptions
  };
}

/**
 * Sanitizes questions for delivery to candidate client.
 * Reorders options according to shuffled mapping and strips correct answers and explanations.
 */
export function sanitizeQuestionsForStudent(
  selectedQuestionIds: string[],
  shuffledOptions: Record<string, number[]>,
  questionBank: WeeklyQuizQuestion[]
): Array<{
  id: string;
  question: string;
  options: string[];
  marks: number;
}> {
  const questionMap = new Map(questionBank.map(q => [q.id, q]));
  const result = [];

  for (const qId of selectedQuestionIds) {
    const originalQ = questionMap.get(qId);
    if (!originalQ) continue;

    const permutation = shuffledOptions[qId] || originalQ.options.map((_, i) => i);
    const displayedOptions = permutation.map(originalIdx => originalQ.options[originalIdx]);

    result.push({
      id: originalQ.id,
      question: originalQ.question,
      options: displayedOptions,
      marks: originalQ.marks
    });
  }

  return result;
}

/**
 * Converts local date, time, and timezone to canonical UTC ISO string.
 * Default timezone: Asia/Kolkata (IST, UTC+05:30)
 */
export function convertScheduleToUtc(
  dateStr?: string,
  timeStr?: string,
  timezone: string = 'Asia/Kolkata'
): string {
  if (!dateStr || !timeStr) {
    return new Date().toISOString();
  }
  const cleanDate = dateStr.trim();
  let cleanTime = timeStr.trim();
  if (cleanTime.length === 5) {
    cleanTime += ':00';
  }

  // Asia/Kolkata / IST (+05:30)
  if (timezone === 'Asia/Kolkata' || timezone === 'IST' || !timezone) {
    const isoWithOffset = `${cleanDate}T${cleanTime}+05:30`;
    const parsed = new Date(isoWithOffset);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  // UTC / GMT (+00:00)
  if (timezone === 'UTC' || timezone === 'GMT') {
    const isoWithOffset = `${cleanDate}T${cleanTime}Z`;
    const parsed = new Date(isoWithOffset);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  const parsed = new Date(`${cleanDate}T${cleanTime}`);
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

/**
 * Formats canonical UTC ISO timestamp into Indian Standard Time (IST) strings.
 */
export function formatToIst(utcIsoString?: string): { date: string; time: string; time12: string; full: string } {
  if (!utcIsoString) {
    return { date: '', time: '', time12: '', full: '' };
  }
  const d = new Date(utcIsoString);
  if (isNaN(d.getTime())) {
    return { date: '', time: '', time12: '', full: '' };
  }

  try {
    const formatterDate = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const formatterTime = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const formatterTime12 = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const dateFormatted = formatterDate.format(d);
    const timeFormatted = formatterTime.format(d);
    const time12Formatted = formatterTime12.format(d);

    return {
      date: dateFormatted,
      time: timeFormatted,
      time12: time12Formatted,
      full: `${dateFormatted}, ${time12Formatted} IST`
    };
  } catch (e) {
    return { date: '', time: '', time12: '', full: '' };
  }
}

/**
 * Derives current schedule status for a Weekly Quiz (UPCOMING, LIVE, ENDED).
 */
export function getQuizScheduleStatus(
  quiz: WeeklyQuiz,
  now: Date = new Date()
): 'UPCOMING' | 'LIVE' | 'ENDED' {
  const nowMs = now.getTime();
  const startMs = quiz.scheduledStartAt
    ? new Date(quiz.scheduledStartAt).getTime()
    : quiz.availableFrom
    ? new Date(quiz.availableFrom).getTime()
    : 0;
  const endMs = quiz.scheduledEndAt
    ? new Date(quiz.scheduledEndAt).getTime()
    : quiz.availableUntil
    ? new Date(quiz.availableUntil).getTime()
    : Number.MAX_SAFE_INTEGER;

  if (nowMs < startMs) {
    return 'UPCOMING';
  }
  if (nowMs >= endMs) {
    return 'ENDED';
  }
  return 'LIVE';
}

/**
 * Computes authoritative remaining time in seconds bounded by attempt duration and quiz end time.
 */
export function calculateAuthoritativeRemainingSeconds(
  attempt: WeeklyQuizAttempt,
  quiz: WeeklyQuiz,
  now: Date = new Date()
): number {
  if (attempt.status === 'SUBMITTED' || attempt.status === 'REVIEW_REQUIRED' || attempt.status === 'LOCKED') {
    return 0;
  }

  if (attempt.status === 'PAUSED') {
    return Math.max(0, attempt.pausedRemainingSeconds || 0);
  }

  const nowMs = now.getTime();

  // 1. Attempt duration limit
  let attemptRemaining = Number.MAX_SAFE_INTEGER;
  if (attempt.expiresAt) {
    attemptRemaining = Math.max(0, Math.floor((new Date(attempt.expiresAt).getTime() - nowMs) / 1000));
  } else if (attempt.startedAt) {
    const totalMinutes = quiz.durationMinutes + (attempt.extendedMinutes || 0);
    const calculatedExpiresMs = new Date(attempt.startedAt).getTime() + totalMinutes * 60 * 1000;
    attemptRemaining = Math.max(0, Math.floor((calculatedExpiresMs - nowMs) / 1000));
  } else {
    attemptRemaining = (quiz.durationMinutes + (attempt.extendedMinutes || 0)) * 60;
  }

  // 2. Scheduled Quiz window limit
  let windowRemaining = Number.MAX_SAFE_INTEGER;
  if (quiz.scheduledEndAt) {
    windowRemaining = Math.max(0, Math.floor((new Date(quiz.scheduledEndAt).getTime() - nowMs) / 1000));
  } else if (quiz.availableUntil) {
    windowRemaining = Math.max(0, Math.floor((new Date(quiz.availableUntil).getTime() - nowMs) / 1000));
  }

  return Math.max(0, Math.min(attemptRemaining, windowRemaining));
}

/**
 * Computes remaining time in seconds based on authoritative server timestamps.
 */
export function calculateRemainingSeconds(
  attempt: WeeklyQuizAttempt,
  durationMinutes: number,
  quiz?: WeeklyQuiz
): number {
  if (quiz) {
    return calculateAuthoritativeRemainingSeconds(attempt, quiz);
  }

  if (attempt.status === 'SUBMITTED' || attempt.status === 'REVIEW_REQUIRED') {
    return 0;
  }

  if (attempt.status === 'PAUSED') {
    return Math.max(0, attempt.pausedRemainingSeconds || 0);
  }

  if (!attempt.startedAt || !attempt.expiresAt) {
    return (durationMinutes + (attempt.extendedMinutes || 0)) * 60;
  }

  const expiresTime = new Date(attempt.expiresAt).getTime();
  const now = Date.now();
  const diffSec = Math.floor((expiresTime - now) / 1000);

  return Math.max(0, diffSec);
}

/**
 * Verifies candidate session-specific eligibility, schedule window, and attempt state.
 */
export async function verifyCandidateSessionEligibility(params: {
  email: string;
  quizId: string;
}): Promise<import('@/types/weeklyQuiz').CandidateEligibilityResult> {
  const cleanEmail = (params.email || '').trim().toLowerCase();
  const serverTime = new Date().toISOString();

  if (!cleanEmail) {
    return {
      isEligible: false,
      reason: 'INVALID_CREDENTIALS',
      message: 'Registered University Email is required.',
      serverTime
    };
  }

  const quiz = await db.weeklyQuizzes.getById(params.quizId);
  if (!quiz) {
    return {
      isEligible: false,
      reason: 'QUIZ_INACTIVE',
      message: 'Weekly Quiz not found.',
      serverTime
    };
  }

  if (quiz.status === 'Draft' || quiz.status === 'Archived') {
    return {
      isEligible: false,
      reason: 'QUIZ_INACTIVE',
      message: 'This Weekly Quiz is currently unavailable.',
      serverTime
    };
  }

  const scheduleStatus = getQuizScheduleStatus(quiz);
  const startMs = quiz.scheduledStartAt
    ? new Date(quiz.scheduledStartAt).getTime()
    : quiz.availableFrom
    ? new Date(quiz.availableFrom).getTime()
    : 0;
  const endMs = quiz.scheduledEndAt
    ? new Date(quiz.scheduledEndAt).getTime()
    : quiz.availableUntil
    ? new Date(quiz.availableUntil).getTime()
    : Number.MAX_SAFE_INTEGER;
  const nowMs = Date.now();

  // 1. Session-Specific Registration Check
  const targetSessionId = quiz.sessionId;
  let matchingRegistration: any = null;

  if (targetSessionId) {
    const candidateRegistrations = await db.eventRegistrations.getByEmail(cleanEmail);
    matchingRegistration = candidateRegistrations.find(
      (r: any) => String(r.eventId || '').trim().toLowerCase() === targetSessionId.trim().toLowerCase()
    );

    if (!matchingRegistration) {
      return {
        isEligible: false,
        reason: 'NOT_REGISTERED_FOR_SESSION',
        message: "You are not registered for this session's Weekly Quiz.",
        serverTime,
        quiz: {
          id: quiz.id,
          quizCode: quiz.quizCode,
          title: quiz.title,
          topic: quiz.topic,
          description: quiz.description,
          sessionId: quiz.sessionId,
          sessionTitle: quiz.sessionTitle,
          durationMinutes: quiz.durationMinutes,
          totalQuestions: quiz.totalQuestionsToSelect || 20,
          passingPercentage: quiz.passingPercentage,
          scheduledDate: quiz.scheduledDate,
          startTime: quiz.startTime,
          endTime: quiz.endTime,
          timezone: quiz.timezone,
          scheduledStartAt: quiz.scheduledStartAt,
          scheduledEndAt: quiz.scheduledEndAt,
          scheduleStatus
        }
      };
    }

    if (matchingRegistration.status === 'Cancelled') {
      return {
        isEligible: false,
        reason: 'REGISTRATION_NOT_CONFIRMED',
        message: 'Your registration for this session is not active or confirmed.',
        serverTime,
        registration: {
          id: matchingRegistration.id,
          eventId: matchingRegistration.eventId,
          name: matchingRegistration.name,
          email: matchingRegistration.email,
          status: matchingRegistration.status
        }
      };
    }
  }

  // 2. Schedule window check
  if (scheduleStatus === 'UPCOMING') {
    const startsInSeconds = Math.max(0, Math.ceil((startMs - nowMs) / 1000));
    return {
      isEligible: false,
      reason: 'QUIZ_NOT_STARTED',
      message: 'Weekly Quiz Not Started Yet',
      serverTime,
      registration: matchingRegistration
        ? {
            id: matchingRegistration.id,
            eventId: matchingRegistration.eventId,
            name: matchingRegistration.name,
            email: matchingRegistration.email,
            status: matchingRegistration.status
          }
        : undefined,
      quiz: {
        id: quiz.id,
        quizCode: quiz.quizCode,
        title: quiz.title,
        topic: quiz.topic,
        description: quiz.description,
        sessionId: quiz.sessionId,
        sessionTitle: quiz.sessionTitle,
        durationMinutes: quiz.durationMinutes,
        totalQuestions: quiz.totalQuestionsToSelect || 20,
        passingPercentage: quiz.passingPercentage,
        scheduledDate: quiz.scheduledDate,
        startTime: quiz.startTime,
        endTime: quiz.endTime,
        timezone: quiz.timezone,
        scheduledStartAt: quiz.scheduledStartAt,
        scheduledEndAt: quiz.scheduledEndAt,
        scheduleStatus,
        startsInSeconds
      }
    };
  }

  // 3. Existing Attempt check
  const existingAttempt = await db.weeklyQuizAttempts.getByEmailAndQuiz(cleanEmail, quiz.id);

  if (existingAttempt) {
    if (existingAttempt.status === 'SUBMITTED' || existingAttempt.status === 'REVIEW_REQUIRED') {
      return {
        isEligible: false,
        reason: 'ALREADY_SUBMITTED',
        message: 'You have already completed and submitted this Weekly Quiz.',
        serverTime,
        existingAttempt: {
          id: existingAttempt.id,
          status: existingAttempt.status,
          sessionToken: existingAttempt.sessionToken,
          score: existingAttempt.score,
          totalMarks: existingAttempt.totalMarks,
          percentage: existingAttempt.percentage,
          passed: existingAttempt.passed,
          submissionReason: existingAttempt.submissionReason,
          submittedAt: existingAttempt.submittedAt
        }
      };
    }

    if (existingAttempt.status === 'LOCKED') {
      return {
        isEligible: false,
        reason: 'ATTEMPT_LOCKED',
        message: 'Your quiz attempt is locked due to security violations.',
        serverTime,
        existingAttempt: {
          id: existingAttempt.id,
          status: existingAttempt.status,
          sessionToken: existingAttempt.sessionToken
        }
      };
    }

    // Active in-progress attempt
    if (scheduleStatus === 'ENDED' || nowMs >= endMs) {
      await autoSubmitExpiredAttemptsForQuiz(quiz.id);
      const updated = await db.weeklyQuizAttempts.getById(existingAttempt.id);
      return {
        isEligible: false,
        reason: 'QUIZ_ENDED',
        message: 'This Weekly Quiz has ended.',
        serverTime,
        existingAttempt: updated
          ? {
              id: updated.id,
              status: updated.status,
              sessionToken: updated.sessionToken,
              score: updated.score,
              totalMarks: updated.totalMarks,
              percentage: updated.percentage,
              passed: updated.passed,
              submissionReason: updated.submissionReason,
              submittedAt: updated.submittedAt
            }
          : undefined
      };
    }

    const remainingSeconds = calculateAuthoritativeRemainingSeconds(existingAttempt, quiz);

    if (remainingSeconds <= 0) {
      await autoSubmitExpiredAttemptsForQuiz(quiz.id);
      const updated = await db.weeklyQuizAttempts.getById(existingAttempt.id);
      return {
        isEligible: false,
        reason: 'QUIZ_ENDED',
        message: 'Assessment time has expired.',
        serverTime,
        existingAttempt: updated
          ? {
              id: updated.id,
              status: updated.status,
              sessionToken: updated.sessionToken,
              score: updated.score,
              totalMarks: updated.totalMarks,
              percentage: updated.percentage,
              passed: updated.passed,
              submissionReason: updated.submissionReason,
              submittedAt: updated.submittedAt
            }
          : undefined
      };
    }

    return {
      isEligible: true,
      reason: 'ELIGIBLE',
      message: 'Active attempt resumed.',
      serverTime,
      registration: matchingRegistration
        ? {
            id: matchingRegistration.id,
            eventId: matchingRegistration.eventId,
            name: matchingRegistration.name,
            email: matchingRegistration.email,
            status: matchingRegistration.status
          }
        : undefined,
      quiz: {
        id: quiz.id,
        quizCode: quiz.quizCode,
        title: quiz.title,
        topic: quiz.topic,
        description: quiz.description,
        sessionId: quiz.sessionId,
        sessionTitle: quiz.sessionTitle,
        durationMinutes: quiz.durationMinutes,
        totalQuestions: quiz.totalQuestionsToSelect || 20,
        passingPercentage: quiz.passingPercentage,
        scheduledDate: quiz.scheduledDate,
        startTime: quiz.startTime,
        endTime: quiz.endTime,
        timezone: quiz.timezone,
        scheduledStartAt: quiz.scheduledStartAt,
        scheduledEndAt: quiz.scheduledEndAt,
        scheduleStatus,
        remainingSeconds
      },
      existingAttempt: {
        id: existingAttempt.id,
        status: existingAttempt.status,
        sessionToken: existingAttempt.sessionToken,
        remainingSeconds
      }
    };
  }

  if (scheduleStatus === 'ENDED' || nowMs >= endMs) {
    return {
      isEligible: false,
      reason: 'QUIZ_ENDED',
      message: 'This Weekly Quiz has ended.',
      serverTime
    };
  }

  const remainingSeconds = calculateAuthoritativeRemainingSeconds(
    { status: 'WAITING', durationMinutes: quiz.durationMinutes } as any,
    quiz
  );

  return {
    isEligible: true,
    reason: 'ELIGIBLE',
    message: 'Candidate is eligible to start the Weekly Quiz.',
    serverTime,
    registration: matchingRegistration
      ? {
          id: matchingRegistration.id,
          eventId: matchingRegistration.eventId,
          name: matchingRegistration.name,
          email: matchingRegistration.email,
          status: matchingRegistration.status
        }
      : undefined,
    quiz: {
      id: quiz.id,
      quizCode: quiz.quizCode,
      title: quiz.title,
      topic: quiz.topic,
      description: quiz.description,
      sessionId: quiz.sessionId,
      sessionTitle: quiz.sessionTitle,
      durationMinutes: quiz.durationMinutes,
      totalQuestions: quiz.totalQuestionsToSelect || 20,
      passingPercentage: quiz.passingPercentage,
      scheduledDate: quiz.scheduledDate,
      startTime: quiz.startTime,
      endTime: quiz.endTime,
      timezone: quiz.timezone,
      scheduledStartAt: quiz.scheduledStartAt,
      scheduledEndAt: quiz.scheduledEndAt,
      scheduleStatus,
      remainingSeconds
    }
  };
}

/**
 * Scans and automatically submits all expired attempts for a quiz.
 */
export async function autoSubmitExpiredAttemptsForQuiz(quizId: string): Promise<number> {
  const quiz = await db.weeklyQuizzes.getById(quizId);
  if (!quiz) return 0;

  const nowMs = Date.now();
  const quizEndMs = quiz.scheduledEndAt
    ? new Date(quiz.scheduledEndAt).getTime()
    : quiz.availableUntil
    ? new Date(quiz.availableUntil).getTime()
    : Number.MAX_SAFE_INTEGER;

  const attempts: WeeklyQuizAttempt[] = await db.weeklyQuizAttempts.getByQuizId(quizId);
  let autoSubmittedCount = 0;
  const nowIso = new Date().toISOString();

  for (const attempt of attempts) {
    if (attempt.status !== 'IN_PROGRESS' && attempt.status !== 'PAUSED') {
      continue;
    }

    const attemptExpiresMs = attempt.expiresAt ? new Date(attempt.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;
    const isExpired = nowMs >= quizEndMs || nowMs >= attemptExpiresMs;

    if (isExpired) {
      const results = calculateScoreAndResults(attempt, quiz);
      await db.weeklyQuizAttempts.updateOne(attempt.id, {
        status: 'SUBMITTED',
        submissionReason: 'TIME_EXPIRED',
        submittedAt: nowIso,
        score: results.score,
        totalMarks: results.totalMarks,
        percentage: results.percentage,
        passed: results.passed,
        adminNotes: (attempt.adminNotes ? attempt.adminNotes + ' | ' : '') + 'AUTO SUBMITTED — TIME EXPIRED',
        updatedAt: nowIso
      });

      await db.weeklyQuizSecurityEvents.insertOne({
        id: `wqe_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        attemptId: attempt.id,
        quizId: quiz.id,
        candidateId: attempt.candidateId,
        studentName: attempt.studentName,
        email: attempt.email,
        eventType: 'AUTO_SUBMITTED',
        severity: 'INFO',
        metadata: { submissionReason: 'TIME_EXPIRED', scheduledEndAt: quiz.scheduledEndAt },
        timestamp: nowIso
      });

      autoSubmittedCount++;
    }
  }

  return autoSubmittedCount;
}

/**
 * Calculates server-side candidate eligibility metrics for admin reporting.
 */
export async function calculateQuizEligibilityMetrics(
  quizId: string
): Promise<import('@/types/weeklyQuiz').WeeklyQuizEligibilityMetrics> {
  const quiz = await db.weeklyQuizzes.getById(quizId);
  const now = new Date();
  const scheduleStatus = quiz ? getQuizScheduleStatus(quiz, now) : 'ENDED';

  if (!quiz) {
    return {
      totalEligible: 0,
      started: 0,
      notStarted: 0,
      active: 0,
      submitted: 0,
      autoSubmitted: 0,
      scheduleStatus: 'ENDED',
      serverTime: now.toISOString()
    };
  }

  let totalEligible = 0;
  if (quiz.sessionId) {
    const allRegistrations = await db.eventRegistrations.getAll();
    const sessionRegs = allRegistrations.filter(
      (r: any) =>
        String(r.eventId || '').trim().toLowerCase() === quiz.sessionId.trim().toLowerCase() &&
        r.status !== 'Cancelled'
    );
    totalEligible = sessionRegs.length;
  }

  const attempts: WeeklyQuizAttempt[] = await db.weeklyQuizAttempts.getByQuizId(quizId);
  const started = attempts.length;
  const notStarted = Math.max(0, totalEligible - started);
  const active = attempts.filter(a => a.status === 'IN_PROGRESS' || a.status === 'PAUSED').length;
  const submitted = attempts.filter(a => a.status === 'SUBMITTED' || a.status === 'REVIEW_REQUIRED').length;
  const autoSubmitted = attempts.filter(
    a =>
      a.status === 'SUBMITTED' &&
      (a.submissionReason === 'TIME_EXPIRED' || a.submissionReason === 'SECURITY_VIOLATION')
  ).length;

  return {
    totalEligible,
    started,
    notStarted,
    active,
    submitted,
    autoSubmitted,
    scheduleStatus,
    serverTime: now.toISOString()
  };
}

/**
 * Calculates authoritative score and pass/fail for a completed attempt.
 */
export function calculateScoreAndResults(
  attempt: WeeklyQuizAttempt,
  quiz: WeeklyQuiz
): {
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
} {
  const questionMap = new Map(quiz.questionBank.map(q => [q.id, q]));
  let score = 0;
  let totalMarks = 0;

  for (const qId of attempt.selectedQuestionIds) {
    const question = questionMap.get(qId);
    if (!question) continue;

    const qMarks = question.marks || 1;
    totalMarks += qMarks;

    const studentDisplayIndex = attempt.answers[qId];
    if (studentDisplayIndex !== undefined && studentDisplayIndex !== null) {
      const permutation = attempt.shuffledOptions[qId];
      if (permutation && permutation[studentDisplayIndex] !== undefined) {
        const originalOptionIndex = permutation[studentDisplayIndex];
        if (originalOptionIndex === question.correctOptionIndex) {
          score += qMarks;
        }
      }
    }
  }

  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
  const passed = percentage >= (quiz.passingPercentage || 60);

  return {
    score,
    totalMarks,
    percentage,
    passed
  };
}

/**
 * Evaluates candidate integrity signals and assigns an objective integrity rating.
 */
export function calculateIntegrityRating(
  events: WeeklyQuizSecurityEvent[],
  attempt: WeeklyQuizAttempt
): WeeklyQuizIntegritySummary {
  let faceEventsCount = 0;
  let focusEventsCount = 0;
  let securityEventsCount = 0;
  let screenEventsCount = 0;
  let reconnectsCount = 0;
  let totalNoFaceDuration = 0;

  for (const ev of events) {
    if (ev.eventType === 'NO_FACE_DETECTED' || ev.eventType === 'MULTIPLE_FACES_DETECTED') {
      faceEventsCount++;
      if (ev.durationSeconds) totalNoFaceDuration += ev.durationSeconds;
    } else if (
      ev.eventType === 'TAB_FOCUS_LOST' ||
      ev.eventType === 'TAB_HIDDEN' ||
      ev.eventType === 'WINDOW_BLURRED' ||
      ev.eventType === 'FULLSCREEN_EXIT' ||
      ev.eventType === 'FULLSCREEN_EXITED'
    ) {
      focusEventsCount++;
    } else if (
      ev.eventType === 'SCREEN_SHARE_STOPPED' ||
      ev.eventType === 'SCREEN_SHARE_INTERRUPTED' ||
      ev.eventType === 'SCREEN_SHARE_PERMISSION_DENIED'
    ) {
      screenEventsCount++;
    } else if (
      ev.eventType === 'WEBCAM_DISCONNECTED' ||
      ev.eventType === 'WEBCAM_STREAM_INTERRUPTED' ||
      ev.eventType === 'CAMERA_DISCONNECTED' ||
      ev.eventType === 'NETWORK_INTERRUPTION' ||
      ev.eventType === 'NETWORK_DISCONNECTED'
    ) {
      reconnectsCount++;
    } else if (
      ev.eventType === 'COPY_ATTEMPT' ||
      ev.eventType === 'CUT_ATTEMPT' ||
      ev.eventType === 'PASTE_ATTEMPT' ||
      ev.eventType === 'NAVIGATION_ATTEMPT' ||
      ev.eventType === 'UNAUTHORIZED_KEY'
    ) {
      securityEventsCount++;
    }
  }

  let rating: IntegrityRating = 'NORMAL';

  if (
    (attempt.violationCount || 0) >= 2 ||
    screenEventsCount >= 2 ||
    faceEventsCount >= 4 ||
    totalNoFaceDuration > 25 ||
    focusEventsCount >= 4 ||
    securityEventsCount >= 2 ||
    reconnectsCount >= 3
  ) {
    rating = 'REVIEW_REQUIRED';
  } else if (
    (attempt.violationCount || 0) >= 1 ||
    screenEventsCount >= 1 ||
    faceEventsCount >= 1 ||
    focusEventsCount >= 1 ||
    securityEventsCount >= 1 ||
    reconnectsCount >= 1
  ) {
    rating = 'ATTENTION';
  }

  return {
    cameraStatus: attempt.cameraStatus || 'ACTIVE',
    screenStatus: attempt.screenStatus || 'ACTIVE',
    faceStatus: attempt.faceStatus || 'ONE_FACE',
    focusStatus: attempt.focusStatus || 'FOCUSED',
    fullscreenStatus: attempt.fullscreenStatus || 'FULLSCREEN',
    connectionStatus: attempt.connectionStatus || 'CONNECTED',
    violationCount: attempt.violationCount || 0,
    faceEventsCount,
    focusEventsCount,
    securityEventsCount,
    screenEventsCount,
    reconnectsCount,
    integrityRating: rating,
    lastViolationReason: attempt.violationHistory?.slice(-1)[0]?.reason
  };
}

// In-memory deduplication cooldowns: Map<attemptId_category, timestamp>
const violationCooldowns = new Map<string, number>();

/**
 * Evaluates whether an incoming security event triggers a server-authoritative violation.
 * Policy:
 * - 1st Violation: Warning logged, student notified, continues quiz.
 * - 2nd Violation: Automatic submission with reason "SECURITY_VIOLATION", answering locked.
 */
export function isViolationEvent(eventType: WeeklyQuizEventType): { isViolation: boolean; category: string; defaultReason: string } {
  switch (eventType) {
    case 'SCREEN_SHARE_STOPPED':
    case 'SCREEN_SHARE_INTERRUPTED':
    case 'SCREEN_SHARE_PERMISSION_DENIED':
      return { isViolation: true, category: 'SCREEN', defaultReason: 'Screen sharing was stopped or interrupted.' };

    case 'TAB_FOCUS_LOST':
    case 'TAB_HIDDEN':
    case 'WINDOW_BLURRED':
      return { isViolation: true, category: 'FOCUS', defaultReason: 'Navigated away or switched browser tab during proctored quiz.' };

    case 'FULLSCREEN_EXIT':
    case 'FULLSCREEN_EXITED':
      return { isViolation: true, category: 'FULLSCREEN', defaultReason: 'Exited fullscreen assessment mode.' };

    case 'MULTIPLE_FACES_DETECTED':
      return { isViolation: true, category: 'FACE_MULTIPLE', defaultReason: 'Multiple people detected in candidate webcam view.' };

    case 'NO_FACE_DETECTED':
      return { isViolation: true, category: 'FACE_ABSENT', defaultReason: 'No face detected in webcam view for prolonged duration.' };

    case 'WEBCAM_DISCONNECTED':
    case 'CAMERA_DISCONNECTED':
      return { isViolation: true, category: 'CAMERA', defaultReason: 'Webcam feed disconnected during proctoring.' };

    case 'COPY_ATTEMPT':
    case 'CUT_ATTEMPT':
    case 'PASTE_ATTEMPT':
    case 'NAVIGATION_ATTEMPT':
    case 'UNAUTHORIZED_KEY':
      return { isViolation: true, category: 'KEYBOARD', defaultReason: 'Unauthorized key combination or clipboard action attempted.' };

    default:
      return { isViolation: false, category: 'INFO', defaultReason: '' };
  }
}

export interface ProcessEventResult {
  event: WeeklyQuizSecurityEvent;
  isWarning: boolean;
  isAutoSubmitted: boolean;
  violationCount: number;
  message?: string;
}

/**
 * Logs a proctoring/security event, checks 2-violation policy, and updates the attempt.
 */
export async function logWeeklyQuizSecurityEvent(params: {
  attemptId: string;
  quizId: string;
  candidateId: string;
  studentName: string;
  email: string;
  eventType: WeeklyQuizEventType;
  severity?: WeeklyQuizEventSeverity;
  durationSeconds?: number;
  metadata?: Record<string, any>;
}): Promise<ProcessEventResult> {
  const violationCheck = isViolationEvent(params.eventType);
  const severity: WeeklyQuizEventSeverity =
    params.severity ||
    (params.eventType === 'NO_FACE_DETECTED' ||
    params.eventType === 'MULTIPLE_FACES_DETECTED' ||
    params.eventType === 'FULLSCREEN_EXIT' ||
    params.eventType === 'FULLSCREEN_EXITED' ||
    params.eventType === 'TAB_FOCUS_LOST' ||
    params.eventType === 'TAB_HIDDEN'
      ? 'WARNING'
      : params.eventType === 'WEBCAM_DISCONNECTED' ||
        params.eventType === 'CAMERA_DISCONNECTED' ||
        params.eventType === 'SCREEN_SHARE_STOPPED' ||
        params.eventType === 'SCREEN_SHARE_INTERRUPTED'
      ? 'CRITICAL'
      : 'INFO');

  const newEvent: WeeklyQuizSecurityEvent = {
    id: `wqe_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    attemptId: params.attemptId,
    quizId: params.quizId,
    candidateId: params.candidateId,
    studentName: params.studentName,
    email: params.email.toLowerCase().trim(),
    eventType: params.eventType,
    severity,
    durationSeconds: params.durationSeconds,
    metadata: params.metadata || {},
    timestamp: new Date().toISOString()
  };

  await db.weeklyQuizSecurityEvents.insertOne(newEvent);

  let isWarning = false;
  let isAutoSubmitted = false;
  let returnMessage: string | undefined;

  // Update live status flags on the attempt
  const attempt = await db.weeklyQuizAttempts.getById(params.attemptId);
  if (attempt) {
    const updates: Partial<WeeklyQuizAttempt> = {};
    const now = new Date().toISOString();

    // Camera Status
    if (
      params.eventType === 'WEBCAM_CONNECTED' ||
      params.eventType === 'CAMERA_CONNECTED' ||
      params.eventType === 'CAMERA_RECONNECTED' ||
      params.eventType === 'WEBCAM_PERMISSION_GRANTED'
    ) {
      updates.cameraStatus = 'ACTIVE';
    } else if (
      params.eventType === 'WEBCAM_DISCONNECTED' ||
      params.eventType === 'CAMERA_DISCONNECTED' ||
      params.eventType === 'WEBCAM_PERMISSION_DENIED'
    ) {
      updates.cameraStatus = 'DISCONNECTED';
    }

    // Screen Status
    if (params.eventType === 'SCREEN_SHARE_STARTED' || params.eventType === 'SCREEN_SHARE_PERMISSION_GRANTED') {
      updates.screenStatus = 'ACTIVE';
    } else if (
      params.eventType === 'SCREEN_SHARE_STOPPED' ||
      params.eventType === 'SCREEN_SHARE_INTERRUPTED' ||
      params.eventType === 'SCREEN_SHARE_PERMISSION_DENIED'
    ) {
      updates.screenStatus = 'DISCONNECTED';
    }

    // Face Status
    if (params.eventType === 'FACE_DETECTION_RECOVERED' || params.eventType === 'FACE_DETECTED') {
      updates.faceStatus = 'ONE_FACE';
    } else if (params.eventType === 'NO_FACE_DETECTED') {
      updates.faceStatus = 'NO_FACE';
    } else if (params.eventType === 'MULTIPLE_FACES_DETECTED') {
      updates.faceStatus = 'MULTIPLE_FACES';
    }

    // Focus Status
    if (params.eventType === 'TAB_FOCUS_RESTORED' || params.eventType === 'TAB_VISIBLE' || params.eventType === 'WINDOW_FOCUSED') {
      updates.focusStatus = 'FOCUSED';
    } else if (params.eventType === 'TAB_FOCUS_LOST' || params.eventType === 'TAB_HIDDEN' || params.eventType === 'WINDOW_BLURRED') {
      updates.focusStatus = 'UNFOCUSED';
    }

    // Fullscreen Status
    if (params.eventType === 'FULLSCREEN_RESTORED' || params.eventType === 'FULLSCREEN_ENTERED') {
      updates.fullscreenStatus = 'FULLSCREEN';
    } else if (params.eventType === 'FULLSCREEN_EXIT' || params.eventType === 'FULLSCREEN_EXITED') {
      updates.fullscreenStatus = 'WINDOWED';
    }

    // Connection Status
    if (params.eventType === 'NETWORK_RECONNECTED' || params.eventType === 'NETWORK_RECOVERED') {
      updates.connectionStatus = 'CONNECTED';
    } else if (params.eventType === 'NETWORK_DISCONNECTED') {
      updates.connectionStatus = 'DISCONNECTED';
    } else if (params.eventType === 'NETWORK_INTERRUPTION') {
      updates.connectionStatus = 'RECONNECTING';
    }

    // Server-Authoritative 2-Violation Engine
    if (violationCheck.isViolation && (attempt.status === 'IN_PROGRESS' || attempt.status === 'PAUSED')) {
      const cooldownKey = `${attempt.id}_${violationCheck.category}`;
      const lastTrigger = violationCooldowns.get(cooldownKey) || 0;
      const cooldownMs = 3000; // 3 second deduplication cooldown per physical incident category

      if (Date.now() - lastTrigger >= cooldownMs) {
        violationCooldowns.set(cooldownKey, Date.now());

        const currentCount = attempt.violationCount || 0;
        const newViolationNumber = currentCount + 1;
        const reason = params.metadata?.reason || violationCheck.defaultReason;

        const newRecord: WeeklyQuizViolationRecord = {
          violationNumber: newViolationNumber,
          eventType: params.eventType,
          reason,
          timestamp: now
        };

        const updatedHistory = [...(attempt.violationHistory || []), newRecord];
        updates.violationCount = newViolationNumber;
        updates.violationHistory = updatedHistory;

        if (newViolationNumber === 1) {
          // Violation 1: Warning
          isWarning = true;
          returnMessage = `Warning (1/2): ${reason} Please correct your environment. A second violation will automatically submit your quiz.`;

          // Insert audit log & warning event
          await db.weeklyQuizSecurityEvents.insertOne({
            id: `wqe_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
            attemptId: attempt.id,
            quizId: attempt.quizId,
            candidateId: attempt.candidateId,
            studentName: attempt.studentName,
            email: attempt.email,
            eventType: 'PROCTOR_WARNING',
            severity: 'WARNING',
            metadata: { reason, violationNumber: 1 },
            timestamp: now
          });
        } else if (newViolationNumber >= 2) {
          // Violation 2: Automatic Submission
          isAutoSubmitted = true;
          returnMessage = 'Automatically submitted due to repeated proctoring violations.';

          const quiz = await db.weeklyQuizzes.getById(attempt.quizId);
          let results = { score: 0, totalMarks: 0, percentage: 0, passed: false };
          if (quiz) {
            results = calculateScoreAndResults(attempt, quiz);
          }

          updates.status = 'SUBMITTED';
          updates.submissionReason = 'SECURITY_VIOLATION';
          updates.submittedAt = now;
          updates.score = results.score;
          updates.totalMarks = results.totalMarks;
          updates.percentage = results.percentage;
          updates.passed = results.passed;
          updates.adminNotes = (attempt.adminNotes ? attempt.adminNotes + ' | ' : '') + 'Automatically submitted due to repeated proctoring violations.';

          // Insert violation & auto-submit event
          await db.weeklyQuizSecurityEvents.insertOne({
            id: `wqe_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
            attemptId: attempt.id,
            quizId: attempt.quizId,
            candidateId: attempt.candidateId,
            studentName: attempt.studentName,
            email: attempt.email,
            eventType: 'PROCTOR_VIOLATION',
            severity: 'CRITICAL',
            metadata: { reason, violationNumber: 2 },
            timestamp: now
          });

          await db.weeklyQuizSecurityEvents.insertOne({
            id: `wqe_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
            attemptId: attempt.id,
            quizId: attempt.quizId,
            candidateId: attempt.candidateId,
            studentName: attempt.studentName,
            email: attempt.email,
            eventType: 'AUTO_SUBMITTED',
            severity: 'CRITICAL',
            metadata: { submissionReason: 'SECURITY_VIOLATION' },
            timestamp: now
          });
        }
      }
    }

    const allEvents = await db.weeklyQuizSecurityEvents.getByAttemptId(params.attemptId);
    updates.integritySummary = calculateIntegrityRating(allEvents, { ...attempt, ...updates });
    updates.updatedAt = now;

    await db.weeklyQuizAttempts.updateOne(params.attemptId, updates);

    return {
      event: newEvent,
      isWarning,
      isAutoSubmitted,
      violationCount: updates.violationCount !== undefined ? updates.violationCount : attempt.violationCount || 0,
      message: returnMessage
    };
  }

  return {
    event: newEvent,
    isWarning: false,
    isAutoSubmitted: false,
    violationCount: 0
  };
}

/**
 * Records an audited admin proctor action.
 */
export async function logWeeklyQuizAuditAction(params: {
  quizId: string;
  attemptId?: string;
  adminUser: string;
  action: WeeklyQuizAdminAction;
  details?: Record<string, any>;
}): Promise<WeeklyQuizAuditLog> {
  const log: WeeklyQuizAuditLog = {
    id: `wqa_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    quizId: params.quizId,
    attemptId: params.attemptId,
    adminUser: params.adminUser,
    action: params.action,
    details: params.details || {},
    timestamp: new Date().toISOString()
  };

  await db.weeklyQuizAuditLogs.insertOne(log);
  return log;
}
