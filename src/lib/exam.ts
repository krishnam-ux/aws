import crypto from 'crypto';
import { db } from '@/lib/db';
import {
  Exam,
  ExamAttempt,
  ExamCandidate,
  ExamSecurityEvent,
  ExamAuditLog,
  Question,
  SecurityEventType,
  SecuritySeverity,
  AdminActionType,
  SubmissionReason
} from '@/types/exam';
import { triggerExamResultEmail, triggerExamSelectionEmail } from '@/lib/email/automations';

export function generateSessionToken(): string {
  return `sess_${crypto.randomBytes(32).toString('hex')}`;
}

export function generateAttemptId(): string {
  return `att_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

export function generateUnlockPassword(): string {
  return `UNLOCK-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/**
 * Generate cryptographically secure random password for candidates.
 * Format: AWS-XXXX-XXXX (e.g. AWS-7k9Q-m2X8)
 * Non-predictable, high-entropy, excludes ambiguous characters.
 */
export function generateCandidatePassword(): string {
  const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const bytes = crypto.randomBytes(8);
  let segment1 = '';
  let segment2 = '';
  for (let i = 0; i < 4; i++) {
    segment1 += charset[bytes[i] % charset.length];
  }
  for (let i = 4; i < 8; i++) {
    segment2 += charset[bytes[i] % charset.length];
  }
  return `AWS-${segment1}-${segment2}`;
}

/**
 * Automatically provision candidate credentials for an approved exam registration.
 */
export async function provisionExamCandidate(params: {
  examId: string;
  studentName: string;
  rollNumber: string;
  email: string;
  customPassword?: string;
}): Promise<ExamCandidate> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanRoll = params.rollNumber.trim().toUpperCase();
  const cleanName = params.studentName.trim();
  const existing = await db.examCandidates.getByEmailAndExam(cleanEmail, params.examId);
  const password = params.customPassword || generateCandidatePassword();

  if (existing) {
    const updated = await db.examCandidates.updateOne(existing.id, {
      studentName: cleanName,
      rollNumber: cleanRoll,
      password: params.customPassword ? password : existing.password,
      status: 'Active',
      updatedAt: new Date().toISOString()
    });
    return updated || existing;
  }

  const newCandidate: ExamCandidate = {
    id: `cand_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    examId: params.examId,
    studentName: cleanName,
    rollNumber: cleanRoll,
    email: cleanEmail,
    password,
    status: 'Active',
    emailSentStatus: 'Not Sent',
    lastPasswordUpdate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await db.examCandidates.insertOne(newCandidate);
  return newCandidate;
}

/**
 * Regenerate candidate password and invalidate the previous one.
 */
export async function regenerateCandidatePassword(candidateId: string): Promise<ExamCandidate | null> {
  const candidate = await db.examCandidates.getById(candidateId);
  if (!candidate) return null;

  const newPassword = generateCandidatePassword();
  const updated = await db.examCandidates.updateOne(candidateId, {
    password: newPassword,
    lastPasswordUpdate: new Date().toISOString(),
    emailSentStatus: 'Not Sent'
  });

  return updated;
}

/**
 * Send candidate credentials email via Resend integration.
 */
export async function sendCandidateCredentialsEmail(
  candidate: ExamCandidate,
  exam: Exam,
  siteUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { triggerExamCredentialsEmail } = await import('@/lib/email/automations');

    const result = await triggerExamCredentialsEmail({
      studentName: candidate.studentName,
      email: candidate.email,
      exam: {
        id: exam.id,
        title: exam.title,
        examCode: exam.examCode,
        password: candidate.password,
        durationMinutes: exam.durationMinutes
      }
    });

    if (result && result.success === false) {
      await db.examCandidates.updateOne(candidate.id, {
        emailSentStatus: 'Failed'
      });
      return { success: false, error: result.error || 'Failed to dispatch email.' };
    }

    await db.examCandidates.updateOne(candidate.id, {
      emailSentStatus: 'Sent',
      emailSentAt: new Date().toISOString()
    });
    return { success: true };
  } catch (err: any) {
    console.error('Error sending candidate credentials email:', err);
    await db.examCandidates.updateOne(candidate.id, {
      emailSentStatus: 'Failed'
    });
    return { success: false, error: err.message || 'Email dispatch error.' };
  }
}

/**
 * Sanitize exam payload for public/student consumption.
 * STRICT SECURITY: Correct answers, explanations, and examUnlockPassword are strictly stripped.
 */
export function sanitizeExamForStudent(exam: Exam) {
  return {
    id: exam.id,
    examCode: exam.examCode,
    title: exam.title,
    description: exam.description,
    category: exam.category,
    durationMinutes: exam.durationMinutes,
    passingPercentage: exam.passingPercentage,
    requireSecureBrowser: exam.requireSecureBrowser,
    maxSecurityViolations: exam.maxSecurityViolations || 3,
    questions: (exam.questions || []).map((q: Question) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      marks: q.marks
    }))
  };
}

/**
 * Authoritative Server-side timer calculation.
 * Returns the exact number of seconds left for an attempt.
 * If EXAM_LOCKED, returns paused remaining seconds so candidate is not penalized while waiting.
 */
export function calculateRemainingSeconds(attempt: ExamAttempt, exam: Exam): number {
  if (attempt.status === 'SUBMITTED' || attempt.status === 'REVIEW_REQUIRED') {
    return 0;
  }
  if (attempt.status === 'EXAM_LOCKED' && typeof attempt.pausedRemainingSeconds === 'number') {
    return Math.max(0, attempt.pausedRemainingSeconds);
  }
  if (!attempt.startedAt) {
    return (exam.durationMinutes + (attempt.extendedMinutes || 0)) * 60;
  }

  const durationSeconds = (exam.durationMinutes + (attempt.extendedMinutes || 0)) * 60;
  const startedAtMs = new Date(attempt.startedAt).getTime();
  const nowMs = Date.now();
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  const remaining = durationSeconds - elapsedSeconds;

  return Math.max(0, remaining);
}

/**
 * Transition candidate attempt into EXAM_LOCKED state.
 * Freezes questions and pauses candidate timer countdown.
 */
export async function lockExamAttempt(
  attemptId: string,
  reason: string,
  source: string = 'SYSTEM'
): Promise<ExamAttempt | null> {
  const attempt = await db.examAttempts.getById(attemptId);
  if (!attempt) return null;
  if (attempt.status !== 'IN_EXAM') return attempt;

  const exam = await db.exams.getById(attempt.examId);
  const remainingSec = exam ? calculateRemainingSeconds(attempt, exam) : 0;
  const newLockCount = (attempt.lockCount || 0) + 1;

  const updatedAttempt = await db.examAttempts.updateOne(attemptId, {
    status: 'EXAM_LOCKED',
    lockedAt: new Date().toISOString(),
    lockedBy: source,
    lockReason: reason,
    lockCount: newLockCount,
    pausedRemainingSeconds: remainingSec,
    securityViolationsCount: (attempt.securityViolationsCount || 0) + 1
  });

  // Log EXAM_LOCKED security event
  const secEvent: ExamSecurityEvent = {
    id: `sec_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    attemptId: attempt.id,
    examId: attempt.examId,
    studentName: attempt.studentName,
    rollNumber: attempt.rollNumber,
    eventType: 'EXAM_LOCKED',
    severity: 'WARNING',
    metadata: {
      reason,
      source,
      lockCount: newLockCount,
      pausedRemainingSeconds: remainingSec
    },
    timestamp: new Date().toISOString()
  };
  await db.examSecurityLogs.insertOne(secEvent);

  if (source === 'ADMIN') {
    await logAdminAudit(attempt.examId, 'admin', 'MANUAL_LOCK_CANDIDATE', {
      candidateId: attempt.id,
      studentName: attempt.studentName,
      rollNumber: attempt.rollNumber,
      reason,
      previousState: 'IN_EXAM',
      newState: 'EXAM_LOCKED'
    }, attempt.id);
  }

  return updatedAttempt;
}

