import https from 'https';

function request(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const req = https.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: opts.method || 'GET',
      headers: opts.headers || {}
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: raw }));
    });
    req.on('error', reject);
    if (opts.body) {
      req.write(typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body));
    }
    req.end();
  });
}

function parse(raw, fallback = null) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

async function runViolationsAudit() {
  const base = 'https://www.awssbgcuup.tech';
  console.log('========================================================================');
  console.log('🛡️ SECTION 5 & 9: BROWSER INTEGRITY & 2-VIOLATION ENGINE AUDIT');
  console.log('Target:', base);
  console.log('========================================================================\n');

  const results = [];

  // Admin login
  const adminLoginRes = await request(base + '/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { action: 'login', username: process.env.ADMIN_EMAIL || 'awsadmin@culko.in', password: process.env.ADMIN_PASSWORD || '' }
  });
  const adminToken = parse(adminLoginRes.body, {}).token;

  // Create a live quiz for violation testing
  const now = new Date();
  const quizPayload = {
    action: 'save-quiz',
    quiz: {
      id: 'quiz-violation-audit',
      quizCode: 'AWS-VIOLATION-AUDIT',
      title: 'Browser Integrity & Violation Test',
      sessionId: 'event-1790339112799',
      scheduledDate: '2026-10-07',
      startTime: '18:00',
      endTime: '23:30',
      timezone: 'Asia/Kolkata',
      durationMinutes: 20,
      status: 'Live',
      questionBank: [
        { id: 'q1', question: 'What is IAM?', options: ['Identity & Access Management', 'Storage', 'Compute', 'Network'], correctOptionIndex: 0, marks: 2 },
        { id: 'q2', question: 'What is VPC?', options: ['Virtual Private Cloud', 'Video Processing Cloud', 'Visual Platform', 'VM'], correctOptionIndex: 0, marks: 2 }
      ]
    }
  };
  await request(base + '/api/admin/weekly-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: quizPayload
  });

  // Start attempt for Candidate
  const candEmail = '26LBCS3304@culkomail.in';
  const startRes = await request(base + '/api/quiz/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      quizId: 'quiz-violation-audit',
      email: candEmail,
      studentName: 'Krishna Singh',
      rollNumber: '26LBCS3304',
      consentGiven: true
    }
  });
  const startData = parse(startRes.body, {});
  const attemptId = startData.attemptId;
  const token = startData.token;

  console.log(`Started violation test attempt: ${attemptId}`);

  // 1. First Violation (e.g., TAB_FOCUS_LOST)
  const v1Res = await request(base + '/api/quiz/security-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      attemptId,
      token,
      eventType: 'TAB_FOCUS_LOST',
      severity: 'WARNING',
      metadata: { reason: 'Candidate switched tabs or minimized browser.' }
    }
  });
  const v1Data = parse(v1Res.body, {});

  results.push({
    Test: '1. Violation #1 Trigger: Warning Dispatched & Attempt Remains Active',
    Status: v1Data.isWarning === true && v1Data.isAutoSubmitted === false && v1Data.violationCount === 1 ? 'PASS' : 'FAIL',
    Details: `ViolationCount: ${v1Data.violationCount}, isWarning: ${v1Data.isWarning}, isAutoSubmitted: ${v1Data.isAutoSubmitted}, Message: ${v1Data.message}`
  });

  // 2. Intelligent Deduplication Cooldown Test
  // Send 5 rapid TAB_FOCUS_LOST / TAB_HIDDEN events in rapid succession (within 200ms)
  const rapidResponses = [];
  for (let i = 0; i < 5; i++) {
    const rapidRes = await request(base + '/api/quiz/security-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        attemptId,
        token,
        eventType: 'TAB_HIDDEN',
        severity: 'WARNING',
        metadata: { reason: 'Duplicate blur event' }
      }
    });
    rapidResponses.push(parse(rapidRes.body, {}));
  }

  // Check if violation count was NOT incremented 5 times (should remain 1 due to 3s cooldown)
  const lastRapidCount = rapidResponses[rapidResponses.length - 1]?.violationCount;
  results.push({
    Test: '2. Event Spam Deduplication (Rapid Tab Blur Events within 3s Cooldown)',
    Status: lastRapidCount === 1 ? 'PASS' : 'FAIL',
    Details: `Sent 5 rapid events in 200ms. Final ViolationCount: ${lastRapidCount} (Correctly throttled to prevent false auto-submit)`
  });

  // 3. Second Valid Violation after cooldown (e.g., FULLSCREEN_EXIT after 3.5s)
  console.log('Waiting 3.5 seconds for cooldown to clear...');
  await new Promise(r => setTimeout(r, 3500));

  const v2Res = await request(base + '/api/quiz/security-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      attemptId,
      token,
      eventType: 'FULLSCREEN_EXIT',
      severity: 'CRITICAL',
      metadata: { reason: 'Exited fullscreen mode.' }
    }
  });
  const v2Data = parse(v2Res.body, {});

  results.push({
    Test: '3. Violation #2 Trigger: Automatic Server-Side Submission',
    Status: v2Data.isAutoSubmitted === true && v2Data.violationCount === 2 ? 'PASS' : 'FAIL',
    Details: `ViolationCount: ${v2Data.violationCount}, isAutoSubmitted: ${v2Data.isAutoSubmitted}, Message: ${v2Data.message}`
  });

  // 4. Verify Candidate Attempt Locked in Database & Scoring Calculated
  const candDetailsRes = await request(base + `/api/admin/weekly-quiz?action=get-candidate-details&attemptId=${attemptId}`, {
    headers: { Authorization: 'Bearer ' + adminToken }
  });
  const candDetails = parse(candDetailsRes.body, {}).candidate;

  results.push({
    Test: '4. Attempt State Finalization & Submission Reason Bound to SECURITY_VIOLATION',
    Status: candDetails.status === 'SUBMITTED' && candDetails.submissionReason === 'SECURITY_VIOLATION' ? 'PASS' : 'FAIL',
    Details: `Status: ${candDetails.status}, Reason: ${candDetails.submissionReason}, Violations Logged: ${candDetails.violationCount}`
  });

  // 5. Subsequent Answer Modifications Rejected on Locked Attempt
  const tamperAfterAutoSubmit = await request(base + '/api/quiz/save-answers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      attemptId,
      token,
      answers: { q1: 0 }
    }
  });
  results.push({
    Test: '5. Answer Modification Blocked on Auto-Submitted Violation Attempt',
    Status: tamperAfterAutoSubmit.status === 400 ? 'PASS' : 'FAIL',
    Details: `HTTP ${tamperAfterAutoSubmit.status}: Locked assessment rejected modifications.`
  });

  console.table(results);
}

runViolationsAudit().catch(console.error);
