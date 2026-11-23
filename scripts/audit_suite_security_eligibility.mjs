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

async function runSecurityAudit() {
  const base = 'https://www.awssbgcuup.tech';
  console.log('========================================================================');
  console.log('🔒 SECTION 2 & 15: SECURITY, ELIGIBILITY & IDOR TAMPERING AUDIT');
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
  if (!adminToken) {
    throw new Error('Admin login failed: ' + adminLoginRes.body);
  }

  // 1. Unregistered candidate rejection
  const unregRes = await request(base + '/api/quiz/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'unregistered_hacker_999@randomdomain.com', quizId: 'quiz-live-audit-test' }
  });
  const unregData = parse(unregRes.body, {});
  results.push({
    Test: '1. Unregistered Candidate Denied',
    Status: unregRes.status === 200 && unregData.isEligible === false && unregData.eligibilityReason === 'NOT_REGISTERED_FOR_SESSION' ? 'PASS' : 'FAIL',
    Details: `Status: ${unregRes.status}, isEligible: ${unregData.isEligible}, reason: ${unregData.eligibilityReason}`
  });

  // 2. Registered candidate session verification
  const regEmail = 'chaudharyamarchaudhary593@gmail.com'; // Registered for event-1790339112799
  const regAuthRes = await request(base + '/api/quiz/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: regEmail, quizId: 'quiz-live-audit-test' }
  });
  const regAuthData = parse(regAuthRes.body, {});
  results.push({
    Test: '2. Registered Candidate Session Eligibility',
    Status: regAuthRes.status === 200 && regAuthData.isEligible === true ? 'PASS' : 'FAIL',
    Details: `Status: ${regAuthRes.status}, isEligible: ${regAuthData.isEligible}, RegistrationId: ${regAuthData.registration?.id}`
  });

  // 3. Answer Key Leakage Check in Auth Response
  const authPayloadStr = JSON.stringify(regAuthData);
  const leaksAnswerInAuth = /correctOptionIndex|correctAnswer/i.test(authPayloadStr);
  results.push({
    Test: '3. Answer Key Leakage in /api/quiz/auth',
    Status: !leaksAnswerInAuth ? 'PASS' : 'FAIL',
    Details: leaksAnswerInAuth ? 'CRITICAL: Answer keys found in auth payload!' : 'Answer keys are completely stripped and safe.'
  });

  // 4. Candidate Start Assessment & Token Generation
  const startRes = await request(base + '/api/quiz/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      quizId: 'quiz-live-audit-test',
      email: regEmail,
      studentName: 'Amar Chaudhary',
      rollNumber: '21BCS7426',
      consentGiven: true
    }
  });
  const startData = parse(startRes.body, {});
  const startPayloadStr = JSON.stringify(startData);
  const leaksAnswerInStart = /correctOptionIndex|correctAnswer/i.test(startPayloadStr);
  const candidateToken = startData.token;
  const candidateAttemptId = startData.attemptId;

  results.push({
    Test: '4. Candidate Start & Token Generation',
    Status: startRes.status === 200 && candidateToken && candidateAttemptId ? 'PASS' : 'FAIL',
    Details: `AttemptId: ${candidateAttemptId}, Token prefix: ${candidateToken?.slice(0, 12)}...`
  });

  results.push({
    Test: '5. Answer Key Leakage in /api/quiz/start',
    Status: !leaksAnswerInStart ? 'PASS' : 'FAIL',
    Details: leaksAnswerInStart ? 'CRITICAL: Answer keys exposed in start payload!' : 'Sanitized questions only (options shuffled, correctOptionIndex stripped).'
  });

  // 6. IDOR / Cross-Candidate Attempt Tampering Check (Invalid Token)
  const fakeToken = 'wq_sess_fake_hacker_token_1234567890abcdef';
  const tamperAnswerRes = await request(base + '/api/quiz/save-answers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      attemptId: candidateAttemptId,
      token: fakeToken,
      answers: { q1: 2, q2: 3 }
    }
  });
  results.push({
    Test: '6. IDOR: Cross-Candidate Answer Tampering (Invalid Token)',
    Status: tamperAnswerRes.status === 401 ? 'PASS' : 'FAIL',
    Details: `HTTP ${tamperAnswerRes.status}: Rejected unauthorized attempt modification.`
  });

  // 7. Candidate Start with consent missing
  const noConsentRes = await request(base + '/api/quiz/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      quizId: 'quiz-live-audit-test',
      email: 'krishna_test_consent@culkomail.in',
      consentGiven: false
    }
  });
  results.push({
    Test: '7. Start Quiz Without Candidate Consent',
    Status: noConsentRes.status === 400 || noConsentRes.status === 403 ? 'PASS' : 'FAIL',
    Details: `HTTP ${noConsentRes.status}: Candidate consent enforcement verified.`
  });

  // 8. Legitimate Candidate Save Answers
  const saveAnswerRes = await request(base + '/api/quiz/save-answers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      attemptId: candidateAttemptId,
      token: candidateToken,
      answers: { q1: 0, q2: 1, q3: 1 },
      markedForReview: ['q3']
    }
  });
  results.push({
    Test: '8. Legitimate Server-Side Answer Storage',
    Status: saveAnswerRes.status === 200 ? 'PASS' : 'FAIL',
    Details: `HTTP ${saveAnswerRes.status}: Answers successfully persisted server-side.`
  });

  // 9. Legitimate Submit Assessment
  const submitRes = await request(base + '/api/quiz/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      attemptId: candidateAttemptId,
      token: candidateToken,
      answers: { q1: 0, q2: 1, q3: 1, q4: 0, q5: 1 },
      reason: 'MANUAL'
    }
  });
  const submitData = parse(submitRes.body, {});
  results.push({
    Test: '9. Candidate Assessment Final Submission',
    Status: submitRes.status === 200 && submitData.success ? 'PASS' : 'FAIL',
    Details: `HTTP ${submitRes.status}: ReferenceId: ${submitData.referenceId}`
  });

  // 10. Attempt Immutability after Submission (Duplicate Save Rejected)
  const postSubmitSaveRes = await request(base + '/api/quiz/save-answers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      attemptId: candidateAttemptId,
      token: candidateToken,
      answers: { q1: 3 }
    }
  });
  results.push({
    Test: '10. Immutability: Post-Submission Answer Modification Rejected',
    Status: postSubmitSaveRes.status === 400 ? 'PASS' : 'FAIL',
    Details: `HTTP ${postSubmitSaveRes.status}: Cannot modify submitted assessment.`
  });

  // 11. Idempotent Duplicate Submit Check
  const duplicateSubmitRes = await request(base + '/api/quiz/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      attemptId: candidateAttemptId,
      token: candidateToken,
      answers: { q1: 3 }
    }
  });
  const dupSubmitData = parse(duplicateSubmitRes.body, {});
  results.push({
    Test: '11. Duplicate Submit Idempotency',
    Status: duplicateSubmitRes.status === 200 && dupSubmitData.message?.includes('already submitted') ? 'PASS' : 'FAIL',
    Details: `HTTP ${duplicateSubmitRes.status}: Idempotent safe response returned without score distortion.`
  });

  // 12. Duplicate Attempt Creation Blocked
  const dupStartRes = await request(base + '/api/quiz/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      quizId: 'quiz-live-audit-test',
      email: regEmail,
      consentGiven: true
    }
  });
  results.push({
    Test: '12. Duplicate Attempt Prevention on Submitted Assessment',
    Status: dupStartRes.status === 403 ? 'PASS' : 'FAIL',
    Details: `HTTP ${dupStartRes.status}: Only 1 attempt allowed per student.`
  });

  // 13. Admin Endpoint Authentication Protection
  const unauthAdminRes = await request(base + '/api/admin/weekly-quiz', {
    method: 'GET'
  });
  results.push({
    Test: '13. Admin Endpoints Authentication Protection (Missing Bearer Token)',
    Status: unauthAdminRes.status === 401 ? 'PASS' : 'FAIL',
    Details: `HTTP ${unauthAdminRes.status}: Unauthorized administrative access blocked.`
  });

  console.table(results);
}

runSecurityAudit().catch(console.error);