/**
 * Unlock a locked candidate attempt and resume examination.
 */
export async function unlockExamAttempt(
  attemptId: string,
  unlockMethod: 'STUDENT_PASSWORD' | 'ADMIN_MANUAL',
  adminUser?: string,
  reason?: string
): Promise<ExamAttempt | null> {
  const attempt = await db.examAttempts.getById(attemptId);
  if (!attempt) return null;
  if (attempt.status !== 'EXAM_LOCKED') return attempt;

  const exam = await db.exams.getById(attempt.examId);
  const totalDurationSec = (exam?.durationMinutes || 30) * 60;
  const pausedSec = typeof attempt.pausedRemainingSeconds === 'number' ? attempt.pausedRemainingSeconds : totalDurationSec;

  // Calculate locked duration to record
  const lockedMs = attempt.lockedAt ? Date.now() - new Date(attempt.lockedAt).getTime() : 0;
  const lockedSeconds = Math.max(0, Math.floor(lockedMs / 1000));
  const newTotalLockedSeconds = (attempt.totalLockedSeconds || 0) + lockedSeconds;

  // Resume startedAt timestamp so elapsed time matches: elapsed = totalDuration - pausedSec
  const targetStartedAtMs = Date.now() - Math.max(0, (totalDurationSec - pausedSec)) * 1000;

  const updatedAttempt = await db.examAttempts.updateOne(attemptId, {
    status: 'IN_EXAM',
    startedAt: new Date(targetStartedAtMs).toISOString(),
    lockedAt: undefined,
    pausedRemainingSeconds: undefined,
    totalLockedSeconds: newTotalLockedSeconds,
    adminNotes: reason ? `${attempt.adminNotes ? attempt.adminNotes + ' | ' : ''}Unlocked: ${reason}` : attempt.adminNotes
  });

  // Log EXAM_UNLOCKED security event
  const secEvent: ExamSecurityEvent = {
    id: `sec_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    attemptId: attempt.id,
    examId: attempt.examId,
    studentName: attempt.studentName,
    rollNumber: attempt.rollNumber,
    eventType: 'EXAM_UNLOCKED',
    severity: 'INFO',
    metadata: {
      unlockMethod,
      adminUser: adminUser || 'STUDENT',
      reason: reason || 'Verified Unlock Password',
      lockedSeconds,
      totalLockedSeconds: newTotalLockedSeconds
    },
    timestamp: new Date().toISOString()
  };
  await db.examSecurityLogs.insertOne(secEvent);

  if (adminUser) {
    await logAdminAudit(attempt.examId, adminUser, 'UNLOCK_LOCKED_CANDIDATE', {
      candidateId: attempt.id,
      studentName: attempt.studentName,
      rollNumber: attempt.rollNumber,
      reason: reason || 'Proctor manual unlock',
      previousState: 'EXAM_LOCKED',
      newState: 'IN_EXAM'
    }, attempt.id);
  }

  return updatedAttempt;
}

/**
 * Sends the official exam result email to the candidate.
 * Contains score, percentage, and PASS/FAIL verdict.
 * NO certificate is generated or sent.
 */
export async function sendCandidateResultEmail(
  attempt: ExamAttempt,
  exam: Exam,
  result: { score: number; totalMarks: number; percentage: number; passed: boolean }
): Promise<void> {
  const verdict = result.passed ? 'PASSED' : 'FAILED';

  // Dispatch via central email automation engine (with error isolation)
  try {
    await triggerExamResultEmail({
      studentName: attempt.studentName,
      email: attempt.email,
      rollNumber: attempt.rollNumber,
      exam: {
        id: exam.id,
        title: exam.title,
        examCode: exam.examCode,
        passingPercentage: exam.passingPercentage
      },
      result
    });
  } catch (emailErr) {
    console.error('Non-blocking error dispatching exam result email:', emailErr);
  }

  // Insert notification record for candidate
  try {
    await db.notifications.insertOne({
      id: `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      title: `Exam Result - ${exam.title}`,
      description: `Result scorecard delivered for ${attempt.studentName} (${attempt.rollNumber})`,
      message: `Score: ${result.percentage}% - Status: ${verdict}`,
      recipientEmail: attempt.email,
      type: 'exam_result',
      status: 'unread',
      createdAt: new Date().toISOString()
    } as any);
  } catch (err) {
    console.error('Failed to log result notification:', err);
  }

  // Log admin audit entry for result dispatch
  try {
    await logAdminAudit(exam.id, 'system_email_service', 'START', {
      action: 'RESULT_EMAIL_SENT',
      recipient: attempt.email,
      studentName: attempt.studentName,
      verdict,
      score: result.score,
      percentage: result.percentage
    }, attempt.id);
  } catch (err) {
    console.error('Failed to log email audit:', err);
  }
}

