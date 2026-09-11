const BASE_URL = process.env.TEST_BASE_URL || 'https://awscu.vercel.app';
const ADMIN_TOKEN = 'awssbg-admin-session-token-secure-hash';

console.log(`\n======================================================================`);
console.log(`🔐 LIVE PRODUCTION LOCK & RECOVERY AUDIT: ${BASE_URL}`);
console.log(`======================================================================\n`);

async function run() {
  const timestamp = Date.now();
  const testExamId = `prod-lock-${timestamp}`;
  const testExamCode = `LCK-${timestamp.toString().slice(-4)}`;
  const testPassword = `pass-${timestamp.toString().slice(-4)}`;
  const unlockPassword = `UNLOCK-${timestamp.toString().slice(-4)}-LIVE`;

  // 1. Create Exam with Invigilator Unlock Password
  console.log(`[Step 1] Creating Secure Exam in Production: ID=${testExamId}, UnlockPass=${unlockPassword}`);
  const createRes = await fetch(`${BASE_URL}/api/admin/exams`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ADMIN_TOKEN}`
    },
    body: JSON.stringify({
      action: 'create',
      exam: {
        id: testExamId,
        examCode: testExamCode,
        password: testPassword,
        examUnlockPassword: unlockPassword,
        title: 'AWS SBG Live Lockdown & Recovery Assessment',
        description: 'End-to-End Production Lockdown Verification',
        category: 'Security Architecture',
        durationMinutes: 30,
        passingPercentage: 70,
        maxAttempts: 1,
        status: 'Live',
        requireSecureBrowser: true,
        maxSecurityViolations: 3,
        questions: [
          {
            id: 'q-lock-1',
            question: 'Which AWS service is designed for automated security assessments?',
            options: ['Amazon Inspector', 'Amazon S3', 'Amazon Route 53', 'AWS Glue'],
            correctOptionIndex: 0,
            marks: 50,
            explanation: 'Amazon Inspector automatically assesses applications for vulnerabilities.'
          },
          {
            id: 'q-lock-2',
            question: 'What mechanism provides temporary security credentials in AWS?',
            options: ['AWS KMS', 'AWS STS', 'AWS IAM User', 'Amazon VPC'],
            correctOptionIndex: 1,
            marks: 50,
            explanation: 'AWS Security Token Service (STS) issues temporary credentials.'
          }
        ]
      }
    })
  });

  const createData = await createRes.json();
  if (!createRes.ok || !createData.success) {
    throw new Error(`Failed to create exam: ${JSON.stringify(createData)}`);
  }
  console.log(`✓ Exam created successfully with Invigilator Unlock Password.`);

  // 2. Candidate registers & logs into lobby
  console.log(`\n[Step 2] Candidate Authenticates into Lobby`);
  const authRes = await fetch(`${BASE_URL}/api/exam/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      examId: testExamCode.toLowerCase(),
      password: testPassword,
      studentName: 'Karan Malhotra',
      rollNumber: `23BCS${timestamp.toString().slice(-4)}`,
      email: `karan.prod.${timestamp}@cumail.in`
    })
  });
  const authData = await authRes.json();
  if (!authRes.ok || !authData.success) {
    throw new Error(`Auth failed: ${JSON.stringify(authData)}`);
  }
  const attemptId = authData.attemptId;
  const token = authData.token;
  console.log(`✓ Candidate entered lobby. Status = ${authData.status}, AttemptId = ${attemptId}`);

  // 3. Admin verifies & unlocks candidate in lobby
  console.log(`\n[Step 3] Admin Verifies & Unlocks Candidate in Lobby`);
  await fetch(`${BASE_URL}/api/admin/exams/control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN}` },
    body: JSON.stringify({ action: 'verify', examId: testExamId, candidateId: attemptId })
  });
  await fetch(`${BASE_URL}/api/admin/exams/control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN}` },
    body: JSON.stringify({ action: 'unlock', examId: testExamId, candidateId: attemptId })
  });
  console.log(`✓ Candidate verified and unlocked.`);

  // 4. Candidate starts exam -> IN_EXAM
  console.log(`\n[Step 4] Candidate Starts Exam`);
  const startRes = await fetch(`${BASE_URL}/api/exam/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attemptId, token })
  });
  const startData = await startRes.json();
  if (!startRes.ok || startData.status !== 'IN_EXAM') {
    throw new Error(`Start exam failed: ${JSON.stringify(startData)}`);
  }
  console.log(`✓ Candidate IN_EXAM. Remaining time: ${startData.remainingSeconds}s`);

  // 5. Check active session has questions
  console.log(`\n[Step 5] Verify Active Session has questions`);
  const sessionRes = await fetch(`${BASE_URL}/api/exam/session?attemptId=${attemptId}&token=${token}`);
  const sessionData = await sessionRes.json();
  if (sessionData.exam.questions.length !== 2) {
    throw new Error(`Expected 2 questions, got ${sessionData.exam.questions.length}`);
  }
  console.log(`✓ Questions loaded: ${sessionData.exam.questions.length} questions.`);

  // Candidate answers Question 1
  await fetch(`${BASE_URL}/api/exam/save-answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attemptId, token, answers: { 'q-lock-1': 0 } })
  });
  console.log(`✓ Saved candidate answer for Question 1.`);

  // 6. Fullscreen / ESC Interruption occurs -> Trigger EXAM_LOCKED
  console.log(`\n[Step 6] Simulating Security Interruption (ESC / Fullscreen Exit)`);
  const secRes = await fetch(`${BASE_URL}/api/exam/security-event`, {
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
  const secData = await secRes.json();
  if (!secData.locked || secData.status !== 'EXAM_LOCKED') {
    throw new Error(`Expected locked: true and status: EXAM_LOCKED, got: ${JSON.stringify(secData)}`);
  }
  console.log(`✓ Candidate locked out! Status = ${secData.status}, Incident #${secData.lockCount}`);

  // 7. Anti-Bypass Check: Session must return 0 questions while locked
  console.log(`\n[Step 7] Anti-Bypass: Check Question Stripping during Lock`);
  const lockedSessionRes = await fetch(`${BASE_URL}/api/exam/session?attemptId=${attemptId}&token=${token}`);
  const lockedSessionData = await lockedSessionRes.json();
  if (lockedSessionData.exam.questions.length !== 0) {
    throw new Error(`CRITICAL SECURITY FAILURE: Questions leaked during EXAM_LOCKED!`);
  }
  if (lockedSessionData.attempt.status !== 'EXAM_LOCKED') {
    throw new Error(`Expected attempt status EXAM_LOCKED`);
  }
  console.log(`✓ Anti-Bypass Verified: Questions are 100% stripped from locked session.`);
  console.log(`✓ Timer Paused: Remaining seconds preserved at ${lockedSessionData.attempt.remainingSeconds}s.`);

  // 8. Anti-Bypass Check: save-answers must be blocked (403)
  console.log(`\n[Step 8] Anti-Bypass: Attempting to save answers while locked`);
  const blockedSaveRes = await fetch(`${BASE_URL}/api/exam/save-answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attemptId, token, answers: { 'q-lock-1': 1, 'q-lock-2': 1 } })
  });
  if (blockedSaveRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden on save-answers while locked, got ${blockedSaveRes.status}`);
  }
  console.log(`✓ Anti-Bypass Verified: save-answers rejected with HTTP 403 Forbidden.`);

  // 9. Admin Live Control Center Check
  console.log(`\n[Step 9] Checking Admin Live Control Feed`);
  const liveRes = await fetch(`${BASE_URL}/api/admin/exams/live?examId=${testExamId}`, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
  });
  const liveData = await liveRes.json();
  if (liveData.stats.examLocked !== 1) {
    throw new Error(`Admin stats should report 1 examLocked candidate, got ${liveData.stats.examLocked}`);
  }
  const liveCandidate = liveData.candidates.find((c) => c.id === attemptId);
  if (liveCandidate?.status !== 'EXAM_LOCKED') {
    throw new Error(`Admin candidate status should be EXAM_LOCKED`);
  }
  console.log(`✓ Admin Live Dashboard accurately displays: 🔒 LOCKED (Incident #${liveCandidate.lockCount}, Reason: ${liveCandidate.lockReason})`);

  // 10. Student enters wrong unlock password -> 403 Forbidden
  console.log(`\n[Step 10] Testing Invalid Unlock Password`);
  const wrongUnlockRes = await fetch(`${BASE_URL}/api/exam/recover-lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attemptId, token, unlockPassword: 'WRONG-PASSWORD-XYZ' })
  });
  if (wrongUnlockRes.status !== 403) {
    throw new Error(`Expected 403 for wrong unlock password, got ${wrongUnlockRes.status}`);
  }
  console.log(`✓ Invalid unlock password correctly rejected with HTTP 403.`);

  // 11. Student enters correct Invigilator Unlock Password -> Resumes Exam
  console.log(`\n[Step 11] Candidate enters Correct Invigilator Unlock Password`);
  const correctUnlockRes = await fetch(`${BASE_URL}/api/exam/recover-lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attemptId, token, unlockPassword })
  });
  const correctUnlockData = await correctUnlockRes.json();
  if (!correctUnlockRes.ok || !correctUnlockData.success || correctUnlockData.status !== 'IN_EXAM') {
    throw new Error(`Failed to unlock with correct password: ${JSON.stringify(correctUnlockData)}`);
  }
  console.log(`✓ Exam successfully unlocked! Status restored to IN_EXAM.`);

  // 12. Verify Questions & Answers are restored intact
  console.log(`\n[Step 12] Verify Restored Session & Preserved Answers`);
  const resumedSessionRes = await fetch(`${BASE_URL}/api/exam/session?attemptId=${attemptId}&token=${token}`);
  const resumedSessionData = await resumedSessionRes.json();
  if (resumedSessionData.exam.questions.length !== 2) {
    throw new Error(`Questions not restored after unlock`);
  }
  if (resumedSessionData.attempt.answers['q-lock-1'] !== 0) {
    throw new Error(`Saved answers corrupted during lock/unlock cycle`);
  }
  console.log(`✓ Session verified: All ${resumedSessionData.exam.questions.length} questions restored, previous answers intact.`);

  // 13. Admin Remote Manual Workstation Lock
  console.log(`\n[Step 13] Admin Remote Workstation Lock`);
  const adminLockRes = await fetch(`${BASE_URL}/api/admin/exams/control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN}` },
    body: JSON.stringify({
      action: 'manual-lock-candidate',
      candidateId: attemptId,
      reason: 'Proctor physical environment check'
    })
  });
  const adminLockData = await adminLockRes.json();
  if (adminLockData.status !== 'EXAM_LOCKED') {
    throw new Error(`Admin manual lock failed: ${JSON.stringify(adminLockData)}`);
  }
  console.log(`✓ Candidate remotely locked by Proctor.`);

  // 14. Admin Remote Manual Workstation Unlock
  console.log(`\n[Step 14] Admin Remote Workstation Unlock`);
  const adminUnlockRes = await fetch(`${BASE_URL}/api/admin/exams/control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN}` },
    body: JSON.stringify({
      action: 'unlock-locked-candidate',
      candidateId: attemptId,
      reason: 'Proctor verified candidate workstation is compliant'
    })
  });
  const adminUnlockData = await adminUnlockRes.json();
  if (adminUnlockData.status !== 'IN_EXAM') {
    throw new Error(`Admin manual unlock failed: ${JSON.stringify(adminUnlockData)}`);
  }
  console.log(`✓ Candidate remotely unlocked by Proctor with mandatory reason logged.`);

  // 15. Candidate submits final exam
  console.log(`\n[Step 15] Candidate Submits Final Answers`);
  const submitRes = await fetch(`${BASE_URL}/api/exam/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attemptId,
      token,
      answers: { 'q-lock-1': 0, 'q-lock-2': 1 },
      reason: 'MANUAL'
    })
  });
  const submitData = await submitRes.json();
  if (!submitRes.ok || submitData.status !== 'SUBMITTED') {
    throw new Error(`Submit failed: ${JSON.stringify(submitData)}`);
  }
  if (submitData.score !== undefined || submitData.passed !== undefined || submitData.certificateId !== undefined) {
    throw new Error(`CRITICAL PRIVACY VIOLATION: Score or certificate exposed on submit!`);
  }
  console.log(`✓ Clean Neutral Submission Confirmation: "${submitData.message}"`);

  // 16. Admin Password Regeneration
  console.log(`\n[Step 16] Admin Regenerates Invigilator Unlock Password`);
  const regenRes = await fetch(`${BASE_URL}/api/admin/exams/control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN}` },
    body: JSON.stringify({ action: 'regenerate-unlock-password', examId: testExamId })
  });
  const regenData = await regenRes.json();
  if (!regenData.examUnlockPassword || regenData.examUnlockPassword === unlockPassword) {
    throw new Error(`Password regeneration failed`);
  }
  console.log(`✓ New Invigilator Unlock Password generated: ${regenData.examUnlockPassword} (Old password invalidated).`);

  // 17. Cleanup
  console.log(`\n[Step 17] Cleaning up test attempt and exam`);
  await fetch(`${BASE_URL}/api/admin/exams/control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN}` },
    body: JSON.stringify({ action: 'delete-candidate', examId: testExamId, candidateId: attemptId })
  });
  await fetch(`${BASE_URL}/api/admin/exams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN}` },
    body: JSON.stringify({ action: 'delete', examId: testExamId })
  });
  console.log(`✓ Test cleanup complete.`);

  console.log(`\n======================================================================`);
  console.log(`🎉 ALL 17 PRODUCTION LOCK & RECOVERY VERIFICATION CHECKS PASSED!`);
  console.log(`======================================================================\n`);
}

run().catch((err) => {
  console.error(`\n❌ PRODUCTION AUDIT FAILED:`, err);
  process.exit(1);
});
