import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/db';
import { POST as authPost } from '../src/app/api/exam/auth/route';
import { POST as startPost } from '../src/app/api/exam/start/route';
import { GET as sessionGet } from '../src/app/api/exam/session/route';
import { POST as saveAnswersPost } from '../src/app/api/exam/save-answers/route';
import { POST as securityEventPost } from '../src/app/api/exam/security-event/route';
import { POST as recoverLockPost } from '../src/app/api/exam/recover-lock/route';
import { POST as adminControlPost } from '../src/app/api/admin/exams/control/route';
import { GET as adminLiveGet } from '../src/app/api/admin/exams/live/route';
import { generateUnlockPassword, lockExamAttempt, unlockExamAttempt, calculateRemainingSeconds } from '../src/lib/exam';
import { Exam, ExamAttempt } from '../src/types/exam';

const ADMIN_HEADER = { Authorization: 'Bearer awssbg-admin-session-token-secure-hash' };

test('Security & Recovery: Independent Exam Unlock Passwords & Regeneration', async () => {
  const pwd1 = generateUnlockPassword();
  const pwd2 = generateUnlockPassword();
  assert.ok(pwd1.startsWith('UNLOCK-'), 'Unlock password should have UNLOCK- prefix');
  assert.ok(pwd2.startsWith('UNLOCK-'), 'Unlock password should have UNLOCK- prefix');
  assert.notEqual(pwd1, pwd2, 'Independent passwords must be generated for different exams');

  // Create Exam with Unlock Password
  const testExamId = `exam-unlock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const exam: Exam = {
    id: testExamId,
    examCode: `LOCK-${Date.now().toString().slice(-4)}`,
    password: 'student-pass-123',
    examUnlockPassword: pwd1,
    title: 'AWS Secure Lock Verification Exam',
    description: 'Testing exam lock and invigilator recovery flows',
    category: 'Security Architecture',
    durationMinutes: 45,
    passingPercentage: 70,
    maxAttempts: 1,
    status: 'Live',
    requireSecureBrowser: true,
    maxSecurityViolations: 5,
    questions: [
      {
        id: 'sec-q1',
        question: 'Which service provides DDoS protection?',
        options: ['AWS Shield', 'AWS S3', 'AWS Lambda', 'AWS Glue'],
        correctOptionIndex: 0,
        marks: 10,
        explanation: 'AWS Shield provides DDoS protection.'
      },
      {
        id: 'sec-q2',
        question: 'What is used for granular IAM permissions?',
        options: ['IAM Policies', 'VPC Peering', 'Route53', 'CloudFront'],
        correctOptionIndex: 0,
        marks: 10,
        explanation: 'IAM Policies manage access permissions.'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await db.exams.insertOne(exam);

  // Verify Admin Live view exposes examUnlockPassword to authorized admin
  const liveReq = new Request(`http://localhost/api/admin/exams/live?examId=${testExamId}`, {
    headers: ADMIN_HEADER
  });
  const liveRes = await adminLiveGet(liveReq);
  const liveData = await liveRes.json();
  assert.equal(liveRes.status, 200);
  assert.equal(liveData.examUnlockPassword, pwd1, 'Admin Live endpoint must return current examUnlockPassword');

  // Regenerate Password via Admin Control
  const regenReq = new Request('http://localhost/api/admin/exams/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...ADMIN_HEADER },
    body: JSON.stringify({
      action: 'regenerate-unlock-password',
      examId: testExamId
    })
  });
  const regenRes = await adminControlPost(regenReq);
  const regenData = await regenRes.json();
  assert.equal(regenRes.status, 200);
  assert.ok(regenData.examUnlockPassword);
  assert.notEqual(regenData.examUnlockPassword, pwd1, 'Regenerated password must differ from initial');

  // Verify DB updated
  const updatedExam = await db.exams.getById(testExamId);
  assert.equal(updatedExam?.examUnlockPassword, regenData.examUnlockPassword);
});

