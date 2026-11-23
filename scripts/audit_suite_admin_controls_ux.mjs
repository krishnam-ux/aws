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

async function runAdminControlsAudit() {
  const base = 'https://www.awssbgcuup.tech';
  console.log('========================================================================');
  console.log('🎛️ SECTION 12 & 13: ADMIN PROCTORING UX & ADMINISTRATIVE CONTROLS AUDIT');
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

  // Start fresh candidate attempt to run administrative controls on
  const quizPayload = {
    action: 'save-quiz',
    quiz: {
      id: 'quiz-admin-ctrl-test',
      quizCode: 'AWS-CTRL-TEST',
      title: 'Admin Controls Test Quiz',
      sessionId: 'event-1790339112799',
      scheduledDate: '2026-10-07',
      startTime: '18:00',
      endTime: '23:30',
      timezone: 'Asia/Kolkata',
      durationMinutes: 20,
      status: 'Live',
      questionBank: [{ id: 'q1', question: 'What is DynamoDB?', options: ['NoSQL', 'Relational', 'File', 'DNS'], correctOptionIndex: 0, marks: 2 }]
    }
  };
  await request(base + '/api/admin/weekly-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: quizPayload
  });

  const startRes = await request(base + '/api/quiz/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      quizId: 'quiz-admin-ctrl-test',
      email: 'om.ruhela8659@gmail.com',
      studentName: 'Om Ruhela',
      consentGiven: true
    }
  });
  const startData = parse(startRes.body, {});
  const attemptId = startData.attemptId;

  // 1. Single Screen Proctoring Grid & Top Metrics Aggregation
  const dashRes = await request(base + `/api/admin/weekly-quiz?quizId=quiz-admin-ctrl-test`, {
    headers: { Authorization: 'Bearer ' + adminToken }
  });
  const dashData = parse(dashRes.body, {});
  const metrics = dashData.metrics;

  results.push({
    Test: '1. Admin Single-Screen Summary Metrics Aggregation',
    Status: metrics && metrics.totalCandidates >= 1 ? 'PASS' : 'FAIL',
    Details: `Active: ${metrics?.inProgress}, Submitted: ${metrics?.submitted}, Total: ${metrics?.totalCandidates}, Camera Issues: ${metrics?.cameraIssues}, Security Alerts: ${metrics?.securityAlerts}`
  });

  // 2. Admin Action: Pause Candidate Assessment
  const pauseRes = await request(base + '/api/admin/weekly-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: {
      action: 'pause-candidate',
      attemptId
    }
  });
  const pauseData = parse(pauseRes.body, {});

  const candPauseCheck = await request(base + `/api/admin/weekly-quiz?action=get-candidate-details&attemptId=${attemptId}`, {
    headers: { Authorization: 'Bearer ' + adminToken }
  });
  const candPauseData = parse(candPauseCheck.body, {}).candidate;

  results.push({
    Test: '2. Admin Action: Pause Candidate Assessment',
    Status: pauseData.success && candPauseData.status === 'PAUSED' ? 'PASS' : 'FAIL',
    Details: `Status: ${candPauseData.status}, Authoritative Remaining Preserved: ${candPauseData.remainingSeconds}s`
  });

  // 3. Admin Action: Resume Candidate Assessment
  const resumeRes = await request(base + '/api/admin/weekly-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: {
      action: 'resume-candidate',
      attemptId
    }
  });
  const resumeData = parse(resumeRes.body, {});

  const candResumeCheck = await request(base + `/api/admin/weekly-quiz?action=get-candidate-details&attemptId=${attemptId}`, {
    headers: { Authorization: 'Bearer ' + adminToken }
  });
  const candResumeData = parse(candResumeCheck.body, {}).candidate;

  results.push({
    Test: '3. Admin Action: Resume Candidate Assessment',
    Status: resumeData.success && candResumeData.status === 'IN_PROGRESS' ? 'PASS' : 'FAIL',
    Details: `Status: ${candResumeData.status}, ExpiresAt: ${candResumeData.expiresAt}`
  });

  // 4. Admin Action: Extend Assessment Time (+5 minutes)
  const extendRes = await request(base + '/api/admin/weekly-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: {
      action: 'extend-time',
      attemptId,
      minutes: 5
    }
  });
  const extendData = parse(extendRes.body, {});

  results.push({
    Test: '4. Admin Action: Extend Candidate Assessment Time (+5 Min)',
    Status: extendData.success && extendData.extendedMinutes >= 5 ? 'PASS' : 'FAIL',
    Details: `ExtendedMinutes: ${extendData.extendedMinutes}, NewExpiresAt: ${extendData.expiresAt}`
  });

  // 5. Admin Action: Send Proctor Warning
  const warnRes = await request(base + '/api/admin/weekly-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: {
      action: 'send-warning',
      attemptId,
      message: 'Please adjust your lighting and stay centered in camera view.'
    }
  });
  const warnData = parse(warnRes.body, {});

  results.push({
    Test: '5. Admin Action: Dispatch Real-Time Proctor Warning',
    Status: warnData.success ? 'PASS' : 'FAIL',
    Details: `Response: ${warnData.message}`
  });

  // 6. Admin Action: Lock Candidate Attempt
  const lockRes = await request(base + '/api/admin/weekly-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: {
      action: 'lock-candidate',
      attemptId
    }
  });
  const lockData = parse(lockRes.body, {});

  results.push({
    Test: '6. Admin Action: Lock Candidate Assessment',
    Status: lockData.success && lockData.status === 'LOCKED' ? 'PASS' : 'FAIL',
    Details: `Status: ${lockData.status}`
  });

  // 7. Admin Action: Force Submit Candidate Assessment
  const forceSubmitRes = await request(base + '/api/admin/weekly-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: {
      action: 'force-submit',
      attemptId
    }
  });
  const forceSubmitData = parse(forceSubmitRes.body, {});

  const candFinalCheck = await request(base + `/api/admin/weekly-quiz?action=get-candidate-details&attemptId=${attemptId}`, {
    headers: { Authorization: 'Bearer ' + adminToken }
  });
  const candFinalData = parse(candFinalCheck.body, {}).candidate;

  results.push({
    Test: '7. Admin Action: Force Submit Candidate Assessment',
    Status: forceSubmitData.success && candFinalData.status === 'SUBMITTED' && candFinalData.submissionReason === 'ADMIN_FORCE_SUBMIT' ? 'PASS' : 'FAIL',
    Details: `Status: ${candFinalData.status}, Reason: ${candFinalData.submissionReason}, Score: ${candFinalData.score}`
  });

  // 8. Full Administrative Audit Logging Verification
  const timelineRes = await request(base + `/api/admin/weekly-quiz?action=get-timeline&attemptId=${attemptId}`, {
    headers: { Authorization: 'Bearer ' + adminToken }
  });
  const timelineData = parse(timelineRes.body, {});
  const events = timelineData.events || [];

  results.push({
    Test: '8. Comprehensive Security & Administrative Audit Logging',
    Status: events.length > 0 ? 'PASS' : 'FAIL',
    Details: `Total Audited Incident Events Logged: ${events.length}`
  });

  console.table(results);
}

runAdminControlsAudit().catch(console.error);
