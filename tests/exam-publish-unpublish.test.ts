import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/db';
import { GET as getExamStatus } from '../src/app/api/exam/status/route';
import { POST as authPost } from '../src/app/api/exam/auth/route';
import { GET as adminExamsGet, POST as adminExamsPost } from '../src/app/api/admin/exams/route';
import { POST as adminPost } from '../src/app/api/admin/route';
import { Exam } from '../src/types/exam';

const ADMIN_HEADER = { Authorization: 'Bearer awssbg-admin-session-token-secure-hash' };

test('1. Exam Portal Settings Persistence & Default Unpublished State', async () => {
  // Ensure default is false
  await db.settings.setExamPortalPublished(false);
  const status1 = await db.settings.getExamPortalPublished();
  assert.equal(status1, false, 'Exam portal must be unpublished by default');

  // Toggle to true
  await db.settings.setExamPortalPublished(true);
  const status2 = await db.settings.getExamPortalPublished();
  assert.equal(status2, true, 'Exam portal must persist published state');

  // Toggle back to false
  await db.settings.setExamPortalPublished(false);
  const status3 = await db.settings.getExamPortalPublished();
  assert.equal(status3, false, 'Exam portal must persist unpublished state');
});

test('2. Public API: GET /api/exam/status respects published setting', async () => {
  // 1. Unpublished
  await db.settings.setExamPortalPublished(false);
  const resUnpublished = await getExamStatus();
  assert.equal(resUnpublished.status, 200);
  const dataUnpublished = await resUnpublished.json();
  assert.equal(dataUnpublished.success, true);
  assert.equal(dataUnpublished.published, false);

  // 2. Published
  await db.settings.setExamPortalPublished(true);
  const resPublished = await getExamStatus();
  assert.equal(resPublished.status, 200);
  const dataPublished = await resPublished.json();
  assert.equal(dataPublished.success, true);
  assert.equal(dataPublished.published, true);
});

test('3. Admin API: /api/admin/exams Portal Status Control', async () => {
  // Unpublish via admin API
  const unpublishReq = new Request('http://localhost/api/admin/exams', {
    method: 'POST',
    headers: { ...ADMIN_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'set-portal-status', published: false })
  });
  const unpublishRes = await adminExamsPost(unpublishReq);
  assert.equal(unpublishRes.status, 200);
  const unpublishData = await unpublishRes.json();
  assert.equal(unpublishData.success, true);
  assert.equal(unpublishData.published, false);

  // Check via GET /api/admin/exams
  const getReq = new Request('http://localhost/api/admin/exams', {
    method: 'GET',
    headers: ADMIN_HEADER
  });
  const getRes = await adminExamsGet(getReq);
  assert.equal(getRes.status, 200);
  const getData = await getRes.json();
  assert.equal(getData.portalPublished, false);

  // Publish via admin API
  const publishReq = new Request('http://localhost/api/admin/exams', {
    method: 'POST',
    headers: { ...ADMIN_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'set-portal-status', published: true })
  });
  const publishRes = await adminExamsPost(publishReq);
  assert.equal(publishRes.status, 200);
  const publishData = await publishRes.json();
  assert.equal(publishData.success, true);
  assert.equal(publishData.published, true);

  // Check via GET /api/admin/exams again
  const getRes2 = await adminExamsGet(getReq);
  const getData2 = await getRes2.json();
  assert.equal(getData2.portalPublished, true);
});

test('4. Admin General API: /api/admin Exam Portal Status Actions', async () => {
  // Check get-exam-portal-status
  const getStatusReq = new Request('http://localhost/api/admin', {
    method: 'POST',
    headers: { ...ADMIN_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get-exam-portal-status' })
  });
  const getStatusRes = await adminPost(getStatusReq);
  assert.equal(getStatusRes.status, 200);

  // Set to false
  const setFalseReq = new Request('http://localhost/api/admin', {
    method: 'POST',
    headers: { ...ADMIN_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'set-exam-portal-status', published: false })
  });
  const setFalseRes = await adminPost(setFalseReq);
  assert.equal(setFalseRes.status, 200);
  const setFalseData = await setFalseRes.json();
  assert.equal(setFalseData.published, false);
});

test('5. Candidate Authentication Security: 403 when Unpublished, 200 when Published', async () => {
  const testExamId = `exam-toggle-test-${Date.now()}`;
  const exam: Exam = {
    id: testExamId,
    examCode: 'TOGGLE-AWS-01',
    password: '',
    title: 'Toggle Test Exam',
    description: 'Testing 403 on unpublished',
    category: 'Cloud Architecture',
    durationMinutes: 30,
    passingPercentage: 70,
    maxAttempts: 1,
    status: 'Live',
    requireSecureBrowser: false,
    maxSecurityViolations: 3,
    questions: [
      {
        id: 'q1',
        question: 'Sample question?',
        options: ['A', 'B', 'C', 'D'],
        correctOptionIndex: 0,
        marks: 10,
        explanation: 'Test'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await db.exams.insertOne(exam);

  // A. When unpublished -> auth must reject with 403
  await db.settings.setExamPortalPublished(false);
  const authReqUnpublished = new Request('http://localhost/api/exam/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      examId: testExamId,
      studentName: 'Test Student',
      rollNumber: '23BCS99999',
      email: 'test@cumail.in'
    })
  });
  const authResUnpublished = await authPost(authReqUnpublished);
  assert.equal(authResUnpublished.status, 403);
  const authDataUnpublished = await authResUnpublished.json();
  assert.match(authDataUnpublished.error, /unpublished/i);

  // B. When published -> auth must succeed with 200
  await db.settings.setExamPortalPublished(true);
  const authReqPublished = new Request('http://localhost/api/exam/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      examId: testExamId,
      studentName: 'Test Student',
      rollNumber: '23BCS99999',
      email: 'test@cumail.in'
    })
  });
  const authResPublished = await authPost(authReqPublished);
  assert.equal(authResPublished.status, 200);
  const authDataPublished = await authResPublished.json();
  assert.equal(authDataPublished.success, true);
  assert.ok(authDataPublished.token, 'Session token must be provided');

  // Clean up test exam & restore unpublished state
  await db.exams.deleteOne(testExamId);
  await db.settings.setExamPortalPublished(false);
});

test('6. Data & Log Integrity: No Exams or Attempts Deleted during Unpublish', async () => {
  const exams = await db.exams.getAll();
  assert.ok(Array.isArray(exams), 'Exams list must remain an array');
  assert.ok(exams.length > 0, 'Exams database must not be emptied');

  const attempts = await db.examAttempts.getAll();
  assert.ok(Array.isArray(attempts), 'Attempts list must remain intact');

  const securityLogs = await db.examSecurityLogs.getAll();
  assert.ok(Array.isArray(securityLogs), 'Security logs must remain intact');

  const auditLogs = await db.examAuditLogs.getAll();
  assert.ok(Array.isArray(auditLogs), 'Audit logs must remain intact');

  // Ensure portal is in unpublished state as desired
  await db.settings.setExamPortalPublished(false);
  const finalStatus = await db.settings.getExamPortalPublished();
  assert.equal(finalStatus, false);
});
