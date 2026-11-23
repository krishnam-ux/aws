import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateAssessmentSessionToken, generateAssessmentId } from '@/lib/teamAssessment';
import { TeamAssessmentPeriod, TeamWorkAssessment } from '@/types/teamAssessment';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, periodId } = body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Registered university or team email is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Fetch active period or requested period
    const periods: TeamAssessmentPeriod[] = await db.teamAssessmentPeriods.getAll();
    let targetPeriod: TeamAssessmentPeriod | null = null;

    if (periodId && typeof periodId === 'string' && periodId.trim()) {
      targetPeriod = periods.find(p => p.id === periodId.trim()) || null;
    } else {
      targetPeriod = periods.find(p => p.status === 'Active') || (periods.length > 0 ? periods[0] : null);
    }

    if (!targetPeriod) {
      return NextResponse.json(
        { error: 'No active Team Work & Contribution Assessment period found.' },
        { status: 404, headers: noStoreHeaders }
      );
    }

    // 2. Verify Member Eligibility in Target Period
    const eligibleList = Array.isArray(targetPeriod.eligibleMembers) ? targetPeriod.eligibleMembers : [];
    const matchedMember = eligibleList.find(
      m => m.email?.trim().toLowerCase() === cleanEmail && m.isActive !== false
    );

    if (!matchedMember) {
      return NextResponse.json(
        {
          success: false,
          isEligible: false,
          reason: 'NOT_ELIGIBLE_FOR_PERIOD',
          message: 'Your email is not currently listed in the eligible team members roster for this assessment review period. Please contact an Administrator if you believe this is an error.',
          period: {
            id: targetPeriod.id,
            title: targetPeriod.title,
            deadline: targetPeriod.deadline,
            status: targetPeriod.status
          }
        },
        { status: 200, headers: noStoreHeaders }
      );
    }

    // 3. Check for existing assessment draft or submitted record
    let assessment: TeamWorkAssessment | null = await db.teamAssessments.getByEmailAndPeriod(
      cleanEmail,
      targetPeriod.id
    );

    let sessionToken: string;
    if (assessment) {
      sessionToken = assessment.sessionToken;
    } else {
      sessionToken = generateAssessmentSessionToken();
      const newAssessment: TeamWorkAssessment = {
        id: generateAssessmentId(),
        assessmentPeriodId: targetPeriod.id,
        assessmentPeriodTitle: targetPeriod.title,
        memberEmail: cleanEmail,
        memberName: matchedMember.name,
        memberRole: matchedMember.role,
        memberDomain: matchedMember.domain,
        sessionToken,
        status: 'DRAFT',
        assignedTasks: [],
        completedTasks: [],
        pendingTasks: [],
        missedResponsibilities: '',
        contribution: {
          independence: 'Mostly independently',
          communication: 'Consistently',
          deadlineConsistency: 'Usually',
          ownership: 'Took full ownership',
          extraContribution: 'Yes, occasionally',
          mostValuableContribution: '',
          areaForImprovement: ''
        },
        commitments: {
          sevenDayCommitment: '',
          thirtyDayCommitment: '',
          independentResponsibility: '',
          leadershipSupportNeeded: '',
          newInitiativeOwnership: '',
          commitmentsList: []
        },
        completionPercentage: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.teamAssessments.insertOne(newAssessment);
      assessment = newAssessment;
    }

    return NextResponse.json(
      {
        success: true,
        isEligible: true,
        sessionToken,
        member: {
          email: cleanEmail,
          name: matchedMember.name,
          role: matchedMember.role,
          domain: matchedMember.domain
        },
        memberProfile: {
          email: cleanEmail,
          name: matchedMember.name,
          role: matchedMember.role,
          domain: matchedMember.domain
        },
        period: {
          id: targetPeriod.id,
          title: targetPeriod.title,
          description: targetPeriod.description,
          startDate: targetPeriod.startDate,
          endDate: targetPeriod.endDate,
          deadline: targetPeriod.deadline,
          status: targetPeriod.status
        },
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
    console.error('Team assessment auth error:', error);
    return NextResponse.json(
      { error: error.message || 'Authentication failed.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
