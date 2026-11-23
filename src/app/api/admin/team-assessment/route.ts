import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAuthorizedAdmin } from '@/lib/adminAuth';
import {
  generatePeriodId,
  calculateAverageAdminScore,
  calculateTeamAssessmentSummaryStats,
  validateAdminReviewPayload,
  generateAssessmentsCsv,
  logTeamAssessmentAuditAction
} from '@/lib/teamAssessment';
import {
  TeamAssessmentPeriod,
  TeamWorkAssessment,
  TeamWorkAdminReview,
  EvidenceVerificationStatus
} from '@/types/teamAssessment';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

export async function GET(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized administrative access.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'get-dashboard';
    const periodId = searchParams.get('periodId');
    const assessmentId = searchParams.get('assessmentId');
    const domainFilter = searchParams.get('domain');
    const statusFilter = searchParams.get('status');
    const roleFilter = searchParams.get('role');
    const search = searchParams.get('search')?.toLowerCase().trim();

    const periods: TeamAssessmentPeriod[] = await db.teamAssessmentPeriods.getAll();

    // 1. Export CSV Action
    if (action === 'export-csv') {
      const allAssessments: TeamWorkAssessment[] = await db.teamAssessments.getAll();
      let targetAssessments = allAssessments;
      if (periodId && periodId !== 'All') {
        targetAssessments = targetAssessments.filter(a => a.assessmentPeriodId === periodId);
      }
      if (domainFilter && domainFilter !== 'All') {
        targetAssessments = targetAssessments.filter(a => a.memberDomain === domainFilter);
      }
      if (statusFilter && statusFilter !== 'All') {
        targetAssessments = targetAssessments.filter(a => (a.adminReview?.finalStatus || a.status) === statusFilter);
      }

      const csvContent = generateAssessmentsCsv(targetAssessments);
      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="AWS_SBG_Team_Work_Assessments_${new Date().toISOString().slice(0, 10)}.csv"`,
          ...noStoreHeaders
        }
      });
    }

    // 2. Member Detail Report Action
    if (action === 'get-assessment-details' && assessmentId) {
      const assessment: TeamWorkAssessment | null = await db.teamAssessments.getById(assessmentId);
      if (!assessment) {
        return NextResponse.json(
          { error: 'Assessment not found.' },
          { status: 404, headers: noStoreHeaders }
        );
      }

      const period = periods.find(p => p.id === assessment.assessmentPeriodId);
      return NextResponse.json(
        {
          success: true,
          assessment,
          period: period || null
        },
        { status: 200, headers: noStoreHeaders }
      );
    }

    // 3. Periods List Action
    if (action === 'get-periods') {
      return NextResponse.json(
        {
          success: true,
          periods
        },
        { status: 200, headers: noStoreHeaders }
      );
    }

    // 4. Audit Logs Action
    if (action === 'get-audit-logs') {
      let logs = await db.teamAssessmentAuditLogs.getAll();
      if (periodId && periodId !== 'All') {
        logs = logs.filter((l: any) => l.assessmentPeriodId === periodId);
      }
      if (assessmentId) {
        logs = logs.filter((l: any) => l.assessmentId === assessmentId);
      }
      return NextResponse.json(
        {
          success: true,
          logs
        },
        { status: 200, headers: noStoreHeaders }
      );
    }

    // 5. Default Dashboard Data Action
    const activePeriod = (periodId && periodId !== 'All')
      ? periods.find(p => p.id === periodId)
      : periods.find(p => p.status === 'Active') || (periods.length > 0 ? periods[0] : null);

    const targetPeriodId = activePeriod?.id;
    let assessments: TeamWorkAssessment[] = await db.teamAssessments.getAll();

    if (targetPeriodId && periodId !== 'All') {
      assessments = assessments.filter(a => a.assessmentPeriodId === targetPeriodId);
    }

    // Apply Filters
    if (domainFilter && domainFilter !== 'All') {
      assessments = assessments.filter(a => a.memberDomain === domainFilter);
    }
    if (roleFilter && roleFilter !== 'All') {
      assessments = assessments.filter(a => a.memberRole === roleFilter);
    }
    if (statusFilter && statusFilter !== 'All') {
      assessments = assessments.filter(a => (a.adminReview?.finalStatus || a.status) === statusFilter);
    }
    if (search) {
      assessments = assessments.filter(
        a =>
          a.memberName?.toLowerCase().includes(search) ||
          a.memberEmail?.toLowerCase().includes(search) ||
          a.memberDomain?.toLowerCase().includes(search) ||
          a.memberRole?.toLowerCase().includes(search)
      );
    }

    const metrics = calculateTeamAssessmentSummaryStats(assessments);

    return NextResponse.json(
      {
        success: true,
        metrics,
        periods,
        activePeriod,
        assessments: assessments.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      },
      { status: 200, headers: noStoreHeaders }
    );
  } catch (error: any) {
    console.error('Admin team assessment GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch admin assessment data.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized administrative access.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const body = await request.json();
    const { action, assessmentId, period, review, evidenceItemId, verificationStatus, adminNotes, periodId, reason } = body;
    const adminUser = 'awsadmin@culko.in';
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const clientUa = request.headers.get('user-agent') || undefined;

    // 1. Save / Update Assessment Review Period
    if (action === 'save-period') {
      if (!period || !period.title) {
        return NextResponse.json(
          { error: 'Period title is required.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      if (period.id) {
        const existing = await db.teamAssessmentPeriods.getById(period.id);
        if (existing) {
          const updated = await db.teamAssessmentPeriods.updateOne(period.id, {
            ...period,
            eligibleMembers: Array.isArray(period.eligibleMembers) ? period.eligibleMembers : existing.eligibleMembers,
            updatedAt: new Date().toISOString()
          });

          await logTeamAssessmentAuditAction({
            action: 'UPDATE_PERIOD',
            assessmentPeriodId: period.id,
            adminUser,
            ipAddress: clientIp,
            userAgent: clientUa,
            details: { title: period.title, eligibleCount: period.eligibleMembers?.length || 0 }
          });

          return NextResponse.json({ success: true, period: updated }, { status: 200, headers: noStoreHeaders });
        }
      }

      const newPeriod: TeamAssessmentPeriod = {
        id: period.id || generatePeriodId(),
        title: period.title,
        description: period.description || '',
        startDate: period.startDate || new Date().toISOString().slice(0, 10),
        endDate: period.endDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        deadline: period.deadline || new Date(Date.now() + 25 * 86400000).toISOString().slice(0, 10),
        status: period.status || 'Active',
        eligibleMembers: Array.isArray(period.eligibleMembers) ? period.eligibleMembers : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.teamAssessmentPeriods.insertOne(newPeriod);

      await logTeamAssessmentAuditAction({
        action: 'CREATE_PERIOD',
        assessmentPeriodId: newPeriod.id,
        adminUser,
        ipAddress: clientIp,
        userAgent: clientUa,
        details: { title: newPeriod.title, eligibleCount: newPeriod.eligibleMembers?.length || 0 }
      });

      return NextResponse.json({ success: true, period: newPeriod }, { status: 200, headers: noStoreHeaders });
    }

    // 2. Save Admin Review & Scores
    if (action === 'save-review') {
      if (!assessmentId || !review) {
        return NextResponse.json(
          { error: 'Assessment ID and review data are required.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      const assessment: TeamWorkAssessment | null = await db.teamAssessments.getById(assessmentId);
      if (!assessment) {
        return NextResponse.json(
          { error: 'Assessment not found.' },
          { status: 404, headers: noStoreHeaders }
        );
      }

      const validation = validateAdminReviewPayload(review);
      if (!validation.isValid) {
        return NextResponse.json(
          { error: 'Review validation failed.', details: validation.errors },
          { status: 400, headers: noStoreHeaders }
        );
      }

      const calculatedAverageScore = calculateAverageAdminScore(review);
      const nowIso = new Date().toISOString();

      const adminReviewRecord: TeamWorkAdminReview = {
        workCompletionScore: Number(review.workCompletionScore),
        qualityScore: Number(review.qualityScore),
        ownershipScore: Number(review.ownershipScore),
        consistencyScore: Number(review.consistencyScore),
        communicationScore: Number(review.communicationScore),
        initiativeScore: Number(review.initiativeScore),
        overallScore: Number(review.overallScore),
        calculatedAverageScore,
        adminFeedback: review.adminFeedback || '',
        finalStatus: review.finalStatus,
        reviewedBy: adminUser,
        reviewedAt: nowIso,
        isPublishedToMember: Boolean(review.isPublishedToMember)
      };

      const updated = await db.teamAssessments.updateOne(assessmentId, {
        adminReview: adminReviewRecord,
        status: 'REVIEWED',
        updatedAt: nowIso
      });

      await logTeamAssessmentAuditAction({
        action: 'SAVE_REVIEW',
        assessmentId: assessment.id,
        assessmentPeriodId: assessment.assessmentPeriodId,
        memberEmail: assessment.memberEmail,
        memberName: assessment.memberName,
        adminUser,
        ipAddress: clientIp,
        userAgent: clientUa,
        details: {
          calculatedAverageScore,
          finalStatus: review.finalStatus,
          isPublishedToMember: Boolean(review.isPublishedToMember)
        }
      });

      return NextResponse.json(
        {
          success: true,
          assessment: updated,
          message: 'Admin review and performance scores recorded successfully.'
        },
        { status: 200, headers: noStoreHeaders }
      );
    }

    // 3. Verify / Reject Evidence Item
    if (action === 'verify-evidence') {
      if (!assessmentId || !evidenceItemId || !verificationStatus) {
        return NextResponse.json(
          { error: 'Assessment ID, Evidence Item ID, and Verification Status required.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      const assessment: TeamWorkAssessment | null = await db.teamAssessments.getById(assessmentId);
      if (!assessment) {
        return NextResponse.json(
          { error: 'Assessment not found.' },
          { status: 404, headers: noStoreHeaders }
        );
      }

      const completedTasks = assessment.completedTasks || [];
      const itemIdx = completedTasks.findIndex(t => t.id === evidenceItemId);

      if (itemIdx === -1) {
        return NextResponse.json(
          { error: 'Evidence item not found.' },
          { status: 404, headers: noStoreHeaders }
        );
      }

      completedTasks[itemIdx] = {
        ...completedTasks[itemIdx],
        verificationStatus: verificationStatus as EvidenceVerificationStatus,
        adminNotes: adminNotes !== undefined ? adminNotes : completedTasks[itemIdx].adminNotes,
        verifiedBy: adminUser,
        verifiedAt: new Date().toISOString()
      };

      const updated = await db.teamAssessments.updateOne(assessmentId, {
        completedTasks,
        updatedAt: new Date().toISOString()
      });

      await logTeamAssessmentAuditAction({
        action: verificationStatus === 'Verified' ? 'VERIFY_EVIDENCE' : 'REJECT_EVIDENCE',
        assessmentId: assessment.id,
        assessmentPeriodId: assessment.assessmentPeriodId,
        memberEmail: assessment.memberEmail,
        memberName: assessment.memberName,
        adminUser,
        ipAddress: clientIp,
        userAgent: clientUa,
        details: {
          evidenceItemId,
          taskName: completedTasks[itemIdx].taskName,
          verificationStatus,
          adminNotes: adminNotes || ''
        }
      });

      return NextResponse.json(
        {
          success: true,
          item: completedTasks[itemIdx],
          assessment: updated,
          message: `Evidence marked as "${verificationStatus}".`
        },
        { status: 200, headers: noStoreHeaders }
      );
    }

    // 4. Delete Assessment (Permanently with IDOR & Audit Protection)
    if (action === 'delete-assessment') {
      if (!assessmentId || typeof assessmentId !== 'string' || !assessmentId.trim()) {
        return NextResponse.json(
          { error: 'Assessment ID is required.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      const cleanAssessmentId = assessmentId.trim();
      const assessment: TeamWorkAssessment | null = await db.teamAssessments.getById(cleanAssessmentId);
      if (!assessment) {
        return NextResponse.json(
          { error: 'Assessment not found or already deleted.' },
          { status: 404, headers: noStoreHeaders }
        );
      }

      // Record immutable audit entry prior to deletion
      await logTeamAssessmentAuditAction({
        action: 'DELETE_ASSESSMENT',
        assessmentId: assessment.id,
        assessmentPeriodId: assessment.assessmentPeriodId,
        memberEmail: assessment.memberEmail,
        memberName: assessment.memberName,
        adminUser,
        ipAddress: clientIp,
        userAgent: clientUa,
        details: {
          status: assessment.status,
          assignedTasksCount: assessment.assignedTasks?.length || 0,
          completedTasksCount: assessment.completedTasks?.length || 0,
          pendingTasksCount: assessment.pendingTasks?.length || 0,
          completionPercentage: assessment.completionPercentage,
          hasAdminReview: Boolean(assessment.adminReview),
          finalStatus: assessment.adminReview?.finalStatus || null,
          submittedAt: assessment.submittedAt || null,
          deletedAt: new Date().toISOString(),
          reason: reason || 'Manual administrative deletion from Admin Dashboard'
        }
      });

      // Safely delete assessment (removes draft, submissions, deliverables & evidence records)
      await db.teamAssessments.deleteOne(cleanAssessmentId);

      return NextResponse.json(
        {
          success: true,
          deletedId: cleanAssessmentId,
          memberName: assessment.memberName,
          message: `Assessment record for ${assessment.memberName} (${assessment.memberEmail}) has been permanently deleted along with all submissions, drafts, and evidence records.`
        },
        { status: 200, headers: noStoreHeaders }
      );
    }

    // 5. Delete Period (with Audit Protection)
    if (action === 'delete-period') {
      if (!periodId || typeof periodId !== 'string' || !periodId.trim()) {
        return NextResponse.json(
          { error: 'Period ID is required.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      const cleanPeriodId = periodId.trim();
      const periodRecord = await db.teamAssessmentPeriods.getById(cleanPeriodId);
      if (!periodRecord) {
        return NextResponse.json(
          { error: 'Assessment period not found or already deleted.' },
          { status: 404, headers: noStoreHeaders }
        );
      }

      await logTeamAssessmentAuditAction({
        action: 'DELETE_PERIOD',
        assessmentPeriodId: cleanPeriodId,
        adminUser,
        ipAddress: clientIp,
        userAgent: clientUa,
        details: {
          title: periodRecord.title,
          status: periodRecord.status,
          eligibleCount: periodRecord.eligibleMembers?.length || 0
        }
      });

      await db.teamAssessmentPeriods.deleteOne(cleanPeriodId);
      return NextResponse.json(
        {
          success: true,
          deletedPeriodId: cleanPeriodId,
          message: `Assessment review period "${periodRecord.title}" deleted.`
        },
        { status: 200, headers: noStoreHeaders }
      );
    }

    return NextResponse.json({ error: 'Invalid action requested.' }, { status: 400, headers: noStoreHeaders });
  } catch (error: any) {
    console.error('Admin team assessment POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process admin action.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized administrative access.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    let assessmentId = searchParams.get('assessmentId') || searchParams.get('id');
    let periodId = searchParams.get('periodId');
    let reason = searchParams.get('reason') || 'HTTP DELETE request by Administrator';

    if (!assessmentId && !periodId) {
      try {
        const body = await request.json();
        assessmentId = body.assessmentId || body.id;
        periodId = body.periodId;
        if (body.reason) reason = body.reason;
      } catch {}
    }

    const adminUser = 'awsadmin@culko.in';
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const clientUa = request.headers.get('user-agent') || undefined;

    if (assessmentId) {
      const cleanAssessmentId = assessmentId.trim();
      const assessment: TeamWorkAssessment | null = await db.teamAssessments.getById(cleanAssessmentId);
      if (!assessment) {
        return NextResponse.json(
          { error: 'Assessment not found or already deleted.' },
          { status: 404, headers: noStoreHeaders }
        );
      }

      await logTeamAssessmentAuditAction({
        action: 'DELETE_ASSESSMENT',
        assessmentId: assessment.id,
        assessmentPeriodId: assessment.assessmentPeriodId,
        memberEmail: assessment.memberEmail,
        memberName: assessment.memberName,
        adminUser,
        ipAddress: clientIp,
        userAgent: clientUa,
        details: {
          status: assessment.status,
          assignedTasksCount: assessment.assignedTasks?.length || 0,
          completedTasksCount: assessment.completedTasks?.length || 0,
          pendingTasksCount: assessment.pendingTasks?.length || 0,
          completionPercentage: assessment.completionPercentage,
          hasAdminReview: Boolean(assessment.adminReview),
          finalStatus: assessment.adminReview?.finalStatus || null,
          submittedAt: assessment.submittedAt || null,
          deletedAt: new Date().toISOString(),
          reason
        }
      });

      await db.teamAssessments.deleteOne(cleanAssessmentId);

      return NextResponse.json(
        {
          success: true,
          deletedId: cleanAssessmentId,
          memberName: assessment.memberName,
          message: `Assessment record for ${assessment.memberName} (${assessment.memberEmail}) has been permanently deleted along with all submissions, drafts, and evidence records.`
        },
        { status: 200, headers: noStoreHeaders }
      );
    }

    if (periodId) {
      const cleanPeriodId = periodId.trim();
      const periodRecord = await db.teamAssessmentPeriods.getById(cleanPeriodId);
      if (!periodRecord) {
        return NextResponse.json(
          { error: 'Assessment period not found or already deleted.' },
          { status: 404, headers: noStoreHeaders }
        );
      }

      await logTeamAssessmentAuditAction({
        action: 'DELETE_PERIOD',
        assessmentPeriodId: cleanPeriodId,
        adminUser,
        ipAddress: clientIp,
        userAgent: clientUa,
        details: {
          title: periodRecord.title,
          status: periodRecord.status,
          eligibleCount: periodRecord.eligibleMembers?.length || 0
        }
      });

      await db.teamAssessmentPeriods.deleteOne(cleanPeriodId);

      return NextResponse.json(
        {
          success: true,
          deletedPeriodId: cleanPeriodId,
          message: `Assessment review period "${periodRecord.title}" deleted.`
        },
        { status: 200, headers: noStoreHeaders }
      );
    }

    return NextResponse.json(
      { error: 'Either assessmentId or periodId is required for deletion.' },
      { status: 400, headers: noStoreHeaders }
    );
  } catch (error: any) {
    console.error('Admin team assessment DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process admin deletion.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