/**
 * Sends a separate selection / qualification email when Admin marks candidate as selected.
 */
export async function sendCandidateSelectionEmail(
  attempt: ExamAttempt,
  exam: Exam,
  notes: string = ''
): Promise<void> {
  // Dispatch via central email automation engine (with error isolation)
  try {
    await triggerExamSelectionEmail({
      studentName: attempt.studentName,
      email: attempt.email,
      rollNumber: attempt.rollNumber,
      exam: {
        id: exam.id,
        title: exam.title
      },
      selectionNotes: notes
    });
  } catch (emailErr) {
    console.error('Non-blocking error dispatching candidate selection email:', emailErr);
  }

  try {
    await logAdminAudit(exam.id, 'admin', 'START', {
      action: 'SELECTION_EMAIL_SENT',
      recipient: attempt.email,
      studentName: attempt.studentName,
      notes
    }, attempt.id);
  } catch (err) {
    console.error('Failed to log selection email notification:', err);
  }
}

/**
 * Server-side exam evaluation.
 * Calculates score, percentage, passed status and triggers candidate result email.
 * NO certificate is generated or stored.
 */
export async function evaluateExamSubmission(
  exam: Exam,
  attempt: ExamAttempt,
  reason: SubmissionReason = 'MANUAL'
): Promise<{
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
}> {
  let earnedMarks = 0;
  let maxMarks = 0;

  const questionsMap = new Map<string, Question>();
  for (const q of exam.questions || []) {
    questionsMap.set(q.id, q);
    maxMarks += Number(q.marks) || 1;
  }

  const answers = attempt.answers || {};
  for (const [qId, selectedIdx] of Object.entries(answers)) {
    const question = questionsMap.get(qId);
    if (question && Number(selectedIdx) === question.correctOptionIndex) {
      earnedMarks += Number(question.marks) || 1;
    }
  }

  if (maxMarks === 0) maxMarks = 100;
  const percentage = Math.round((earnedMarks / maxMarks) * 100);
  const passed = percentage >= (exam.passingPercentage || 60);

  const result = {
    score: earnedMarks,
    totalMarks: maxMarks,
    percentage,
    passed
  };

  // Dispatch candidate result email asynchronously
  await sendCandidateResultEmail(attempt, exam, result);

  return result;
}

