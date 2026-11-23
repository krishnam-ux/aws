import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  calculateCompletionPercentage,
  validateAssessmentSubmissionPayload
} from '@/lib/teamAssessment';
import { TeamWorkAssessment, TeamAssessmentPeriod } from '@/types/teamAssessment';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    const token =
      body.token ||
      body.sessionToken ||
      (authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '');

    const {
      assignedTasks,
      completedTasks,
      pendingTasks,
      missedResponsibilities,
      contribution,
      commitments
    } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Session token is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const assessment: TeamWorkAssessment | null = await db.teamAssessments.getBySessionToken(token);
    if (!assessment) {
      return NextResponse.json(
        { error: 'Invalid assessment session.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    if (assessment.status === 'SUBMITTED' || assessment.status === 'REVIEWED') {
      return NextResponse.json(
        {
          success: true,
          message: 'Assessment has already been submitted.',
          submittedAt: assessment.submittedAt,
          status: assessment.status
        },
        { status: 200, headers: noStoreHeaders }
      );
    }

    const period: TeamAssessmentPeriod | null = await db.teamAssessmentPeriods.getById(
      assessment.assessmentPeriodId
    );

    if (period && period.status === 'Closed') {
      return NextResponse.json(
        { error: 'This assessment review period has concluded and is closed to new submissions.' },
        { status: 403, headers: noStoreHeaders }
      );
    }

    const safeAssigned = Array.isArray(assignedTasks) ? assignedTasks : assessment.assignedTasks || [];
    const safeCompleted = Array.isArray(completedTasks) ? completedTasks : assessment.completedTasks || [];
    const safePending = Array.isArray(pendingTasks) ? pendingTasks : assessment.pendingTasks || [];

    const validation = validateAssessmentSubmissionPayload({
      memberEmail: assessment.memberEmail,
      memberName: assessment.memberName,
      assessmentPeriodId: assessment.assessmentPeriodId,
      assignedTasks: safeAssigned,
      completedTasks: safeCompleted,
      contribution: contribution || assessment.contribution,
      commitments: commitments || assessment.commitments
    });

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Validation failed. Please complete all required sections.',
          details: validation.errors
        },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const formattedCompleted = safeCompleted.map((c: any) => ({
      ...c,
      verificationStatus: c.verificationStatus || 'Pending Verification'
    }));

    const completionPercentage = calculateCompletionPercentage(safeAssigned, formattedCompleted);
    const nowIso = new Date().toISOString();

    const updated = await db.teamAssessments.updateOne(assessment.id, {
      status: 'SUBMITTED',
      assignedTasks: safeAssigned,
      completedTasks: formattedCompleted,
      pendingTasks: safePending,
      missedResponsibilities: typeof missedResponsibilities === 'string' ? missedResponsibilities : assessment.missedResponsibilities,
      contribution: contribution || assessment.contribution,
      commitments: commitments || assessment.commitments,
      completionPercentage,
      submittedAt: nowIso,
      updatedAt: nowIso
    });

    return NextResponse.json(
      {
        success: true,
        status: 'SUBMITTED',
        submittedAt: nowIso,
        completionPercentage,
        referenceId: `TWA-${assessment.id.slice(-8).toUpperCase()}`,
        assessment: updated,
        message: 'Your Team Work & Contribution Review has been successfully submitted for administrative evaluation.'
      },
      { status: 200, headers: noStoreHeaders }
    );
  } catch (error: any) {
    console.error('Submit assessment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit assessment.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
