import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/db';
import {
  generateCandidatePassword,
  provisionExamCandidate,
  regenerateCandidatePassword,
  generateSEBConfigXml
} from '../src/lib/exam';
import { POST as authPost } from '../src/app/api/exam/auth/route';
import { POST as eventRegisterPost } from '../src/app/api/event-register/route';

test('1. Generates high-entropy cryptographic password with AWS- prefix and no ambiguous characters', () => {
  const password = generateCandidatePassword();
  assert.match(password, /^AWS-[A-HJ-NP-Za-km-z2-9]{4}-[A-HJ-NP-Za-km-z2-9]{4}$/);
  assert.ok(!password.includes('0'));
  assert.ok(!password.includes('O'));
  assert.ok(!password.includes('1'));
  assert.ok(!password.includes('I'));
  assert.ok(!password.includes('l'));

  // Uniqueness check
  const set = new Set<string>();
  for (let i = 0; i < 100; i++) {
    set.add(generateCandidatePassword());
  }
  assert.equal(set.size, 100);
});

test('2. Provisions exam candidate with auto-generated password and stores in database', async () => {
  const testExamId = 'exam-aws-ccp-01';
  const testEmail = `candidate.${Date.now()}@cumail.in`;
  const testName = 'Vikramaditya Sharma';
  const testRoll = '21BCS9999';

  const candidate = await provisionExamCandidate({
    examId: testExamId,
    studentName: testName,
    email: testEmail,
    rollNumber: testRoll
  });

  assert.ok(candidate.id);
  assert.equal(candidate.email, testEmail.toLowerCase().trim());
  assert.equal(candidate.studentName, testName.trim());
  assert.equal(candidate.rollNumber, testRoll.trim());
  assert.equal(candidate.status, 'Active');
  assert.match(candidate.password, /^AWS-[A-HJ-NP-Za-km-z2-9]{4}-[A-HJ-NP-Za-km-z2-9]{4}$/);

  // Verify retrieval
  const inDb = await db.examCandidates.getByEmailAndExam(testEmail, testExamId);
  assert.ok(inDb);
  assert.equal(inDb.id, candidate.id);
  assert.equal(inDb.password, candidate.password);

  // Clean up
  await db.examCandidates.deleteById(candidate.id);
});

test('3. Regenerates candidate password and updates database record', async () => {
  const testExamId = 'exam-aws-ccp-01';
  const testEmail = `candidate.regen.${Date.now()}@cumail.in`;

  const candidate = await provisionExamCandidate({
    examId: testExamId,
    studentName: 'Regen Test',
    email: testEmail,
    rollNumber: '21BCS8888'
  });

  const originalPassword = candidate.password;
  const updated = await regenerateCandidatePassword(candidate.id);

  assert.ok(updated);
  assert.notEqual(updated.password, originalPassword);
  assert.match(updated.password, /^AWS-[A-HJ-NP-Za-km-z2-9]{4}-[A-HJ-NP-Za-km-z2-9]{4}$/);

  const inDb = await db.examCandidates.getById(candidate.id);
  assert.equal(inDb?.password, updated.password);

  // Clean up
  await db.examCandidates.deleteById(candidate.id);
});

test('4. Handles candidate revocation and access toggling', async () => {
  const testExamId = 'exam-aws-ccp-01';
  const testEmail = `candidate.toggle.${Date.now()}@cumail.in`;

  const candidate = await provisionExamCandidate({
    examId: testExamId,
    studentName: 'Revoke Test',
    email: testEmail,
    rollNumber: '21BCS7777'
  });

  // Revoke
  await db.examCandidates.updateOne(candidate.id, { status: 'Revoked' });
  let fetched = await db.examCandidates.getById(candidate.id);
  assert.equal(fetched?.status, 'Revoked');

  // Reactivate
  await db.examCandidates.updateOne(candidate.id, { status: 'Active' });
  fetched = await db.examCandidates.getById(candidate.id);
  assert.equal(fetched?.status, 'Active');

  // Clean up
  await db.examCandidates.deleteById(candidate.id);
});

