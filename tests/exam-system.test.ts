import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/db';
import {
  generateSessionToken,
  generateAttemptId,
  sanitizeExamForStudent,
  calculateRemainingSeconds,
  evaluateExamSubmission,
  logSecurityEvent,
  logAdminAudit,
  generateSEBConfigXml
} from '../src/lib/exam';
import { Exam, ExamAttempt } from '../src/types/exam';

const TEST_EXAM: Exam = {
  id: 'test-exam-ccp-unit',
  examCode: 'AWS-TEST-01',
  password: 'test-secure-pass',
  title: 'AWS Certified Cloud Practitioner Unit Assessment',
  description: 'Unit testing exam model',
  category: 'Cloud Architecture',
  durationMinutes: 30,
  passingPercentage: 70,
  maxAttempts: 2,
  status: 'Live',
  requireSecureBrowser: true,
  maxSecurityViolations: 3,
  questions: [
    {
      id: 'tq-1',
      question: 'Which AWS service is an object storage service?',
      options: ['EC2', 'S3', 'RDS', 'Lambda'],
      correctOptionIndex: 1,
      marks: 10,
      explanation: 'Amazon S3 is an object storage service.'
    },
    {
      id: 'tq-2',
      question: 'Which service allows running code serverless?',
      options: ['EC2', 'EBS', 'Lambda', 'VPC'],
      correctOptionIndex: 2,
      marks: 10,
      explanation: 'AWS Lambda runs code serverless.'
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

test('1. Security Anti-Bypass: Client Question Sanitization', async () => {
  const sanitized = sanitizeExamForStudent(TEST_EXAM);
  assert.equal(sanitized.id, TEST_EXAM.id);
  assert.equal(sanitized.questions.length, 2);

  // Assert correctOptionIndex and explanation are strictly stripped
  for (const q of sanitized.questions) {
    assert.equal((q as any).correctOptionIndex, undefined, 'correctOptionIndex must never leak to student client');
    assert.equal((q as any).explanation, undefined, 'explanation must never leak to student client during exam');
    assert.ok(q.options.length > 0);
    assert.ok(q.marks > 0);
  }
});

test('2. Exam Lifecycle: Lobby Locking, Admin Verification, and Unlock', async () => {
  await db.exams.insertOne(TEST_EXAM);

  const attemptId = generateAttemptId();
  const token = generateSessionToken();

  const attempt: ExamAttempt = {
    id: attemptId,
    examId: TEST_EXAM.id,
    studentName: 'Test Student One',
    rollNumber: '23BCS9999',
    email: 'test.student@cumail.in',
    sessionToken: token,
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

  await db.examAttempts.insertOne(attempt);

  // 1. Initially Locked in lobby
  let fetched = await db.examAttempts.getById(attemptId);
  assert.ok(fetched);
  assert.equal(fetched.status, 'LOCKED');

  // 2. Admin Verifies candidate
  await db.examAttempts.updateOne(attemptId, {
    status: 'VERIFIED',
    verifiedAt: new Date().toISOString()
  });
  fetched = await db.examAttempts.getById(attemptId);
  assert.equal(fetched.status, 'VERIFIED');

  // 3. Admin Unlocks candidate
  await db.examAttempts.updateOne(attemptId, {
    status: 'UNLOCKED',
    unlockedAt: new Date().toISOString()
  });
  fetched = await db.examAttempts.getById(attemptId);
  assert.equal(fetched.status, 'UNLOCKED');

  // Clean up
  await db.examAttempts.deleteById(attemptId);
});

test('3. Authoritative Server-Side Timer & Concurrency', async () => {
  const attemptId = generateAttemptId();
  const token = generateSessionToken();

  const now = new Date();
  const startedAt = new Date(now.getTime() - 10 * 60 * 1000).toISOString(); // 10 mins ago
  const expiresAt = new Date(now.getTime() + 20 * 60 * 1000).toISOString(); // 20 mins remaining

  const attempt: ExamAttempt = {
    id: attemptId,
    examId: TEST_EXAM.id,
    studentName: 'Timer Test Student',
    rollNumber: '23BCS8888',
    email: 'timer@cumail.in',
    sessionToken: token,
    status: 'IN_EXAM',
    startedAt,
    expiresAt,
    extendedMinutes: 0,
    answers: {},
    markedForReview: [],
    score: 0,
    totalMarks: 0,
    percentage: 0,
    passed: false,
    securityViolationsCount: 0,
    createdAt: startedAt,
    updatedAt: startedAt
  };

  await db.examAttempts.insertOne(attempt);

  const remaining = calculateRemainingSeconds(attempt, TEST_EXAM);
  // Expected approx 20 mins = 1200 seconds (allow ±5 seconds tolerance)
  assert.ok(remaining >= 1190 && remaining <= 1210, `Expected ~1200s, got ${remaining}s`);

  // Test admin time extension (+5 mins)
  attempt.extendedMinutes = 5;
  const extendedRemaining = calculateRemainingSeconds(attempt, TEST_EXAM);
  assert.ok(extendedRemaining >= 1490 && extendedRemaining <= 1510, `Expected ~1500s after +5min extension, got ${extendedRemaining}s`);

  await db.examAttempts.deleteById(attemptId);
});

test('4. Server-Side Scoring, Pass/Fail Threshold, Email Notification & No Certificate Generation', async () => {
  const attemptId = generateAttemptId();
  const token = generateSessionToken();

  // Student answers: Q1 -> Option 1 (Correct, S3), Q2 -> Option 2 (Correct, Lambda) = 100%
  const passingAttempt: ExamAttempt = {
    id: attemptId,
    examId: TEST_EXAM.id,
    studentName: 'Abhay Kumar',
    rollNumber: '23BCS1001',
    email: 'abhay@cumail.in',
    sessionToken: token,
    status: 'IN_EXAM',
    extendedMinutes: 0,
    answers: {
      'tq-1': 1,
      'tq-2': 2
    },
    markedForReview: [],
    score: 0,
    totalMarks: 0,
    percentage: 0,
    passed: false,
    securityViolationsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const evalResult = await evaluateExamSubmission(TEST_EXAM, passingAttempt, 'MANUAL');
  assert.equal(evalResult.score, 20);
  assert.equal(evalResult.totalMarks, 20);
  assert.equal(evalResult.percentage, 100);
  assert.equal(evalResult.passed, true);
  // Certificate must NOT be generated
  assert.equal((evalResult as any).certificateId, undefined, 'Certificate must NEVER be generated automatically');

  // Verify notifications table contains the dispatched result email
  const notifs = await db.notifications.getAll();
  const resultEmailNotif = notifs.find((n: any) => n.recipientEmail === 'abhay@cumail.in' && n.title.includes('Result'));
  assert.ok(resultEmailNotif, 'Result email must be queued and sent to candidate');
  assert.ok(resultEmailNotif.message.includes('100%'));
  assert.ok(resultEmailNotif.message.includes('PASSED'));

  // Test Failing Submission: Q1 -> Option 0 (Wrong, EC2), Q2 -> Option 0 (Wrong, EC2) = 0%
  const failingAttempt: ExamAttempt = {
    ...passingAttempt,
    id: generateAttemptId(),
    email: 'fail.test@cumail.in',
    answers: {
      'tq-1': 0,
      'tq-2': 0
    }
  };

  const failResult = await evaluateExamSubmission(TEST_EXAM, failingAttempt, 'MANUAL');
  assert.equal(failResult.score, 0);
  assert.equal(failResult.percentage, 0);
  assert.equal(failResult.passed, false);
  assert.equal((failResult as any).certificateId, undefined, 'Failing student must not receive a certificate');

  // Clean up
  await db.examAttempts.deleteById(attemptId);
  await db.examAttempts.deleteById(failingAttempt.id);
});

test('5. Security Event Logging & Violation Auto-Submit Threshold', async () => {
  const attemptId = generateAttemptId();
  const token = generateSessionToken();

  const attempt: ExamAttempt = {
    id: attemptId,
    examId: TEST_EXAM.id,
    studentName: 'Security Test Student',
    rollNumber: '23BCS7777',
    email: 'sec@cumail.in',
    sessionToken: token,
    status: 'IN_EXAM',
    extendedMinutes: 0,
    answers: { 'tq-1': 1 },
    markedForReview: [],
    score: 0,
    totalMarks: 0,
    percentage: 0,
    passed: false,
    securityViolationsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await db.examAttempts.insertOne(attempt);

  // Violation 1: Fullscreen Exit
  let res1 = await logSecurityEvent(attemptId, 'FULLSCREEN_EXIT', 'WARNING', { trigger: 'esc_key' });
  assert.equal(res1.violationCount, 1);
  assert.equal(res1.shouldAutoSubmit, false);

  // Violation 2: Tab Blur
  let res2 = await logSecurityEvent(attemptId, 'TAB_BLUR', 'WARNING', { trigger: 'tab_switch' });
  assert.equal(res2.violationCount, 2);
  assert.equal(res2.shouldAutoSubmit, false);

  // Violation 3: Unauthorized Key combination (Threshold reached -> maxSecurityViolations = 3)
  let res3 = await logSecurityEvent(attemptId, 'UNAUTHORIZED_KEY', 'WARNING', { key: 'Ctrl+C' });
  assert.equal(res3.violationCount, 3);
  assert.equal(res3.shouldAutoSubmit, true, 'Violation limit exceeded: should trigger auto-submit');

  // Verify security events were persisted in db.examSecurityLogs
  const logs = await db.examSecurityLogs.getByAttemptId(attemptId);
  assert.equal(logs.length, 3);

  await db.examAttempts.deleteById(attemptId);
});

test('6. Safe Exam Browser (SEB) XML Config Generator', async () => {
  const xml = generateSEBConfigXml(TEST_EXAM, 'https://www.awssbgcuup.tech');
  assert.ok(xml.includes('<key>startURL</key>'));
  assert.ok(xml.includes('https://www.awssbgcuup.tech/exam/test-exam-ccp-unit'));
  assert.ok(xml.includes('<key>URLFilterRules</key>'));
  assert.ok(xml.includes('<key>allowDeveloperConsole</key>'));
  assert.ok(xml.includes('<false/>'));
});

test('7. Admin Audit Trail Logging', async () => {
  await logAdminAudit(TEST_EXAM.id, 'admin', 'UNLOCK_ALL', { count: 5 });
  const auditLogs = await db.examAuditLogs.getByExamId(TEST_EXAM.id);
  assert.ok(auditLogs.length > 0);
  assert.equal(auditLogs[0].action, 'UNLOCK_ALL');
  assert.equal(auditLogs[0].adminUser, 'admin');

  // Clean up test exam
  await db.exams.deleteOne(TEST_EXAM.id);
});
