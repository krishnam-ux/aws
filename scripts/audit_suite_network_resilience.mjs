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

async function runNetworkResilienceAudit() {
  const base = 'https://www.awssbgcuup.tech';
  console.log('========================================================================');
  console.log('📶 SECTION 11: NETWORK FAILURE, DISCONNECT & RECOVERY AUDIT');
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

  // Setup quiz
  const now = new Date();
  const quizPayload = {
    action: 'save-quiz',
    quiz: {
      id: 'quiz-net-resilience',
      quizCode: 'AWS-NET-TEST',
      title: 'Network Resilience Test Quiz',
      sessionId: 'event-1790339112799',
      scheduledDate: '2026-10-07',
      startTime: '18:00',
      endTime: '23:30',
      timezone: 'Asia/Kolkata',
      durationMinutes: 20,
      status: 'Live',
      questionBank: [
        { id: 'q1', question: 'What is Route 53?', options: ['DNS', 'DB', 'Compute', 'Storage'], correctOptionIndex: 0, marks: 1 },
        { id: 'q2', question: 'What is CloudFront?', options: ['CDN', 'DB', 'Compute', 'Queue'], correctOptionIndex: 0, marks: 1 }
      ]
    }
  };
  await request(base + '/api/admin/weekly-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: quizPayload
  });

  // Start candidate attempt
  const startRes = await request(base + '/api/quiz/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      quizId: 'quiz-net-resilience',
      email: 'om.ruhela8659@gmail.com',
      studentName: 'Om Ruhela',
      consentGiven: true
    }
  });
  const startData = parse(startRes.body, {});
  const attemptId = startData.attemptId;
  const token = startData.token;

  // Save partial answers before network drop
  await request(base + '/api/quiz/save-answers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      attemptId,
      token,
      answers: { q1: 0 }
    }
  });

  // 1. Simulate 5-second network drop (signaling disconnected event)
  await request(base + '/api/quiz/security-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      attemptId,
      token,
      eventType: 'NETWORK_INTERRUPTION',
      severity: 'WARNING',
      metadata: { reason: 'Network offline: 5 seconds' }
    }
  });

  const check5s = await request(base + `/api/admin/weekly-quiz?action=get-candidate-details&attemptId=${attemptId}`, {
    headers: { Authorization: 'Bearer ' + adminToken }
  });
  const data5s = parse(check5s.body, {}).candidate;

  results.push({
    Test: '1. 5s Network Interruption: RECONNECTING State Transition',
    Status: data5s.connectionStatus === 'RECONNECTING' ? 'PASS' : 'FAIL',
    Details: `Connection Status: ${data5s.connectionStatus}`
  });

  // 2. Candidate Reconnects after 5s and syncs
  await request(base + '/api/quiz/security-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      attemptId,
      token,
      eventType: 'NETWORK_RECONNECTED',
      severity: 'INFO',
      metadata: { reason: 'Connection restored' }
    }
  });

  const recCheck = await request(base + `/api/admin/weekly-quiz?action=get-candidate-details&attemptId=${attemptId}`, {
    headers: { Authorization: 'Bearer ' + adminToken }
  });
  const recData = parse(recCheck.body, {}).candidate;

  results.push({
    Test: '2. Reconnect Recovery: Status Restored to CONNECTED',
    Status: recData.connectionStatus === 'CONNECTED' ? 'PASS' : 'FAIL',
    Details: `Connection Status: ${recData.connectionStatus}`
  });

  // 3. Answer Persistence Across Reconnect / Session Resumption
  // Student calls /api/quiz/start again to resume session
  const resumeRes = await request(base + '/api/quiz/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      quizId: 'quiz-net-resilience',
      email: 'om.ruhela8659@gmail.com',
      consentGiven: true
    }
  });
  const resumeData = parse(resumeRes.body, {});
  const preservedAnswers = resumeData.answers || {};

  results.push({
    Test: '3. State & Answer Preservation on Session Resume',
    Status: preservedAnswers.q1 === 0 && resumeData.attemptId === attemptId ? 'PASS' : 'FAIL',
    Details: `Resumed Attempt: ${resumeData.attemptId}, Answers Preserved: ${JSON.stringify(preservedAnswers)}`
  });

  // 4. Authoritative Timer Integrity Across Refresh/Drop (No Time Inflation)
  const initialRemaining = startData.remainingSeconds;
  const resumedRemaining = resumeData.remainingSeconds;
  // Elapsed time must be subtracted; resumedRemaining cannot be greater than initialRemaining
  results.push({
    Test: '4. Authoritative Server Timer Integrity (Zero Clock Drift / No Time Inflation)',
    Status: resumedRemaining <= initialRemaining ? 'PASS' : 'FAIL',
    Details: `Initial Remaining: ${initialRemaining}s, Resumed Remaining: ${resumedRemaining}s (No extra time granted)`
  });

  console.table(results);
}

runNetworkResilienceAudit().catch(console.error);
