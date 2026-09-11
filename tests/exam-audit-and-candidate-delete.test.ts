import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/db';
import { POST as authPost } from '../src/app/api/exam/auth/route';
import { POST as adminControlPost } from '../src/app/api/admin/exams/control/route';
import { GET as adminLiveGet } from '../src/app/api/admin/exams/live/route';
import { calculateRemainingSeconds } from '../src/lib/exam';
import { Exam, ExamAttempt } from '../src/types/exam';

const ADMIN_HEADER = { Authorization: 'Bearer awssbg-admin-session-token-secure-hash' };

test('Audit & Verification: Resilient Exam Lookup & Immediate Accessibility', async () => {
  const testExamId = 'exam-resilience-mock-test';
  const testExamCode = 'AWS-RESIL-01';

  // 1. Create fresh exam
  const exam: Exam = {
    id: testExamId,
    examCode: testExamCode,
    password: 'secure-resilience-pass',
    title: 'AWS Resilience Verification Mock',
    description: 'Testing instant lookup and case resilience',
    category: 'Cloud Architecture',
    durationMinutes: 40,
    passingPercentage: 70,
    maxAttempts: 1,
    status: 'Live',
    requireSecureBrowser: true,
    maxSecurityViolations: 3,
    questions: [
      {
        id: 'rq-1',
        question: 'What ensures high availability?',
        options: ['Multi-AZ', 'Single-AZ', 'No backup', 'Single server'],
        correctOptionIndex: 0,
        marks: 10,
        explanation: 'Multi-AZ provides high availability.'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await db.exams.insertOne(exam);

  // 2. Direct ID lookup
  const directLookup = await db.exams.getById(testExamId);
  assert.ok(directLookup, 'Direct ID lookup must succeed immediately without caching delays');
  assert.equal(directLookup.title, 'AWS Resilience Verification Mock');

  // 3. Case-insensitive ExamCode lookup
  const codeLookupLower = await db.exams.getById('aws-resil-01');
  assert.ok(codeLookupLower, 'Lowercase examCode lookup must succeed');
  assert.equal(codeLookupLower.id, testExamId);

  // 4. Normalized with whitespace and different casing
  const authReq = new Request('http://localhost/api/exam/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      examId: '  aws-resil-01  ', // lower case with leading/trailing spaces
      password: 'secure-resilience-pass',
      studentName: 'Rohan Verma',
      rollNumber: '23BCS8888',
      email: 'rohan.verma@cumail.in'
    })
  });

  const authRes = await authPost(authReq);
  const authData = await authRes.json();
  assert.equal(authRes.status, 200, `Auth should succeed with status 200. Error was: ${authData.error}`);
  assert.equal(authData.success, true);
  assert.ok(authData.attemptId);
  assert.ok(authData.token);

  // Clean up
  await db.examAttempts.deleteById(authData.attemptId);
  await db.exams.deleteOne(testExamId);
});

