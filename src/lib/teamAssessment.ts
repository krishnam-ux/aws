import crypto from 'crypto';
import { db } from '@/lib/db';
import {
  TeamWorkAssessment,
  TeamWorkTask,
  TeamWorkCompletedItem,
  TeamWorkAdminReview,
  MemberFinalStatus,
  TeamAssessmentSummaryStats,
  TeamAssessmentAuditAction,
  TeamAssessmentAuditLog
} from '@/types/teamAssessment';

export async function logTeamAssessmentAuditAction(params: {
  action: TeamAssessmentAuditAction;
  adminUser: string;
  assessmentId?: string;
  assessmentPeriodId?: string;
  memberEmail?: string;
  memberName?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}): Promise<TeamAssessmentAuditLog> {
  const log: TeamAssessmentAuditLog = {
    id: `taa_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    action: params.action,
    assessmentId: params.assessmentId,
    assessmentPeriodId: params.assessmentPeriodId,
    memberEmail: params.memberEmail,
    memberName: params.memberName,
    adminUser: params.adminUser,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    details: params.details,
    timestamp: new Date().toISOString()
  };
  await db.teamAssessmentAuditLogs.insertOne(log);
  return log;
}

export function generateAssessmentId(): string {
  return `twa_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

export function generatePeriodId(): string {
  return `tap_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
}

export function generateAssessmentSessionToken(): string {
  return `tws_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Calculates the completion percentage based on assigned and completed tasks.
 */
export function calculateCompletionPercentage(
  assignedTasks: TeamWorkTask[] = [],
  completedTasks: TeamWorkCompletedItem[] = []
): number {
  if (!assignedTasks || assignedTasks.length === 0) {
    return completedTasks && completedTasks.length > 0 ? 100 : 0;
  }
  const completedCount = assignedTasks.filter(t => t.status === 'Completed').length;
  // If user has recorded explicit completed tasks, take maximum of status completed or completed items count
  const effectiveCompleted = Math.max(completedCount, Math.min(completedTasks.length, assignedTasks.length));
  return Math.round((effectiveCompleted / assignedTasks.length) * 100);
}

/**
 * Calculates average admin evaluation score across the 7 evaluation dimensions (0-10 scale).
 */
export function calculateAverageAdminScore(review: Partial<TeamWorkAdminReview>): number {
  const scores = [
    review.workCompletionScore ?? 0,
    review.qualityScore ?? 0,
    review.ownershipScore ?? 0,
    review.consistencyScore ?? 0,
    review.communicationScore ?? 0,
    review.initiativeScore ?? 0,
    review.overallScore ?? 0
  ];
  const sum = scores.reduce((a, b) => a + Number(b), 0);
  return Number((sum / scores.length).toFixed(1));
}

/**
 * Derives an initial suggested status recommendation based on completion rate and admin score.
 * Admin can always manually override this status.
 */
export function deriveSuggestedStatus(completionRate: number, adminAvgScore: number = 0): MemberFinalStatus {
  if (adminAvgScore >= 9.0 && completionRate >= 90) {
    return 'Outstanding';
  }
  if (adminAvgScore >= 7.5 && completionRate >= 75) {
    return 'Strong Contributor';
  }
  if (adminAvgScore >= 6.0 || completionRate >= 60) {
    return 'Active';
  }
  if (adminAvgScore >= 4.0 || completionRate >= 35) {
    return 'Needs Improvement';
  }
  if (adminAvgScore > 0 && adminAvgScore < 4.0 && completionRate < 35) {
    return 'Inactive';
  }
  return 'Review Required';
}

/**
 * Computes summary analytics across all assessments for an assessment period.
 */
export function calculateTeamAssessmentSummaryStats(
  assessments: TeamWorkAssessment[] = []
): TeamAssessmentSummaryStats {
  const totalAssessed = assessments.length;
  const completedReviews = assessments.filter(a => a.status === 'REVIEWED').length;
  const pendingReviews = assessments.filter(a => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW').length;

  let activeContributors = 0;
  let strongPerformers = 0;
  let needsImprovement = 0;
  let inactiveMembers = 0;

  let totalScoreSum = 0;
  let scoredCount = 0;
  let totalCompletionSum = 0;

  for (const a of assessments) {
    totalCompletionSum += (a.completionPercentage || 0);

    const status = a.adminReview?.finalStatus || deriveSuggestedStatus(a.completionPercentage || 0, a.adminReview?.calculatedAverageScore);
    if (status === 'Outstanding' || status === 'Strong Contributor') {
      strongPerformers++;
      activeContributors++;
    } else if (status === 'Active') {
      activeContributors++;
    } else if (status === 'Needs Improvement') {
      needsImprovement++;
    } else if (status === 'Inactive') {
      inactiveMembers++;
    }

    if (a.adminReview?.calculatedAverageScore !== undefined && a.adminReview.calculatedAverageScore > 0) {
      totalScoreSum += a.adminReview.calculatedAverageScore;
      scoredCount++;
    }
  }

  const averageContributionScore = scoredCount > 0 ? Number((totalScoreSum / scoredCount).toFixed(1)) : 0;
  const averageCompletionRate = totalAssessed > 0 ? Math.round(totalCompletionSum / totalAssessed) : 0;

  return {
    totalAssessed,
    completedReviews,
    pendingReviews,
    activeContributors,
    strongPerformers,
    needsImprovement,
    inactiveMembers,
    averageContributionScore,
    averageCompletionRate
  };
}

/**
 * Validates candidate submission payload server-side.
 */
export function validateAssessmentSubmissionPayload(payload: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!payload.memberEmail || typeof payload.memberEmail !== 'string') {
    errors.push('Member email is required.');
  }
  if (!payload.memberName || typeof payload.memberName !== 'string') {
    errors.push('Member name is required.');
  }
  if (!payload.assessmentPeriodId || typeof payload.assessmentPeriodId !== 'string') {
    errors.push('Assessment period ID is required.');
  }

  if (!Array.isArray(payload.assignedTasks) || payload.assignedTasks.length === 0) {
    errors.push('At least one assigned task must be listed in Section 1.');
  }

  if (!Array.isArray(payload.completedTasks) || payload.completedTasks.length === 0) {
    errors.push('At least one completed task/deliverable must be reported in Section 2.');
  }

  if (!payload.contribution || typeof payload.contribution !== 'object') {
    errors.push('Section 4 (Contribution & Ownership) is required.');
  } else {
    if (!payload.contribution.independence) errors.push('Section 4: Independence response is required.');
    if (!payload.contribution.communication) errors.push('Section 4: Progress communication response is required.');
    if (!payload.contribution.deadlineConsistency) errors.push('Section 4: Deadline consistency response is required.');
    if (!payload.contribution.ownership) errors.push('Section 4: Ownership response is required.');
    if (!payload.contribution.mostValuableContribution?.trim()) {
      errors.push('Section 4: Description of most valuable contribution is required.');
    }
  }

  if (!payload.commitments || typeof payload.commitments !== 'object') {
    errors.push('Section 5 (Next Commitments) is required.');
  } else {
    if (!payload.commitments.sevenDayCommitment?.trim()) {
      errors.push('Section 5: 7-day commitment is required.');
    }
    if (!payload.commitments.thirtyDayCommitment?.trim()) {
      errors.push('Section 5: 30-day commitment is required.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates admin review scoring payload server-side.
 */
export function validateAdminReviewPayload(payload: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  const scoreFields = [
    'workCompletionScore',
    'qualityScore',
    'ownershipScore',
    'consistencyScore',
    'communicationScore',
    'initiativeScore',
    'overallScore'
  ];

  for (const field of scoreFields) {
    const val = Number(payload[field]);
    if (isNaN(val) || val < 0 || val > 10) {
      errors.push(`${field} must be a number between 0 and 10.`);
    }
  }

  if (!payload.finalStatus) {
    errors.push('Final status is required.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generates a clean CSV file string from assessment records.
 */
export function generateAssessmentsCsv(assessments: TeamWorkAssessment[]): string {
  const headers = [
    'Assessment ID',
    'Period Title',
    'Member Name',
    'Member Email',
    'Domain',
    'Role',
    'Status',
    'Assigned Tasks Count',
    'Completed Tasks Count',
    'Pending Tasks Count',
    'Completion %',
    'Independence',
    'Communication',
    'Ownership Rating',
    'Deadline Consistency',
    'Extra Contribution',
    'Most Valuable Contribution',
    'Area for Improvement',
    '7-Day Commitment',
    '30-Day Commitment',
    'Admin Work Completion Score',
    'Admin Quality Score',
    'Admin Ownership Score',
    'Admin Consistency Score',
    'Admin Communication Score',
    'Admin Initiative Score',
    'Admin Overall Score',
    'Admin Avg Score',
    'Admin Final Status',
    'Admin Feedback',
    'Submitted At'
  ];

  const escapeCsv = (str: any) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = assessments.map(a => [
    escapeCsv(a.id),
    escapeCsv(a.assessmentPeriodTitle),
    escapeCsv(a.memberName),
    escapeCsv(a.memberEmail),
    escapeCsv(a.memberDomain),
    escapeCsv(a.memberRole),
    escapeCsv(a.status),
    escapeCsv(a.assignedTasks?.length || 0),
    escapeCsv(a.completedTasks?.length || 0),
    escapeCsv(a.pendingTasks?.length || 0),
    escapeCsv(a.completionPercentage || 0),
    escapeCsv(a.contribution?.independence || ''),
    escapeCsv(a.contribution?.communication || ''),
    escapeCsv(a.contribution?.ownership || ''),
    escapeCsv(a.contribution?.deadlineConsistency || ''),
    escapeCsv(a.contribution?.extraContribution || ''),
    escapeCsv(a.contribution?.mostValuableContribution || ''),
    escapeCsv(a.contribution?.areaForImprovement || ''),
    escapeCsv(a.commitments?.sevenDayCommitment || ''),
    escapeCsv(a.commitments?.thirtyDayCommitment || ''),
    escapeCsv(a.adminReview?.workCompletionScore ?? ''),
    escapeCsv(a.adminReview?.qualityScore ?? ''),
    escapeCsv(a.adminReview?.ownershipScore ?? ''),
    escapeCsv(a.adminReview?.consistencyScore ?? ''),
    escapeCsv(a.adminReview?.communicationScore ?? ''),
    escapeCsv(a.adminReview?.initiativeScore ?? ''),
    escapeCsv(a.adminReview?.overallScore ?? ''),
    escapeCsv(a.adminReview?.calculatedAverageScore ?? ''),
    escapeCsv(a.adminReview?.finalStatus || ''),
    escapeCsv(a.adminReview?.adminFeedback || ''),
    escapeCsv(a.submittedAt || a.createdAt || '')
  ].join(','));

  return [headers.join(','), ...rows].join('\r\n');
}