test('Lockdown Violation: Fullscreen Interruption triggers EXAM_LOCKED and Strips Questions', async () => {
  const examId = `exam-lock-lifecycle-${Date.now()}`;
  const unlockPassword = 'UNLOCK-TEST-PROCTOR-99';

  const exam: Exam = {
    id: examId,
    examCode: `LOCK-${Date.now().toString().slice(-4)}`,
    password: 'candidate-entry-pass',
    examUnlockPassword: unlockPassword,
    title: 'AWS Lifecycle Lockout Assessment',
    description: 'Testing lock transition, question stripping, and timer preservation',
    category: 'Security',
    durationMinutes: 30,
    passingPercentage: 70,
    maxAttempts: 1,
    status: 'Live',
    requireSecureBrowser: true,
    maxSecurityViolations: 5,
    questions: [
      {
        id: 'q-secret-1',
        question: 'Confidential Exam Question 1',
        options: ['A', 'B', 'C', 'D'],
        correctOptionIndex: 1,
        marks: 5,
        explanation: 'Secret answer'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await db.exams.insertOne(exam);

  // 1. Candidate registers & logs in
  const authReq = new Request('http://localhost/api/exam/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      examId,
      password: 'candidate-entry-pass',
      studentName: 'Alice Security Candidate',
      rollNumber: `SEC-${Date.now()}`,
      email: 'alice.sec@cumail.in'
    })
  });
  const authRes = await authPost(authReq);
  const authData = await authRes.json();
  assert.equal(authRes.status, 200, authData.error || 'Auth failed');
  const attemptId = authData.attemptId;
  const token = authData.token;

  // 2. Admin verifies and unlocks in lobby
  await adminControlPost(
    new Request('http://localhost/api/admin/exams/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...ADMIN_HEADER },
      body: JSON.stringify({ action: 'verify-candidate', attemptId })
    })
  );
  await adminControlPost(
    new Request('http://localhost/api/admin/exams/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...ADMIN_HEADER },
      body: JSON.stringify({ action: 'unlock-candidate', attemptId })
    })
  );

  // 3. Candidate starts exam -> IN_EXAM
  const startReq = new Request('http://localhost/api/exam/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attemptId, token })
  });
  const startRes = await startPost(startReq);
  assert.equal(startRes.status, 200);

  // Verify candidate has questions in IN_EXAM
  const sessionActiveRes = await sessionGet(
    new Request(`http://localhost/api/exam/session?attemptId=${attemptId}&token=${token}`)
  );
  const sessionActiveData = await sessionActiveRes.json();
  assert.equal(sessionActiveData.attempt.status, 'IN_EXAM');
  assert.equal(sessionActiveData.exam.questions.length, 1, 'Active session must return questions');

  // Candidate answers q-secret-1
  const saveRes = await saveAnswersPost(
    new Request('http://localhost/api/exam/save-answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attemptId,
        token,
        answers: { 'q-secret-1': 1 }
      })
    })
  );
  assert.equal(saveRes.status, 200);

  // 4. Candidate triggers FULLSCREEN_EXIT / ESC interruption
  const secReq = new Request('http://localhost/api/exam/security-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attemptId,
      token,
      eventType: 'ESC_FULLSCREEN_EXIT',
      severity: 'WARNING',
      metadata: { key: 'Escape' }
    })
  });
  const secRes = await securityEventPost(secReq);
  const secData = await secRes.json();
  assert.equal(secRes.status, 200);
  assert.equal(secData.locked, true, 'Security event must return locked: true');
  assert.equal(secData.status, 'EXAM_LOCKED');
  assert.equal(secData.lockCount, 1);

  // 5. Anti-Bypass Check: Session endpoint MUST NOT return questions when EXAM_LOCKED
  const sessionLockedRes = await sessionGet(
    new Request(`http://localhost/api/exam/session?attemptId=${attemptId}&token=${token}`)
  );
  const sessionLockedData = await sessionLockedRes.json();
  assert.equal(sessionLockedData.attempt.status, 'EXAM_LOCKED');
  assert.equal(sessionLockedData.exam.questions.length, 0, 'Questions MUST be stripped during EXAM_LOCKED');
  assert.ok(sessionLockedData.attempt.pausedRemainingSeconds > 0, 'Paused remaining seconds must be stored');

  // 6. Anti-Bypass Check: save-answers MUST return 403 Forbidden while EXAM_LOCKED
  const saveWhileLockedRes = await saveAnswersPost(
    new Request('http://localhost/api/exam/save-answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attemptId,
        token,
        answers: { 'q-secret-1': 2 }
      })
    })
  );
  assert.equal(saveWhileLockedRes.status, 403, 'Saving answers while locked must be rejected with HTTP 403');

  // 7. Recovery Test: Wrong unlock password must be rejected
  const wrongUnlockRes = await recoverLockPost(
    new Request('http://localhost/api/exam/recover-lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attemptId,
        token,
        unlockPassword: 'WRONG-PASSWORD-000'
      })
    })
  );
  assert.equal(wrongUnlockRes.status, 403);
  const wrongUnlockData = await wrongUnlockRes.json();
  assert.match(wrongUnlockData.error, /Incorrect Invigilator Unlock Password/i);

  // 8. Recovery Test: Correct unlock password restores IN_EXAM and questions
  const correctUnlockRes = await recoverLockPost(
    new Request('http://localhost/api/exam/recover-lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attemptId,
        token,
        unlockPassword: unlockPassword
      })
    })
  );
  assert.equal(correctUnlockRes.status, 200);
  const correctUnlockData = await correctUnlockRes.json();
  assert.equal(correctUnlockData.success, true);
  assert.equal(correctUnlockData.status, 'IN_EXAM');

  // Check questions are restored and answers are preserved intact
  const sessionResumedRes = await sessionGet(
    new Request(`http://localhost/api/exam/session?attemptId=${attemptId}&token=${token}`)
  );
  const sessionResumedData = await sessionResumedRes.json();
  assert.equal(sessionResumedData.attempt.status, 'IN_EXAM');
  assert.equal(sessionResumedData.exam.questions.length, 1);
  assert.equal(sessionResumedData.attempt.answers['q-secret-1'], 1, 'Saved answers must remain intact after unlock');
});