test('Audit & Verification: Candidate Deletion Actions & Protection', async () => {
  const testExamId = 'exam-delete-test';
  await db.exams.deleteOne(testExamId);

  await db.exams.insertOne({
    id: testExamId,
    examCode: 'AWS-DEL-01',
    password: 'del-test-pass',
    title: 'Candidate Delete Test Exam',
    description: 'Verifying candidate deletion capabilities',
    category: 'Cloud',
    durationMinutes: 30,
    passingPercentage: 70,
    maxAttempts: 1,
    status: 'Live',
    requireSecureBrowser: false,
    maxSecurityViolations: 3,
    questions: [
      {
        id: 'del-q1',
        question: 'Sample question?',
        options: ['A', 'B', 'C', 'D'],
        correctOptionIndex: 0,
        marks: 10
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Seed 3 candidate attempts: 2 LOCKED, 1 IN_EXAM
  const c1: ExamAttempt = {
    id: 'att-cand-1',
    examId: testExamId,
    studentName: 'Waiting Candidate A',
    rollNumber: '23BCS1001',
    email: 'candA@cumail.in',
    sessionToken: 'token-c1',
    status: 'LOCKED',
    extendedMinutes: 0,
    answers: {},
    markedForReview: [],
    score: 0,
    totalMarks: 0,
    percentage: 0,
    passed: false,
    securityViolationsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const c2: ExamAttempt = {
    id: 'att-cand-2',
    examId: testExamId,
    studentName: 'Waiting Candidate B',
    rollNumber: '23BCS1002',
    email: 'candB@cumail.in',
    sessionToken: 'token-c2',
    status: 'LOCKED',
    extendedMinutes: 0,
    answers: {},
    markedForReview: [],
    score: 0,
    totalMarks: 0,
    percentage: 0,
    passed: false,
    securityViolationsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const c3: ExamAttempt = {
    id: 'att-cand-3',
    examId: testExamId,
    studentName: 'Active Candidate C',
    rollNumber: '23BCS1003',
    email: 'candC@cumail.in',
    sessionToken: 'token-c3',
    status: 'IN_EXAM',
    startedAt: new Date().toISOString(),
    extendedMinutes: 0,
    answers: {},
    markedForReview: [],
    score: 0,
    totalMarks: 0,
    percentage: 0,
    passed: false,
    securityViolationsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await db.examAttempts.insertOne(c1);
  await db.examAttempts.insertOne(c2);
  await db.examAttempts.insertOne(c3);

  // 1. Verify all 3 appear in Live Control
  const liveReq = new Request(`http://localhost/api/admin/exams/live?examId=${testExamId}`, {
    headers: ADMIN_HEADER
  });
  let liveRes = await adminLiveGet(liveReq);
  let liveData = await liveRes.json();
  assert.equal(liveData.stats.totalCandidates, 3);
  assert.equal(liveData.stats.waiting, 2);
  assert.equal(liveData.stats.inExam, 1);

  // 2. Delete single candidate c1
  const delSingleReq = new Request('http://localhost/api/admin/exams/control', {
    method: 'POST',
    headers: { ...ADMIN_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'delete-candidate',
      examId: testExamId,
      candidateId: 'att-cand-1'
    })
  });
  const delSingleRes = await adminControlPost(delSingleReq);
  const delSingleData = await delSingleRes.json();
  assert.equal(delSingleRes.status, 200);
  assert.equal(delSingleData.success, true);

  // Confirm c1 is deleted
  const fetchedC1 = await db.examAttempts.getById('att-cand-1');
  assert.equal(fetchedC1, null, 'Candidate 1 must be deleted');

  // 3. Delete waiting candidates in lobby (c2)
  const delWaitingReq = new Request('http://localhost/api/admin/exams/control', {
    method: 'POST',
    headers: { ...ADMIN_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'delete-waiting',
      examId: testExamId
    })
  });
  const delWaitingRes = await adminControlPost(delWaitingReq);
  assert.equal(delWaitingRes.status, 200);

  // Confirm c2 is deleted, c3 is still active
  const fetchedC2 = await db.examAttempts.getById('att-cand-2');
  assert.equal(fetchedC2, null, 'Candidate 2 should be deleted by delete-waiting');
  const fetchedC3 = await db.examAttempts.getById('att-cand-3');
  assert.ok(fetchedC3, 'Candidate 3 (IN_EXAM) should not be deleted by delete-waiting');

  // 4. Delete all remaining candidates
  const delAllReq = new Request('http://localhost/api/admin/exams/control', {
    method: 'POST',
    headers: { ...ADMIN_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'delete-all-candidates',
      examId: testExamId
    })
  });
  const delAllRes = await adminControlPost(delAllReq);
  assert.equal(delAllRes.status, 200);

  // Confirm exam and questions remain intact
  const finalExam = await db.exams.getById(testExamId);
  assert.ok(finalExam, 'Exam must NOT be deleted when candidates are deleted');
  assert.equal(finalExam.questions.length, 1, 'Exam questions must NOT be affected');

  // Clean up
  await db.exams.deleteOne(testExamId);
});

test('Audit & Verification: Authoritative Time Extension Calculation', async () => {
  const exam: Exam = {
    id: 'exam-time-test',
    examCode: 'AWS-TIME-01',
    password: 'time-pass',
    title: 'Time Extension Test',
    description: 'Test timer calculations',
    category: 'Cloud',
    durationMinutes: 10, // 10 mins = 600s
    passingPercentage: 70,
    maxAttempts: 1,
    status: 'Live',
    requireSecureBrowser: false,
    maxSecurityViolations: 3,
    questions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const startedAt = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // started 2 mins ago

  const attempt: ExamAttempt = {
    id: 'att-time-1',
    examId: exam.id,
    studentName: 'Timer Student',
    rollNumber: '23BCS3333',
    email: 'timer@cumail.in',
    sessionToken: 'token-time',
    status: 'IN_EXAM',
    startedAt,
    extendedMinutes: 0,
    answers: {},
    markedForReview: [],
    score: 0,
    totalMarks: 0,
    percentage: 0,
    passed: false,
    securityViolationsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Base remaining seconds: 10m - 2m elapsed = ~8m = 480s (allow 2s delta)
  const remBefore = calculateRemainingSeconds(attempt, exam);
  assert.ok(remBefore >= 475 && remBefore <= 485, `Remaining before extension should be ~480s, got ${remBefore}`);

  // Admin extends time by +5 minutes
  attempt.extendedMinutes = 5;
  const remAfter = calculateRemainingSeconds(attempt, exam);
  assert.ok(remAfter >= 775 && remAfter <= 785, `Remaining after +5m extension should be ~780s, got ${remAfter}`);
});