/**
 * Server-side Security Event Logger.
 * Evaluates whether security violations exceed the exam threshold to trigger auto-submit.
 */
export async function logSecurityEvent(
  attemptId: string,
  eventType: SecurityEventType,
  severity: SecuritySeverity,
  metadata: Record<string, any> = {}
): Promise<{ violationCount: number; shouldAutoSubmit: boolean }> {
  const attempt = await db.examAttempts.getById(attemptId);
  if (!attempt) {
    return { violationCount: 0, shouldAutoSubmit: false };
  }

  const exam = await db.exams.getById(attempt.examId);
  const maxViolations = exam?.maxSecurityViolations || 3;

  const event: ExamSecurityEvent = {
    id: `sec_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    attemptId,
    examId: attempt.examId,
    studentName: attempt.studentName,
    rollNumber: attempt.rollNumber,
    eventType,
    severity,
    metadata,
    timestamp: new Date().toISOString()
  };

  await db.examSecurityLogs.insertOne(event);

  const isViolation = severity === 'WARNING' || severity === 'CRITICAL' || eventType === 'FULLSCREEN_EXIT' || eventType === 'TAB_BLUR' || eventType === 'UNAUTHORIZED_KEY';
  const newViolationCount = isViolation ? (attempt.securityViolationsCount || 0) + 1 : (attempt.securityViolationsCount || 0);

  if (isViolation) {
    await db.examAttempts.updateOne(attemptId, {
      securityViolationsCount: newViolationCount
    });
  }

  const shouldAutoSubmit = isViolation && newViolationCount >= maxViolations && attempt.status === 'IN_EXAM';

  return {
    violationCount: newViolationCount,
    shouldAutoSubmit
  };
}

/**
 * Admin Audit Logger.
 */
export async function logAdminAudit(
  examId: string,
  adminUser: string,
  action: AdminActionType,
  details: Record<string, any> = {},
  attemptId?: string
) {
  const log: ExamAuditLog = {
    id: `audit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    examId,
    attemptId,
    adminUser,
    action,
    details,
    timestamp: new Date().toISOString()
  };

  await db.examAuditLogs.insertOne(log);
}

/**
 * Safe Exam Browser (.seb) Configuration Generator.
 * Generates an XML plist configuration compatible with SEB for Windows/macOS/iOS.
 */
