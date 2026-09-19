import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/db';
import {
  generateWeeklyQuizSessionToken,
  generateWeeklyQuizAttemptId,
  selectAndRandomizeQuestions,
  sanitizeQuestionsForStudent,
  calculateRemainingSeconds,
  calculateScoreAndResults,
  calculateIntegrityRating,
  logWeeklyQuizSecurityEvent,
  logWeeklyQuizAuditAction
} from '../src/lib/weeklyQuiz';
import {
  registerCandidateSignal,
  getCandidateSignalForStudent,
  getCandidateSignalForAdmin,
  registerAdminSignal
} from '../src/lib/webrtcSignaling';
import { FaceStatusTracker, FaceDetectionResult } from '../src/lib/faceDetection';
import { WeeklyQuiz, WeeklyQuizAttempt, WeeklyQuizQuestion } from '../src/types/weeklyQuiz';

test('Weekly Quiz Proctoring System Test Suite', async (t) => {

  // Test 1: Seed data and collection accessibility
  await t.test('1. Database Collections & Default Weekly Quiz Initialization', async () => {
    const quizzes = await db.weeklyQuizzes.getAll();
    assert.ok(Array.isArray(quizzes), 'Quizzes collection should be an array');
    assert.ok(quizzes.length >= 1, 'Should have at least 1 default weekly quiz');

    const defaultQuiz = quizzes.find(q => q.id === 'quiz-aws-week-01');
    assert.ok(defaultQuiz, 'Default Weekly AWS Quiz #01 should exist');
    assert.equal(defaultQuiz.quizCode, 'AWS-WEEK-01');
    assert.equal(defaultQuiz.durationMinutes, 20);
    assert.equal(defaultQuiz.maxAttempts, 1);
    assert.ok(defaultQuiz.questionBank.length >= 20, 'Question bank should have at least 20 questions');
    assert.equal(defaultQuiz.settings.requireWebcam, true);
    assert.equal(defaultQuiz.settings.requireFaceDetection, true);
  });

  // Test 2: Server-side question selection, option randomization & client sanitization
  await t.test('2. Question Bank Randomization & Anti-Leak Sanitization', async () => {
    const quiz = await db.weeklyQuizzes.getById('quiz-aws-week-01');
    assert.ok(quiz);

    const { selectedQuestionIds, shuffledOptions } = selectAndRandomizeQuestions(quiz.questionBank, 10);
    assert.equal(selectedQuestionIds.length, 10, 'Should select exactly 10 questions');
    assert.equal(Object.keys(shuffledOptions).length, 10, 'Should have shuffled options mapping for all 10');

    // Sanitize for student
    const sanitized = sanitizeQuestionsForStudent(selectedQuestionIds, shuffledOptions, quiz.questionBank);
    assert.equal(sanitized.length, 10);

    for (const sq of sanitized) {
      assert.ok(sq.id, 'Question must have id');
      assert.ok(sq.question, 'Question must have text');
      assert.ok(Array.isArray(sq.options), 'Options must be an array');
      assert.equal(sq.options.length, 4, 'Options must have 4 choices');
      // Anti-leak verification: correctOptionIndex and explanation MUST NOT be present
      assert.equal((sq as any).correctOptionIndex, undefined, 'correctOptionIndex must NOT be sent to student');
      assert.equal((sq as any).explanation, undefined, 'explanation must NOT be sent to student');
    }
  });

  // Test 3: Candidate Attempt Lifecycle, Authoritative Scoring & Pass/Fail
  await t.test('3. Candidate Attempt Lifecycle, Scoring & Option De-shuffling', async () => {
    const quiz = await db.weeklyQuizzes.getById('quiz-aws-week-01');
    assert.ok(quiz);

    const token = generateWeeklyQuizSessionToken();
    const attemptId = generateWeeklyQuizAttemptId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 20 * 60 * 1000).toISOString();

    const { selectedQuestionIds, shuffledOptions } = selectAndRandomizeQuestions(quiz.questionBank, 5);

    const attempt: WeeklyQuizAttempt = {
      id: attemptId,
      quizId: quiz.id,
      candidateId: 'cand_test_student_01',
      studentName: 'Test Student',
      rollNumber: '23BCS9999',
      email: 'teststudent@cumail.in',
      sessionToken: token,
      status: 'IN_PROGRESS',
      selectedQuestionIds,
      shuffledOptions,
      answers: {},
      markedForReview: [],
      score: 0,
      totalMarks: 0,
      percentage: 0,
      passed: false,
      startedAt: now.toISOString(),
      expiresAt,
      extendedMinutes: 0,
      cameraStatus: 'ACTIVE',
      faceStatus: 'ONE_FACE',
      focusStatus: 'FOCUSED',
      fullscreenStatus: 'FULLSCREEN',
      integritySummary: {
        cameraStatus: 'ACTIVE',
        faceStatus: 'ONE_FACE',
        focusStatus: 'FOCUSED',
        fullscreenStatus: 'FULLSCREEN',
        faceEventsCount: 0,
        focusEventsCount: 0,
        securityEventsCount: 0,
        reconnectsCount: 0,
        integrityRating: 'NORMAL'
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    await db.weeklyQuizAttempts.insertOne(attempt);

    // Candidate answers all 5 questions correctly (finding displayed index mapped to original correctOptionIndex)
    const simulatedAnswers: Record<string, number> = {};
    for (const qId of selectedQuestionIds) {
      const originalQ = quiz.questionBank.find((q: WeeklyQuizQuestion) => q.id === qId);
      assert.ok(originalQ);
      const perm = shuffledOptions[qId];
      const displayedIndex = perm.indexOf(originalQ.correctOptionIndex);
      simulatedAnswers[qId] = displayedIndex;
    }

    const completedAttempt: WeeklyQuizAttempt = {
      ...attempt,
      answers: simulatedAnswers
    };

    const results = calculateScoreAndResults(completedAttempt, quiz);
    assert.equal(results.percentage, 100, 'Score should be 100% when all correct options selected');
    assert.equal(results.passed, true, 'Should pass when score >= 60%');

    // Clean up test attempt
    await db.weeklyQuizAttempts.deleteById(attemptId);
  });

  // Test 4: WebRTC Signaling, Peer Exchange & Candidate Stream Isolation
  await t.test('4. WebRTC Signaling Session & Candidate Stream Isolation', async () => {
    const attemptIdA = 'wq_att_test_candidate_a';
    const attemptIdB = 'wq_att_test_candidate_b';

    // Candidate A registers WebRTC Offer and preview frame
    const mockOfferA = { type: 'offer', sdp: 'v=0\r\no=candidateA 1234 1 IN IP4 127.0.0.1...' };
    const mockPreviewA = 'data:image/jpeg;base64,mockPreviewAData...';

    registerCandidateSignal({
      attemptId: attemptIdA,
      candidateId: 'cand_a',
      studentName: 'Candidate A',
      quizId: 'quiz-aws-week-01',
      offer: mockOfferA,
      previewFrame: mockPreviewA,
      cameraActive: true
    });

    // Admin fetches Candidate A signaling data
    const adminSignalA = getCandidateSignalForAdmin(attemptIdA);
    assert.ok(adminSignalA, 'Admin should retrieve candidate A signaling channel');
    assert.equal(adminSignalA.offer.sdp, mockOfferA.sdp);
    assert.equal(adminSignalA.previewFrame, mockPreviewA);

    // Admin registers WebRTC Answer for Candidate A
    const mockAnswer = { type: 'answer', sdp: 'v=0\r\no=adminProctor 5678 1 IN IP4 127.0.0.1...' };
    registerAdminSignal({
      attemptId: attemptIdA,
      answer: mockAnswer
    });

    // Candidate A receives Admin Answer
    const studentSignalA = getCandidateSignalForStudent(attemptIdA);
    assert.ok(studentSignalA.answer);
    assert.equal(studentSignalA.answer.sdp, mockAnswer.sdp);

    // Candidate Isolation Verification: Candidate B cannot access Candidate A's answer
    const studentSignalB = getCandidateSignalForStudent(attemptIdB);
    assert.equal(studentSignalB.answer, undefined, 'Candidate B must not receive Candidate A answer');
  });

  // Test 5: Client-Side Privacy-Preserving Face Status Tracker & Debouncing
  await t.test('5. Privacy-Preserving Face Status Tracker Debounce & Transitions', async () => {
    let noFaceTriggered = false;
    let multipleFacesTriggered = false;
    let recoveredTriggered = false;

    const tracker = new FaceStatusTracker({
      noFaceThresholdSeconds: 2,
      multipleFacesThresholdSeconds: 2,
      onNoFaceDetected: () => { noFaceTriggered = true; },
      onMultipleFacesDetected: () => { multipleFacesTriggered = true; },
      onFaceRecovered: () => { recoveredTriggered = true; }
    });

    // 1. Initial 1 face detection
    const res1 = tracker.update({ status: 'ONE_FACE', count: 1, confidence: 0.9 });
    assert.equal(res1.currentStatus, 'ONE_FACE');
    assert.equal(noFaceTriggered, false);

    // 2. Momentary glitch (No face for 0.5s) should NOT trigger alert immediately
    const res2 = tracker.update({ status: 'NO_FACE', count: 0, confidence: 0.8 });
    assert.equal(res2.currentStatus, 'NO_FACE');
    assert.equal(noFaceTriggered, false, 'Momentary drop should not trigger alert before threshold');

    // 3. Reappearance restores ONE_FACE without alert
    const res3 = tracker.update({ status: 'ONE_FACE', count: 1, confidence: 0.9 });
    assert.equal(res3.currentStatus, 'ONE_FACE');
    assert.equal(noFaceTriggered, false);
  });

  // Test 6: Security & Integrity Event Logging with Status Updates
  await t.test('6. Security Event Logging & Integrity Summary Rating', async () => {
    const attemptId = 'wq_att_test_sec_events';
    const testAttempt: WeeklyQuizAttempt = {
      id: attemptId,
      quizId: 'quiz-aws-week-01',
      candidateId: 'cand_test_02',
      studentName: 'Integrity Test Candidate',
      rollNumber: '23BCS1234',
      email: 'integritytest@cumail.in',
      sessionToken: 'token_sec_test',
      status: 'IN_PROGRESS',
      selectedQuestionIds: ['wq-01'],
      shuffledOptions: { 'wq-01': [0, 1, 2, 3] },
      answers: {},
      markedForReview: [],
      score: 0,
      totalMarks: 5,
      percentage: 0,
      passed: false,
      cameraStatus: 'ACTIVE',
      faceStatus: 'ONE_FACE',
      focusStatus: 'FOCUSED',
      fullscreenStatus: 'FULLSCREEN',
      integritySummary: {
        cameraStatus: 'ACTIVE',
        faceStatus: 'ONE_FACE',
        focusStatus: 'FOCUSED',
        fullscreenStatus: 'FULLSCREEN',
        faceEventsCount: 0,
        focusEventsCount: 0,
        securityEventsCount: 0,
        reconnectsCount: 0,
        integrityRating: 'NORMAL'
      },
      extendedMinutes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.weeklyQuizAttempts.insertOne(testAttempt);

    // Log Tab Focus Lost event
    await logWeeklyQuizSecurityEvent({
      attemptId,
      quizId: 'quiz-aws-week-01',
      candidateId: 'cand_test_02',
      studentName: 'Integrity Test Candidate',
      email: 'integritytest@cumail.in',
      eventType: 'TAB_FOCUS_LOST',
      severity: 'WARNING'
    });

    let updatedAttempt = await db.weeklyQuizAttempts.getById(attemptId);
    assert.equal(updatedAttempt.focusStatus, 'UNFOCUSED');

    // Log Tab Focus Restored event
    await logWeeklyQuizSecurityEvent({
      attemptId,
      quizId: 'quiz-aws-week-01',
      candidateId: 'cand_test_02',
      studentName: 'Integrity Test Candidate',
      email: 'integritytest@cumail.in',
      eventType: 'TAB_FOCUS_RESTORED',
      severity: 'INFO'
    });

    updatedAttempt = await db.weeklyQuizAttempts.getById(attemptId);
    assert.equal(updatedAttempt.focusStatus, 'FOCUSED');

    // Verify Integrity Rating remains objective ('NORMAL' / 'ATTENTION', NEVER 'CHEATER')
    const events = await db.weeklyQuizSecurityEvents.getByAttemptId(attemptId);
    const integrity = calculateIntegrityRating(events, updatedAttempt);
    assert.ok(['NORMAL', 'ATTENTION', 'REVIEW_REQUIRED'].includes(integrity.integrityRating));
    assert.notEqual(integrity.integrityRating, 'CHEATER');

    // Clean up
    await db.weeklyQuizAttempts.deleteById(attemptId);
  });

  // Test 7: Admin Live Controls & Audit Logging
  await t.test('7. Admin Live Controls & Audit Trail Logging', async () => {
    const attemptId = 'wq_att_test_admin_ctrl';
    const testAttempt: WeeklyQuizAttempt = {
      id: attemptId,
      quizId: 'quiz-aws-week-01',
      candidateId: 'cand_admin_ctrl',
      studentName: 'Admin Control Candidate',
      rollNumber: '23BCS8888',
      email: 'adminctrl@cumail.in',
      sessionToken: 'token_admin_ctrl',
      status: 'IN_PROGRESS',
      selectedQuestionIds: ['wq-01'],
      shuffledOptions: { 'wq-01': [0, 1, 2, 3] },
      answers: {},
      markedForReview: [],
      score: 0,
      totalMarks: 5,
      percentage: 0,
      passed: false,
      cameraStatus: 'ACTIVE',
      faceStatus: 'ONE_FACE',
      focusStatus: 'FOCUSED',
      fullscreenStatus: 'FULLSCREEN',
      integritySummary: {
        cameraStatus: 'ACTIVE',
        faceStatus: 'ONE_FACE',
        focusStatus: 'FOCUSED',
        fullscreenStatus: 'FULLSCREEN',
        faceEventsCount: 0,
        focusEventsCount: 0,
        securityEventsCount: 0,
        reconnectsCount: 0,
        integrityRating: 'NORMAL'
      },
      extendedMinutes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.weeklyQuizAttempts.insertOne(testAttempt);

    // Admin pauses quiz
    await db.weeklyQuizAttempts.updateOne(attemptId, {
      status: 'PAUSED',
      pausedRemainingSeconds: 600
    });

    const pausedLog = await logWeeklyQuizAuditAction({
      quizId: 'quiz-aws-week-01',
      attemptId,
      adminUser: 'awsadmin@culko.in',
      action: 'PAUSE_QUIZ',
      details: { remainingSeconds: 600 }
    });

    assert.equal(pausedLog.action, 'PAUSE_QUIZ');
    assert.equal(pausedLog.adminUser, 'awsadmin@culko.in');

    const pausedAttempt = await db.weeklyQuizAttempts.getById(attemptId);
    assert.equal(pausedAttempt.status, 'PAUSED');

    // Admin extends time by 5 minutes
    await db.weeklyQuizAttempts.updateOne(attemptId, {
      extendedMinutes: 5
    });

    await logWeeklyQuizAuditAction({
      quizId: 'quiz-aws-week-01',
      attemptId,
      adminUser: 'awsadmin@culko.in',
      action: 'EXTEND_TIME',
      details: { extraMinutes: 5 }
    });

    const extendedAttempt = await db.weeklyQuizAttempts.getById(attemptId);
    assert.equal(extendedAttempt.extendedMinutes, 5);

    // Clean up
    await db.weeklyQuizAttempts.deleteById(attemptId);
  });

  // Test 8: Isolation & Non-Regression of Existing Certification Exam System
  await t.test('8. Certification Exam System Architecture Isolation & Non-Regression', async () => {
    // Verify existing exam database collections and types remain 100% intact
    const exams = await db.exams.getAll();
    assert.ok(Array.isArray(exams), 'Existing exams must be an array');
    assert.ok(exams.some(e => e.id === 'exam-aws-ccp-01'), 'AWS-CCP-01 certification exam must be untouched');

    const examCandidates = await db.examCandidates.getAll();
    assert.ok(Array.isArray(examCandidates), 'Existing exam candidates must remain intact');

    const examAttempts = await db.examAttempts.getAll();
    assert.ok(Array.isArray(examAttempts), 'Existing exam attempts must remain intact');
  });

  // Test 9: Two-Violation Policy (1st = Warning, 2nd = Auto-Submission)
  await t.test('9. Two-Violation Server-Authoritative Policy Enforcement', async () => {
    const attemptId = `wq_test_viol_${Date.now()}`;
    const token = 'wq_token_viol_test';

    const testAttempt: WeeklyQuizAttempt = {
      id: attemptId,
      quizId: 'quiz-aws-week-01',
      candidateId: 'cand_viol_test',
      studentName: 'Violation Test Candidate',
      rollNumber: '23BCS7777',
      email: 'violtest@cumail.in',
      sessionToken: token,
      status: 'IN_PROGRESS',
      selectedQuestionIds: ['wq-01'],
      shuffledOptions: { 'wq-01': [0, 1, 2, 3] },
      answers: {},
      markedForReview: [],
      score: 0,
      totalMarks: 5,
      percentage: 0,
      passed: false,
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 20 * 60000).toISOString(),
      extendedMinutes: 0,
      cameraStatus: 'ACTIVE',
      screenStatus: 'ACTIVE',
      faceStatus: 'ONE_FACE',
      focusStatus: 'FOCUSED',
      fullscreenStatus: 'FULLSCREEN',
      connectionStatus: 'CONNECTED',
      violationCount: 0,
      violationHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.weeklyQuizAttempts.insertOne(testAttempt);

    // 1st Violation: Screen Share Interrupted
    const res1 = await logWeeklyQuizSecurityEvent({
      attemptId,
      quizId: 'quiz-aws-week-01',
      candidateId: 'cand_viol_test',
      studentName: 'Violation Test Candidate',
      email: 'violtest@cumail.in',
      eventType: 'SCREEN_SHARE_STOPPED',
      severity: 'CRITICAL',
      metadata: { reason: 'Candidate stopped sharing screen' }
    });

    assert.equal(res1.isWarning, true, 'First violation must trigger a warning');
    assert.equal(res1.isAutoSubmitted, false, 'First violation must NOT auto-submit');
    assert.equal(res1.violationCount, 1, 'Violation count should be 1');
    assert.ok(res1.message?.includes('Warning (1/2)'), 'Message should indicate Warning 1/2');

    const updatedAfter1 = await db.weeklyQuizAttempts.getById(attemptId);
    assert.equal(updatedAfter1.status, 'IN_PROGRESS', 'Attempt should still be IN_PROGRESS after violation 1');
    assert.equal(updatedAfter1.violationCount, 1);
    assert.equal(updatedAfter1.screenStatus, 'DISCONNECTED');

    // 2nd Violation: Tab Switch / Blur
    const res2 = await logWeeklyQuizSecurityEvent({
      attemptId,
      quizId: 'quiz-aws-week-01',
      candidateId: 'cand_viol_test',
      studentName: 'Violation Test Candidate',
      email: 'violtest@cumail.in',
      eventType: 'TAB_FOCUS_LOST',
      severity: 'WARNING',
      metadata: { reason: 'Candidate switched tabs' }
    });

    assert.equal(res2.isWarning, false, 'Second violation is not just a warning');
    assert.equal(res2.isAutoSubmitted, true, 'Second violation MUST trigger automatic submission');
    assert.equal(res2.violationCount, 2, 'Violation count should be 2');

    const updatedAfter2 = await db.weeklyQuizAttempts.getById(attemptId);
    assert.equal(updatedAfter2.status, 'SUBMITTED', 'Attempt must be SUBMITTED after 2nd violation');
    assert.equal(updatedAfter2.submissionReason, 'SECURITY_VIOLATION');
    assert.ok(updatedAfter2.submittedAt, 'Must have submittedAt timestamp');

    // Clean up
    await db.weeklyQuizAttempts.deleteById(attemptId);
  });

  // Test 10: Dual WebRTC Signaling & Telemetry Frames
  await t.test('10. Dual-Stream WebRTC Signaling (Camera + Screen) & Preview Telemetry', async () => {
    const attemptId = `wq_test_webrtc_dual_${Date.now()}`;
    const token = 'token_dual_webrtc';

    const testAttempt: WeeklyQuizAttempt = {
      id: attemptId,
      quizId: 'quiz-aws-week-01',
      candidateId: 'cand_dual_webrtc',
      studentName: 'Dual WebRTC Student',
      rollNumber: '23BCS6666',
      email: 'dualwebrtc@cumail.in',
      sessionToken: token,
      status: 'IN_PROGRESS',
      selectedQuestionIds: ['wq-01'],
      shuffledOptions: { 'wq-01': [0, 1, 2, 3] },
      answers: {},
      markedForReview: [],
      score: 0,
      totalMarks: 5,
      percentage: 0,
      passed: false,
      cameraStatus: 'ACTIVE',
      screenStatus: 'ACTIVE',
      faceStatus: 'ONE_FACE',
      focusStatus: 'FOCUSED',
      fullscreenStatus: 'FULLSCREEN',
      connectionStatus: 'CONNECTED',
      violationCount: 0,
      violationHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.weeklyQuizAttempts.insertOne(testAttempt);

    // Candidate registers dual signals: Camera Offer + Screen Offer + Preview Frames
    const candidateChannel = registerCandidateSignal({
      attemptId,
      candidateId: 'cand_dual_webrtc',
      studentName: 'Dual WebRTC Student',
      email: 'dualwebrtc@cumail.in',
      quizId: 'quiz-aws-week-01',
      offer: { type: 'offer', sdp: 'v=0\r\no=camera 123456\r\n' },
      screenOffer: { type: 'offer', sdp: 'v=0\r\no=screen 789101\r\n' },
      cameraPreviewFrame: 'data:image/jpeg;base64,/9j/camFrame',
      screenPreviewFrame: 'data:image/jpeg;base64,/9j/screenFrame',
      cameraActive: true,
      screenActive: true,
      connectionStatus: 'CONNECTED'
    });

    assert.ok(candidateChannel, 'Channel registered');
    assert.equal(candidateChannel.offer.sdp, 'v=0\r\no=camera 123456\r\n');
    assert.equal(candidateChannel.screenOffer.sdp, 'v=0\r\no=screen 789101\r\n');
    assert.equal(candidateChannel.cameraPreviewFrame, 'data:image/jpeg;base64,/9j/camFrame');
    assert.equal(candidateChannel.screenPreviewFrame, 'data:image/jpeg;base64,/9j/screenFrame');

    // Admin fetches signals
    const adminSignal = getCandidateSignalForAdmin(attemptId);
    assert.ok(adminSignal);
    assert.equal(adminSignal.cameraActive, true);
    assert.equal(adminSignal.screenActive, true);

    // Admin registers dual answers
    registerAdminSignal({
      attemptId,
      answer: { type: 'answer', sdp: 'v=0\r\no=camAnswer 111\r\n' },
      screenAnswer: { type: 'answer', sdp: 'v=0\r\no=scrAnswer 222\r\n' }
    });

    // Student retrieves admin answers
    const studentSignal = getCandidateSignalForStudent(attemptId);
    assert.equal(studentSignal.answer.sdp, 'v=0\r\no=camAnswer 111\r\n');
    assert.equal(studentSignal.screenAnswer.sdp, 'v=0\r\no=scrAnswer 222\r\n');

    // Clean up
    await db.weeklyQuizAttempts.deleteById(attemptId);
  });
});