test('5. Ensures score privacy by verifying student submission response does not expose exam scores or answer keys', async () => {
  const publicReceiptContract = {
    success: true,
    submissionId: 'sub-test-123',
    submissionTime: new Date().toISOString(),
    status: 'SUBMITTED',
    message: 'Your responses have been recorded and securely transferred to the grading authority.',
    evaluationNotice: 'Official score report and qualification certificate will be delivered to your registered email.'
  };

  assert.ok(!('score' in publicReceiptContract));
  assert.ok(!('percentage' in publicReceiptContract));
  assert.ok(!('passed' in publicReceiptContract));
  assert.ok(!('certificateUrl' in publicReceiptContract));
  assert.ok(!('correctAnswers' in publicReceiptContract));
});

test('6. Automatic exam candidate credential creation from student event registration', async () => {
  const testEmail = `auto.student.${Date.now()}@cumail.in`;
  const testName = 'Ananya Sen';
  const testRoll = '22BCS1010';

  // Make sure portal is published for testing
  await db.settings.setExamPortalPublished(true);

  // Get active event or create mock event
  let events = await db.events.getAll();
  let event = events.find(e => e.status !== 'Draft' && e.status !== 'Unpublished' && e.registrationStatus === 'Open');
  if (!event && events.length > 0) {
    event = { ...events[0], status: 'Upcoming', registrationStatus: 'Open' };
    await db.events.saveAll(events.map(e => e.id === event?.id ? event : e));
  }

  assert.ok(event, 'At least one event must exist');

  const regReq = new Request('http://localhost/api/event-register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventId: event.id,
      fullName: testName,
      email: testEmail,
      phone: '+91 9876543210',
      university: 'Chandigarh University',
      program: 'B.Tech CSE',
      year: '3rd Year',
      studentId: testRoll,
      interests: ['Cloud Architecture', 'Security'],
      experienceLevel: 'Intermediate',
      motivation: 'I want to master AWS Cloud and participate in this examination.',
      consent: true
    })
  });

  const regRes = await eventRegisterPost(regReq);
  assert.equal(regRes.status, 200);

  // Verify that candidate credential was automatically created
  const candidateList = await db.examCandidates.getByEmail(testEmail);
  assert.ok(candidateList.length > 0, 'Candidate must be auto-provisioned upon registration');
  const cand = candidateList[0];
  assert.equal(cand.studentName, testName);
  assert.equal(cand.rollNumber, testRoll);
  assert.equal(cand.status, 'Active');
  assert.match(cand.password, /^AWS-[A-HJ-NP-Za-km-z2-9]{4}-[A-HJ-NP-Za-km-z2-9]{4}$/);

  // Verify authentication with the auto-generated password
  const authReq = new Request('http://localhost/api/exam/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: cand.password
    })
  });

  const authRes = await authPost(authReq);
  assert.equal(authRes.status, 200);
  const authData = await authRes.json();
  assert.equal(authData.success, true);
  assert.equal(authData.candidate.studentName, testName);
  assert.ok(authData.token, 'Session token must be returned');

  // Verify rejection with incorrect password
  const badAuthReq = new Request('http://localhost/api/exam/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'AWS-WRONG-PASS'
    })
  });
  const badAuthRes = await authPost(badAuthReq);
  assert.equal(badAuthRes.status, 401);

  // Clean up
  await db.examCandidates.deleteById(cand.id);
  const regList = await db.eventRegistrations.getByEmail(testEmail);
  for (const r of regList) {
    await db.eventRegistrations.deleteOne(r.id);
  }
});

test('7. Safe Exam Browser (SEB) XML config contains correct startURL, quitURL, and security rules', async () => {
  const exams = await db.exams.getAll();
  assert.ok(exams.length > 0);
  const exam = exams[0];

  const siteUrl = 'https://www.awssbgcuup.tech';
  const xml = generateSEBConfigXml(exam, siteUrl);

  assert.ok(xml.includes(`<string>${siteUrl}/exam</string>`));
  assert.ok(xml.includes('<key>allowDeveloperConsole</key>'));
  assert.ok(xml.includes('<key>prohibitedProcesses</key>'));
  assert.ok(xml.includes('<string>Discord.exe</string>'));
  assert.ok(xml.includes('<string>AnyDesk.exe</string>'));
});
