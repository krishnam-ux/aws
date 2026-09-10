import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { evaluateExamSubmission, logAdminAudit } from '@/lib/exam';
import { ExamAttempt, Exam } from '@/types/exam';

export const dynamic = 'force-dynamic';

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  return authHeader.substring(7) === SECURE_TOKEN;
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized administrative access.' }, { status: 401 });
    }

    const body = await request.json();
    const { action, examId, candidateId, candidateIds, minutes = 5, notes = '' } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required.' }, { status: 400 });
    }

    // 1. Verify candidate
    if (action === 'verify') {
      if (!candidateId) return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400 });
      await db.examAttempts.updateOne(candidateId, {
        status: 'VERIFIED',
        verifiedAt: new Date().toISOString()
      });
      await logAdminAudit(examId || '', 'admin', 'VERIFY', { candidateId }, candidateId);
      return NextResponse.json({ success: true, action: 'verify' });
    }

    // 2. Unlock single candidate
    if (action === 'unlock') {
      if (!candidateId) return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400 });
      await db.examAttempts.updateOne(candidateId, {
        status: 'UNLOCKED',
        unlockedAt: new Date().toISOString()
      });
      await logAdminAudit(examId || '', 'admin', 'UNLOCK', { candidateId }, candidateId);
      return NextResponse.json({ success: true, action: 'unlock' });
    }

    // 3. Bulk unlock
    if (action === 'bulk-unlock') {
      if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
        return NextResponse.json({ error: 'Candidate IDs array is required.' }, { status: 400 });
      }
      for (const id of candidateIds) {
        await db.examAttempts.updateOne(id, {
          status: 'UNLOCKED',
          unlockedAt: new Date().toISOString()
        });
      }
      await logAdminAudit(examId || '', 'admin', 'BULK_UNLOCK', { candidateIds, count: candidateIds.length });
      return NextResponse.json({ success: true, action: 'bulk-unlock', count: candidateIds.length });
    }

    // 4. Unlock All (all locked or verified candidates for this exam)
    if (action === 'unlock-all') {
      if (!examId) return NextResponse.json({ error: 'Exam ID is required.' }, { status: 400 });
      const attempts = await db.examAttempts.getByExamId(examId);
      const eligible = attempts.filter((a: ExamAttempt) => a.status === 'LOCKED' || a.status === 'VERIFIED');
      for (const a of eligible) {
        await db.examAttempts.updateOne(a.id, {
          status: 'UNLOCKED',
          unlockedAt: new Date().toISOString()
        });
      }
      await logAdminAudit(examId, 'admin', 'UNLOCK_ALL', { count: eligible.length });
      return NextResponse.json({ success: true, action: 'unlock-all', count: eligible.length });
    }

    // 5. Lock candidate
    if (action === 'lock') {
      if (!candidateId) return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400 });
      await db.examAttempts.updateOne(candidateId, {
        status: 'LOCKED'
      });
      await logAdminAudit(examId || '', 'admin', 'LOCK', { candidateId }, candidateId);
      return NextResponse.json({ success: true, action: 'lock' });
    }

    // 6. Start single candidate
    if (action === 'start') {
      if (!candidateId) return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400 });
      const attempt = await db.examAttempts.getById(candidateId);
      if (!attempt) return NextResponse.json({ error: 'Candidate attempt not found.' }, { status: 404 });

      const exam = await db.exams.getById(attempt.examId);
      const totalMinutes = (exam?.durationMinutes || 30) + (attempt.extendedMinutes || 0);
      const now = new Date();

      await db.examAttempts.updateOne(candidateId, {
        status: 'IN_EXAM',
        startedAt: attempt.startedAt || now.toISOString(),
        expiresAt: new Date(now.getTime() + totalMinutes * 60 * 1000).toISOString()
      });
      await logAdminAudit(attempt.examId, 'admin', 'START', { candidateId }, candidateId);
      return NextResponse.json({ success: true, action: 'start' });
    }

    // 7. Start selected
    if (action === 'start-selected') {
      if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
        return NextResponse.json({ error: 'Candidate IDs array is required.' }, { status: 400 });
      }
      for (const id of candidateIds) {
        const attempt = await db.examAttempts.getById(id);
        if (attempt && (attempt.status === 'UNLOCKED' || attempt.status === 'PAUSED')) {
          const exam = await db.exams.getById(attempt.examId);
          const totalMinutes = (exam?.durationMinutes || 30) + (attempt.extendedMinutes || 0);
          const now = new Date();
          await db.examAttempts.updateOne(id, {
            status: 'IN_EXAM',
            startedAt: attempt.startedAt || now.toISOString(),
            expiresAt: new Date(now.getTime() + totalMinutes * 60 * 1000).toISOString()
          });
        }
      }
      await logAdminAudit(examId || '', 'admin', 'START_SELECTED', { candidateIds });
      return NextResponse.json({ success: true, action: 'start-selected', count: candidateIds.length });
    }

    // 8. Start All (all unlocked candidates for this exam)
    if (action === 'start-all') {
      if (!examId) return NextResponse.json({ error: 'Exam ID is required.' }, { status: 400 });
      const attempts = await db.examAttempts.getByExamId(examId);
      const eligible = attempts.filter((a: ExamAttempt) => a.status === 'UNLOCKED' || a.status === 'PAUSED');
      const exam = await db.exams.getById(examId);
      const now = new Date();

      for (const a of eligible) {
        const totalMinutes = (exam?.durationMinutes || 30) + (a.extendedMinutes || 0);
        await db.examAttempts.updateOne(a.id, {
          status: 'IN_EXAM',
          startedAt: a.startedAt || now.toISOString(),
          expiresAt: new Date(now.getTime() + totalMinutes * 60 * 1000).toISOString()
        });
      }
      await logAdminAudit(examId, 'admin', 'START_ALL', { count: eligible.length });
      return NextResponse.json({ success: true, action: 'start-all', count: eligible.length });
    }

    // 9. Pause exam
    if (action === 'pause') {
      if (!candidateId) return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400 });
      await db.examAttempts.updateOne(candidateId, { status: 'PAUSED' });
      await logAdminAudit(examId || '', 'admin', 'PAUSE', { candidateId }, candidateId);
      return NextResponse.json({ success: true, action: 'pause' });
    }

    // 10. Resume exam
    if (action === 'resume') {
      if (!candidateId) return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400 });
      await db.examAttempts.updateOne(candidateId, { status: 'IN_EXAM' });
      await logAdminAudit(examId || '', 'admin', 'RESUME', { candidateId }, candidateId);
      return NextResponse.json({ success: true, action: 'resume' });
    }

    // 11. Extend Time
    if (action === 'extend-time') {
      if (!candidateId) return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400 });
      const attempt = await db.examAttempts.getById(candidateId);
      if (!attempt) return NextResponse.json({ error: 'Candidate attempt not found.' }, { status: 404 });

      const addMinutes = Number(minutes) || 5;
      const newExtended = (attempt.extendedMinutes || 0) + addMinutes;

      let newExpiresAt = attempt.expiresAt;
      if (attempt.expiresAt) {
        newExpiresAt = new Date(new Date(attempt.expiresAt).getTime() + addMinutes * 60 * 1000).toISOString();
      }

      await db.examAttempts.updateOne(candidateId, {
        extendedMinutes: newExtended,
        expiresAt: newExpiresAt
      });
      await logAdminAudit(attempt.examId, 'admin', 'EXTEND_TIME', { candidateId, addMinutes, totalExtended: newExtended }, candidateId);
      return NextResponse.json({ success: true, action: 'extend-time', extendedMinutes: newExtended });
    }

    // 12. Force Submit
    if (action === 'force-submit') {
      if (!candidateId) return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400 });
      const attempt = await db.examAttempts.getById(candidateId);
      if (!attempt) return NextResponse.json({ error: 'Candidate attempt not found.' }, { status: 404 });

      const exam = await db.exams.getById(attempt.examId);
      if (!exam) return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });

      const result = await evaluateExamSubmission(exam, attempt, 'ADMIN_FORCE_SUBMIT');

      await db.examAttempts.updateOne(candidateId, {
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString(),
        submissionReason: 'ADMIN_FORCE_SUBMIT',
        score: result.score,
        totalMarks: result.totalMarks,
        percentage: result.percentage,
        passed: result.passed,
        adminNotes: notes || attempt.adminNotes || ''
      });

      await logAdminAudit(attempt.examId, 'admin', 'FORCE_SUBMIT', { candidateId, score: result.score, passed: result.passed }, candidateId);
      return NextResponse.json({ success: true, action: 'force-submit', result });
    }

    // 13. Mark Selected / Qualified and Send Selection Email
    if (action === 'mark-selected') {
      if (!candidateId) return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400 });
      const attempt = await db.examAttempts.getById(candidateId);
      if (!attempt) return NextResponse.json({ error: 'Candidate attempt not found.' }, { status: 404 });

      const exam = await db.exams.getById(attempt.examId);
      if (!exam) return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });

      const selectionNote = notes || 'Selected & Qualified by Proctor';
      await db.examAttempts.updateOne(candidateId, {
        adminNotes: selectionNote
      });

      const { sendCandidateSelectionEmail } = await import('@/lib/exam');
      await sendCandidateSelectionEmail(attempt, exam, selectionNote);

      return NextResponse.json({ success: true, action: 'mark-selected' });
    }

    // 14. Delete / Reset Attempt
    if (action === 'delete-attempt') {
      if (!candidateId) return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400 });
      await db.examAttempts.deleteById(candidateId);
      await logAdminAudit(examId || '', 'admin', 'RESET_ATTEMPT', { candidateId }, candidateId);
      return NextResponse.json({ success: true, action: 'delete-attempt' });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin exam control error:', error);
    return NextResponse.json({ error: error.message || 'Control operation failed.' }, { status: 500 });
  }
}
