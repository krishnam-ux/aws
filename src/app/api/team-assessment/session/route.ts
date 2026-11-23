import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TeamWorkAssessment, TeamAssessmentPeriod } from '@/types/teamAssessment';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    const token =
      searchParams.get('token') ||
      searchParams.get('sessionToken') ||
      (authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '');

    if (!token) {
      return NextResponse.json(
        { error: 'Session token is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const assessment: TeamWorkAssessment | null = await db.teamAssessments.getBySessionToken(token);
    if (!assessment) {
      return NextResponse.json(
        { error: 'Invalid or expired assessment session.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const period: TeamAssessmentPeriod | null = await db.teamAssessmentPeriods.getById(
      assessment.assessmentPeriodId
    );

    return NextResponse.json(
      {
        success: true,
        member: {
          email: assessment.memberEmail,
          name: assessment.memberName,
          role: assessment.memberRole,
          domain: assessment.memberDomain
        },
        period: period
          ? {
              id: period.id,
              title: period.title,
              description: period.description,
              deadline: period.deadline,
              status: period.status
            }
          : null,
        assessment: {
          id: assessment.id,
          status: assessment.status,
          completionPercentage: assessment.completionPercentage,
          assignedTasks: assessment.assignedTasks || [],
          completedTasks: assessment.completedTasks || [],
          pendingTasks: assessment.pendingTasks || [],
          missedResponsibilities: assessment.missedResponsibilities || '',
          contribution: assessment.contribution,
          commitments: assessment.commitments,
          submittedAt: assessment.submittedAt || null,
          adminReview: assessment.adminReview?.isPublishedToMember ? assessment.adminReview : undefined
        }
      },
      { status: 200, headers: noStoreHeaders }
    );
  } catch (error: any) {
    console.error('Session retrieval error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve assessment session.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
