import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/db';
import { POST as authPost } from '../src/app/api/exam/auth/route';
import { GET as lobbyGet } from '../src/app/api/exam/lobby-status/route';
import { POST as startPost } from '../src/app/api/exam/start/route';
import { GET as sessionGet } from '../src/app/api/exam/session/route';
import { POST as saveAnswersPost } from '../src/app/api/exam/save-answers/route';
import { POST as secEventPost } from '../src/app/api/exam/security-event/route';
import { POST as submitPost } from '../src/app/api/exam/submit/route';
import { GET as resultGet } from '../src/app/api/exam/result/route';
import { GET as certPdfGet } from '../src/app/api/exam/certificate-pdf/route';
import { GET as sebConfigGet } from '../src/app/api/exam/seb-config/route';
import { GET as adminExamsGet, POST as adminExamsPost } from '../src/app/api/admin/exams/route';
import { GET as adminLiveGet } from '../src/app/api/admin/exams/live/route';
import { POST as adminControlPost } from '../src/app/api/admin/exams/control/route';
import { GET as adminInspectGet } from '../src/app/api/admin/exams/attempt-details/route';
import { GET as adminExportGet } from '../src/app/api/admin/exams/export/route';

const ADMIN_HEADER = { Authorization: 'Bearer awssbg-admin-session-token-secure-hash' };