test('Admin Manual Unlock and Manual Workstation Lock Flows', async () => {
  const examId = `exam-admin-lock-flow-${Date.now()}`;
  const exam: Exam = {
    id: examId,
    examCode: `LOCK-ADM-${Date.now().toString().slice(-4)}`,
    password: 'student-flow-pass',
    examUnlockPassword: 'UNLOCK-ADMIN-FLOW-12',
    title: 'AWS Admin Control Lock Assessment',
    description: 'Testing remote admin unlock and manual lock commands',
    category: 'Security',
    durationMinutes: 20,
    passingPercentage: 60,
    maxAttempts: 1,
    status: 'Live',
    requireSecureBrowser: true,
    maxSecurityViolations: 3,
    questions: [
      {
        id: 'q1',
        question: 'What is Amazon S3?',
        options: ['Object Storage', 'Relational DB', 'DNS', 'Compute'],
        correctOptionIndex: 0,
        marks: 10,
        explanation: 'S3 is object storage.'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await db.exams.insertOne(exam);

  // Create attempt in IN_EXAM state directly
  const attemptId = `att-admin-lock-${Date.now()}`;
  const attempt: ExamAttempt = {
    id: attemptId,
    examId,
    studentName: 'Bob Invigilator Subject',
    rollNumber: 'ROLL-BOB-99',
    email: 'bob@cumail.in',
    sessionToken: 'bob-tok-12345',
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
    lockCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await db.examAttempts.insertOne(attempt);

  // 1. Admin remotely locks candidate workstation
  const lockReq = new Request('http://localhost/api/admin/exams/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...ADMIN_HEADER },
    body: JSON.stringify({
      action: 'manual-lock-candidate',
      attemptId,
      reason: 'Suspicious dual-monitor detected by proctor'
    })
  });
  const lockRes = await adminControlPost(lockReq);
  const lockData = await lockRes.json();
  assert.equal(lockRes.status, 200);
  assert.equal(lockData.status, 'EXAM_LOCKED');

  const lockedAttempt = await db.examAttempts.getById(attemptId);
  assert.equal(lockedAttempt?.status, 'EXAM_LOCKED');
  assert.equal(lockedAttempt?.lockedBy, 'ADMIN');
  assert.equal(lockedAttempt?.lockCount, 1);
  assert.match(lockedAttempt?.lockReason || '', /Suspicious dual-monitor/);

  // 2. Admin remotely unlocks candidate workstation with mandatory reason
  const unlockReq = new Request('http://localhost/api/admin/exams/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...ADMIN_HEADER },
    body: JSON.stringify({
      action: 'unlock-locked-candidate',
      attemptId,
      reason: 'Physical inspection completed and secondary display disconnected'
    })
  });
  const unlockRes = await adminControlPost(unlockReq);
  const unlockData = await unlockRes.json();
  assert.equal(unlockRes.status, 200);
  assert.equal(unlockData.status, 'IN_EXAM');

  const resumedAttempt = await db.examAttempts.getById(attemptId);
  assert.equal(resumedAttempt?.status, 'IN_EXAM');
  assert.ok((resumedAttempt?.totalLockedSeconds || 0) >= 0);

  // 3. Verify Admin Audit Log captured both actions
  const auditLogs = await db.examAuditLogs.getByExamId(examId);
  const manualLockLogs = auditLogs.filter((l) => l.action === 'MANUAL_LOCK_CANDIDATE');
  const unlockLogs = auditLogs.filter((l) => l.action === 'UNLOCK_LOCKED_CANDIDATE');
  assert.equal(manualLockLogs.length, 1, 'Manual lock must be audited');
  assert.equal(unlockLogs.length, 1, 'Admin unlock must be audited with proctor details');
  assert.equal(unlockLogs[0].details.reason, 'Physical inspection completed and secondary display disconnected');
});
