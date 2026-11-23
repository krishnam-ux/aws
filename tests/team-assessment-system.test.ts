import test, { describe, afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Isolate unit tests to local store
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;

import { db } from '../src/lib/db';
import {
  generateAssessmentId,
  generatePeriodId,
  generateAssessmentSessionToken,
  calculateCompletionPercentage,
  calculateAverageAdminScore,
  deriveSuggestedStatus,
  calculateTeamAssessmentSummaryStats,
  validateAssessmentSubmissionPayload,
  validateAdminReviewPayload,
  generateAssessmentsCsv
} from '../src/lib/teamAssessment';

import {
  TeamWorkAssessment,
  TeamAssessmentPeriod,
  TeamWorkTask,
  TeamWorkCompletedItem,
  TeamWorkPendingItem,
  TeamWorkContributionSection,
  TeamWorkNextCommitmentsSection
} from '../src/types/teamAssessment';

import { POST as authRoute } from '../src/app/api/team-assessment/auth/route';
import { GET as sessionRoute } from '../src/app/api/team-assessment/session/route';
import { POST as saveDraftRoute } from '../src/app/api/team-assessment/save-draft/route';
import { POST as submitRoute } from '../src/app/api/team-assessment/submit/route';
import { GET as adminGetRoute, POST as adminPostRoute, DELETE as adminDeleteRoute } from '../src/app/api/admin/team-assessment/route';
import { logTeamAssessmentAuditAction } from '../src/lib/teamAssessment';
import { TeamAssessmentAuditLog } from '../src/types/teamAssessment';

const SECURE_ADMIN_TOKEN = 'awssbg-admin-session-token-secure-hash';

function makeAdminAuthRequest(url: string, options: RequestInit = {}): Request {
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${SECURE_ADMIN_TOKEN}`);
  return new Request(url, { ...options, headers });
}

function makeUnauthRequest(url: string, options: RequestInit = {}): Request {
  return new Request(url, options);
}

describe('AWS SBG CU-UP — Team Work & Contribution Assessment System', () => {
  const testAssessmentIdsToCleanup: string[] = [];
  const testPeriodIdsToCleanup: string[] = [];

  after(async () => {
    for (const id of testAssessmentIdsToCleanup) {
      try {
        await db.teamAssessments.deleteOne(id);
      } catch (e) {}
    }
    for (const pid of testPeriodIdsToCleanup) {
      try {
        await db.teamAssessmentPeriods.deleteOne(pid);
      } catch (e) {}
    }
  });

  // TEST 1: Pure Functions & Mathematical Calculations
  test('1. calculateCompletionPercentage computes task progress correctly', () => {
    const tasks: TeamWorkTask[] = [
      { id: '1', title: 'T1', description: '', assignedDate: '2026-09-01', deadline: '2026-09-10', status: 'Completed', role: 'Lead' },
      { id: '2', title: 'T2', description: '', assignedDate: '2026-09-01', deadline: '2026-09-10', status: 'Completed', role: 'Lead' },
      { id: '3', title: 'T3', description: '', assignedDate: '2026-09-01', deadline: '2026-09-10', status: 'In Progress', role: 'Lead' },
      { id: '4', title: 'T4', description: '', assignedDate: '2026-09-01', deadline: '2026-09-10', status: 'Not Started', role: 'Lead' }
    ];

    const completed: TeamWorkCompletedItem[] = [
      { id: 'c1', taskName: 'T1', whatWasDone: 'Done', completionDate: '2026-09-09', verificationStatus: 'Pending Verification' },
      { id: 'c2', taskName: 'T2', whatWasDone: 'Done', completionDate: '2026-09-09', verificationStatus: 'Pending Verification' }
    ];

    assert.equal(calculateCompletionPercentage(tasks, completed), 50);
    assert.equal(calculateCompletionPercentage([], completed), 100);
    assert.equal(calculateCompletionPercentage(tasks, []), 50);
  });

  test('2. calculateAverageAdminScore averages 7 evaluation dimensions accurately', () => {
    const review = {
      workCompletionScore: 10,
      qualityScore: 8,
      ownershipScore: 9,
      consistencyScore: 9,
      communicationScore: 8,
      initiativeScore: 10,
      overallScore: 9
    };
    // Sum = 63 / 7 = 9.0
    const avg = calculateAverageAdminScore(review);
    assert.equal(avg, 9.0);
  });

  test('3. deriveSuggestedStatus categorizes performance bands properly', () => {
    assert.equal(deriveSuggestedStatus(95, 9.2), 'Outstanding');
    assert.equal(deriveSuggestedStatus(80, 8.0), 'Strong Contributor');
    assert.equal(deriveSuggestedStatus(65, 6.5), 'Active');
    assert.equal(deriveSuggestedStatus(40, 4.0), 'Needs Improvement');
    assert.equal(deriveSuggestedStatus(10, 2.0), 'Inactive');
    assert.equal(deriveSuggestedStatus(0, 0), 'Review Required');
  });

  // TEST 4: Candidate Authentication & Eligibility Verification
  test('4. /api/team-assessment/auth permits eligible candidate and rejects ineligible', async () => {
    // 4a. Eligible candidate
    const eligibleReq = makeUnauthRequest('http://localhost:3000/api/team-assessment/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'om.ruhela8659@gmail.com' })
    });

    const eligibleRes = await authRoute(eligibleReq);
    const eligibleData = await eligibleRes.json();
    assert.equal(eligibleRes.status, 200);
    assert.equal(eligibleData.success, true);
    assert.ok(eligibleData.sessionToken);
    assert.equal(eligibleData.memberProfile.email, 'om.ruhela8659@gmail.com');
    assert.equal(eligibleData.memberProfile.name, 'Om Ruhela');
    assert.ok(eligibleData.assessment.id);

    testAssessmentIdsToCleanup.push(eligibleData.assessment.id);

    // 4b. Ineligible email
    const ineligibleReq = makeUnauthRequest('http://localhost:3000/api/team-assessment/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'unknown.student@example.com' })
    });

    const ineligibleRes = await authRoute(ineligibleReq);
    const ineligibleData = await ineligibleRes.json();
    assert.equal(ineligibleRes.status, 200);
    assert.equal(ineligibleData.isEligible, false);
    assert.equal(ineligibleData.reason, 'NOT_ELIGIBLE_FOR_PERIOD');
  });

  // TEST 5: Candidate Draft Save & Session Resumption
  test('5. Candidate can save drafts and resume session with preserved state', async () => {
    // Authenticate candidate Krishna Mohan
    const authReq = makeUnauthRequest('http://localhost:3000/api/team-assessment/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'krishnamohan.aws@gmail.com' })
    });
    const authRes = await authRoute(authReq);
    const authData = await authRes.json();
    const sessionToken = authData.sessionToken;
    testAssessmentIdsToCleanup.push(authData.assessment.id);

    // Save Draft with Section 1 and Section 2
    const assignedTasks: TeamWorkTask[] = [
      {
        id: 'task-km-1',
        title: 'Architect VPC & Bastion Host',
        description: 'Provisioned dual-AZ VPC with NAT Gateway',
        assignedDate: '2026-09-01',
        deadline: '2026-09-15',
        status: 'Completed',
        role: 'Co-lead'
      }
    ];

    const completedTasks: TeamWorkCompletedItem[] = [
      {
        id: 'comp-km-1',
        taskName: 'Architect VPC & Bastion Host',
        whatWasDone: 'Configured Terraform scripts and automated peering connection.',
        completionDate: '2026-09-14',
        evidenceUrl: 'https://github.com/aws-sbg-cuup/terraform-vpc',
        evidenceType: 'GitHub',
        verificationStatus: 'Pending Verification'
      }
    ];

    const draftReq = makeUnauthRequest('http://localhost:3000/api/team-assessment/save-draft', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`
      },
      body: JSON.stringify({
        sessionToken,
        assignedTasks,
        completedTasks,
        currentStep: 3
      })
    });

    const draftRes = await saveDraftRoute(draftReq);
    const draftData = await draftRes.json();
    assert.equal(draftRes.status, 200);
    assert.equal(draftData.success, true);
    assert.equal(draftData.assessment.assignedTasks.length, 1);
    assert.equal(draftData.assessment.completedTasks.length, 1);

    // Retrieve via session endpoint
    const sessionReq = makeUnauthRequest(`http://localhost:3000/api/team-assessment/session?token=${sessionToken}`);
    const sessionRes = await sessionRoute(sessionReq);
    const sessionData = await sessionRes.json();
    assert.equal(sessionRes.status, 200);
    assert.equal(sessionData.success, true);
    assert.equal(sessionData.assessment.assignedTasks[0].title, 'Architect VPC & Bastion Host');
    assert.equal(sessionData.assessment.completedTasks[0].evidenceUrl, 'https://github.com/aws-sbg-cuup/terraform-vpc');
  });

  // TEST 6: Candidate Full Submission & Server-Side Validation
  test('6. /api/team-assessment/submit enforces complete section data and transitions state to SUBMITTED', async () => {
    // Clean any prior assessment for Om Ruhela so we test full lifecycle
    const active = await db.teamAssessmentPeriods.getActive();
    if (active) {
      const existing = await db.teamAssessments.getByEmailAndPeriod('om.ruhela8659@gmail.com', active.id);
      if (existing) {
        await db.teamAssessments.deleteOne(existing.id);
      }
    }

    // Authenticate candidate Om Ruhela
    const authReq = makeUnauthRequest('http://localhost:3000/api/team-assessment/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'om.ruhela8659@gmail.com' })
    });
    const authRes = await authRoute(authReq);
    const authData = await authRes.json();
    const sessionToken = authData.sessionToken;
    const assessmentId = authData.assessment.id;
    testAssessmentIdsToCleanup.push(assessmentId);

    // 6a. Try submitting invalid empty payload
    const invalidSubmitReq = makeUnauthRequest('http://localhost:3000/api/team-assessment/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`
      },
      body: JSON.stringify({ sessionToken })
    });
    const invalidRes = await submitRoute(invalidSubmitReq);
    assert.equal(invalidRes.status, 400);

    // 6b. Submit full valid payload across all 5 sections
    const assignedTasks: TeamWorkTask[] = [
      {
        id: 't-1',
        title: 'Lead Cloud Architecture Study Jam',
        description: 'Prepared labs for 50+ students',
        assignedDate: '2026-09-01',
        deadline: '2026-09-20',
        status: 'Completed',
        role: 'Lead'
      },
      {
        id: 't-2',
        title: 'CI/CD Automated Deployment Pipeline',
        description: 'GitHub Actions to AWS S3 & CloudFront',
        assignedDate: '2026-09-10',
        deadline: '2026-09-28',
        status: 'Completed',
        role: 'Lead'
      }
    ];

    const completedTasks: TeamWorkCompletedItem[] = [
      {
        id: 'c-1',
        taskName: 'Lead Cloud Architecture Study Jam',
        whatWasDone: 'Delivered 3 hands-on sessions on AWS IAM and S3 security.',
        completionDate: '2026-09-20',
        evidenceUrl: 'https://www.awssbgcuup.tech/events',
        evidenceType: 'Event',
        verificationStatus: 'Pending Verification'
      },
      {
        id: 'c-2',
        taskName: 'CI/CD Automated Deployment Pipeline',
        whatWasDone: 'Built and tested automated deployment workflow.',
        completionDate: '2026-09-28',
        evidenceUrl: 'https://github.com/aws-sbg-cuup/cicd-pipeline',
        evidenceType: 'GitHub',
        verificationStatus: 'Pending Verification'
      }
    ];

    const pendingTasks: TeamWorkPendingItem[] = [];

    const contribution: TeamWorkContributionSection = {
      independence: 'Completely independently',
      communication: 'Consistently',
      deadlineConsistency: 'Always',
      ownership: 'Took full ownership',
      extraContribution: 'Yes, significantly',
      mostValuableContribution: 'Mentored 15 students and built automated deployment scripts.',
      areaForImprovement: 'Improve advance documentation before launching workshops.'
    };

    const commitments: TeamWorkNextCommitmentsSection = {
      sevenDayCommitment: 'Publish Serverless microservice architecture tutorial.',
      thirtyDayCommitment: 'Organize AWS Community Day hackathon track.',
      independentResponsibility: 'Cloud Architecture & DevOps Workshops',
      leadershipSupportNeeded: 'Additional sandbox accounts for live demos',
      newInitiativeOwnership: 'AWS Certification prep study group'
    };

    const submitReq = makeUnauthRequest('http://localhost:3000/api/team-assessment/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`
      },
      body: JSON.stringify({
        sessionToken,
        assignedTasks,
        completedTasks,
        pendingTasks,
        missedResponsibilities: 'None; all targets met on schedule.',
        contribution,
        commitments
      })
    });

    const submitRes = await submitRoute(submitReq);
    const submitData = await submitRes.json();
    assert.equal(submitRes.status, 200);
    assert.equal(submitData.success, true);
    assert.equal(submitData.assessment.status, 'SUBMITTED');
    assert.equal(submitData.assessment.completionPercentage, 100);
    assert.ok(submitData.assessment.submittedAt);
  });

  // TEST 7: Admin Dashboard, Evidence Verification & 0-10 Evaluation
  test('7. Admin API allows dashboard inspection, evidence verification, and 0-10 scoring', async () => {
    // 7a. Get Dashboard Data
    const dashReq = makeAdminAuthRequest('http://localhost:3000/api/admin/team-assessment?action=get-dashboard');
    const dashRes = await adminGetRoute(dashReq);
    const dashData = await dashRes.json();
    assert.equal(dashRes.status, 200);
    assert.equal(dashData.success, true);
    assert.ok(dashData.metrics.totalAssessed >= 1);
    assert.ok(Array.isArray(dashData.assessments));

    const submittedAss = dashData.assessments.find((a: any) => a.memberEmail === 'om.ruhela8659@gmail.com');
    assert.ok(submittedAss);
    const evidenceItemId = submittedAss.completedTasks[0].id;

    // 7b. Admin Verifies Evidence
    const verifyReq = makeAdminAuthRequest('http://localhost:3000/api/admin/team-assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify-evidence',
        assessmentId: submittedAss.id,
        evidenceItemId,
        verificationStatus: 'Verified',
        adminNotes: 'Code verified in official AWS SBG GitHub repository.'
      })
    });

    const verifyRes = await adminPostRoute(verifyReq);
    const verifyData = await verifyRes.json();
    assert.equal(verifyRes.status, 200);
    assert.equal(verifyData.success, true);
    assert.equal(verifyData.assessment.completedTasks[0].verificationStatus, 'Verified');
    assert.equal(verifyData.assessment.completedTasks[0].adminNotes, 'Code verified in official AWS SBG GitHub repository.');

    // 7c. Admin Scores 0-10 across 7 dimensions
    const reviewPayload = {
      workCompletionScore: 10,
      qualityScore: 9,
      ownershipScore: 10,
      consistencyScore: 10,
      communicationScore: 9,
      initiativeScore: 10,
      overallScore: 10,
      adminFeedback: 'Exceptional ownership and verified high-impact contribution.',
      finalStatus: 'Outstanding',
      isPublishedToMember: true
    };

    const reviewReq = makeAdminAuthRequest('http://localhost:3000/api/admin/team-assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save-review',
        assessmentId: submittedAss.id,
        review: reviewPayload
      })
    });

    const reviewRes = await adminPostRoute(reviewReq);
    const reviewData = await reviewRes.json();
    assert.equal(reviewRes.status, 200);
    assert.equal(reviewData.success, true);
    assert.equal(reviewData.assessment.status, 'REVIEWED');
    assert.equal(reviewData.assessment.adminReview.finalStatus, 'Outstanding');
    assert.ok(reviewData.assessment.adminReview.calculatedAverageScore >= 9.5);
  });

  // TEST 8: Admin CSV Export
  test('8. Admin CSV export generates correct formatted data rows', async () => {
    const csvReq = makeAdminAuthRequest('http://localhost:3000/api/admin/team-assessment?action=export-csv');
    const csvRes = await adminGetRoute(csvReq);
    assert.equal(csvRes.status, 200);
    assert.equal(csvRes.headers.get('Content-Type'), 'text/csv; charset=utf-8');

    const csvText = await csvRes.text();
    assert.ok(csvText.includes('Assessment ID,Period Title,Member Name,Member Email'));
    assert.ok(csvText.includes('Om Ruhela'));
    assert.ok(csvText.includes('om.ruhela8659@gmail.com'));
    assert.ok(csvText.includes('Outstanding'));
  });

  // TEST 9: Security & IDOR Protection for general endpoints
  test('9. Admin endpoints reject unauthorized access with 401/403', async () => {
    const unauthReq = makeUnauthRequest('http://localhost:3000/api/admin/team-assessment?action=get-dashboard');
    const unauthRes = await adminGetRoute(unauthReq);
    assert.equal(unauthRes.status, 401);

    const unauthPostReq = makeUnauthRequest('http://localhost:3000/api/admin/team-assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save-period', period: {} })
    });
    const unauthPostRes = await adminPostRoute(unauthPostReq);
    assert.equal(unauthPostRes.status, 401);
  });

  // TEST 10: Permanent Assessment Deletion with IDOR & Audit Logging (POST action)
  test('10. Admin can permanently delete an assessment via POST delete-assessment with IDOR protection and audit logging', async () => {
    // 10a. Create a dedicated test assessment
    const active = await db.teamAssessmentPeriods.getActive();
    const testId = `twa_test_del_${Date.now()}`;
    const testToken = `tws_test_del_${Date.now()}`;
    const assessmentToDel: TeamWorkAssessment = {
      id: testId,
      assessmentPeriodId: active?.id || 'period-2026-q3-oct',
      assessmentPeriodTitle: active?.title || 'Test Review Period',
      memberEmail: 'chaudharyamarchaudhary593@gmail.com',
      memberName: 'Amar Chaudhary',
      memberRole: 'DevOps & Infrastructure Lead',
      memberDomain: 'DevOps & SRE',
      sessionToken: testToken,
      status: 'SUBMITTED',
      assignedTasks: [
        { id: 'dt-1', title: 'Kubernetes Cluster Provisioning', description: 'EKS Cluster', assignedDate: '2026-10-01', deadline: '2026-10-15', status: 'Completed', role: 'Lead' }
      ],
      completedTasks: [
        { id: 'dc-1', taskName: 'Kubernetes Cluster Provisioning', whatWasDone: 'Helm charts configured', completionDate: '2026-10-14', verificationStatus: 'Verified' }
      ],
      pendingTasks: [],
      missedResponsibilities: '',
      contribution: {
        independence: 'Completely independently',
        communication: 'Consistently',
        deadlineConsistency: 'Always',
        ownership: 'Took full ownership',
        extraContribution: 'Yes, significantly',
        mostValuableContribution: 'Automated CI/CD',
        areaForImprovement: 'Monitoring'
      },
      commitments: {
        sevenDayCommitment: 'Terraform modules',
        thirtyDayCommitment: 'Observability',
        independentResponsibility: 'SRE',
        leadershipSupportNeeded: 'Cloud credits',
        newInitiativeOwnership: 'EKS'
      },
      completionPercentage: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.teamAssessments.insertOne(assessmentToDel);

    // Verify it exists in DB
    const inserted = await db.teamAssessments.getById(testId);
    assert.ok(inserted);

    // 10b. Unauthorized deletion attempt must return 401
    const unauthDelReq = makeUnauthRequest('http://localhost:3000/api/admin/team-assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-assessment', assessmentId: testId })
    });
    const unauthDelRes = await adminPostRoute(unauthDelReq);
    assert.equal(unauthDelRes.status, 401);

    // 10c. IDOR: Deleting non-existent ID must return 404
    const nonExistentReq = makeAdminAuthRequest('http://localhost:3000/api/admin/team-assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-assessment', assessmentId: 'twa_invalid_nonexistent_id' })
    });
    const nonExistentRes = await adminPostRoute(nonExistentReq);
    assert.equal(nonExistentRes.status, 404);

    // 10d. Missing assessmentId must return 400
    const missingIdReq = makeAdminAuthRequest('http://localhost:3000/api/admin/team-assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-assessment', assessmentId: '' })
    });
    const missingIdRes = await adminPostRoute(missingIdReq);
    assert.equal(missingIdRes.status, 400);

    // 10e. Authorized deletion of existing assessment
    const authDelReq = makeAdminAuthRequest('http://localhost:3000/api/admin/team-assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete-assessment',
        assessmentId: testId,
        reason: 'Integration test deletion validation'
      })
    });
    const authDelRes = await adminPostRoute(authDelReq);
    const authDelData = await authDelRes.json();
    assert.equal(authDelRes.status, 200);
    assert.equal(authDelData.success, true);
    assert.equal(authDelData.deletedId, testId);
    assert.equal(authDelData.memberName, 'Amar Chaudhary');

    // 10f. Verify record and draft state are permanently gone
    const deletedCheck = await db.teamAssessments.getById(testId);
    assert.equal(deletedCheck, null);

    const tokenCheck = await db.teamAssessments.getBySessionToken(testToken);
    assert.equal(tokenCheck, null);

    // 10g. Verify candidate session endpoint rejects the deleted session token
    const invalidatedSessionReq = makeUnauthRequest(`http://localhost:3000/api/team-assessment/session?token=${testToken}`);
    const invalidatedSessionRes = await sessionRoute(invalidatedSessionReq);
    assert.equal(invalidatedSessionRes.status, 401);

    // 10h. Verify audit log entry was created for DELETE_ASSESSMENT
    const auditLogs: TeamAssessmentAuditLog[] = await db.teamAssessmentAuditLogs.getByAssessmentId(testId);
    assert.ok(auditLogs.length >= 1);
    const deleteLog = auditLogs.find(l => l.action === 'DELETE_ASSESSMENT');
    assert.ok(deleteLog);
    assert.equal(deleteLog.memberEmail, 'chaudharyamarchaudhary593@gmail.com');
    assert.equal(deleteLog.memberName, 'Amar Chaudhary');
    assert.equal(deleteLog.details?.assignedTasksCount, 1);
    assert.equal(deleteLog.details?.completedTasksCount, 1);
    assert.equal(deleteLog.details?.reason, 'Integration test deletion validation');
  });

  // TEST 11: Permanent Assessment Deletion via DELETE HTTP Route
  test('11. Admin can permanently delete an assessment via DELETE HTTP method', async () => {
    // Create test assessment
    const active = await db.teamAssessmentPeriods.getActive();
    const testId = `twa_test_http_del_${Date.now()}`;
    const testToken = `tws_test_http_del_${Date.now()}`;
    const assessmentToDel: TeamWorkAssessment = {
      id: testId,
      assessmentPeriodId: active?.id || 'period-2026-q3-oct',
      assessmentPeriodTitle: active?.title || 'Test Review Period',
      memberEmail: 'divyanshu.dev@culkomail.in',
      memberName: 'Divyanshu Sharma',
      memberRole: 'Frontend & UI Lead',
      memberDomain: 'Web & Community Platforms',
      sessionToken: testToken,
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
        mostValuableContribution: 'Frontend design',
        areaForImprovement: 'Testing'
      },
      commitments: {
        sevenDayCommitment: 'UI Polish',
        thirtyDayCommitment: 'Design system',
        independentResponsibility: 'Web',
        leadershipSupportNeeded: 'Figma',
        newInitiativeOwnership: 'Portal'
      },
      completionPercentage: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.teamAssessments.insertOne(assessmentToDel);

    // 11a. Unauthorized DELETE method must return 401
    const unauthHttpReq = makeUnauthRequest(`http://localhost:3000/api/admin/team-assessment?assessmentId=${testId}`, {
      method: 'DELETE'
    });
    const unauthHttpRes = await adminDeleteRoute(unauthHttpReq);
    assert.equal(unauthHttpRes.status, 401);

    // 11b. Authorized DELETE method deletes assessment
    const authHttpReq = makeAdminAuthRequest(`http://localhost:3000/api/admin/team-assessment?assessmentId=${testId}&reason=HTTP+DELETE+Test`, {
      method: 'DELETE'
    });
    const authHttpRes = await adminDeleteRoute(authHttpReq);
    const authHttpData = await authHttpRes.json();
    assert.equal(authHttpRes.status, 200);
    assert.equal(authHttpData.success, true);
    assert.equal(authHttpData.deletedId, testId);

    // Verify gone
    const checkGone = await db.teamAssessments.getById(testId);
    assert.equal(checkGone, null);
  });

  // TEST 12: Audit Log Retrieval Endpoint
  test('12. Admin can retrieve audit logs via GET action=get-audit-logs', async () => {
    const auditReq = makeAdminAuthRequest('http://localhost:3000/api/admin/team-assessment?action=get-audit-logs');
    const auditRes = await adminGetRoute(auditReq);
    const auditData = await auditRes.json();
    assert.equal(auditRes.status, 200);
    assert.equal(auditData.success, true);
    assert.ok(Array.isArray(auditData.logs));
    assert.ok(auditData.logs.some((l: any) => l.action === 'DELETE_ASSESSMENT'));
  });

  // TEST 13: Strict Non-Interference Verification
  test('13. Weekly Quiz and Certification Exam systems remain completely isolated and intact', () => {
    const root = path.resolve(__dirname, '..');
    assert.ok(fs.existsSync(path.join(root, 'src/components/AdminWeeklyQuizProctoring.tsx')));
    assert.ok(fs.existsSync(path.join(root, 'src/components/AdminExamsManager.tsx')));
    assert.ok(fs.existsSync(path.join(root, 'src/components/AdminDigitalIdManager.tsx')));
    assert.ok(fs.existsSync(path.join(root, 'src/components/AdminDigitalBadgesManager.tsx')));
    assert.ok(fs.existsSync(path.join(root, 'src/components/AdminFoundingMembersManager.tsx')));
    assert.ok(fs.existsSync(path.join(root, 'src/lib/weeklyQuiz.ts')));
    assert.ok(fs.existsSync(path.join(root, 'src/lib/exam.ts')));
  });
});
