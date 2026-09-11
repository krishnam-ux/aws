import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { evaluateExamSubmission, logAdminAudit } from '@/lib/exam';
import { ExamAttempt, Exam } from '@/types/exam';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  return authHeader.substring(7) === SECURE_TOKEN;
}

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized administrative access.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const body = await request.json();
    const { action, examId, candidateId, candidateIds, minutes = 5, notes = '' } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    // 1. Verify candidate
    if (action === 'verify') {
      if (!candidateId) return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400, headers: noStoreHeaders });
      await db.examAttempts.updateOne(candidateId, {
        status: 'VERIFIED',
        verifiedAt: new Date().toISOString()
      });
      await logAdminAudit(examId || '', 'admin', 'VERIFY', { candidateId }, candidateId);
      return NextResponse.json({ success: true, action: 'verify' }, { headers: noStoreHeaders });
    }

    // 2. Unlock single candidate
    if (action === 'unlock') {
      if (!candidateId) return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400, headers: noStoreHeaders });
      await db.examAttempts.updateOne(candidateId, {
        status: 'UNLOCKED',
        unlockedAt: new Date().toISOString()
      });
      await logAdminAudit(examId || '', 'admin', 'UNLOCK', { candidateId }, candidateId);
      return NextResponse.json({ success: true, action: 'unlock' }, { headers: noStoreHeaders });
    }

    // 3. Bulk unlock
    if (action === 'bulk-unlock') {
      if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
        return NextResponse.json({ error: 'Candidate IDs array is required.' }, { status: 400, headers: noStoreHeaders });
      }
      for (const id of candidateIds) {
        await db.examAttempts.updateOne(id, {
          status: 'UNLOCKED',
          unlockedAt: new Date().toISOString()
        });
      }
      await logAdminAudit(examId || '', 'admin', 'BULK_UNLOCK', { candidateIds, count: candidateIds.length });
      return NextResponse.json({ success: true, action: 'bulk-unlock', count: candidateIds.length }, { headers: noStoreHeaders });
    }

    // 4. Unlock All (all locked or verified candidates for this exam)
    if (action === 'unlock-all') {
      if (!examId) return NextResponse.json({ error: 'Exam ID is required.' }, { status: 400, headers: noStoreHeaders });
      const attempts = await db.examAttempts.getByExamId(examId);
      const eligible = attempts.filter((a: ExamAttempt) => a.status === 'LOCKED' || a.status === 'VERIFIED');
      for (const a of eligible) {
        await db.examAttempts.updateOne(a.id, {
          status: 'UNLOCKED',
          unlockedAt: new Date().toISOString()
        });
      }
      await logAdminAudit(examId, 'admin', 'UNLOCK_ALL', { count: eligible.length });
      return NextResponse.json({ success: true, action: 'unlock-all', count: eligible.length }, { headers: noStoreHeaders });
    }

    // 5. Lock candidate
    if (action === 'lock') {
      if (!candidateId) return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400, headers: noStoreHeaders });
      await db.examAttempts.updateOne(candidateId, {
        status: 'LOCKED'
      });
      await logAdminAudit(examId || '', 'admin', 'LOCK', { candidateId }, candidateId);
      return NextResponse.json({ success: true, action: 'lock' }, { headers: noStoreHeaders });
    }

    // 6. Start single candidate
    if (action === 'start') {
      if (!candidateId) return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400, headers: noStoreHeaders });
      const attempt = await db.examAttempts.getById(candidateId);
      if (!attempt) return NextResponse.json({ error: 'Candidate attempt not found.' }, { status: 404, headers: noStoreHeaders });

      const exam = await db.exams.getById(attempt.examId);
      const totalMinutes = (exam?.durationMinutes || 30) + (attempt.extendedMinutes || 0);
      const now = new Date();

      await db.examAttempts.updateOne(candidateId, {
        status: 'IN_EXAM',
        startedAt: attempt.startedAt || now.toISOString(),
        expiresAt: new Date(now.getTime() + totalMinutes * 60 * 1000).toISOString()
      });
      await logAdminAudit(attempt.examId, 'admin', 'START', { candidateId }, candidateId);
      return NextResponse.json({ success: true, action: 'start' }, { headers: noStoreHeaders });
    }

    // 7. Start selected
    if (action === 'start-selected') {
      if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
        return NextResponse.json({ error: 'Candidate IDs array is required.' }, { status: 400, headers: noStoreHeaders });
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
      return NextResponse.json({ success: true, action: 'start-selected', count: candidateIds.length }, { headers: noStoreHeaders });
    }

    // 8. Start All (all unlocked candidates for this exam)
    if (action === 'start-all') {
      if (!examId) return NextResponse.json({ error: 'Exam ID is required.' }, { status: 400, headers: noStoreHeaders });
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
      return NextResponse.json({ success: true, action: 'start-all', count: eligible.length }, { headers: noStoreHeaders });
    }

    // 9. Pause exam
    if (action === 'pause') {
      if (!candidateId) return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400, headers: noStoreHeaders });
      await db.examAttempts.updateOne(candidateId, { status: 'PAUSED' });
      await logAdminAudit(examId || '', 'admin', 'PAUSE', { candidateId }, candidateId);
      return NextResponse.json({ success: true, action: 'pause' }, { headers: noStoreHeaders });
    }

    // 10. Resume exam
    if (action === 'resume') {
      if (!candidateId) return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400, headers: noStoreHeaders });
      await db.examAttempts.updateOne(candidateId, { status: 'IN_EXAM' });
      await logAdminAudit(examId || '', 'admin', 'RESUME', { candidateId }, candidateId);
      return NextResponse.json({ success: true, action: 'resume' }, { headers: noStoreHeaders });
    }

    // 11. Extend Time
    if (action === 'extend-time') {
      if (!candidateId) return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400, headers: noStoreHeaders });
      const attempt = await db.examAttempts.getById(candidateId);
      if (!attempt) return NextResponse.json({ error: 'Candidate attempt not found.' }, { status: 404, headers: noStoreHeaders });

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
      return NextResponse.json({ success: true, action: 'extend-time', extendedMinutes: newExtended }, { headers: noStoreHeaders });
    }

    // 12. Force Submit
    if (action === 'force-submit') {
      if (!candidateId) return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400, headers: noStoreHeaders });
      const attempt = await db.examAttempts.getById(candidateId);
      if (!attempt) return NextResponse.json({ error: 'Candidate attempt not found.' }, { status: 404, headers: noStoreHeaders });

      const exam = await db.exams.getById(attempt.examId);
      if (!exam) return NextResponse.json({ error: 'Exam not found.' }, { status: 404, headers: noStoreHeaders });

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
      return NextResponse.json({ success: true, action: 'force-submit', result }, { headers: noStoreHeaders });
    }

    // 13. Mark Selected / Qualified and Send Selection Email
    if (action === 'mark-selected') {
      if (!candidateId) return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400, headers: noStoreHeaders });
      const attempt = await db.examAttempts.getById(candidateId);
      if (!attempt) return NextResponse.json({ error: 'Candidate attempt not found.' }, { status: 404, headers: noStoreHeaders });

      const exam = await db.exams.getById(attempt.examId);
      if (!exam) return NextResponse.json({ error: 'Exam not found.' }, { status: 404, headers: noStoreHeaders });

      const selectionNote = notes || 'Selected & Qualified by Proctor';
      await db.examAttempts.updateOne(candidateId, {
        adminNotes: selectionNote
      });

      const { sendCandidateSelectionEmail } = await import('@/lib/exam');
      await sendCandidateSelectionEmail(attempt, exam, selectionNote);

      return NextResponse.json({ success: true, action: 'mark-selected' }, { headers: noStoreHeaders });
    }

    // 14. Delete Single Candidate / Reset Attempt
    if (action === 'delete-candidate' || action === 'delete-attempt') {
      if (!candidateId) return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400, headers: noStoreHeaders });
      const attempt = await db.examAttempts.getById(candidateId);
      const examTargetId = attempt?.examId || examId || '';
      
      await db.examAttempts.deleteById(candidateId);
      await logAdminAudit(examTargetId, 'admin', 'RESET_ATTEMPT', {
        candidateId,
        studentName: attempt?.studentName,
        rollNumber: attempt?.rollNumber
      }, candidateId);
      
      return NextResponse.json({ success: true, action: 'delete-candidate', candidateId }, { headers: noStoreHeaders });
    }

    // 15. Bulk Delete Selected Candidates
    if (action === 'delete-candidates' || action === 'bulk-delete') {
      if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
        return NextResponse.json({ error: 'Candidate IDs array is required.' }, { status: 400, headers: noStoreHeaders });
      }
      const deletedCount = await db.examAttempts.deleteMany(candidateIds);
      await logAdminAudit(examId || '', 'admin', 'RESET_ATTEMPT', { candidateIds, count: deletedCount });
      return NextResponse.json({ success: true, action: 'delete-candidates', count: deletedCount }, { headers: noStoreHeaders });
    }

    // 16. Delete All Waiting / Unverified Candidates in Exam Lobby
    if (action === 'delete-waiting') {
      if (!examId) return NextResponse.json({ error: 'Exam ID is required.' }, { status: 400, headers: noStoreHeaders });
      const deletedCount = await db.examAttempts.deleteByExamId(examId, ['LOCKED', 'VERIFIED']);
      await logAdminAudit(examId, 'admin', 'RESET_ATTEMPT', { action: 'DELETE_WAITING', count: deletedCount });
      return NextResponse.json({ success: true, action: 'delete-waiting', count: deletedCount }, { headers: noStoreHeaders });
    }

    // 17. Delete All Candidates for this Exam
    if (action === 'delete-all-candidates') {
      if (!examId) return NextResponse.json({ error: 'Exam ID is required.' }, { status: 400, headers: noStoreHeaders });
      const deletedCount = await db.examAttempts.deleteByExamId(examId);
      await logAdminAudit(examId, 'admin', 'RESET_ATTEMPT', { action: 'DELETE_ALL_CANDIDATES', count: deletedCount });
      return NextResponse.json({ success: true, action: 'delete-all-candidates', count: deletedCount }, { headers: noStoreHeaders });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400, headers: noStoreHeaders });
  } catch (error: any) {
    console.error('Admin exam control error:', error);
    return NextResponse.json(
      { error: error.message || 'Control operation failed.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
