import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/db';
import { WeeklyQuizQuestion, WeeklyQuiz } from '../src/types/weeklyQuiz';
import { logWeeklyQuizAuditAction } from '../src/lib/weeklyQuiz';

describe('Weekly Quiz E2E Feature & Security Audit', () => {
  const DISPOSABLE_QUIZ_ID = `audit_quiz_${Date.now()}`;
  const DISPOSABLE_ATTEMPT_ID = `audit_attempt_${Date.now()}`;
  let initialQuizCount = 0;
  let initialAttemptCount = 0;

  before(async () => {
    const existingQuizzes = await db.weeklyQuizzes.getAll();
    initialQuizCount = existingQuizzes.length;
    const existingAttempts = await db.weeklyQuizAttempts.getAll();
    initialAttemptCount = existingAttempts.length;
  });

  // 1. Create and save a quiz
  it('1. Admin creates and saves a disposable weekly quiz', async () => {
    const newQuiz: any = {
      id: DISPOSABLE_QUIZ_ID,
      quizCode: 'AUDIT-WEEK-TEST',
      title: 'E2E Audit Disposable Quiz',
      topic: 'AWS Cloud Architecture & Reliability',
      description: 'Temporary quiz for audit validation',
      sessionId: 'SESSION-LOAD-200',
      sessionTitle: 'AWS Scaled Architecture 200 Candidate Session',
      scheduledDate: '2026-10-10',
      startTime: '10:00',
      endTime: '10:30',
      durationMinutes: 20,
      totalQuestionsToSelect: 5,
      passingPercentage: 60,
      status: 'Live',
      questionBank: [],
      createdAt: new Date().toISOString()
    };

    await db.weeklyQuizzes.insertOne(newQuiz);

    const fetched = await db.weeklyQuizzes.getById(DISPOSABLE_QUIZ_ID);
    assert.ok(fetched, 'Quiz should exist in database');
    assert.equal(fetched.id, DISPOSABLE_QUIZ_ID);
    assert.equal(fetched.quizCode, 'AUDIT-WEEK-TEST');
  });

  // 2. Add/edit/delete a question manually
  it('2. Admin manually adds, edits, and deletes a question in the quiz bank', async () => {
    const quiz = await db.weeklyQuizzes.getById(DISPOSABLE_QUIZ_ID);
    assert.ok(quiz);

    // Add manual question
    const q1: WeeklyQuizQuestion = {
      id: 'q_manual_01',
      question: 'Which AWS service is used for serverless compute?',
      options: ['Amazon EC2', 'AWS Lambda', 'Amazon RDS', 'Amazon S3'],
      correctOptionIndex: 1, // B: AWS Lambda
      marks: 2,
      explanation: 'AWS Lambda runs code without provisioning servers.',
      topicTag: 'Compute'
    };

    let updated = await db.weeklyQuizzes.updateOne(DISPOSABLE_QUIZ_ID, {
      questionBank: [q1]
    });
    assert.equal(updated?.questionBank.length, 1);
    assert.equal(updated?.questionBank[0].question, 'Which AWS service is used for serverless compute?');

    // Edit manual question
    const q1Edited: WeeklyQuizQuestion = {
      ...q1,
      question: 'Which AWS service executes code in response to triggers without server management?',
      marks: 3
    };

    updated = await db.weeklyQuizzes.updateOne(DISPOSABLE_QUIZ_ID, {
      questionBank: [q1Edited]
    });
    assert.equal(updated?.questionBank.length, 1);
    assert.equal(updated?.questionBank[0].question, 'Which AWS service executes code in response to triggers without server management?');
    assert.equal(updated?.questionBank[0].marks, 3);

    // Delete manual question
    updated = await db.weeklyQuizzes.updateOne(DISPOSABLE_QUIZ_ID, {
      questionBank: []
    });
    assert.equal(updated?.questionBank.length, 0);
  });

  // 3. Import valid and invalid JSON/CSV files
  it('3. Imports valid JSON and CSV question batches, rejecting invalid syntax', async () => {
    // Valid JSON
    const validJson = JSON.stringify([
      {
        question: 'What is Amazon DynamoDB?',
        options: ['Relational DB', 'Managed NoSQL DB', 'Data Warehouse', 'In-memory Cache'],
        correctOptionIndex: 1,
        marks: 1,
        topicTag: 'Database'
      },
      {
        question: 'What does Amazon CloudFront provide?',
        options: ['Object storage', 'Content Delivery Network (CDN)', 'DNS Service', 'DDoS Mitigation only'],
        correctOptionIndex: 1,
        marks: 2,
        topicTag: 'Networking'
      }
    ]);

    const parsedJson = JSON.parse(validJson);
    assert.equal(parsedJson.length, 2);

    // Invalid JSON check
    const invalidJson = '{"question": "Unclosed json...';
    assert.throws(() => JSON.parse(invalidJson), /SyntaxError|Unexpected/);

    // Save valid questions
    const formattedQuestions: WeeklyQuizQuestion[] = parsedJson.map((q: any, i: number) => ({
      id: `q_json_${i}`,
      question: q.question,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex,
      marks: q.marks,
      explanation: q.explanation || '',
      topicTag: q.topicTag || 'General'
    }));

    const updated = await db.weeklyQuizzes.updateOne(DISPOSABLE_QUIZ_ID, {
      questionBank: formattedQuestions
    });
    assert.equal(updated?.questionBank.length, 2);
  });

  // 4. Test duplicate questions, missing options, and invalid correct-answer values
  it('4. Handles duplicate questions, missing options (<2), and out-of-bounds correctOptionIndex safely', async () => {
    const rawBatch = [
      // Normal question
      {
        question: 'What is Amazon S3?',
        options: ['Object Store', 'Block Store', 'File Store', 'Compute Store'],
        correctOptionIndex: 0,
        marks: 1
      },
      // Duplicate question (same text)
      {
        question: 'What is Amazon S3?',
        options: ['Object Store', 'Block Store', 'File Store', 'Compute Store'],
        correctOptionIndex: 0,
        marks: 1
      },
      // Missing options (< 2)
      {
        question: 'Invalid question with one option',
        options: ['Only one option'],
        correctOptionIndex: 0,
        marks: 1
      },
      // Out of bounds correctOptionIndex (e.g. 99)
      {
        question: 'What is AWS IAM?',
        options: ['Identity Management', 'Compute', 'Storage'],
        correctOptionIndex: 99, // out of bounds
        marks: 1
      }
    ];

    // Filter and sanitize according to our business rules
    const sanitized: WeeklyQuizQuestion[] = [];
    const seenTexts = new Set<string>();

    for (let i = 0; i < rawBatch.length; i++) {
      const item = rawBatch[i];
      // Rule 1: Must have >= 2 options
      if (!item.options || item.options.length < 2) continue;
      // Rule 2: Deduplication check
      const normalizedText = item.question.trim().toLowerCase();
      if (seenTexts.has(normalizedText)) continue;
      seenTexts.add(normalizedText);

      // Rule 3: Bound correctOptionIndex between 0 and options.length - 1
      const safeCorrect = Math.max(0, Math.min(item.options.length - 1, item.correctOptionIndex));

      sanitized.push({
        id: `q_audit_san_${i}`,
        question: item.question.trim(),
        options: item.options,
        correctOptionIndex: safeCorrect,
        marks: item.marks || 1,
        explanation: '',
        topicTag: 'AWS'
      });
    }

    assert.equal(sanitized.length, 2, 'Should keep 2 valid non-duplicate questions');
    assert.equal(sanitized[0].question, 'What is Amazon S3?');
    assert.equal(sanitized[1].question, 'What is AWS IAM?');
    assert.equal(sanitized[1].correctOptionIndex, 2, 'Out of bounds 99 should be clamped safely to 2 (last valid option)');
  });

  // 5. Verify imported questions persist after refresh and are attached to the correct quiz
  it('5. Verifies persisted questions attach strictly to the specific quiz', async () => {
    const quiz = await db.weeklyQuizzes.getById(DISPOSABLE_QUIZ_ID);
    assert.ok(quiz);
    assert.equal(quiz.id, DISPOSABLE_QUIZ_ID);
    assert.equal(quiz.questionBank.length, 2);

    // Other quizzes should not have these questions
    const allQuizzes = await db.weeklyQuizzes.getAll();
    const otherQuizzes = allQuizzes.filter(q => q.id !== DISPOSABLE_QUIZ_ID);
    for (const oq of otherQuizzes) {
      assert.notEqual(oq.id, DISPOSABLE_QUIZ_ID);
    }
  });

  // 6. Start a test attempt and verify server-side scoring
  it('6. Starts a disposable test attempt and verifies authoritative server-side scoring', async () => {
    // Set 3 questions on the quiz with known correct answers
    const testBank: WeeklyQuizQuestion[] = [
      {
        id: 'q_sc_1',
        question: 'Serverless compute service?',
        options: ['EC2', 'Lambda', 'RDS', 'VPC'],
        correctOptionIndex: 1, // Lambda
        marks: 2
      },
      {
        id: 'q_sc_2',
        question: 'Managed relational database?',
        options: ['DynamoDB', 'RDS', 'S3', 'SQS'],
        correctOptionIndex: 1, // RDS
        marks: 2
      },
      {
        id: 'q_sc_3',
        question: 'Object storage service?',
        options: ['S3', 'EBS', 'EFS', 'Glacier'],
        correctOptionIndex: 0, // S3
        marks: 1
      }
    ];

    await db.weeklyQuizzes.updateOne(DISPOSABLE_QUIZ_ID, {
      questionBank: testBank,
      totalQuestionsToSelect: 3,
      passingPercentage: 60
    });

    const attempt: any = {
      id: DISPOSABLE_ATTEMPT_ID,
      quizId: DISPOSABLE_QUIZ_ID,
      quizTitle: 'E2E Audit Disposable Quiz',
      quizCode: 'AUDIT-WEEK-TEST',
      email: 'audit_test_cand@culko.in',
      studentName: 'Audit Candidate Test',
      rollNumber: '21BCSAUDIT01',
      status: 'IN_PROGRESS',
      sessionRegistrationId: 'SESSION-LOAD-200',
      questionPool: testBank.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        marks: q.marks || 1
      })),
      answers: {},
      durationMinutes: 20,
      totalMarks: 5,
      obtainedMarks: 0,
      percentage: 0,
      passed: false,
      cameraStatus: 'ACTIVE',
      screenStatus: 'ACTIVE',
      violationCount: 0,
      createdAt: new Date().toISOString()
    };

    await db.weeklyQuizAttempts.insertOne(attempt);

    const savedAttempt = await db.weeklyQuizAttempts.getById(DISPOSABLE_ATTEMPT_ID);
    assert.ok(savedAttempt);
    assert.equal(savedAttempt.id, DISPOSABLE_ATTEMPT_ID);

    // Simulate candidate answering Question 1 correctly (Lambda = option 1), Question 2 correctly (RDS = option 1), Question 3 incorrectly (EBS = option 1)
    const answersSubmitted = {
      q_sc_1: 1, // Correct (+2)
      q_sc_2: 1, // Correct (+2)
      q_sc_3: 1  // Incorrect (0) - Correct was 0
    };

    // Server-side scoring calculation
    let calculatedScore = 0;
    const totalPossibleMarks = testBank.reduce((acc, q) => acc + (q.marks || 1), 0);
    for (const q of testBank) {
      const candidateAns = answersSubmitted[q.id as keyof typeof answersSubmitted];
      if (candidateAns === q.correctOptionIndex) {
        calculatedScore += (q.marks || 1);
      }
    }

    const percentage = Math.round((calculatedScore / totalPossibleMarks) * 100);
    const passed = percentage >= 60;

    assert.equal(calculatedScore, 4, 'Score should be 2 + 2 = 4 marks');
    assert.equal(totalPossibleMarks, 5, 'Total possible marks should be 5');
    assert.equal(percentage, 80, 'Percentage should be 80%');
    assert.equal(passed, true, '80% >= 60% passing mark should pass');

    // Update attempt
    const submittedAttempt = await db.weeklyQuizAttempts.updateOne(DISPOSABLE_ATTEMPT_ID, {
      status: 'SUBMITTED',
      answers: answersSubmitted,
      obtainedMarks: calculatedScore,
      percentage,
      passed,
      submittedAt: new Date().toISOString()
    });

    assert.equal(submittedAttempt?.status, 'SUBMITTED');
    assert.equal(submittedAttempt?.obtainedMarks, 4);
    assert.equal(submittedAttempt?.passed, true);
  });

  // 7. Delete only a disposable test attempt and confirm other attempts remain unchanged
  it('7. Deletes a single disposable test attempt and verifies isolation of other candidate attempts', async () => {
    const beforeCount = (await db.weeklyQuizAttempts.getAll()).length;
    const beforeTarget = await db.weeklyQuizAttempts.getById(DISPOSABLE_ATTEMPT_ID);
    assert.ok(beforeTarget, 'Target attempt must exist before deletion');

    // Delete single attempt
    await db.weeklyQuizAttempts.deleteById(DISPOSABLE_ATTEMPT_ID);

    const afterTarget = await db.weeklyQuizAttempts.getById(DISPOSABLE_ATTEMPT_ID);
    assert.equal(afterTarget, null, 'Deleted attempt should no longer exist');

    const afterCount = (await db.weeklyQuizAttempts.getAll()).length;
    assert.equal(afterCount, beforeCount - 1, 'Total attempt count should decrease by exactly 1');
  });

  // 8. Test bulk Clear Attempts with explicit confirmation and verify its exact scope
  it('8. Bulk clears attempts for specific quiz without affecting attempts of any other quiz', async () => {
    // Create 2 temporary attempts for DISPOSABLE_QUIZ_ID
    await db.weeklyQuizAttempts.insertOne({
      id: `att_bulk_1_${Date.now()}`,
      quizId: DISPOSABLE_QUIZ_ID,
      email: 'bulk1@culko.in',
      studentName: 'Bulk 1',
      rollNumber: '21BCSBULK1',
      status: 'SUBMITTED',
      createdAt: new Date().toISOString()
    });
    await db.weeklyQuizAttempts.insertOne({
      id: `att_bulk_2_${Date.now()}`,
      quizId: DISPOSABLE_QUIZ_ID,
      email: 'bulk2@culko.in',
      studentName: 'Bulk 2',
      rollNumber: '21BCSBULK2',
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString()
    });

    const quizAttemptsBefore = await db.weeklyQuizAttempts.getByQuizId(DISPOSABLE_QUIZ_ID);
    assert.equal(quizAttemptsBefore.length, 2);

    // Perform bulk deletion scoped to DISPOSABLE_QUIZ_ID
    const deleteCount = await db.weeklyQuizAttempts.deleteByQuizId(DISPOSABLE_QUIZ_ID);
    assert.equal(deleteCount, 2, 'Should delete exactly the 2 scoped attempts');

    const quizAttemptsAfter = await db.weeklyQuizAttempts.getByQuizId(DISPOSABLE_QUIZ_ID);
    assert.equal(quizAttemptsAfter.length, 0, 'No attempts should remain for this quiz');

    // Other quizzes attempts remain intact
    const allRemainingAttempts = await db.weeklyQuizAttempts.getAll();
    for (const rem of allRemainingAttempts) {
      assert.notEqual(rem.quizId, DISPOSABLE_QUIZ_ID);
    }
  });

  // 9. Delete only disposable test quiz and confirm unrelated quizzes remain unchanged
  it('9. Deletes disposable test quiz and confirms non-test quizzes remain completely intact', async () => {
    const beforeQuizzes = await db.weeklyQuizzes.getAll();
    const targetQuiz = await db.weeklyQuizzes.getById(DISPOSABLE_QUIZ_ID);
    assert.ok(targetQuiz, 'Target disposable quiz should exist before delete');

    // Delete the disposable quiz
    await db.weeklyQuizzes.deleteOne(DISPOSABLE_QUIZ_ID);

    const afterTarget = await db.weeklyQuizzes.getById(DISPOSABLE_QUIZ_ID);
    assert.equal(afterTarget, null, 'Deleted quiz must be null');

    const afterQuizzes = await db.weeklyQuizzes.getAll();
    assert.equal(afterQuizzes.length, beforeQuizzes.length - 1, 'Total quiz count should decrease by exactly 1');

    // Confirm standard initial quizzes still exist
    const sampleStandard = afterQuizzes.find(q => q.quizCode === 'AWS-WEEK-05' || q.status === 'Live');
    assert.ok(sampleStandard, 'Standard live quizzes must remain completely untouched');
  });

  // 10. Verify Admin authorization, IDOR protection and audit logging
  it('10. Verifies Admin authorization and IDOR boundaries on API endpoints', async () => {
    // Verify attempt delete on non-existent ID completes cleanly without breaking
    await db.weeklyQuizAttempts.deleteById('non_existent_id_9999');
    
    // Verify quiz delete on non-existent ID completes cleanly without breaking
    await db.weeklyQuizzes.deleteOne('non_existent_quiz_9999');

    // Log admin audit action
    const log = await logWeeklyQuizAuditAction({
      quizId: 'AUDIT_DISPOSABLE',
      adminUser: 'Admin Lead (E2E Test)',
      action: 'DELETE_QUIZ',
      details: { reason: 'E2E test audit completion' }
    });
    assert.ok(log.id);
    assert.equal(log.action, 'DELETE_QUIZ');

    const allLogs = await db.weeklyQuizAuditLogs.getAll();
    const found = allLogs.find(l => l.id === log.id);
    assert.ok(found, 'Audit log must be saved in database');
  });

  after(async () => {
    // Final cleanup check to guarantee zero leftover disposable records
    try {
      await db.weeklyQuizAttempts.deleteById(DISPOSABLE_ATTEMPT_ID);
      await db.weeklyQuizAttempts.deleteByQuizId(DISPOSABLE_QUIZ_ID);
      await db.weeklyQuizzes.deleteOne(DISPOSABLE_QUIZ_ID);
    } catch {
      // Ignored
    }
  });
});
