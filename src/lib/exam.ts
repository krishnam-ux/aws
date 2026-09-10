import crypto from 'crypto';
import { db } from '@/lib/db';
import {
  Exam,
  ExamAttempt,
  ExamSecurityEvent,
  ExamAuditLog,
  Question,
  SecurityEventType,
  SecuritySeverity,
  AdminActionType,
  SubmissionReason
} from '@/types/exam';
import { generateCertificateId, generateCertificatePdfBuffer } from '@/lib/certificates';

export function generateSessionToken(): string {
  return `sess_${crypto.randomBytes(32).toString('hex')}`;
}

export function generateAttemptId(): string {
  return `att_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Sanitize exam payload for public/student consumption.
 * STRICT SECURITY: Correct answers and explanations are stripped.
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
 */
export function calculateRemainingSeconds(attempt: ExamAttempt, exam: Exam): number {
  if (attempt.status === 'SUBMITTED' || attempt.status === 'REVIEW_REQUIRED') {
    return 0;
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
 * Server-side exam evaluation.
 * Calculates score, percentage, passed status, and generates certificate record if passed.
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
  certificateId?: string;
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

  let certificateId: string | undefined = undefined;

  if (passed) {
    certificateId = await generateCertificateId(attempt.id, exam.id, attempt.studentName);

    // Save permanent certificate in certificates collection
    try {
      await db.certificates.insertOne({
        id: `cert-${Date.now()}-${attempt.id}`,
        certificateId,
        eventId: exam.id,
        registrationId: attempt.id,
        studentName: attempt.studentName,
        eventName: `${exam.title} Certification`,
        eventDate: new Date().toISOString().slice(0, 10),
        venue: 'Chandigarh University – Uttar Pradesh (Secure Assessment Portal)',
        issueDate: new Date().toISOString().slice(0, 10),
        status: 'Valid',
        score: percentage,
        createdAt: new Date().toISOString()
      });
    } catch (certErr) {
      console.error('Failed to create certificate in db:', certErr);
    }
  }

  return {
    score: earnedMarks,
    totalMarks: maxMarks,
    percentage,
    passed,
    certificateId
  };
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
  const targetUrl = `${siteUrl}/exam/${exam.id}`;
  const quitUrl = `${siteUrl}/exam/${exam.id}/finished`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>startURL</key>
    <string>${targetUrl}</string>
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
    <key>URLFilterEnable</key>
    <true/>
    <key>URLFilterRules</key>
    <array>
        <dict>
            <key>action</key>
            <integer>1</integer>
            <key>active</key>
            <true/>
            <key>expression</key>
            <string>${siteUrl}/*</string>
            <key>regex</key>
            <false/>
        </dict>
        <dict>
            <key>action</key>
            <integer>0</integer>
            <key>active</key>
            <true/>
            <key>expression</key>
            <string>*</string>
            <key>regex</key>
            <false/>
        </dict>
    </array>
</dict>
</plist>`;
}
