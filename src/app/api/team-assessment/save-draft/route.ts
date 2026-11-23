import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateCompletionPercentage } from '@/lib/teamAssessment';
import { TeamWorkAssessment } from '@/types/teamAssessment';

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
        { error: 'Cannot modify an assessment that has already been submitted.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const safeAssigned = Array.isArray(assignedTasks) ? assignedTasks : assessment.assignedTasks || [];
    const safeCompleted = Array.isArray(completedTasks) ? completedTasks : assessment.completedTasks || [];
    const safePending = Array.isArray(pendingTasks) ? pendingTasks : assessment.pendingTasks || [];

    // Ensure all completed items have verificationStatus initialized
    const formattedCompleted = safeCompleted.map((c: any) => ({
      ...c,
      verificationStatus: c.verificationStatus || 'Pending Verification'
    }));

    const completionPercentage = calculateCompletionPercentage(safeAssigned, formattedCompleted);

    const updated = await db.teamAssessments.updateOne(assessment.id, {
      assignedTasks: safeAssigned,
      completedTasks: formattedCompleted,
      pendingTasks: safePending,
      missedResponsibilities: typeof missedResponsibilities === 'string' ? missedResponsibilities : assessment.missedResponsibilities,
      contribution: contribution || assessment.contribution,
      commitments: commitments || assessment.commitments,
      completionPercentage,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json(
      {
        success: true,
        savedAt: new Date().toISOString(),
        completionPercentage,
        assessment: updated,
        message: 'Draft saved successfully.'
      },
      { status: 200, headers: noStoreHeaders }
    );
  } catch (error: any) {
    console.error('Save draft error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save draft.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
