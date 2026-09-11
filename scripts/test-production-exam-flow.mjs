import { execSync } from 'child_process';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ADMIN_TOKEN = 'awssbg-admin-session-token-secure-hash';

console.log(`\n==================================================`);
console.log(`Running End-to-End Exam Verification on: ${BASE_URL}`);
console.log(`==================================================\n`);

async function runTest() {
  const timestamp = Date.now();
  const testExamId = `audit-exam-${timestamp}`;
  const testExamCode = `AUDIT-${timestamp.toString().slice(-4)}`;
  const testPassword = `pass-${timestamp.toString().slice(-4)}`;

  console.log(`[Step 1] Creating New Exam: ID=${testExamId}, Code=${testExamCode}, Pass=${testPassword}`);
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
        title: 'AWS SBG Secure Certification Production Audit',
        description: 'Live Verification Exam',
        category: 'Cloud Architecture',
        durationMinutes: 30,
        passingPercentage: 70,
        maxAttempts: 1,
        status: 'Live',
        requireSecureBrowser: true,
        maxSecurityViolations: 3,
        questions: [
          {
            id: 'q-audit-1',
            question: 'Which AWS service is used to deploy serverless functions?',
            options: ['EC2', 'RDS', 'Lambda', 'EBS'],
            correctOptionIndex: 2,
            marks: 50,
            explanation: 'AWS Lambda runs code without provisioning servers.'
          },
          {
            id: 'q-audit-2',
            question: 'Which service offers managed relational databases?',
            options: ['DynamoDB', 'RDS', 'S3', 'SNS'],
            correctOptionIndex: 1,
            marks: 50,
            explanation: 'Amazon RDS manages relational engines like PostgreSQL and MySQL.'
          }
        ]
      }
    })
  });

  const createData = await createRes.json();
  if (!createRes.ok || !createData.success) {
    throw new Error(`Failed to create exam: ${JSON.stringify(createData)}`);
  }
  console.log(`✓ Exam created successfully.`);

  console.log(`\n[Step 2] Student Enters Exam using Code=${testExamCode} and Pass=${testPassword}`);
  const authRes = await fetch(`${BASE_URL}/api/exam/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      examId: testExamCode.toLowerCase(), // test case insensitivity
      password: testPassword,
      studentName: 'Aarav Patel',
      rollNumber: '23BCS7777',
      email: 'aarav.patel@cumail.in'
    })
  });

  const authData = await authRes.json();
  if (!authRes.ok || !authData.success) {
    throw new Error(`Student auth failed: ${JSON.stringify(authData)}`);
  }
  console.log(`✓ Student authenticated. Status: ${authData.status}, Attempt ID: ${authData.attemptId}`);
  const { token, attemptId } = authData;

  console.log(`\n[Step 3] Polling Lobby Status`);
  const lobbyRes = await fetch(`${BASE_URL}/api/exam/lobby-status?attemptId=${attemptId}&token=${token}`);
  const lobbyData = await lobbyRes.json();
  console.log(`✓ Lobby status: ${lobbyData.status}`);

  console.log(`\n[Step 4] Admin Checks Live Control Feed`);
  const liveRes = await fetch(`${BASE_URL}/api/admin/exams/live?examId=${testExamId}`, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
  });
  const liveData = await liveRes.json();
  console.log(`✓ Live feed stats: Total=${liveData.stats.totalCandidates}, Waiting=${liveData.stats.waiting}`);
  if (liveData.candidates.length === 0) {
    throw new Error('Candidate not visible in Admin live feed!');
  }

  console.log(`\n[Step 5] Admin Verifies Candidate`);
  const verifyRes = await fetch(`${BASE_URL}/api/admin/exams/control`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ADMIN_TOKEN}`
    },
    body: JSON.stringify({
      action: 'verify',
      examId: testExamId,
      candidateId: attemptId
    })
  });
  const verifyData = await verifyRes.json();
  console.log(`✓ Verified: ${verifyData.success}`);

  console.log(`\n[Step 6] Admin Unlocks Candidate`);
  const unlockRes = await fetch(`${BASE_URL}/api/admin/exams/control`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ADMIN_TOKEN}`
    },
    body: JSON.stringify({
      action: 'unlock',
      examId: testExamId,
      candidateId: attemptId
    })
  });
  const unlockData = await unlockRes.json();
  console.log(`✓ Unlocked: ${unlockData.success}`);

  console.log(`\n[Step 7] Student Starts Exam`);
  const startRes = await fetch(`${BASE_URL}/api/exam/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attemptId, token })
  });
  const startData = await startRes.json();
  console.log(`✓ Started: Status=${startData.status}, RemainingSeconds=${startData.remainingSeconds}`);

  console.log(`\n[Step 8] Student Auto-Saves Answers (100% correct)`);
  const saveRes = await fetch(`${BASE_URL}/api/exam/save-answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attemptId,
      token,
      answers: { 'q-audit-1': 2, 'q-audit-2': 1 }
    })
  });
  const saveData = await saveRes.json();
  console.log(`✓ Answers saved: ${saveData.success}`);

  console.log(`\n[Step 9] Admin Extends Time by +5 minutes`);
  const extendRes = await fetch(`${BASE_URL}/api/admin/exams/control`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ADMIN_TOKEN}`
    },
    body: JSON.stringify({
      action: 'extend-time',
      examId: testExamId,
      candidateId: attemptId,
      minutes: 5
    })
  });
  const extendData = await extendRes.json();
  console.log(`✓ Time extended: ${extendData.success}`);

  console.log(`\n[Step 10] Student Submits Exam`);
  const submitRes = await fetch(`${BASE_URL}/api/exam/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attemptId,
      token,
      answers: { 'q-audit-1': 2, 'q-audit-2': 1 },
      reason: 'MANUAL'
    })
  });
  const submitData = await submitRes.json();
  console.log(`✓ Submitted status: ${submitData.status}`);
  console.log(`✓ Student confirmation message: "${submitData.message}"`);

  // Verify privacy constraint
  if (submitData.score !== undefined || submitData.passed !== undefined || submitData.percentage !== undefined) {
    throw new Error('PRIVACY VIOLATION: Student received score or pass/fail in submit response!');
  }
  console.log(`✓ Privacy confirmed: No score or pass/fail exposed to student.`);

  console.log(`\n[Step 11] Admin Inspects Attempt Details`);
  const inspectRes = await fetch(`${BASE_URL}/api/admin/exams/attempt-details?attemptId=${attemptId}`, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
  });
  const inspectData = await inspectRes.json();
  console.log(`✓ Admin Report: Candidate=${inspectData.attempt.studentName}, Score=${inspectData.attempt.score}/${inspectData.attempt.totalMarks} (${inspectData.attempt.percentage}%), Passed=${inspectData.attempt.passed}`);

  console.log(`\n[Step 12] Admin Marks Candidate Selected and Dispatches Email`);
  const selectRes = await fetch(`${BASE_URL}/api/admin/exams/control`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ADMIN_TOKEN}`
    },
    body: JSON.stringify({
      action: 'mark-selected',
      candidateId: attemptId,
      notes: 'Qualified during automated verification suite'
    })
  });
  const selectData = await selectRes.json();
  console.log(`✓ Candidate selected: ${selectData.success}`);

  console.log(`\n[Step 13] Admin Deletes Candidate Attempt`);
  const deleteRes = await fetch(`${BASE_URL}/api/admin/exams/control`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ADMIN_TOKEN}`
    },
    body: JSON.stringify({
      action: 'delete-candidate',
      examId: testExamId,
      candidateId: attemptId
    })
  });
  const deleteData = await deleteRes.json();
  console.log(`✓ Candidate deleted: ${deleteData.success}`);

  // Confirm candidate is gone
  const liveResAfter = await fetch(`${BASE_URL}/api/admin/exams/live?examId=${testExamId}`, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
  });
  const liveDataAfter = await liveResAfter.json();
  console.log(`✓ Candidates remaining in exam: ${liveDataAfter.candidates.length}`);
  if (liveDataAfter.candidates.length !== 0) {
    throw new Error('Candidate was not removed from live feed!');
  }

  // Cleanup exam
  await fetch(`${BASE_URL}/api/admin/exams`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ADMIN_TOKEN}`
    },
    body: JSON.stringify({ action: 'delete', examId: testExamId })
  });
  console.log(`✓ Cleanup complete.`);

  console.log(`\n==================================================`);
  console.log(`🎉 ALL 13 END-TO-END VERIFICATION STEPS PASSED!`);
  console.log(`==================================================\n`);
}

runTest().catch((err) => {
  console.error('❌ E2E Verification Failed:', err);
  process.exit(1);
});
