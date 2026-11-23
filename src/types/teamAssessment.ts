export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Blocked' | 'Cancelled';
export type TaskRole = 'Lead' | 'Co-lead' | 'Contributor' | 'Support';
export type EvidenceVerificationStatus = 'Pending Verification' | 'Verified' | 'Needs Clarification' | 'Rejected';
export type AssessmentStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'REVIEWED';
export type MemberFinalStatus =
  | 'Outstanding'
  | 'Strong Contributor'
  | 'Active'
  | 'Needs Improvement'
  | 'Inactive'
  | 'Review Required';

export type IndependenceOption =
  | 'Completely independently'
  | 'Mostly independently'
  | 'Needed occasional guidance'
  | 'Needed frequent guidance'
  | 'Could not complete without someone else';

export type CommunicationOption =
  | 'Consistently'
  | 'Usually'
  | 'Sometimes'
  | 'Rarely'
  | 'Almost never';

export type DeadlineConsistencyOption =
  | 'Always'
  | 'Usually'
  | 'Sometimes'
  | 'Rarely'
  | 'Never';

export type OwnershipOption =
  | 'Took full ownership'
  | 'Took good ownership'
  | 'Did assigned work only'
  | 'Needed repeated follow-up'
  | 'Did not take ownership';

export type ExtraContributionOption =
  | 'Yes, significantly'
  | 'Yes, occasionally'
  | 'Only assigned work'
  | 'Very little'
  | 'No';

export type CommitmentPriority = 'High' | 'Medium' | 'Low';
export type CommitmentTimeframe = '7_DAYS' | '30_DAYS' | 'NEW_INITIATIVE';

export interface TeamWorkTask {
  id: string;
  title: string;
  description: string;
  assignedDate: string; // YYYY-MM-DD
  deadline: string; // YYYY-MM-DD
  status: TaskStatus;
  role: TaskRole;
}

export interface TeamWorkCompletedItem {
  id: string;
  taskName: string;
  whatWasDone: string;
  completionDate: string; // YYYY-MM-DD
  evidenceUrl?: string;
  evidenceType?: 'GitHub' | 'Drive' | 'Event' | 'Document' | 'Other';
  evidenceDescription?: string;
  verificationStatus: EvidenceVerificationStatus;
  adminNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface TeamWorkPendingItem {
  id: string;
  taskName: string;
  originalDeadline: string;
  currentStatus: string;
  reasonForDelay: string;
  newExpectedCompletionDate: string;
  supportRequired: string;
}

export interface TeamWorkContributionSection {
  independence: IndependenceOption;
  communication: CommunicationOption;
  deadlineConsistency: DeadlineConsistencyOption;
  ownership: OwnershipOption;
  extraContribution: ExtraContributionOption;
  mostValuableContribution: string;
  areaForImprovement: string;
}

export interface TeamWorkCommitmentItem {
  id: string;
  commitment: string;
  timeframe: CommitmentTimeframe;
  deadline: string;
  priority: CommitmentPriority;
}

export interface TeamWorkNextCommitmentsSection {
  sevenDayCommitment: string;
  thirtyDayCommitment: string;
  independentResponsibility: string;
  leadershipSupportNeeded: string;
  newInitiativeOwnership: string;
  commitmentsList?: TeamWorkCommitmentItem[];
}

export interface TeamWorkAdminReview {
  workCompletionScore: number; // 0–10
  qualityScore: number; // 0–10
  ownershipScore: number; // 0–10
  consistencyScore: number; // 0–10
  communicationScore: number; // 0–10
  initiativeScore: number; // 0–10
  overallScore: number; // 0–10
  calculatedAverageScore: number; // 0–10
  adminFeedback: string;
  finalStatus: MemberFinalStatus;
  reviewedBy: string;
  reviewedAt: string;
  isPublishedToMember?: boolean;
}

export interface TeamWorkAssessment {
  id: string;
  assessmentPeriodId: string;
  assessmentPeriodTitle: string;
  memberEmail: string;
  memberName: string;
  memberRole: string; // snapshot at submission
  memberDomain: string; // snapshot at submission
  sessionToken: string;
  status: AssessmentStatus;
  assignedTasks: TeamWorkTask[];
  completedTasks: TeamWorkCompletedItem[];
  pendingTasks: TeamWorkPendingItem[];
  missedResponsibilities: string;
  contribution: TeamWorkContributionSection;
  commitments: TeamWorkNextCommitmentsSection;
  completionPercentage: number;
  adminReview?: TeamWorkAdminReview;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EligibleTeamMember {
  email: string;
  name: string;
  role: string;
  domain: string;
  isActive: boolean;
}

export interface TeamAssessmentPeriod {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  deadline: string;
  status: 'Draft' | 'Active' | 'Closed';
  eligibleMembers: EligibleTeamMember[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamAssessmentSummaryStats {
  totalAssessed: number;
  completedReviews: number;
  pendingReviews: number;
  activeContributors: number;
  strongPerformers: number;
  needsImprovement: number;
  inactiveMembers: number;
  averageContributionScore: number;
  averageCompletionRate: number;
}

export type TeamAssessmentAuditAction =
  | 'DELETE_ASSESSMENT'
  | 'SAVE_REVIEW'
  | 'VERIFY_EVIDENCE'
  | 'REJECT_EVIDENCE'
  | 'CREATE_PERIOD'
  | 'UPDATE_PERIOD'
  | 'DELETE_PERIOD';

export interface TeamAssessmentAuditLog {
  id: string;
  action: TeamAssessmentAuditAction;
  assessmentId?: string;
  assessmentPeriodId?: string;
  memberEmail?: string;
  memberName?: string;
  adminUser: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  timestamp: string;
}
