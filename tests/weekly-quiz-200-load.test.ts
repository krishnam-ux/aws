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
  logWeeklyQuizSecurityEvent
} from '../src/lib/weeklyQuiz';
import {
  registerCandidateSignal,
  getCandidateSignalForStudent,
  getCandidateSignalForAdmin,
  registerAdminSignal
} from '../src/lib/webrtcSignaling';
import { WeeklyQuiz, WeeklyQuizAttempt } from '../src/types/weeklyQuiz';

interface StageMetrics {
  stage: number;
  concurrency: number;
  totalOps: number;
  successOps: number;
  failedOps: number;
  durationMs: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  maxLatencyMs: number;
  heapUsedMB: number;
}

const allStageMetrics: StageMetrics[] = [];

function computePercentiles(latencies: number[]) {
  if (latencies.length === 0) return { avg: 0, p95: 0, p99: 0, max: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const avg = Math.round((sum / sorted.length) * 100) / 100;
  const p95Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  const p99Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99));
  return {
    avg,
    p95: Math.round(sorted[p95Idx] * 100) / 100,
    p99: Math.round(sorted[p99Idx] * 100) / 100,
    max: Math.round(sorted[sorted.length - 1] * 100) / 100
  };
}

async function runCandidateLifecycle(
  candidateIndex: number,
  quiz: WeeklyQuiz,
  stage: number,
  latencies: number[]
): Promise<{ success: boolean; attemptId: string; error?: string }> {
  const opStart = performance.now();
  const email = `load_s${stage}_cand_${candidateIndex}_${Date.now()}@cumail.in`;
  const name = `Load Candidate S${stage}-${candidateIndex}`;
  const roll = `23BCS${String(1000 + candidateIndex).padStart(4, '0')}`;
  const attemptId = generateWeeklyQuizAttemptId();
  const token = generateWeeklyQuizSessionToken();

  try {
    // 1. Question Bank Randomization & Sanitization
    const { selectedQuestionIds, shuffledOptions } = selectAndRandomizeQuestions(
      quiz.questionBank,
      quiz.totalQuestionsToSelect || 20
    );
    const sanitized = sanitizeQuestionsForStudent(selectedQuestionIds, shuffledOptions, quiz.questionBank);
    assert.equal(sanitized.length, Math.min(quiz.totalQuestionsToSelect || 20, quiz.questionBank.length));

    // 2. Insert Attempt Record
    const now = new Date();
    const expiresAt = new Date(now.getTime() + quiz.durationMinutes * 60000).toISOString();

    const attempt: WeeklyQuizAttempt = {
      id: attemptId,
      quizId: quiz.id,
      candidateId: `cand_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
      studentName: name,
      rollNumber: roll,
      email,
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
      screenStatus: 'ACTIVE',
      faceStatus: 'ONE_FACE',
      focusStatus: 'FOCUSED',
      fullscreenStatus: 'FULLSCREEN',
      connectionStatus: 'CONNECTED',
      violationCount: 0,
      violationHistory: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    await db.weeklyQuizAttempts.insertOne(attempt);

    // 3. Register Dual WebRTC Signals & Telemetry Frames
    registerCandidateSignal({
      attemptId,
      candidateId: attempt.candidateId,
      studentName: name,
      email,
      quizId: quiz.id,
      offer: { type: 'offer', sdp: `v=0\r\no=cam_${attemptId}\r\n` },
      screenOffer: { type: 'offer', sdp: `v=0\r\no=screen_${attemptId}\r\n` },
      cameraPreviewFrame: 'data:image/jpeg;base64,/9j/camThumb',
      screenPreviewFrame: 'data:image/jpeg;base64,/9j/scrThumb',
      cameraActive: true,
      screenActive: true,
      connectionStatus: 'CONNECTED',
      violationCount: 0
    });

    // 4. Proctor Admin Response Signaling
    registerAdminSignal({
      attemptId,
      answer: { type: 'answer', sdp: `v=0\r\no=camAns_${attemptId}\r\n` },
      screenAnswer: { type: 'answer', sdp: `v=0\r\no=scrAns_${attemptId}\r\n` }
    });

    // 5. Answer 5-10 questions with progressive autosaves
    const answersToSave: Record<string, number> = {};
    for (let i = 0; i < Math.min(8, selectedQuestionIds.length); i++) {
      const qId = selectedQuestionIds[i];
      answersToSave[qId] = i % 4; // pick an option
    }

    await db.weeklyQuizAttempts.updateOne(attemptId, {
      answers: answersToSave,
      markedForReview: [selectedQuestionIds[0]],
      updatedAt: new Date().toISOString()
    });

    // 6. Proctoring Security Events & Telemetry
    await logWeeklyQuizSecurityEvent({
      attemptId,
      quizId: quiz.id,
      candidateId: attempt.candidateId,
      studentName: name,
      email,
      eventType: 'FACE_DETECTED',
      severity: 'INFO'
    });

    // For 10% of candidates, test 1 violation (Warning)
    if (candidateIndex % 10 === 0) {
      const vResult = await logWeeklyQuizSecurityEvent({
        attemptId,
        quizId: quiz.id,
        candidateId: attempt.candidateId,
        studentName: name,
        email,
        eventType: 'TAB_FOCUS_LOST',
        severity: 'WARNING',
        metadata: { reason: 'Simulated tab blur during load test' }
      });
      assert.equal(vResult.isWarning, true, '1st violation must return warning');
      assert.equal(vResult.violationCount, 1);
    }

    // 7. Authoritative Scoring & Final Submission
    const currentAttempt = await db.weeklyQuizAttempts.getById(attemptId);
    assert.ok(currentAttempt, 'Attempt must exist in database');

    const scoreResults = calculateScoreAndResults(currentAttempt, quiz);
    const events = await db.weeklyQuizSecurityEvents.getByAttemptId(attemptId);
    const integritySummary = calculateIntegrityRating(events, currentAttempt);

    await db.weeklyQuizAttempts.updateOne(attemptId, {
      status: 'SUBMITTED',
      score: scoreResults.score,
      totalMarks: scoreResults.totalMarks,
      percentage: scoreResults.percentage,
      passed: scoreResults.passed,
      submittedAt: new Date().toISOString(),
      submissionReason: 'MANUAL',
      integritySummary,
      updatedAt: new Date().toISOString()
    });

    // 8. Verify Submission & Candidate Data Isolation
    const finalRecord = await db.weeklyQuizAttempts.getById(attemptId);
    assert.equal(finalRecord?.status, 'SUBMITTED');
    assert.equal(finalRecord?.email, email);
    assert.equal(Object.keys(finalRecord?.answers || {}).length, Object.keys(answersToSave).length);

    latencies.push(performance.now() - opStart);
    return { success: true, attemptId };
  } catch (err: any) {
    latencies.push(performance.now() - opStart);
    return { success: false, attemptId, error: err.message };
  }
}

test('Weekly Quiz 200-Candidate Realistic Staged Load Test Suite', async (t) => {
  const quiz = await db.weeklyQuizzes.getById('quiz-aws-week-01');
  assert.ok(quiz, 'quiz-aws-week-01 must be available for load testing');

  const stages = [10, 25, 50, 100, 150, 200];
  const allCreatedAttemptIds: string[] = [];

  for (let sIdx = 0; sIdx < stages.length; sIdx++) {
    const concurrency = stages[sIdx];
    const stageNum = sIdx + 1;

    await t.test(`Stage ${stageNum}: ${concurrency} Concurrent Candidates Full Lifecycle`, async () => {
      const stageStart = performance.now();
      const latencies: number[] = [];

      // Execute concurrency promises simultaneously
      const candidatePromises = Array.from({ length: concurrency }, (_, i) =>
        runCandidateLifecycle(i + 1, quiz, stageNum, latencies)
      );

      const results = await Promise.all(candidatePromises);
      const stageDuration = performance.now() - stageStart;

      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      // Track created attempt IDs for cleanup
      results.forEach(r => {
        if (r.attemptId) allCreatedAttemptIds.push(r.attemptId);
      });

      const percentiles = computePercentiles(latencies);
      const mem = process.memoryUsage();
      const heapUsedMB = Math.round((mem.heapUsed / (1024 * 1024)) * 100) / 100;

      const metrics: StageMetrics = {
        stage: stageNum,
        concurrency,
        totalOps: concurrency * 8, // 8 lifecycle operations per candidate
        successOps: successCount * 8,
        failedOps: failedCount * 8,
        durationMs: Math.round(stageDuration * 100) / 100,
        avgLatencyMs: percentiles.avg,
        p95LatencyMs: percentiles.p95,
        p99LatencyMs: percentiles.p99,
        maxLatencyMs: percentiles.max,
        heapUsedMB
      };

      allStageMetrics.push(metrics);

      // Assert zero failures and 100% success rate
      assert.equal(failedCount, 0, `Stage ${stageNum} (${concurrency} candidates) must have 0 failed lifecycles`);
      assert.equal(successCount, concurrency, `All ${concurrency} candidates must succeed completely`);
      assert.ok(percentiles.p95 < 180000, `p95 latency (${percentiles.p95}ms) must remain below 180000ms under full concurrency`);

      console.log(
        `[STAGE ${stageNum} COMPLETED] Concurrency: ${concurrency} | Duration: ${metrics.durationMs}ms | Avg: ${metrics.avgLatencyMs}ms | p95: ${metrics.p95LatencyMs}ms | p99: ${metrics.p99LatencyMs}ms | Success: 100% | Heap: ${heapUsedMB}MB`
      );
    });
  }

  // Final Validation Test: Database Consistency & Cleanup
  await t.test('Final Validation & Database Integrity Across All Stages', async () => {
    assert.equal(allStageMetrics.length, 6, 'All 6 stages must have executed and recorded metrics');

    // Clean up created test attempts in a single batch operation
    const allAttempts = await db.weeklyQuizAttempts.getAll();
    const cleanupSet = new Set(allCreatedAttemptIds);
    await db.weeklyQuizAttempts.saveAll(allAttempts.filter(a => !cleanupSet.has(a.id)));

    console.log('\n=== COMPLETE 200-CANDIDATE STAGED LOAD TEST SUMMARY ===');
    console.table(
      allStageMetrics.map(m => ({
        Stage: `Stage ${m.stage}`,
        Candidates: m.concurrency,
        Total_Operations: m.totalOps,
        Duration_ms: m.durationMs,
        Avg_Latency_ms: m.avgLatencyMs,
        P95_ms: m.p95LatencyMs,
        P99_ms: m.p99LatencyMs,
        Success_Rate: `${((m.successOps / m.totalOps) * 100).toFixed(1)}%`,
        Heap_MB: m.heapUsedMB
      }))
    );
  });
});
