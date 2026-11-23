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

async function runQuestionsAnswersAudit() {
  const base = 'https://www.awssbgcuup.tech';
  console.log('========================================================================');
  console.log('📝 SECTION 4: QUESTION RANDOMIZATION, PERMUTATIONS & SCORING AUDIT');
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

  // Set up quiz with 10 questions in bank, selecting 5 per attempt
  const questionBank = Array.from({ length: 10 }, (_, i) => ({
    id: `q_bank_${i + 1}`,
    question: `Question Number ${i + 1}: What is characteristic #${i + 1} of AWS?`,
    options: [`Choice A_${i+1}`, `Choice B_${i+1}`, `Choice C_${i+1}`, `Choice D_${i+1}`],
    correctOptionIndex: (i % 4),
    marks: 2
  }));

  const now = new Date();
  const quizPayload = {
    action: 'save-quiz',
    quiz: {
      id: 'quiz-randomization-audit',
      quizCode: 'AWS-RND-TEST',
      title: 'Question Randomization & Scoring Audit',
      topic: 'Randomization Engine',
      sessionId: 'event-1790339112799',
      scheduledDate: '2026-10-07',
      startTime: '18:00',
      endTime: '23:30',
      timezone: 'Asia/Kolkata',
      durationMinutes: 20,
      totalQuestionsToSelect: 5,
      passingPercentage: 60,
      status: 'Live',
      questionBank
    }
  };

  await request(base + '/api/admin/weekly-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: quizPayload
  });

  // Start attempt for Candidate 1 (Om Ruhela)
  // Let's create an attempt using another student or fresh email for testing
  const startCand1 = await request(base + '/api/quiz/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      quizId: 'quiz-randomization-audit',
      email: 'om.ruhela8659@gmail.com',
      studentName: 'Om Ruhela',
      consentGiven: true
    }
  });
  const dataCand1 = parse(startCand1.body, {});
  const questions1 = dataCand1.quiz?.questions || [];

  // Start attempt for Candidate 2 (Amar Chaudhary)
  const startCand2 = await request(base + '/api/quiz/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      quizId: 'quiz-randomization-audit',
      email: 'chaudharyamarchaudhary593@gmail.com',
      studentName: 'Amar Chaudhary',
      consentGiven: true
    }
  });
  const dataCand2 = parse(startCand2.body, {});
  const questions2 = dataCand2.quiz?.questions || [];

  // 1. Check question count selected
  results.push({
    Test: '1. Exact N Question Selection from Bank (5 selected from 10)',
    Status: questions1.length === 5 && questions2.length === 5 ? 'PASS' : 'FAIL',
    Details: `Candidate 1 Qs: ${questions1.length}, Candidate 2 Qs: ${questions2.length}`
  });

  // 2. Check no duplicate questions in candidate set
  const qIds1 = questions1.map(q => q.id);
  const hasDuplicates = new Set(qIds1).size !== qIds1.length;
  results.push({
    Test: '2. No Duplicate Questions in Candidate Assessment Set',
    Status: !hasDuplicates ? 'PASS' : 'FAIL',
    Details: `Unique Question IDs: ${new Set(qIds1).size} of ${qIds1.length}`
  });

  // 3. Check Option Shuffling (Per-attempt permutations)
  // Check if options order differs or matches randomized mapping without exposing raw answers
  const optionsSafe = questions1.every(q => !q.hasOwnProperty('correctOptionIndex') && !q.hasOwnProperty('correctAnswer'));
  results.push({
    Test: '3. Correct Answers Stripped in Delivery Payload',
    Status: optionsSafe ? 'PASS' : 'FAIL',
    Details: optionsSafe ? 'All questions delivered without correctOptionIndex.' : 'FAIL: Answer key exposed.'
  });

  // 4. Test Scoring Calculation with Shuffled Options Mapping
  // Let's submit answers for Candidate 1
  // We'll answer 3 questions correctly and 2 incorrectly based on the original options
  const answersCand1 = {};
  let expectedScore = 0;
  let totalPossible = 0;

  for (let i = 0; i < questions1.length; i++) {
    const q = questions1[i];
    const originalQ = questionBank.find(bq => bq.id === q.id);
    totalPossible += (originalQ.marks || 2);

    if (i < 3) {
      // Find which shuffled index corresponds to originalQ.correctOptionIndex
      const correctOriginalText = originalQ.options[originalQ.correctOptionIndex];
      const displayedIndex = q.options.indexOf(correctOriginalText);
      answersCand1[q.id] = displayedIndex;
      expectedScore += (originalQ.marks || 2);
    } else {
      // Answer incorrectly
      const wrongOriginalIndex = (originalQ.correctOptionIndex + 1) % originalQ.options.length;
      const wrongOriginalText = originalQ.options[wrongOriginalIndex];
      const displayedIndex = q.options.indexOf(wrongOriginalText);
      answersCand1[q.id] = displayedIndex;
    }
  }

  const submitCand1Res = await request(base + '/api/quiz/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      attemptId: dataCand1.attemptId,
      token: dataCand1.token,
      answers: answersCand1,
      reason: 'MANUAL'
    }
  });
  const submitCand1Data = parse(submitCand1Res.body, {});

  // Fetch admin candidate details to inspect calculated score
  const cand1DetailsRes = await request(base + `/api/admin/weekly-quiz?action=get-candidate-details&attemptId=${dataCand1.attemptId}`, {
    headers: { Authorization: 'Bearer ' + adminToken }
  });
  const cand1Details = parse(cand1DetailsRes.body, {}).candidate;

  const expectedPercentage = Math.round((expectedScore / totalPossible) * 100);
  const scoreMatches = cand1Details.score === expectedScore;
  const percentageMatches = cand1Details.percentage === expectedPercentage;

  results.push({
    Test: '4. Option Permutation Decoding & Authoritative Server Scoring',
    Status: scoreMatches && percentageMatches ? 'PASS' : 'FAIL',
    Details: `Expected Score: ${expectedScore}/${totalPossible} (${expectedPercentage}%), Server Scored: ${cand1Details.score}/${cand1Details.totalMarks} (${cand1Details.percentage}%)`
  });

  results.push({
    Test: '5. Pass/Fail Decision Logic (Passing %: 60%)',
    Status: (cand1Details.percentage >= 60) === cand1Details.passed ? 'PASS' : 'FAIL',
    Details: `Passed: ${cand1Details.passed} for ${cand1Details.percentage}% (Threshold: 60%)`
  });

  console.table(results);
}

runQuestionsAnswersAudit().catch(console.error);
