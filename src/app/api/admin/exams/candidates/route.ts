import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  provisionExamCandidate,
  regenerateCandidatePassword,
  sendCandidateCredentialsEmail,
  logAdminAudit
} from '@/lib/exam';
import { ExamCandidate, Exam } from '@/types/exam';

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

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized administrative access.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');

    let candidates = examId
      ? await db.examCandidates.getByExamId(examId)
      : await db.examCandidates.getAll();

    // Enrich candidates with live attempt status
    const allAttempts = await db.examAttempts.getAll();
    const enriched = candidates.map((cand: ExamCandidate) => {
      const attempt = allAttempts.find(
        (a: any) =>
          a.examId === cand.examId &&
          (a.email?.toLowerCase() === cand.email.toLowerCase() ||
            a.rollNumber?.toUpperCase() === cand.rollNumber.toUpperCase())
      );
      return {
        ...cand,
        attemptStatus: attempt ? attempt.status : 'NOT_ENTERED',
        attemptId: attempt ? attempt.id : null,
        securityViolationsCount: attempt ? attempt.securityViolationsCount || 0 : 0
      };
    });

    const stats = {
      total: enriched.length,
      active: enriched.filter((c: any) => c.status === 'Active').length,
      revoked: enriched.filter((c: any) => c.status === 'Revoked').length,
      emailsSent: enriched.filter((c: any) => c.emailSentStatus === 'Sent').length,
      emailsPending: enriched.filter((c: any) => c.emailSentStatus !== 'Sent').length,
      waitingUnlock: enriched.filter((c: any) => c.attemptStatus === 'LOCKED').length,
      inExam: enriched.filter((c: any) => c.attemptStatus === 'IN_EXAM').length,
      submitted: enriched.filter((c: any) => c.attemptStatus === 'SUBMITTED' || c.attemptStatus === 'REVIEW_REQUIRED').length
    };

    return NextResponse.json({ candidates: enriched, stats }, { headers: noStoreHeaders });
  } catch (error: any) {
    console.error('Admin candidates GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch candidate records.' },
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
    const { action, examId, candidateId, candidateIds } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required.' }, { status: 400, headers: noStoreHeaders });
    }

    // 1. Create or Provision single candidate
    if (action === 'create-candidate' || action === 'add-candidate') {
      const { studentName, rollNumber, email, customPassword, sendEmailNow } = body;
      if (!examId || !studentName?.trim() || !rollNumber?.trim() || !email?.trim()) {
        return NextResponse.json(
          { error: 'Exam ID, Candidate Name, Roll Number, and University Email are required.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      const exam = await db.exams.getById(examId);
      if (!exam) {
        return NextResponse.json({ error: 'Exam not found.' }, { status: 404, headers: noStoreHeaders });
      }

      const candidate = await provisionExamCandidate({
        examId,
        studentName: studentName.trim(),
        rollNumber: rollNumber.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
        customPassword: customPassword?.trim() || undefined
      });

      if (sendEmailNow) {
        const host = request.headers.get('host') || 'www.awssbgcuup.tech';
        const proto = request.headers.get('x-forwarded-proto') || 'https';
        await sendCandidateCredentialsEmail(candidate, exam, `${proto}://${host}`);
      }

      await logAdminAudit(examId, 'admin', 'GENERATE_CREDENTIALS', {
        candidateId: candidate.id,
        email: candidate.email,
        studentName: candidate.studentName
      });

      return NextResponse.json({ success: true, candidate }, { headers: noStoreHeaders });
    }

    // 2. Regenerate Candidate Password (invalidates previous password)
    if (action === 'regenerate-password') {
      if (!candidateId) {
        return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400, headers: noStoreHeaders });
      }

      const updated = await regenerateCandidatePassword(candidateId);
      if (!updated) {
        return NextResponse.json({ error: 'Candidate not found.' }, { status: 404, headers: noStoreHeaders });
      }

      const { sendEmailNow } = body;
      if (sendEmailNow) {
        const exam = await db.exams.getById(updated.examId);
        if (exam) {
          const host = request.headers.get('host') || 'www.awssbgcuup.tech';
          const proto = request.headers.get('x-forwarded-proto') || 'https';
          await sendCandidateCredentialsEmail(updated, exam, `${proto}://${host}`);
        }
      }

      await logAdminAudit(updated.examId, 'admin', 'REGENERATE_PASSWORD', {
        candidateId,
        email: updated.email
      });

      return NextResponse.json({ success: true, candidate: updated }, { headers: noStoreHeaders });
    }

    // 3. Send / Resend Credentials Email
    if (action === 'send-credentials') {
      const targetIds = candidateIds || (candidateId ? [candidateId] : []);
      if (!Array.isArray(targetIds) || targetIds.length === 0) {
        return NextResponse.json({ error: 'Candidate ID(s) required.' }, { status: 400, headers: noStoreHeaders });
      }

      const host = request.headers.get('host') || 'www.awssbgcuup.tech';
      const proto = request.headers.get('x-forwarded-proto') || 'https';
      const siteUrl = `${proto}://${host}`;

      let successCount = 0;
      let failCount = 0;

      for (const id of targetIds) {
        const candidate = await db.examCandidates.getById(id);
        if (candidate) {
          const exam = await db.exams.getById(candidate.examId);
          if (exam) {
            const res = await sendCandidateCredentialsEmail(candidate, exam, siteUrl);
            if (res.success) successCount++;
            else failCount++;
          }
        }
      }

      await logAdminAudit(examId || '', 'admin', 'SEND_CREDENTIALS', {
        targetIds,
        successCount,
        failCount
      });

      return NextResponse.json(
        { success: true, count: successCount, failed: failCount },
        { headers: noStoreHeaders }
      );
    }

    // 4. Auto-provision from Event Registrations
    if (action === 'auto-provision-from-events') {
      if (!examId) {
        return NextResponse.json({ error: 'Exam ID is required.' }, { status: 400, headers: noStoreHeaders });
      }

      const exam = await db.exams.getById(examId);
      if (!exam) {
        return NextResponse.json({ error: 'Exam not found.' }, { status: 404, headers: noStoreHeaders });
      }

      const eventRegs = await db.eventRegistrations.getAll();
      const eligible = eventRegs.filter(
        (r: any) => r.status !== 'Rejected' && r.status !== 'Cancelled' && r.email && r.name
      );

      let provisionedCount = 0;
      for (const reg of eligible) {
        const existing = await db.examCandidates.getByEmailAndExam(reg.email, examId);
        if (!existing) {
          await provisionExamCandidate({
            examId,
            studentName: reg.name,
            rollNumber: reg.studentId || `STU-${Date.now().toString().slice(-4)}`,
            email: reg.email
          });
          provisionedCount++;
        }
      }

      await logAdminAudit(examId, 'admin', 'GENERATE_CREDENTIALS', {
        action: 'AUTO_PROVISION_FROM_EVENTS',
        count: provisionedCount
      });

      return NextResponse.json({ success: true, count: provisionedCount }, { headers: noStoreHeaders });
    }

    // 5. Revoke Candidate Access
    if (action === 'revoke') {
      if (!candidateId) {
        return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400, headers: noStoreHeaders });
      }

      const updated = await db.examCandidates.updateOne(candidateId, { status: 'Revoked' });
      await logAdminAudit(updated?.examId || '', 'admin', 'REVOKE_CREDENTIALS', { candidateId });
      return NextResponse.json({ success: true, candidate: updated }, { headers: noStoreHeaders });
    }

    // 6. Activate Candidate Access
    if (action === 'activate') {
      if (!candidateId) {
        return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400, headers: noStoreHeaders });
      }

      const updated = await db.examCandidates.updateOne(candidateId, { status: 'Active' });
      return NextResponse.json({ success: true, candidate: updated }, { headers: noStoreHeaders });
    }

    // 7. Delete Candidate Record
    if (action === 'delete') {
      if (!candidateId) {
        return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400, headers: noStoreHeaders });
      }

      await db.examCandidates.deleteById(candidateId);
      return NextResponse.json({ success: true, candidateId }, { headers: noStoreHeaders });
    }

    return NextResponse.json({ error: 'Unknown candidate action.' }, { status: 400, headers: noStoreHeaders });
  } catch (error: any) {
    console.error('Admin candidates POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Operation failed.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
