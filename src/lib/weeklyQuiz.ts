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
  IntegrityRating
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
 * Computes remaining time in seconds based on authoritative server timestamps.
 */
export function calculateRemainingSeconds(attempt: WeeklyQuizAttempt, durationMinutes: number): number {
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
 * IMPORTANT: Signals are interpreted as review flags, NEVER automated 'cheating' labels.
 */
export function calculateIntegrityRating(
  events: WeeklyQuizSecurityEvent[],
  attempt: WeeklyQuizAttempt
): WeeklyQuizIntegritySummary {
  let faceEventsCount = 0;
  let focusEventsCount = 0;
  let securityEventsCount = 0;
  let reconnectsCount = 0;
  let totalNoFaceDuration = 0;

  for (const ev of events) {
    if (ev.eventType === 'NO_FACE_DETECTED' || ev.eventType === 'MULTIPLE_FACES_DETECTED') {
      faceEventsCount++;
      if (ev.durationSeconds) totalNoFaceDuration += ev.durationSeconds;
    } else if (ev.eventType === 'TAB_FOCUS_LOST' || ev.eventType === 'FULLSCREEN_EXIT') {
      focusEventsCount++;
    } else if (
      ev.eventType === 'WEBCAM_DISCONNECTED' ||
      ev.eventType === 'WEBCAM_STREAM_INTERRUPTED' ||
      ev.eventType === 'NETWORK_INTERRUPTION'
    ) {
      reconnectsCount++;
    } else if (ev.eventType === 'COPY_ATTEMPT' || ev.eventType === 'PASTE_ATTEMPT' || ev.eventType === 'NAVIGATION_ATTEMPT') {
      securityEventsCount++;
    }
  }

  let rating: IntegrityRating = 'NORMAL';

  if (
    faceEventsCount >= 4 ||
    totalNoFaceDuration > 25 ||
    focusEventsCount >= 4 ||
    securityEventsCount >= 2 ||
    reconnectsCount >= 3
  ) {
    rating = 'REVIEW_REQUIRED';
  } else if (
    faceEventsCount >= 1 ||
    focusEventsCount >= 1 ||
    securityEventsCount >= 1 ||
    reconnectsCount >= 1
  ) {
    rating = 'ATTENTION';
  }

  return {
    cameraStatus: attempt.cameraStatus || 'ACTIVE',
    faceStatus: attempt.faceStatus || 'ONE_FACE',
    focusStatus: attempt.focusStatus || 'FOCUSED',
    fullscreenStatus: attempt.fullscreenStatus || 'FULLSCREEN',
    faceEventsCount,
    focusEventsCount,
    securityEventsCount,
    reconnectsCount,
    integrityRating: rating
  };
}

/**
 * Logs a proctoring/security event and updates the live attempt integrity state.
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
}): Promise<WeeklyQuizSecurityEvent> {
  const severity: WeeklyQuizEventSeverity =
    params.severity ||
    (params.eventType === 'NO_FACE_DETECTED' || params.eventType === 'MULTIPLE_FACES_DETECTED' || params.eventType === 'FULLSCREEN_EXIT'
      ? 'WARNING'
      : params.eventType === 'WEBCAM_DISCONNECTED'
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

  // Update live status flags on the attempt
  const attempt = await db.weeklyQuizAttempts.getById(params.attemptId);
  if (attempt) {
    const updates: Partial<WeeklyQuizAttempt> = {};

    if (params.eventType === 'WEBCAM_CONNECTED' || params.eventType === 'WEBCAM_PERMISSION_GRANTED') {
      updates.cameraStatus = 'ACTIVE';
    } else if (params.eventType === 'WEBCAM_DISCONNECTED' || params.eventType === 'WEBCAM_PERMISSION_DENIED') {
      updates.cameraStatus = 'DISCONNECTED';
    }

    if (params.eventType === 'FACE_DETECTION_RECOVERED') {
      updates.faceStatus = 'ONE_FACE';
    } else if (params.eventType === 'NO_FACE_DETECTED') {
      updates.faceStatus = 'NO_FACE';
    } else if (params.eventType === 'MULTIPLE_FACES_DETECTED') {
      updates.faceStatus = 'MULTIPLE_FACES';
    }

    if (params.eventType === 'TAB_FOCUS_RESTORED') {
      updates.focusStatus = 'FOCUSED';
    } else if (params.eventType === 'TAB_FOCUS_LOST') {
      updates.focusStatus = 'UNFOCUSED';
    }

    if (params.eventType === 'FULLSCREEN_RESTORED') {
      updates.fullscreenStatus = 'FULLSCREEN';
    } else if (params.eventType === 'FULLSCREEN_EXIT') {
      updates.fullscreenStatus = 'WINDOWED';
    }

    const allEvents = await db.weeklyQuizSecurityEvents.getByAttemptId(params.attemptId);
    updates.integritySummary = calculateIntegrityRating(allEvents, { ...attempt, ...updates });

    await db.weeklyQuizAttempts.updateOne(params.attemptId, updates);
  }

  return newEvent;
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
