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

async function runScheduleTimerAudit() {
  const base = 'https://www.awssbgcuup.tech';
  console.log('========================================================================');
  console.log('⏱️ SECTION 3: SCHEDULE & SERVER-AUTHORITATIVE TIMER AUDIT');
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

  // 1. Timezone verification: Asia/Kolkata (+05:30 offset)
  const tzQuizPayload = {
    action: 'save-quiz',
    quiz: {
      id: 'quiz-timer-tz-test',
      quizCode: 'AWS-TZ-TEST',
      title: 'Timezone ISO Conversion Test',
      topic: 'Schedule Validation',
      sessionId: 'event-1790339112799',
      scheduledDate: '2026-10-15',
      startTime: '14:00',
      endTime: '15:00',
      timezone: 'Asia/Kolkata',
      durationMinutes: 30,
      status: 'Live',
      questionBank: [{ id: 'q1', question: 'Test?', options: ['A', 'B'], correctOptionIndex: 0, marks: 1 }]
    }
  };

  const tzSaveRes = await request(base + '/api/admin/weekly-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: tzQuizPayload
  });
  const tzData = parse(tzSaveRes.body, {});
  const scheduledStartUtc = tzData.quiz?.scheduledStartAt;
  const scheduledEndUtc = tzData.quiz?.scheduledEndAt;

  // 2026-10-15 14:00 IST = 2026-10-15T08:30:00.000Z UTC
  const isTzStartCorrect = scheduledStartUtc === '2026-10-15T08:30:00.000Z';
  const isTzEndCorrect = scheduledEndUtc === '2026-10-15T09:30:00.000Z';

  results.push({
    Test: '1. Asia/Kolkata (IST +05:30) Canonical UTC ISO Conversion',
    Status: isTzStartCorrect && isTzEndCorrect ? 'PASS' : 'FAIL',
    Details: `Start: ${scheduledStartUtc} (expected 08:30:00Z), End: ${scheduledEndUtc} (expected 09:30:00Z)`
  });

  // 2. Before-Start Window: Candidate Entry Denied with Starts-In Seconds
  const futureQuizPayload = {
    action: 'save-quiz',
    quiz: {
      id: 'quiz-future-test',
      quizCode: 'AWS-FUTURE-TEST',
      title: 'Future Scheduled Assessment',
      topic: 'Schedule Boundary',
      sessionId: 'event-1790339112799',
      scheduledDate: '2026-10-20',
      startTime: '10:00',
      endTime: '11:00',
      timezone: 'Asia/Kolkata',
      durationMinutes: 30,
      status: 'Live',
      questionBank: [{ id: 'q1', question: 'Test?', options: ['A', 'B'], correctOptionIndex: 0, marks: 1 }]
    }
  };
  await request(base + '/api/admin/weekly-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: futureQuizPayload
  });

  const futureAuthRes = await request(base + '/api/quiz/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'om.ruhela8659@gmail.com', quizId: 'quiz-future-test' }
  });
  const futureAuthData = parse(futureAuthRes.body, {});
  results.push({
    Test: '2. Before-Start Window: Status UPCOMING with Countdown',
    Status: futureAuthData.isEligible === false && futureAuthData.eligibilityReason === 'QUIZ_NOT_STARTED' && futureAuthData.quiz?.startsInSeconds > 0 ? 'PASS' : 'FAIL',
    Details: `Status: ${futureAuthData.eligibilityReason}, Starts in: ${futureAuthData.quiz?.startsInSeconds}s`
  });

  // 3. Past-End Window: Candidate Entry Denied (QUIZ_ENDED)
  const pastQuizPayload = {
    action: 'save-quiz',
    quiz: {
      id: 'quiz-past-test',
      quizCode: 'AWS-PAST-TEST',
      title: 'Past Expired Assessment',
      topic: 'Schedule Boundary',
      sessionId: 'event-1790339112799',
      scheduledDate: '2026-10-01',
      startTime: '10:00',
      endTime: '11:00',
      timezone: 'Asia/Kolkata',
      durationMinutes: 30,
      status: 'Live',
      questionBank: [{ id: 'q1', question: 'Test?', options: ['A', 'B'], correctOptionIndex: 0, marks: 1 }]
    }
  };
  await request(base + '/api/admin/weekly-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: pastQuizPayload
  });

  const pastAuthRes = await request(base + '/api/quiz/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'om.ruhela8659@gmail.com', quizId: 'quiz-past-test' }
  });
  const pastAuthData = parse(pastAuthRes.body, {});
  results.push({
    Test: '3. After-End Window: Status ENDED Rejection',
    Status: pastAuthData.isEligible === false && pastAuthData.eligibilityReason === 'QUIZ_ENDED' ? 'PASS' : 'FAIL',
    Details: `Status: ${pastAuthData.eligibilityReason}, Message: ${pastAuthData.eligibilityMessage}`
  });

  // 4. Server-Authoritative Timer Bounded by Quiz End Window
  // Set a quiz that ends in 60 seconds. Attempt duration is 20 min, but authoritative remainingSeconds must be clamped to ~60s
  const now = new Date();
  const shortEnd = new Date(now.getTime() + 90 * 1000); // Ends in 90 seconds
  const shortQuizPayload = {
    action: 'save-quiz',
    quiz: {
      id: 'quiz-short-window-test',
      quizCode: 'AWS-SHORT-WINDOW',
      title: 'Short Window Assessment',
      sessionId: 'event-1790339112799',
      scheduledStartAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
      scheduledEndAt: shortEnd.toISOString(),
      durationMinutes: 20, // 1200 seconds
      status: 'Live',
      questionBank: [{ id: 'q1', question: 'What is EC2?', options: ['VM', 'DB', 'Storage', 'DNS'], correctOptionIndex: 0, marks: 1 }]
    }
  };
  await request(base + '/api/admin/weekly-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: shortQuizPayload
  });

  const shortStartRes = await request(base + '/api/quiz/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      quizId: 'quiz-short-window-test',
      email: '26LBCS3304@culkomail.in', // Krishna Singh
      studentName: 'Krishna Singh',
      rollNumber: '26LBCS3304',
      consentGiven: true
    }
  });
  const shortStartData = parse(shortStartRes.body, {});
  const remainingSec = shortStartData.remainingSeconds;
  // Should be bounded by the 90s window (approx 80-90s) rather than 1200s
  results.push({
    Test: '4. Server-Authoritative Timer Clamped by Quiz Scheduled Window',
    Status: remainingSec > 0 && remainingSec <= 95 ? 'PASS' : 'FAIL',
    Details: `Duration requested: 1200s (20m), Clamped authoritative remaining: ${remainingSec}s`
  });

  // 5. Automatic Expiration and Submission on Expiration
  console.log('Waiting 10 seconds for window expiration test...');
  await new Promise(r => setTimeout(r, 10000));

  // Now set the quiz end time to 1 second in the past
  await request(base + '/api/admin/weekly-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: {
      action: 'save-quiz',
      quiz: {
        id: 'quiz-short-window-test',
        scheduledEndAt: new Date(Date.now() - 5000).toISOString()
      }
    }
  });

  // Candidate attempts to save answers on expired quiz
  const expiredSaveRes = await request(base + '/api/quiz/save-answers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      attemptId: shortStartData.attemptId,
      token: shortStartData.token,
      answers: { q1: 0 }
    }
  });
  const expiredSaveData = parse(expiredSaveRes.body, {});
  results.push({
    Test: '5. Automatic Submission on Time Expiration (TIME_EXPIRED)',
    Status: expiredSaveRes.status === 403 && expiredSaveData.error?.includes('expired') ? 'PASS' : 'FAIL',
    Details: `HTTP ${expiredSaveRes.status}: ${expiredSaveData.error}`
  });

  console.table(results);
}

runScheduleTimerAudit().catch(console.error);