export function generateSEBConfigXml(exam: Exam, siteUrl: string): string {
  const normalizedSiteUrl = (siteUrl || 'https://www.awssbgcuup.tech').replace(/\/+$/, '');
  const startUrl = `${normalizedSiteUrl}/exam`;
  const quitUrl = `${normalizedSiteUrl}/exam`;

  // Build unique allowed expressions list
  const allowedExpressions = Array.from(new Set([
    'https://www.awssbgcuup.tech/*',
    'https://www.awssbgcuup.tech',
    'https://awssbgcuup.tech/*',
    'https://awssbgcuup.tech',
    '*.awssbgcuup.tech/*',
    `${normalizedSiteUrl}/*`,
    normalizedSiteUrl,
    'https://fonts.googleapis.com/*',
    'https://fonts.gstatic.com/*'
  ]));

  const rulesXml = allowedExpressions
    .map(
      (expr) => `        <dict>
            <key>action</key>
            <integer>1</integer>
            <key>active</key>
            <true/>
            <key>expression</key>
            <string>${expr}</string>
            <key>regex</key>
            <false/>
        </dict>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>startURL</key>
    <string>${startUrl}</string>
    <key>examKeySalt</key>
    <data></data>
    <key>browserExamKey</key>
    <string></string>
    <key>allowQuit</key>
    <true/>
    <key>quitURL</key>
    <string>${quitUrl}</string>
    <key>allowPreferencesWindow</key>
    <false/>
    <key>allowDeveloperConsole</key>
    <false/>
    <key>allowSpellCheck</key>
    <false/>
    <key>allowWlan</key>
    <false/>
    <key>allowVirtualMachine</key>
    <false/>
    <key>enableAltEsc</key>
    <false/>
    <key>enableAltF4</key>
    <false/>
    <key>enableAltTab</key>
    <false/>
    <key>enableCtrlEsc</key>
    <false/>
    <key>enableF1</key>
    <false/>
    <key>enableF2</key>
    <false/>
    <key>enableF3</key>
    <false/>
    <key>enableF4</key>
    <false/>
    <key>enableF5</key>
    <false/>
    <key>enableF6</key>
    <false/>
    <key>enableF7</key>
    <false/>
    <key>enableF8</key>
    <false/>
    <key>enableF9</key>
    <false/>
    <key>enableF10</key>
    <false/>
    <key>enableF11</key>
    <false/>
    <key>enableF12</key>
    <false/>
    <key>enablePrintScreen</key>
    <false/>
    <key>enableRightMouse</key>
    <false/>
    <key>prohibitedProcesses</key>
    <array>
        <dict>
            <key>active</key>
            <true/>
            <key>currentUser</key>
            <true/>
            <key>description</key>
            <string>Communication &amp; Remote Access</string>
            <key>executable</key>
            <string>Discord.exe</string>
            <key>originalName</key>
            <string>Discord.exe</string>
        </dict>
        <dict>
            <key>active</key>
            <true/>
            <key>currentUser</key>
            <true/>
            <key>description</key>
            <string>Remote Desktop</string>
            <key>executable</key>
            <string>AnyDesk.exe</string>
            <key>originalName</key>
            <string>AnyDesk.exe</string>
        </dict>
        <dict>
            <key>active</key>
            <true/>
            <key>currentUser</key>
            <true/>
            <key>description</key>
            <string>TeamViewer</string>
            <key>executable</key>
            <string>TeamViewer.exe</string>
            <key>originalName</key>
            <string>TeamViewer.exe</string>
        </dict>
        <dict>
            <key>active</key>
            <true/>
            <key>currentUser</key>
            <true/>
            <key>description</key>
            <string>Screen Recording</string>
            <key>executable</key>
            <string>obs64.exe</string>
            <key>originalName</key>
            <string>obs64.exe</string>
        </dict>
        <dict>
            <key>active</key>
            <true/>
            <key>currentUser</key>
            <true/>
            <key>description</key>
            <string>Zoom Meetings</string>
            <key>executable</key>
            <string>Zoom.exe</string>
            <key>originalName</key>
            <string>Zoom.exe</string>
        </dict>
        <dict>
            <key>active</key>
            <true/>
            <key>currentUser</key>
            <true/>
            <key>description</key>
            <string>WhatsApp</string>
            <key>executable</key>
            <string>WhatsApp.exe</string>
            <key>originalName</key>
            <string>WhatsApp.exe</string>
        </dict>
        <dict>
            <key>active</key>
            <true/>
            <key>currentUser</key>
            <true/>
            <key>description</key>
            <string>Telegram</string>
            <key>executable</key>
            <string>Telegram.exe</string>
            <key>originalName</key>
            <string>Telegram.exe</string>
        </dict>
    </array>
    <key>URLFilterEnable</key>
    <true/>
    <key>URLFilterEnableContentFilter</key>
    <false/>
    <key>URLFilterRules</key>
    <array>
${rulesXml}
    </array>
</dict>
</plist>`;
}