test('E2E Exam API: Full Student and Admin Flow', async () => {
  const testExamId = `exam-e2e-${Date.now()}`;
  const testRoll = `23BCS-${Date.now()}`;

  // 1. Admin creates / verifies exam
  const createExamReq = new Request('http://localhost/api/admin/exams', {
    method: 'POST',
    headers: { ...ADMIN_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create',
      exam: {
        id: testExamId,
        examCode: `AWS-E2E-${Date.now().toString().slice(-4)}`,
        password: 'pass-e2e-2026',
        title: 'AWS Certified Developer Assessment',
        description: 'E2E Assessment',
        category: 'DevOps',
        durationMinutes: 45,
        passingPercentage: 60,
        maxAttempts: 2,
        status: 'Live',
        requireSecureBrowser: true,
        maxSecurityViolations: 3,
        questions: [
          {
            id: 'e2e-q1',
            question: 'What is Amazon DynamoDB?',
            options: ['Relational DB', 'Fully managed NoSQL DB', 'Data warehouse', 'Graph DB'],
            correctOptionIndex: 1,
            marks: 50,
            explanation: 'DynamoDB is a fast, flexible NoSQL database service.'
          },
          {
            id: 'e2e-q2',
            question: 'Which service is used for container orchestration?',
            options: ['Amazon ECS', 'Amazon S3', 'Amazon Route 53', 'Amazon SNS'],
            correctOptionIndex: 0,
            marks: 50,
            explanation: 'Amazon ECS is a container orchestration service.'
          }
        ]
      }
    })
  });

  const createExamRes = await adminExamsPost(createExamReq);
  const createExamData = await createExamRes.json();
  assert.equal(createExamRes.status, 200);
  assert.equal(createExamData.success, true);

  // 2. Student registers & authenticates via Auth API
  const authReq = new Request('http://localhost/api/exam/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      examId: testExamId,
      password: 'pass-e2e-2026',
      studentName: 'Priyanka Sharma',
      rollNumber: testRoll,
      email: 'priyanka@cumail.in'
    })
  });

  const authRes = await authPost(authReq);
  const authData = await authRes.json();
  assert.equal(authRes.status, 200);
  assert.equal(authData.success, true);
  assert.equal(authData.status, 'LOCKED');
  assert.ok(authData.token);
  assert.ok(authData.attemptId);

  const { token, attemptId } = authData;

  // 3. Student in Lobby polls status -> LOCKED
  const lobbyReq = new Request(`http://localhost/api/exam/lobby-status?attemptId=${attemptId}&token=${token}`);
  const lobbyRes = await lobbyGet(lobbyReq);
  const lobbyData = await lobbyRes.json();
  assert.equal(lobbyRes.status, 200);
  assert.equal(lobbyData.status, 'LOCKED');

  // 4. Admin views Live Control feed and sees candidate
  const liveReq = new Request(`http://localhost/api/admin/exams/live?examId=${testExamId}`, {
    headers: ADMIN_HEADER
  });
  const liveRes = await adminLiveGet(liveReq);
  const liveData = await liveRes.json();
  assert.equal(liveRes.status, 200);
  assert.equal(liveData.stats.waiting, 1);
  assert.equal(liveData.candidates.length, 1);
  assert.equal(liveData.candidates[0].studentName, 'Priyanka Sharma');

  // 5. Admin Verifies candidate
  const verifyReq = new Request('http://localhost/api/admin/exams/control', {
    method: 'POST',
    headers: { ...ADMIN_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'verify',
      examId: testExamId,
      candidateId: attemptId
    })
  });
  const verifyRes = await adminControlPost(verifyReq);
  assert.equal(verifyRes.status, 200);

  // 6. Admin Unlocks candidate
  const unlockReq = new Request('http://localhost/api/admin/exams/control', {
    method: 'POST',
    headers: { ...ADMIN_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'unlock',
      examId: testExamId,
      candidateId: attemptId
    })
  });
  const unlockRes = await adminControlPost(unlockReq);
  assert.equal(unlockRes.status, 200);

  // 7. Student status is now UNLOCKED
  const lobbyRes2 = await lobbyGet(lobbyReq);
  const lobbyData2 = await lobbyRes2.json();
  assert.equal(lobbyData2.status, 'UNLOCKED');

  // 8. Student starts exam
  const startReq = new Request('http://localhost/api/exam/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attemptId, token })
  });
  const startRes = await startPost(startReq);
  const startData = await startRes.json();
  assert.equal(startRes.status, 200);
  assert.equal(startData.status, 'IN_EXAM');
  assert.ok(startData.remainingSeconds > 0);

  // 9. Student fetches session questions (verify no leaked correct answers)
  const sessionReq = new Request(`http://localhost/api/exam/session?attemptId=${attemptId}&token=${token}`);
  const sessionRes = await sessionGet(sessionReq);
  const sessionData = await sessionRes.json();
  assert.equal(sessionRes.status, 200);
  assert.equal(sessionData.attempt.status, 'IN_EXAM');
  assert.equal(sessionData.exam.questions.length, 2);
  for (const q of sessionData.exam.questions) {
    assert.equal(q.correctOptionIndex, undefined);
  }

  // 10. Student auto-saves answers
  const saveReq = new Request('http://localhost/api/exam/save-answers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attemptId,
      token,
      answers: { 'e2e-q1': 1, 'e2e-q2': 0 }, // Both correct
      markedForReview: ['e2e-q2']
    })
  });
  const saveRes = await saveAnswersPost(saveReq);
  assert.equal(saveRes.status, 200);

  // 11. Student logs a minor security event
  const secReq = new Request('http://localhost/api/exam/security-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attemptId,
      token,
      eventType: 'TAB_BLUR',
      severity: 'WARNING'
    })
  });
  const secRes = await secEventPost(secReq);
  const secData = await secRes.json();
  assert.equal(secRes.status, 200);
  assert.equal(secData.violationCount, 1);
  assert.equal(secData.autoSubmitted, false);

  // 12. Student Submits Exam (Response must NEVER expose score, percentage, passed, or certificates)
  const submitReq = new Request('http://localhost/api/exam/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attemptId,
      token,
      answers: { 'e2e-q1': 1, 'e2e-q2': 0 },
      reason: 'MANUAL'
    })
  });
  const submitRes = await submitPost(submitReq);
  const submitData = await submitRes.json();
  assert.equal(submitRes.status, 200);
  assert.equal(submitData.status, 'SUBMITTED');
  assert.equal(submitData.message, 'Exam Submitted Successfully. Your response has been recorded. Your result will be communicated by email.');
  assert.equal(submitData.score, undefined, 'Score must NEVER be exposed in student submit response');
  assert.equal(submitData.percentage, undefined, 'Percentage must NEVER be exposed in student submit response');
  assert.equal(submitData.passed, undefined, 'Pass/Fail must NEVER be exposed in student submit response');
  assert.equal(submitData.certificateId, undefined, 'Certificate ID must NEVER be exposed in student submit response');

  // 13. Student attempts to access Result endpoint -> Must be strictly blocked (403 Forbidden)
  const resultReq = new Request(`http://localhost/api/exam/result?attemptId=${attemptId}&token=${token}`);
  const resultRes = await resultGet(resultReq);
  const resultData = await resultRes.json();
  assert.equal(resultRes.status, 403);
  assert.ok(resultData.error.includes('email'));
  assert.equal(resultData.score, undefined);
  assert.equal(resultData.percentage, undefined);

  // 14. Student attempts to download Certificate PDF -> Must be strictly blocked (403 Forbidden)
  const pdfReq = new Request(`http://localhost/api/exam/certificate-pdf?attemptId=${attemptId}&token=${token}`);
  const pdfRes = await certPdfGet(pdfReq);
  const pdfData = await pdfRes.json();
  assert.equal(pdfRes.status, 403);
  assert.ok(pdfData.error.includes('disabled'));

  // 15. SEB Config download endpoint
  const sebReq = new Request(`http://localhost/api/exam/seb-config?examId=${testExamId}`);
  const sebRes = await sebConfigGet(sebReq);
  assert.equal(sebRes.status, 200);
  assert.equal(sebRes.headers.get('Content-Type'), 'application/seb');

  // 16. Admin Inspects Candidate Detailed Report (Admin receives full scores and evaluation)
  const inspectReq = new Request(`http://localhost/api/admin/exams/attempt-details?attemptId=${attemptId}`, {
    headers: ADMIN_HEADER
  });
  const inspectRes = await adminInspectGet(inspectReq);
  const inspectData = await inspectRes.json();
  assert.equal(inspectRes.status, 200);
  assert.equal(inspectData.attempt.studentName, 'Priyanka Sharma');
  assert.equal(inspectData.attempt.score, 100);
  assert.equal(inspectData.attempt.percentage, 100);
  assert.equal(inspectData.attempt.passed, true);
  assert.equal(inspectData.questionsBreakdown.length, 2);
  assert.equal(inspectData.questionsBreakdown[0].isCorrect, true);
  assert.equal(inspectData.securityEvents.length, 1);

  // 17. Admin Marks Candidate as Selected / Qualified
  const selectReq = new Request('http://localhost/api/admin/exams/control', {
    method: 'POST',
    headers: { ...ADMIN_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'mark-selected',
      candidateId: attemptId,
      notes: 'Outstanding technical performance'
    })
  });
  const selectRes = await adminControlPost(selectReq);
  const selectData = await selectRes.json();
  assert.equal(selectRes.status, 200);
  assert.equal(selectData.success, true);

  // Verify candidate selection email was recorded in notifications
  const allNotifs = await db.notifications.getAll();
  const selectionEmail = allNotifs.find((n: any) => n.recipientEmail === 'priyanka@cumail.in' && n.title.includes('Selection'));
  assert.ok(selectionEmail, 'Selection email should be sent upon admin mark-selected action');
  assert.ok(selectionEmail.message.includes('Outstanding technical performance'));

  // 18. Admin Exports CSV Results
  const exportReq = new Request(`http://localhost/api/admin/exams/export?examId=${testExamId}`, {
    headers: ADMIN_HEADER
  });
  const exportRes = await adminExportGet(exportReq);
  assert.equal(exportRes.status, 200);
  const csvText = await exportRes.text();
  assert.ok(csvText.includes('Priyanka Sharma'));
  assert.ok(csvText.includes('PASSED'));

  // 19. Cleanup
  await db.examAttempts.deleteById(attemptId);
  await db.exams.deleteOne(testExamId);
});
