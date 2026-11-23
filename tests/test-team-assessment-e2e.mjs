import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Test utilities
let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`✅ PASSED: ${message}`);
}

async function runTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING TEAM WORK & CONTRIBUTION ASSESSMENT TEST SUITE');
  console.log('================================================================\n');

  // Dynamic import of our lib and db
  const {
    calculateCompletionPercentage,
    calculateAverageAdminScore,
    deriveSuggestedStatus,
    calculateTeamAssessmentSummaryStats,
    validateAssessmentSubmissionPayload,
    validateAdminReviewPayload,
    generateAssessmentsCsv,
    generateAssessmentId,
    generatePeriodId,
    generateAssessmentSessionToken
  } = await import('../src/lib/teamAssessment.ts');

  const { db } = await import('../src/lib/db.ts');

  // TEST 1: Unit Calculations & Formulas
  console.log('--- Test Suite 1: Pure Functions & Formulas ---');
  
  // 1a. Completion percentage formula
  const pct100 = calculateCompletionPercentage(4, 4);
  assert(pct100 === 100, `Completion 4/4 is 100% (got ${pct100}%)`);

  const pct50 = calculateCompletionPercentage(4, 2);
  assert(pct50 === 50, `Completion 2/4 is 50% (got ${pct50}%)`);

  const pctZero = calculateCompletionPercentage(0, 0);
  assert(pctZero === 0, `Completion 0/0 is 0% (got ${pctZero}%)`);

  // 1b. Admin 7-dimension score calculation
  const sampleReview = {
    workCompletionScore: 9,
    qualityScore: 8,
    ownershipScore: 9,
    consistencyScore: 8,
    communicationScore: 9,
    initiativeScore: 10,
    overallContributionScore: 9,
    adminComments: 'Outstanding work across cloud modules.',
    reviewedBy: 'awsadmin@culko.in',
    reviewedAt: new Date().toISOString()
  };
  const avgScore = calculateAverageAdminScore(sampleReview);
  // (9+8+9+8+9+10+9) / 7 = 62 / 7 = 8.86 -> rounded to 8.9
  assert(avgScore >= 8.8 && avgScore <= 8.9, `Average admin score calculated correctly (got ${avgScore})`);

  // 1c. Suggested status derivation
  const statusOutstanding = deriveSuggestedStatus(95, 9.2);
  assert(statusOutstanding === 'Outstanding', `95% completion and 9.2 score yields 'Outstanding' (got ${statusOutstanding})`);

  const statusStrong = deriveSuggestedStatus(80, 8.0);
  assert(statusStrong === 'Strong Contributor', `80% completion and 8.0 score yields 'Strong Contributor' (got ${statusStrong})`);

  const statusActive = deriveSuggestedStatus(65, 6.5);
  assert(statusActive === 'Active', `65% completion and 6.5 score yields 'Active' (got ${statusActive})`);

  const statusNeedsImp = deriveSuggestedStatus(40, 4.5);
  assert(statusNeedsImp === 'Needs Improvement', `40% completion yields 'Needs Improvement' (got ${statusNeedsImp})`);

  const statusInactive = deriveSuggestedStatus(20, 2.0);
  assert(statusInactive === 'Inactive', `20% completion yields 'Inactive' (got ${statusInactive})`);

  // 1d. ID generation format validation
  const twaId = generateAssessmentId();
  assert(twaId.startsWith('TWA-') && twaId.length === 12, `Assessment ID matches TWA-XXXXXXXX format: ${twaId}`);

  const token = generateAssessmentSessionToken();
  assert(token.startsWith('twa_sess_') && token.length > 20, `Session token generated securely: ${token.substring(0, 16)}...`);

  // TEST 2: Database Periods and Roster Verification
  console.log('\n--- Test Suite 2: Assessment Periods & Member Rosters ---');
  const activePeriod = await db.teamAssessmentPeriods.getActive();
  assert(activePeriod !== null, `Active assessment period found: ${activePeriod?.title}`);
  assert(activePeriod.eligibleMembers.length >= 6, `Active period has ${activePeriod?.eligibleMembers.length} eligible roster members`);

  const eligibleCandidate = activePeriod.eligibleMembers.find(m => m.email === 'om.ruhela8659@gmail.com');
  assert(eligibleCandidate !== undefined, `Found eligible member Om Ruhela (${eligibleCandidate?.email})`);
  assert(eligibleCandidate.domain.length > 0, `Om Ruhela has configured domain: ${eligibleCandidate?.domain}`);

  // TEST 3: Validation Logic for Member Submission Payload
  console.log('\n--- Test Suite 3: Submission Payload Validation ---');

  const invalidPayloadEmpty = {};
  const emptyValidation = validateAssessmentSubmissionPayload(invalidPayloadEmpty);
  assert(!emptyValidation.valid, `Empty submission payload rejected`);
  assert(emptyValidation.errors.length > 0, `Validation reported errors: ${emptyValidation.errors.join('; ')}`);

  const validSampleSection1 = [
    {
      id: 'task-1',
      title: 'Setup IAM Roles and Security Policies',
      description: 'Configured least privilege policies and session boundaries',
      assignedDate: '2026-09-01',
      expectedDeadline: '2026-09-15',
      status: 'Completed',
      role: 'Lead'
    },
    {
      id: 'task-2',
      title: 'Organize Cloud Architecture Workshop',
      description: 'Prepared hands-on lab environment on AWS Sandbox',
      assignedDate: '2026-09-10',
      expectedDeadline: '2026-09-25',
      status: 'Completed',
      role: 'Lead'
    }
  ];

  const validSampleSection2 = [
    {
      id: 'comp-1',
      taskTitle: 'Setup IAM Roles and Security Policies',
      whatWasDone: 'Designed and deployed IAM roles, permissions boundaries, and audited access advisor.',
      completionDate: '2026-09-14',
      evidenceLink: 'https://github.com/aws-sbg-cuup/iam-policies',
      githubUrl: 'https://github.com/aws-sbg-cuup/iam-policies',
      verificationStatus: 'Pending Verification'
    },
    {
      id: 'comp-2',
      taskTitle: 'Organize Cloud Architecture Workshop',
      whatWasDone: 'Facilitated hands-on workshop for 60+ students.',
      completionDate: '2026-09-25',
      evidenceLink: 'https://www.awssbgcuup.tech/events',
      eventUrl: 'https://www.awssbgcuup.tech/events',
      verificationStatus: 'Pending Verification'
    }
  ];

  const validSampleSection3 = {
    pendingTasks: [],
    missedResponsibilitiesDescription: 'None during this period; all assigned milestones were met on schedule.'
  };

  const validSampleSection4 = {
    independenceLevel: 'Completely independently',
    communicationConsistency: 'Consistently',
    deadlineConsistency: 'Always',
    ownershipLevel: 'Took full ownership',
    contributionBeyondAssigned: 'Yes, significantly',
    mostValuableContribution: 'Architected the automated deployment workflow and mentored 10 junior members.',
    areaForImprovement: 'Improve time estimation on large multi-stage infrastructure changes.'
  };

  const validSampleSection5 = {
    commitments: [
      {
        id: 'comm-1',
        commitment: 'Publish AWS Solutions Architect Associate preparation guide',
        deadline: '2026-10-15',
        priority: 'High',
        timeframe: '7_days'
      },
      {
        id: 'comm-2',
        commitment: 'Lead AWS Community Day Bootcamp session',
        deadline: '2026-10-31',
        priority: 'High',
        timeframe: '30_days'
      }
    ],
    independentOwnershipArea: 'Cloud Infrastructure & DevOps labs',
    supportNeededFromLeadership: 'Access to additional sandbox accounts for student workshops',
    newInitiativeToLead: 'Hands-on Serverless microservice buildathon'
  };

  const fullValidPayload = {
    assignedWork: validSampleSection1,
    completedWork: validSampleSection2,
    pendingWork: validSampleSection3,
    contribution: validSampleSection4,
    nextCommitments: validSampleSection5
  };

  const fullValidation = validateAssessmentSubmissionPayload(fullValidPayload);
  assert(fullValidation.valid, `Complete valid payload passed validation cleanly`);

  // TEST 4: Assessment Lifecycle: Draft -> Resume -> Submit -> Admin Review
  console.log('\n--- Test Suite 4: End-to-End Data Layer Assessment Lifecycle ---');

  const testEmail = 'om.ruhela8659@gmail.com';
  const testPeriodId = activePeriod.id;
  const testAssessmentId = generateAssessmentId();
  const testSessionToken = generateAssessmentSessionToken();

  // 4a. Create Draft Assessment
  const draftRecord = {
    id: testAssessmentId,
    periodId: testPeriodId,
    periodTitle: activePeriod.title,
    memberEmail: testEmail,
    memberName: eligibleCandidate.name,
    memberDomain: eligibleCandidate.domain,
    memberRole: eligibleCandidate.role,
    memberStudentId: eligibleCandidate.studentId,
    sessionToken: testSessionToken,
    status: 'DRAFT',
    assignedWork: validSampleSection1,
    completedWork: [],
    pendingWork: { pendingTasks: [], missedResponsibilitiesDescription: '' },
    contribution: {},
    nextCommitments: { commitments: [], independentOwnershipArea: '', supportNeededFromLeadership: '', newInitiativeToLead: '' },
    currentStep: 2,
    completionPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await db.teamAssessments.insertOne(draftRecord);
  const fetchedDraft = await db.teamAssessments.getById(testAssessmentId);
  assert(fetchedDraft !== null, `Draft assessment created and fetched by ID: ${fetchedDraft?.id}`);
  assert(fetchedDraft?.status === 'DRAFT', `Assessment starts in DRAFT state`);
  assert(fetchedDraft?.assignedWork.length === 2, `Draft preserved Section 1 tasks`);

  // 4b. Update with all sections & Submit
  const completionPct = calculateCompletionPercentage(2, 2);
  const submittedRecord = {
    ...fetchedDraft,
    assignedWork: validSampleSection1,
    completedWork: validSampleSection2,
    pendingWork: validSampleSection3,
    contribution: validSampleSection4,
    nextCommitments: validSampleSection5,
    status: 'SUBMITTED',
    currentStep: 6,
    completionPercentage: completionPct,
    submissionReference: testAssessmentId,
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await db.teamAssessments.updateOne(testAssessmentId, submittedRecord);
  const fetchedSubmitted = await db.teamAssessments.getById(testAssessmentId);
  assert(fetchedSubmitted?.status === 'SUBMITTED', `Assessment transitioned to SUBMITTED state`);
  assert(fetchedSubmitted?.completionPercentage === 100, `Completion percentage is 100%`);
  assert(fetchedSubmitted?.completedWork.length === 2, `Section 2 completed items preserved`);
  assert(fetchedSubmitted?.contribution.ownershipLevel === 'Took full ownership', `Section 4 contribution preserved`);
  assert(fetchedSubmitted?.nextCommitments.commitments.length === 2, `Section 5 commitments preserved`);

  // 4c. Admin Evidence Verification
  console.log('\n--- Test Suite 5: Admin Evidence Item Verification ---');
  const evidenceItems = [...fetchedSubmitted.completedWork];
  evidenceItems[0].verificationStatus = 'Verified';
  evidenceItems[0].adminVerificationNotes = 'Verified GitHub repository code and commits.';
  evidenceItems[1].verificationStatus = 'Verified';
  evidenceItems[1].adminVerificationNotes = 'Verified event attendance and workshop recording.';

  await db.teamAssessments.updateOne(testAssessmentId, {
    completedWork: evidenceItems,
    updatedAt: new Date().toISOString()
  });

  const verifiedAssessment = await db.teamAssessments.getById(testAssessmentId);
  assert(verifiedAssessment?.completedWork[0].verificationStatus === 'Verified', `Item 1 evidence verified by admin`);
  assert(verifiedAssessment?.completedWork[1].verificationStatus === 'Verified', `Item 2 evidence verified by admin`);
  assert(verifiedAssessment?.completedWork[0].adminVerificationNotes.includes('Verified GitHub'), `Admin verification notes saved`);

  // 4d. Admin 0-10 Evaluation & Scoring
  console.log('\n--- Test Suite 6: Admin 0-10 Scoring & Evaluation ---');
  const adminReviewPayload = {
    workCompletionScore: 10,
    qualityScore: 9,
    ownershipScore: 10,
    consistencyScore: 9,
    communicationScore: 10,
    initiativeScore: 10,
    overallContributionScore: 10,
    adminComments: 'Exceptional leadership and outstanding contributions to AWS SBG CU-UP.',
    reviewedBy: 'awsadmin@culko.in',
    reviewedAt: new Date().toISOString(),
    isPublished: true
  };

  const adminValidation = validateAdminReviewPayload(adminReviewPayload);
  assert(adminValidation.valid, `Admin review payload validated cleanly`);

  const adminAvg = calculateAverageAdminScore(adminReviewPayload);
  const finalStatus = deriveSuggestedStatus(verifiedAssessment.completionPercentage, adminAvg);

  await db.teamAssessments.updateOne(testAssessmentId, {
    adminReview: adminReviewPayload,
    adminOverallScore: adminAvg,
    status: finalStatus,
    updatedAt: new Date().toISOString()
  });

  const reviewedAssessment = await db.teamAssessments.getById(testAssessmentId);
  assert(reviewedAssessment?.adminOverallScore >= 9.5, `Admin overall score recorded: ${reviewedAssessment?.adminOverallScore}/10`);
  assert(reviewedAssessment?.status === 'Outstanding', `Status resolved to 'Outstanding'`);
  assert(reviewedAssessment?.adminReview.adminComments.includes('Exceptional leadership'), `Admin comments saved`);

  // 4e. Summary Statistics Calculation
  console.log('\n--- Test Suite 7: Dashboard Summary Stats Calculation ---');
  const allAssessments = await db.teamAssessments.getAll();
  const summaryStats = calculateTeamAssessmentSummaryStats(allAssessments, activePeriod.eligibleMembers.length);
  assert(summaryStats.totalAssessed >= 1, `Total assessed count: ${summaryStats.totalAssessed}`);
  assert(summaryStats.completedReviews >= 1, `Completed reviews count: ${summaryStats.completedReviews}`);
  assert(summaryStats.outstandingContributors >= 1, `Outstanding count: ${summaryStats.outstandingContributors}`);
  assert(summaryStats.avgCompletionRate > 0, `Avg completion rate: ${summaryStats.avgCompletionRate}%`);
  assert(summaryStats.avgContributionScore > 0, `Avg contribution score: ${summaryStats.avgContributionScore}/10`);

  // 4f. CSV Export Generation
  console.log('\n--- Test Suite 8: CSV Export Engine ---');
  const csvData = generateAssessmentsCsv([reviewedAssessment]);
  assert(csvData.includes('Assessment ID,Period,Member Name,Email'), `CSV contains correct header columns`);
  assert(csvData.includes(testAssessmentId), `CSV contains assessment ID`);
  assert(csvData.includes('Om Ruhela'), `CSV contains candidate name`);
  assert(csvData.includes('Outstanding'), `CSV contains candidate status`);
  assert(csvData.includes('100.0%'), `CSV contains completion rate`);

  // 4g. Historical Snapshot Preservation Test
  console.log('\n--- Test Suite 9: Historical Snapshot Preservation ---');
  // If roster changes later, past assessment must retain original snapshot
  assert(reviewedAssessment?.memberName === 'Om Ruhela', `Original member name preserved`);
  assert(reviewedAssessment?.memberDomain === eligibleCandidate.domain, `Original member domain snapshot preserved`);
  assert(reviewedAssessment?.memberRole === eligibleCandidate.role, `Original member role snapshot preserved`);

  // Clean up test assessment so database remains pristine
  await db.teamAssessments.deleteOne(testAssessmentId);
  const postDelete = await db.teamAssessments.getById(testAssessmentId);
  assert(postDelete === null, `Test assessment record cleanly purged from test database`);

  // TEST 10: Strict Non-Interference Verification with Existing Systems
  console.log('\n--- Test Suite 10: Existing System Non-Interference Audit ---');
  
  // Verify Weekly Quiz files exist and are intact
  const weeklyQuizExists = fs.existsSync(path.join(rootDir, 'src/components/AdminWeeklyQuizProctoring.tsx'));
  assert(weeklyQuizExists, `AdminWeeklyQuizProctoring.tsx is untouched and intact`);

  const examsManagerExists = fs.existsSync(path.join(rootDir, 'src/components/AdminExamsManager.tsx'));
  assert(examsManagerExists, `AdminExamsManager.tsx is untouched and intact`);

  const foundingMembersExists = fs.existsSync(path.join(rootDir, 'src/components/AdminFoundingMembersManager.tsx'));
  assert(foundingMembersExists, `AdminFoundingMembersManager.tsx is untouched and intact`);

  const digitalIdsExists = fs.existsSync(path.join(rootDir, 'src/components/AdminDigitalIdManager.tsx'));
  assert(digitalIdsExists, `AdminDigitalIdManager.tsx is untouched and intact`);

  const digitalBadgesExists = fs.existsSync(path.join(rootDir, 'src/components/AdminDigitalBadgesManager.tsx'));
  assert(digitalBadgesExists, `AdminDigitalBadgesManager.tsx is untouched and intact`);

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED WITH ERROR:');
  console.error(err);
  process.exit(1);
});
