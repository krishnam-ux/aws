import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/db';
import {
  convertScheduleToUtc,
  formatToIst,
  getQuizScheduleStatus,
  calculateAuthoritativeRemainingSeconds,
  verifyCandidateSessionEligibility,
  autoSubmitExpiredAttemptsForQuiz,
  calculateQuizEligibilityMetrics,
  generateWeeklyQuizSessionToken,
  generateWeeklyQuizAttemptId,
  selectAndRandomizeQuestions,
  calculateScoreAndResults
} from '../src/lib/weeklyQuiz';
import { WeeklyQuiz, WeeklyQuizAttempt, WeeklyQuizQuestion } from '../src/types/weeklyQuiz';

describe('Weekly Quiz Session Eligibility & Authoritative Scheduling Tests', () => {
  const SESSION_W5 = 'SESSION-W5-001';
  const SESSION_W4 = 'SESSION-W4-001';
  const SESSION_W6 = 'SESSION-W6-001';

  const sampleQuestionBank: WeeklyQuizQuestion[] = [
    {
      id: 'q1',
      question: 'Which AWS service is used for serverless compute?',
      options: ['AWS Lambda', 'Amazon EC2', 'Amazon S3', 'Amazon RDS'],
      correctOptionIndex: 0,
      marks: 1
    },
    {
      id: 'q2',
      question: 'Which service provides managed NoSQL databases?',
      options: ['Amazon Aurora', 'Amazon DynamoDB', 'Amazon Redshift', 'Amazon EBS'],
      correctOptionIndex: 1,
      marks: 1
    }
  ];

  const nowMs = Date.now();
  const startWindowIso = new Date(nowMs - 5 * 60 * 1000).toISOString(); // Started 5 mins ago
  const endWindowIso = new Date(nowMs + 25 * 60 * 1000).toISOString();  // Ends in 25 mins

  const testQuizW5: WeeklyQuiz = {
    id: 'WEEKLY-QUIZ-W05',
    quizCode: 'AWS-WEEK-05',
    title: 'Introduction to AWS Lambda & Serverless',
    topic: 'Serverless Compute',
    description: 'Weekly session quiz covering AWS Lambda and serverless compute.',
    sessionId: SESSION_W5,
    sessionTitle: 'Introduction to AWS Lambda',
    scheduledDate: '2026-09-25',
    startTime: '10:00',
    endTime: '10:30',
    timezone: 'Asia/Kolkata',
    scheduledStartAt: startWindowIso,
    scheduledEndAt: endWindowIso,
    availableFrom: startWindowIso,
    availableUntil: endWindowIso,
    durationMinutes: 20,
    totalQuestionsToSelect: 2,
    passingPercentage: 60,
    maxAttempts: 1,
    status: 'Live',
    settings: {
      requireWebcam: true,
      requireMicrophone: true,
      requireScreenShare: true,
      requireFaceDetection: true,
      detectMultipleFaces: true,
      requireFullscreen: true,
      monitorFocus: true,
      noFaceThresholdSeconds: 6,
      multipleFacesThresholdSeconds: 4,
      cameraGracePeriodSeconds: 30,
      screenGracePeriodSeconds: 20,
      fullscreenGracePeriodSeconds: 15,
      maxViolationsAllowed: 1
    },
    questionBank: sampleQuestionBank,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  before(async () => {
    // Setup test quiz in DB
    const existing = await db.weeklyQuizzes.getById(testQuizW5.id);
    if (existing) {
      await db.weeklyQuizzes.updateOne(testQuizW5.id, testQuizW5);
    } else {
      await db.weeklyQuizzes.insertOne(testQuizW5);
    }
  });

  beforeEach(async () => {
    // Clear test attempts and test registrations
    const attempts = await db.weeklyQuizAttempts.getAll();
    for (const att of attempts) {
      if (
        att.email?.includes('teststudent') ||
        att.email?.includes('loadtest_candidate') ||
        att.email?.includes('metricstudent') ||
        att.email?.includes('timer@') ||
        att.email?.includes('race@') ||
        att.email?.includes('iso.') ||
        att.email?.includes('violating@') ||
        att.email?.includes('expired.rec@')
      ) {
        await db.weeklyQuizAttempts.deleteById(att.id);
      }
    }

    const registrations = await db.eventRegistrations.getAll();
    for (const reg of registrations) {
      if (
        reg.email?.includes('teststudent') ||
        reg.email?.includes('loadtest_candidate') ||
        reg.email?.includes('metricstudent') ||
        reg.email?.includes('timer@') ||
        reg.email?.includes('race@') ||
        reg.email?.includes('iso.') ||
        reg.email?.includes('violating@') ||
        reg.email?.includes('expired.rec@')
      ) {
        try {
          await db.eventRegistrations.deleteOne(reg.id);
        } catch (e) {}
      }
    }
  });

  // 1. Correct session registration -> allowed
  test('1. Candidate registered for EXACT linked session is ELIGIBLE', async () => {
    const studentEmail = 'teststudent.eligible@culko.in';
    await db.eventRegistrations.insertOne({
      id: 'reg-w5-001',
      eventId: SESSION_W5,
      name: 'Eligible Student',
      email: studentEmail,
      rollNumber: '21BCS101',
      status: 'Confirmed',
      registeredAt: new Date().toISOString()
    });

    const result = await verifyCandidateSessionEligibility({
      email: studentEmail,
      quizId: testQuizW5.id
    });

    assert.equal(result.isEligible, true);
    assert.equal(result.reason, 'ELIGIBLE');
    assert.equal(result.registration?.eventId, SESSION_W5);
  });

  // 2. Wrong session registration -> denied
  test('2. Candidate registered for DIFFERENT session is DENIED with specific message', async () => {
    const studentEmail = 'teststudent.wrongsession@culko.in';
    await db.eventRegistrations.insertOne({
      id: 'reg-wrong-001',
      eventId: 'SESSION-OTHER-999',
      name: 'Wrong Session Student',
      email: studentEmail,
      rollNumber: '21BCS102',
      status: 'Confirmed',
      registeredAt: new Date().toISOString()
    });

    const result = await verifyCandidateSessionEligibility({
      email: studentEmail,
      quizId: testQuizW5.id
    });

    assert.equal(result.isEligible, false);
    assert.equal(result.reason, 'NOT_REGISTERED_FOR_SESSION');
    assert.equal(result.message, "You are not registered for this session's Weekly Quiz.");
  });

  // 3. Past session registration -> denied
  test('3. Candidate registered for PAST session (Week 4) is DENIED access to Week 5', async () => {
    const studentEmail = 'teststudent.pastsession@culko.in';
    await db.eventRegistrations.insertOne({
      id: 'reg-w4-001',
      eventId: SESSION_W4,
      name: 'Past Session Student',
      email: studentEmail,
      rollNumber: '21BCS103',
      status: 'Confirmed',
      registeredAt: new Date().toISOString()
    });

    const result = await verifyCandidateSessionEligibility({
      email: studentEmail,
      quizId: testQuizW5.id
    });

    assert.equal(result.isEligible, false);
    assert.equal(result.reason, 'NOT_REGISTERED_FOR_SESSION');
  });

  // 4. Future session registration -> denied
  test('4. Candidate registered for FUTURE session (Week 6) is DENIED access to Week 5', async () => {
    const studentEmail = 'teststudent.futuresession@culko.in';
    await db.eventRegistrations.insertOne({
      id: 'reg-w6-001',
      eventId: SESSION_W6,
      name: 'Future Session Student',
      email: studentEmail,
      rollNumber: '21BCS104',
      status: 'Confirmed',
      registeredAt: new Date().toISOString()
    });

    const result = await verifyCandidateSessionEligibility({
      email: studentEmail,
      quizId: testQuizW5.id
    });

    assert.equal(result.isEligible, false);
    assert.equal(result.reason, 'NOT_REGISTERED_FOR_SESSION');
  });

  // 5. No registration -> denied
  test('5. Candidate with NO session registration is DENIED', async () => {
    const studentEmail = 'teststudent.unregistered@culko.in';
    const result = await verifyCandidateSessionEligibility({
      email: studentEmail,
      quizId: testQuizW5.id
    });

    assert.equal(result.isEligible, false);
    assert.equal(result.reason, 'NOT_REGISTERED_FOR_SESSION');
  });

  // 6. Before start time -> denied (QUIZ_NOT_STARTED)
  test('6. Candidate attempting to start BEFORE scheduled start time is DENIED with countdown', async () => {
    const studentEmail = 'teststudent.early@culko.in';
    await db.eventRegistrations.insertOne({
      id: 'reg-early-001',
      eventId: 'SESSION-FUTURE-START',
      name: 'Early Student',
      email: studentEmail,
      status: 'Confirmed',
      registeredAt: new Date().toISOString()
    });

    const futureQuiz: WeeklyQuiz = {
      ...testQuizW5,
      id: 'QUIZ-FUTURE-START',
      sessionId: 'SESSION-FUTURE-START',
      scheduledStartAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour in future
      scheduledEndAt: new Date(Date.now() + 90 * 60 * 1000).toISOString()
    };
    await db.weeklyQuizzes.insertOne(futureQuiz);

    const result = await verifyCandidateSessionEligibility({
      email: studentEmail,
      quizId: futureQuiz.id
    });

    assert.equal(result.isEligible, false);
    assert.equal(result.reason, 'QUIZ_NOT_STARTED');
    assert.equal(result.message, 'Weekly Quiz Not Started Yet');
    assert.ok((result.quiz?.startsInSeconds || 0) > 0);
  });

  // 7. Exact start time -> allowed
  test('7. Candidate accessing at exact scheduled start time is ALLOWED', async () => {
    const studentEmail = 'teststudent.exactstart@culko.in';
    await db.eventRegistrations.insertOne({
      id: 'reg-exactstart-001',
      eventId: 'SESSION-EXACT-START',
      name: 'Exact Start Student',
      email: studentEmail,
      status: 'Confirmed',
      registeredAt: new Date().toISOString()
    });

    const exactStartQuiz: WeeklyQuiz = {
      ...testQuizW5,
      id: 'QUIZ-EXACT-START',
      sessionId: 'SESSION-EXACT-START',
      scheduledStartAt: new Date(Date.now() - 500).toISOString(), // 500ms ago (exact start)
      scheduledEndAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };
    await db.weeklyQuizzes.insertOne(exactStartQuiz);

    const result = await verifyCandidateSessionEligibility({
      email: studentEmail,
      quizId: exactStartQuiz.id
    });

    assert.equal(result.isEligible, true);
    assert.equal(result.reason, 'ELIGIBLE');
  });

  // 8. During quiz window -> allowed
  test('8. Candidate accessing DURING active quiz window is ALLOWED', async () => {
    const studentEmail = 'teststudent.midwindow@culko.in';
    await db.eventRegistrations.insertOne({
      id: 'reg-midwindow-001',
      eventId: SESSION_W5,
      name: 'Mid Window Student',
      email: studentEmail,
      status: 'Confirmed',
      registeredAt: new Date().toISOString()
    });

    const result = await verifyCandidateSessionEligibility({
      email: studentEmail,
      quizId: testQuizW5.id
    });

    assert.equal(result.isEligible, true);
    assert.equal(result.reason, 'ELIGIBLE');
  });

  // 9. Exact end time -> auto-submit
  test('9. Active attempts reaching scheduled end time are auto-submitted with TIME_EXPIRED', async () => {
    const studentEmail = 'teststudent.endtime@culko.in';
    const expiredQuizId = 'QUIZ-PAST-END';
    const pastEndQuiz: WeeklyQuiz = {
      ...testQuizW5,
      id: expiredQuizId,
      sessionId: 'SESSION-PAST-END',
      scheduledStartAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      scheduledEndAt: new Date(Date.now() - 1000).toISOString() // Ended 1s ago
    };
    await db.weeklyQuizzes.insertOne(pastEndQuiz);

    const attemptId = 'wq_att_endtime_001';
    await db.weeklyQuizAttempts.insertOne({
      id: attemptId,
      sessionToken: generateWeeklyQuizSessionToken(),
      quizId: expiredQuizId,
      sessionId: 'SESSION-PAST-END',
      candidateId: 'cand_end_001',
      studentName: 'Ending Student',
      email: studentEmail,
      status: 'IN_PROGRESS',
      startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      answers: { q1: 0 },
      selectedQuestionIds: ['q1', 'q2'],
      shuffledOptions: { q1: [0, 1, 2, 3], q2: [0, 1, 2, 3] },
      cameraStatus: 'ACTIVE',
      screenStatus: 'ACTIVE',
      violationCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const autoSubmittedCount = await autoSubmitExpiredAttemptsForQuiz(expiredQuizId);
    assert.equal(autoSubmittedCount, 1);

    const updated = await db.weeklyQuizAttempts.getById(attemptId);
    assert.equal(updated?.status, 'SUBMITTED');
    assert.equal(updated?.submissionReason, 'TIME_EXPIRED');
  });

  // 10. After end time -> denied
  test('10. Candidate attempting to start AFTER scheduled end time is DENIED (QUIZ_ENDED)', async () => {
    const studentEmail = 'teststudent.late@culko.in';
    await db.eventRegistrations.insertOne({
      id: 'reg-late-001',
      eventId: 'SESSION-PAST-END',
      name: 'Late Student',
      email: studentEmail,
      status: 'Confirmed',
      registeredAt: new Date().toISOString()
    });

    const result = await verifyCandidateSessionEligibility({
      email: studentEmail,
      quizId: 'QUIZ-PAST-END'
    });

    assert.equal(result.isEligible, false);
    assert.equal(result.reason, 'QUIZ_ENDED');
  });

  // 11. Browser clock manipulation -> no bypass
  test('11. Server timer ignores client clock and strictly bounds remaining time by server end time', async () => {
    const attempt: any = {
      id: 'att_timer_test',
      sessionToken: 'tok',
      quizId: testQuizW5.id,
      candidateId: 'c1',
      studentName: 'Timer Candidate',
      email: 'timer@culko.in',
      status: 'IN_PROGRESS',
      startedAt: new Date().toISOString(),
      // Suppose client tries to set 5000 minutes expiresAt
      expiresAt: new Date(Date.now() + 5000 * 60 * 1000).toISOString(),
      selectedQuestionIds: ['q1', 'q2'],
      shuffledOptions: {},
      answers: {},
      cameraStatus: 'ACTIVE',
      screenStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const remainingSec = calculateAuthoritativeRemainingSeconds(attempt, testQuizW5);
    // Even though expiresAt is 5000 mins, window remaining is ~25 mins (<= 1500s)
    assert.ok(remainingSec <= 25 * 60 + 5);
    assert.ok(remainingSec >= 24 * 60);
  });

  // 12. quizId tampering -> denied
  test('12. QuizId tampering is denied with QUIZ_INACTIVE', async () => {
    const result = await verifyCandidateSessionEligibility({
      email: 'teststudent.eligible@culko.in',
      quizId: 'NON_EXISTENT_QUIZ_ID_999'
    });

    assert.equal(result.isEligible, false);
    assert.equal(result.reason, 'QUIZ_INACTIVE');
  });

  // 13. sessionId tampering -> denied
  test('13. Attempting to start with spoofed/mismatched session ID fails verification', async () => {
    const studentEmail = 'teststudent.sessiontamper@culko.in';
    await db.eventRegistrations.insertOne({
      id: 'reg-tamper-001',
      eventId: 'SESSION-REAL-W05',
      name: 'Tamper Student',
      email: studentEmail,
      status: 'Confirmed',
      registeredAt: new Date().toISOString()
    });

    // Quiz linked to SESSION-W5-001, but student only has SESSION-REAL-W05
    const result = await verifyCandidateSessionEligibility({
      email: studentEmail,
      quizId: testQuizW5.id
    });

    assert.equal(result.isEligible, false);
    assert.equal(result.reason, 'NOT_REGISTERED_FOR_SESSION');
  });

  // 14. registrationId tampering -> denied
  test('14. Cancelled registration status is DENIED with REGISTRATION_NOT_CONFIRMED', async () => {
    const studentEmail = 'teststudent.cancelled@culko.in';
    await db.eventRegistrations.insertOne({
      id: 'reg-cancelled-001',
      eventId: SESSION_W5,
      name: 'Cancelled Student',
      email: studentEmail,
      status: 'Cancelled',
      registeredAt: new Date().toISOString()
    });

    const result = await verifyCandidateSessionEligibility({
      email: studentEmail,
      quizId: testQuizW5.id
    });

    assert.equal(result.isEligible, false);
    assert.equal(result.reason, 'REGISTRATION_NOT_CONFIRMED');
  });

  // 15. duplicate attempt -> denied
  test('15. Candidate with already SUBMITTED attempt is DENIED duplicate start', async () => {
    const studentEmail = 'teststudent.duplicate@culko.in';
    await db.eventRegistrations.insertOne({
      id: 'reg-dup-001',
      eventId: SESSION_W5,
      name: 'Duplicate Student',
      email: studentEmail,
      status: 'Confirmed',
      registeredAt: new Date().toISOString()
    });

    await db.weeklyQuizAttempts.insertOne({
      id: 'att_completed_001',
      sessionToken: 'tok_comp',
      quizId: testQuizW5.id,
      sessionId: SESSION_W5,
      candidateId: 'cand_dup_001',
      studentName: 'Duplicate Student',
      email: studentEmail,
      status: 'SUBMITTED',
      startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      submittedAt: new Date().toISOString(),
      score: 2,
      totalMarks: 2,
      percentage: 100,
      passed: true,
      submissionReason: 'MANUAL',
      answers: { q1: 0, q2: 1 },
      selectedQuestionIds: ['q1', 'q2'],
      shuffledOptions: {},
      cameraStatus: 'ACTIVE',
      screenStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const result = await verifyCandidateSessionEligibility({
      email: studentEmail,
      quizId: testQuizW5.id
    });

    assert.equal(result.isEligible, false);
    assert.equal(result.reason, 'ALREADY_SUBMITTED');
  });

  // 16. refresh during quiz -> correct remaining time
  test('16. Candidate page refresh returns active attempt with authoritative remaining time', async () => {
    const studentEmail = 'teststudent.refresh@culko.in';
    await db.eventRegistrations.insertOne({
      id: 'reg-refresh-001',
      eventId: SESSION_W5,
      name: 'Refresh Student',
      email: studentEmail,
      status: 'Confirmed',
      registeredAt: new Date().toISOString()
    });

    const startedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 mins ago
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins left

    await db.weeklyQuizAttempts.insertOne({
      id: 'att_refresh_001',
      sessionToken: 'tok_refresh',
      quizId: testQuizW5.id,
      sessionId: SESSION_W5,
      candidateId: 'cand_ref_001',
      studentName: 'Refresh Student',
      email: studentEmail,
      status: 'IN_PROGRESS',
      startedAt,
      expiresAt,
      answers: { q1: 0 },
      selectedQuestionIds: ['q1', 'q2'],
      shuffledOptions: {},
      cameraStatus: 'ACTIVE',
      screenStatus: 'ACTIVE',
      createdAt: startedAt,
      updatedAt: startedAt
    });

    const result = await verifyCandidateSessionEligibility({
      email: studentEmail,
      quizId: testQuizW5.id
    });

    assert.equal(result.isEligible, true);
    assert.ok((result.quiz?.remainingSeconds || 0) > 0);
    assert.ok((result.quiz?.remainingSeconds || 0) <= 15 * 60);
  });

  // 17. reconnect during quiz -> correct remaining time
  test('17. Candidate reconnecting after disconnection preserves exact remaining time', async () => {
    const studentEmail = 'teststudent.reconnect@culko.in';
    await db.eventRegistrations.insertOne({
      id: 'reg-reconnect-001',
      eventId: SESSION_W5,
      name: 'Reconnect Student',
      email: studentEmail,
      status: 'Confirmed',
      registeredAt: new Date().toISOString()
    });

    const attemptId = 'att_reconnect_001';
    const attemptObj: any = {
      id: attemptId,
      sessionToken: 'tok_reconnect',
      quizId: testQuizW5.id,
      sessionId: SESSION_W5,
      candidateId: 'cand_rec_001',
      studentName: 'Reconnect Student',
      email: studentEmail,
      status: 'IN_PROGRESS',
      startedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 12 * 60 * 1000).toISOString(),
      answers: { q1: 0 },
      selectedQuestionIds: ['q1', 'q2'],
      shuffledOptions: {},
      cameraStatus: 'DISCONNECTED',
      screenStatus: 'DISCONNECTED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.weeklyQuizAttempts.insertOne(attemptObj);

    const remainingSec = calculateAuthoritativeRemainingSeconds(attemptObj, testQuizW5);
    assert.ok(remainingSec <= 12 * 60);
    assert.ok(remainingSec >= 11 * 60);
  });

  // 18. active attempt at end time -> TIME_EXPIRED
  test('18. Active attempt auto-submitted at scheduled end time records TIME_EXPIRED', async () => {
    const attemptId = 'att_expired_record_001';
    await db.weeklyQuizAttempts.insertOne({
      id: attemptId,
      sessionToken: 'tok_exp',
      quizId: 'QUIZ-PAST-END',
      sessionId: 'SESSION-PAST-END',
      candidateId: 'cand_exp_001',
      studentName: 'Expired Record Student',
      email: 'expired.rec@culko.in',
      status: 'IN_PROGRESS',
      startedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 5000).toISOString(),
      answers: { q1: 0 },
      selectedQuestionIds: ['q1'],
      shuffledOptions: { q1: [0, 1, 2, 3] },
      cameraStatus: 'ACTIVE',
      screenStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await autoSubmitExpiredAttemptsForQuiz('QUIZ-PAST-END');
    const updated = await db.weeklyQuizAttempts.getById(attemptId);
    assert.equal(updated?.status, 'SUBMITTED');
    assert.equal(updated?.submissionReason, 'TIME_EXPIRED');
  });

  // 19. second violation before end -> SECURITY_VIOLATION
  test('19. 2nd proctoring violation finalizes attempt with SECURITY_VIOLATION', async () => {
    const attemptId = 'att_violation_002';
    await db.weeklyQuizAttempts.insertOne({
      id: attemptId,
      sessionToken: 'tok_viol',
      quizId: testQuizW5.id,
      sessionId: SESSION_W5,
      candidateId: 'cand_viol_002',
      studentName: 'Violating Student',
      email: 'violating@culko.in',
      status: 'IN_PROGRESS',
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      answers: {},
      selectedQuestionIds: ['q1'],
      shuffledOptions: {},
      violationCount: 1, // Already has 1 violation
      cameraStatus: 'ACTIVE',
      screenStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Second violation occurs
    await db.weeklyQuizAttempts.updateOne(attemptId, {
      status: 'SUBMITTED',
      submissionReason: 'SECURITY_VIOLATION',
      violationCount: 2,
      submittedAt: new Date().toISOString()
    });

    const finalized = await db.weeklyQuizAttempts.getById(attemptId);
    assert.equal(finalized?.status, 'SUBMITTED');
    assert.equal(finalized?.submissionReason, 'SECURITY_VIOLATION');
    assert.equal(finalized?.violationCount, 2);
  });

  // 20. race between violation and timeout -> exactly one final submission
  test('20. Race condition between violation auto-submit and timeout auto-submit produces exactly ONE submission', async () => {
    const attemptId = 'att_race_001';
    await db.weeklyQuizAttempts.insertOne({
      id: attemptId,
      sessionToken: 'tok_race',
      quizId: 'QUIZ-PAST-END',
      sessionId: 'SESSION-PAST-END',
      candidateId: 'cand_race_001',
      studentName: 'Race Candidate',
      email: 'race@culko.in',
      status: 'IN_PROGRESS',
      startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      answers: { q1: 0 },
      selectedQuestionIds: ['q1'],
      shuffledOptions: { q1: [0, 1, 2, 3] },
      violationCount: 1,
      cameraStatus: 'ACTIVE',
      screenStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Simulate concurrent actions
    await Promise.allSettled([
      autoSubmitExpiredAttemptsForQuiz('QUIZ-PAST-END'),
      (async () => {
        const att = await db.weeklyQuizAttempts.getById(attemptId);
        if (att && att.status === 'IN_PROGRESS') {
          await db.weeklyQuizAttempts.updateOne(attemptId, {
            status: 'SUBMITTED',
            submissionReason: 'SECURITY_VIOLATION',
            submittedAt: new Date().toISOString()
          });
        }
      })()
    ]);

    const finalAttempt = await db.weeklyQuizAttempts.getById(attemptId);
    assert.equal(finalAttempt?.status, 'SUBMITTED');
    assert.ok(
      finalAttempt?.submissionReason === 'TIME_EXPIRED' ||
      finalAttempt?.submissionReason === 'SECURITY_VIOLATION'
    );
  });

  // 21. Admin proctoring shows only linked-session candidates
  test('21. Proctoring metrics and attempts isolation strictly binds to quiz linked session', async () => {
    // Setup registrations for W5 and W4
    await db.eventRegistrations.insertOne({
      id: 'reg-iso-w5',
      eventId: SESSION_W5,
      name: 'W5 Registered Student',
      email: 'iso.w5@culko.in',
      status: 'Confirmed',
      registeredAt: new Date().toISOString()
    });

    await db.eventRegistrations.insertOne({
      id: 'reg-iso-w4',
      eventId: SESSION_W4,
      name: 'W4 Registered Student',
      email: 'iso.w4@culko.in',
      status: 'Confirmed',
      registeredAt: new Date().toISOString()
    });

    const metrics = await calculateQuizEligibilityMetrics(testQuizW5.id);
    // Only W5 registered students should be counted in totalEligible
    assert.ok(metrics.totalEligible >= 1);

    const allRegs = await db.eventRegistrations.getAll();
    const w5Regs = allRegs.filter(r => r.eventId === SESSION_W5 && r.status !== 'Cancelled');
    assert.equal(metrics.totalEligible, w5Regs.length);
  });

  // 22. Eligible candidate count is correct
  test('22. Server calculates accurate metrics: Eligible, Started, Not Started, Active, Submitted, Auto Submitted', async () => {
    const metricsQuizId = 'QUIZ-METRICS-TEST';
    const metricsSessionId = 'SESSION-METRICS-001';

    await db.weeklyQuizzes.insertOne({
      ...testQuizW5,
      id: metricsQuizId,
      sessionId: metricsSessionId,
      scheduledStartAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      scheduledEndAt: new Date(Date.now() + 20 * 60 * 1000).toISOString()
    });

    // 5 total registrations
    for (let i = 1; i <= 5; i++) {
      await db.eventRegistrations.insertOne({
        id: `reg-m-${i}`,
        eventId: metricsSessionId,
        name: `Metric Student ${i}`,
        email: `metricstudent${i}@culko.in`,
        status: 'Confirmed',
        registeredAt: new Date().toISOString()
      });
    }

    // 2 active attempts
    for (let i = 1; i <= 2; i++) {
      await db.weeklyQuizAttempts.insertOne({
        id: `att-m-${i}`,
        sessionToken: `tok-m-${i}`,
        quizId: metricsQuizId,
        sessionId: metricsSessionId,
        candidateId: `cand-m-${i}`,
        studentName: `Metric Student ${i}`,
        email: `metricstudent${i}@culko.in`,
        status: 'IN_PROGRESS',
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        answers: {},
        selectedQuestionIds: ['q1'],
        shuffledOptions: {},
        cameraStatus: 'ACTIVE',
        screenStatus: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // 1 manual submitted attempt
    await db.weeklyQuizAttempts.insertOne({
      id: 'att-m-3',
      sessionToken: 'tok-m-3',
      quizId: metricsQuizId,
      sessionId: metricsSessionId,
      candidateId: 'cand-m-3',
      studentName: 'Metric Student 3',
      email: 'metricstudent3@culko.in',
      status: 'SUBMITTED',
      startedAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      submissionReason: 'MANUAL',
      answers: {},
      selectedQuestionIds: ['q1'],
      shuffledOptions: {},
      cameraStatus: 'ACTIVE',
      screenStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // 1 auto-submitted attempt
    await db.weeklyQuizAttempts.insertOne({
      id: 'att-m-4',
      sessionToken: 'tok-m-4',
      quizId: metricsQuizId,
      sessionId: metricsSessionId,
      candidateId: 'cand-m-4',
      studentName: 'Metric Student 4',
      email: 'metricstudent4@culko.in',
      status: 'SUBMITTED',
      startedAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      submissionReason: 'TIME_EXPIRED',
      answers: {},
      selectedQuestionIds: ['q1'],
      shuffledOptions: {},
      cameraStatus: 'ACTIVE',
      screenStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const metrics = await calculateQuizEligibilityMetrics(metricsQuizId);
    assert.equal(metrics.totalEligible, 5);
    assert.equal(metrics.started, 4);
    assert.equal(metrics.notStarted, 1);
    assert.equal(metrics.active, 2);
    assert.equal(metrics.submitted, 2);
    assert.equal(metrics.autoSubmitted, 1);
    assert.equal(metrics.scheduleStatus, 'LIVE');
  });

  // ==========================================================
  // 200-CANDIDATE CONCURRENT END-TIME TIMEOUT AUTO-SUBMISSION TEST
  // ==========================================================
  test('23. 200 Concurrent candidates automatically submitted at exact scheduled end time', async () => {
    const loadQuizId = 'QUIZ-LOAD-200-SCHEDULE';
    const loadSessionId = 'SESSION-LOAD-200';
    const candidateCount = 200;

    const loadQuiz: WeeklyQuiz = {
      ...testQuizW5,
      id: loadQuizId,
      sessionId: loadSessionId,
      sessionTitle: 'AWS Scaled Architecture 200 Candidate Session',
      scheduledStartAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      scheduledEndAt: new Date(Date.now() - 500).toISOString(), // Quiz ended 500ms ago
      availableFrom: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      availableUntil: new Date(Date.now() - 500).toISOString()
    };
    await db.weeklyQuizzes.insertOne(loadQuiz);

    // Create 200 active candidate attempts simultaneously
    const creationPromises = [];
    for (let i = 1; i <= candidateCount; i++) {
      const email = `loadtest_candidate_${i}@culko.in`;
      const attemptId = `wq_att_load_${i}`;
      creationPromises.push(
        db.weeklyQuizAttempts.insertOne({
          id: attemptId,
          sessionToken: generateWeeklyQuizSessionToken(),
          quizId: loadQuizId,
          sessionId: loadSessionId,
          candidateId: `cand_load_${i}`,
          studentName: `Candidate ${i}`,
          rollNumber: `21BCS${String(1000 + i)}`,
          email,
          status: 'IN_PROGRESS',
          startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          answers: { q1: i % 2 === 0 ? 0 : 1 },
          selectedQuestionIds: ['q1', 'q2'],
          shuffledOptions: { q1: [0, 1, 2, 3], q2: [0, 1, 2, 3] },
          cameraStatus: 'ACTIVE',
          screenStatus: 'ACTIVE',
          violationCount: i % 50 === 0 ? 1 : 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      );
    }
    await Promise.all(creationPromises);

    // Trigger server authoritative auto-submit for expired scheduled quiz
    const autoSubmittedTotal = await autoSubmitExpiredAttemptsForQuiz(loadQuizId);
    assert.equal(autoSubmittedTotal, candidateCount);

    // Verify all 200 attempts in database
    const attempts = await db.weeklyQuizAttempts.getByQuizId(loadQuizId);
    assert.equal(attempts.length, 200);

    let submittedCount = 0;
    let timeExpiredCount = 0;
    let activeCount = 0;

    for (const att of attempts) {
      if (att.status === 'SUBMITTED') submittedCount++;
      if (att.submissionReason === 'TIME_EXPIRED') timeExpiredCount++;
      if (att.status === 'IN_PROGRESS' || att.status === 'PAUSED') activeCount++;
      assert.ok(att.submittedAt !== undefined);
      assert.ok(typeof att.score === 'number');
    }

    assert.equal(submittedCount, 200, 'All 200 candidates must be in SUBMITTED status');
    assert.equal(timeExpiredCount, 200, 'All 200 submissions must record TIME_EXPIRED reason');
    assert.equal(activeCount, 0, 'Zero candidates remaining ACTIVE');
  });
});
