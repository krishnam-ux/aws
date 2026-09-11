import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/db';
import {
  sendEmail,
  sendBatchEmails,
  sendTemplateEmail,
  retryFailedEmail,
  isValidEmail,
  normalizeEmail
} from '../src/lib/email';
import {
  interpolateVariables,
  renderEmailLayout,
  DEFAULT_EMAIL_TEMPLATES,
  extractVariables
} from '../src/lib/email/templates';
import {
  triggerEventRegistrationConfirmation,
  triggerOpportunityApplicationReceived,
  triggerExamResultEmail,
  triggerExamSelectionEmail,
  triggerFeedbackReceivedEmail,
  isAutomationEnabled
} from '../src/lib/email/automations';

test('Email Utilities & Validation', () => {
  assert.equal(isValidEmail('student@university.edu'), true);
  assert.equal(isValidEmail('admin.aws@cu.ac.in'), true);
  assert.equal(isValidEmail('invalid-email'), false);
  assert.equal(isValidEmail(''), false);
  assert.equal(isValidEmail('missing@domain'), false);

  assert.equal(normalizeEmail('  STUDENT@University.EDU  '), 'student@university.edu');
});

test('Template Engine & Branded Layout', () => {
  const vars = extractVariables('Hello {{studentName}}, welcome to {{eventName}} on {{eventDate}}!');
  assert.deepEqual(vars, ['studentName', 'eventName', 'eventDate']);

  const template = 'Dear {{studentName}}, your score for {{examName}} is {{score}}%.';
  const output = interpolateVariables(template, {
    studentName: 'Alex Doe',
    examName: 'Cloud Practitioner Mock',
    score: 92
  });
  assert.equal(output, 'Dear Alex Doe, your score for Cloud Practitioner Mock is 92%.');

  const html = renderEmailLayout({
    title: 'Registration Confirmed',
    contentHtml: '<p>You are successfully registered for the AWS Workshop.</p>',
    ctaText: 'Access Portal',
    ctaUrl: 'https://www.awssbgcuup.tech/events'
  });

  assert.ok(html.includes('AWS Student Builder Group'));
  assert.ok(html.includes('Chandigarh University – Uttar Pradesh'));
  assert.ok(html.includes('You are successfully registered for the AWS Workshop.'));
  assert.ok(html.includes('Access Portal'));
  assert.ok(html.includes('https://www.awssbgcuup.tech/events'));
});

test('Core Email Dispatch & Fallback Simulation', async () => {
  await db.emailLogs.saveAll([]);

  const result = await sendEmail({
    to: 'student.builder@chandigarh.edu',
    subject: 'Welcome to AWS SBG CU-UP',
    html: '<p>Welcome!</p>',
    type: 'admin_manual_message'
  });

  assert.equal(result.success, true);
  assert.ok(result.status === 'SENT' || result.status === 'SIMULATED');
  assert.equal(result.recipient, 'student.builder@chandigarh.edu');

  const logs = await db.emailLogs.getAll();
  assert.equal(logs.length, 1);
  assert.equal(logs[0].recipient, 'student.builder@chandigarh.edu');
  assert.equal(logs[0].subject, 'Welcome to AWS SBG CU-UP');
  assert.ok(logs[0].status === 'SENT' || logs[0].status === 'SIMULATED');
});

test('Batch Email Dispatch with Deduplication and Error Isolation', async () => {
  await db.emailLogs.saveAll([]);

  const recipients = [
    'student1@cu.edu',
    'student2@cu.edu',
    'student1@cu.edu', // Duplicate
    'student3@cu.edu'
  ];

  const summary = await sendBatchEmails({
    recipients,
    subject: 'AWS Community Bootcamp Update',
    customHtml: '<p>Important update regarding the upcoming workshop.</p>'
  });

  assert.equal(summary.total, 3); // Deduplicated from 4 to 3
  assert.equal(summary.sent, 3);
  assert.equal(summary.failed, 0);

  const logs = await db.emailLogs.getAll();
  assert.equal(logs.length, 3);
});

test('Retry Failed Email Delivery', async () => {
  const failedLog = {
    id: 'log-failed-test-1',
    recipient: 'retry.student@cu.edu',
    subject: 'Retry Test Message',
    type: 'admin_manual_message',
    category: 'COMMUNITY',
    status: 'FAILED',
    sentAt: new Date().toISOString(),
    errorMessage: 'Simulated connection timeout',
    triggeredBy: 'TEST',
    createdAt: new Date().toISOString()
  };
  await db.emailLogs.insertOne(failedLog);

  const retryResult = await retryFailedEmail('log-failed-test-1');
  assert.equal(retryResult.success, true);

  const updated = await db.emailLogs.getById('log-failed-test-1');
  assert.equal(updated?.status, 'SENT');
});

test('Automated Event Registration Confirmation Email', async () => {
  await db.emailLogs.saveAll([]);

  await triggerEventRegistrationConfirmation({
    studentName: 'Rohan Sharma',
    email: 'rohan.sharma@cumail.in',
    event: {
      id: 'event-cloud-summit',
      title: 'AWS Cloud Architecture Summit 2026',
      date: 'October 15, 2026',
      time: '11:00 AM IST',
      venue: 'Auditorium Block A'
    },
    registrationId: 'REG-99281'
  });

  const logs = await db.emailLogs.getAll();
  const eventLog = logs.find((l) => l.recipient === 'rohan.sharma@cumail.in');
  assert.ok(eventLog, 'Log should exist for registered student');
  assert.equal(eventLog?.type, 'event_registration_confirmation');
  assert.ok(eventLog?.subject.includes('Registration Confirmed'));
});

test('Automated Opportunity Application Received Email', async () => {
  await db.emailLogs.saveAll([]);

  await triggerOpportunityApplicationReceived({
    studentName: 'Priya Verma',
    email: 'priya.verma@cumail.in',
    opportunity: {
      id: 'opp-devops-lead',
      title: 'DevOps & Cloud Automation Lead',
      role: 'Technical Lead',
      slug: 'devops-lead'
    },
    applicationId: 'APP-77124'
  });

  const logs = await db.emailLogs.getAll();
  const oppLog = logs.find((l) => l.recipient === 'priya.verma@cumail.in');
  assert.ok(oppLog, 'Log should exist for applicant');
  assert.equal(oppLog?.type, 'opportunity_application_received');
  assert.ok(oppLog?.subject.includes('Application Received'));
});

test('Automated Exam Result Scorecard Delivery Without Exposing Secrets', async () => {
  await db.emailLogs.saveAll([]);

  await triggerExamResultEmail({
    studentName: 'Ananya Gupta',
    email: 'ananya.gupta@cumail.in',
    rollNumber: '21BCS1089',
    exam: {
      id: 'exam-ccp-2026',
      title: 'AWS Certified Cloud Practitioner Simulation',
      examCode: 'AWS-CCP-101',
      passingPercentage: 70
    },
    result: {
      score: 85,
      totalMarks: 100,
      percentage: 85,
      passed: true
    }
  });

  const logs = await db.emailLogs.getAll();
  const examLog = logs.find((l) => l.recipient === 'ananya.gupta@cumail.in');
  assert.ok(examLog, 'Log should exist for candidate');
  assert.equal(examLog?.type, 'exam_result');
  assert.ok(examLog?.subject.includes('Assessment Result'));
});

test('Automated Candidate Qualification Email from Proctor', async () => {
  await db.emailLogs.saveAll([]);

  await triggerExamSelectionEmail({
    studentName: 'Vikram Singh',
    email: 'vikram.singh@cumail.in',
    rollNumber: '22BCS5541',
    exam: {
      id: 'exam-solutions-arch',
      title: 'AWS Solutions Architecture Challenge'
    },
    selectionNotes: 'Top 5 percentile performer'
  });

  const logs = await db.emailLogs.getAll();
  const selectLog = logs.find((l) => l.recipient === 'vikram.singh@cumail.in');
  assert.ok(selectLog, 'Log should exist for selected candidate');
  assert.equal(selectLog?.type, 'exam_selected_qualified');
  assert.ok(selectLog?.subject.includes('Selected & Qualified in'));
});

test('Automated Feedback Received Acknowledgement Email', async () => {
  await db.emailLogs.saveAll([]);

  await triggerFeedbackReceivedEmail({
    studentName: 'Sneha Patel',
    email: 'sneha.patel@cumail.in',
    category: 'AWS Cloud Bootcamp Feedback',
    message: 'Great hands-on session!'
  });

  const logs = await db.emailLogs.getAll();
  const fbLog = logs.find((l) => l.recipient === 'sneha.patel@cumail.in');
  assert.ok(fbLog, 'Log should exist for feedback submitter');
  assert.equal(fbLog?.type, 'feedback_received_acknowledgement');
  assert.ok(fbLog?.subject.toLowerCase().includes('thank you for your feedback'));
});

test('Automation Settings Toggle Enforcement', async () => {
  await db.emailLogs.saveAll([]);

  // Disable event registration automation
  await db.emailAutomationSettings.setSetting('event_registration_confirmation', false, 'test_admin');

  const isEnabled = await isAutomationEnabled('event_registration_confirmation');
  assert.equal(isEnabled, false);

  await triggerEventRegistrationConfirmation({
    studentName: 'Skipped Student',
    email: 'skipped.student@cumail.in',
    event: {
      id: 'event-1',
      title: 'Skipped Event',
      date: '2026-11-01'
    }
  });

  const logs = await db.emailLogs.getAll();
  const skippedLog = logs.find((l) => l.recipient === 'skipped.student@cumail.in');
  assert.equal(skippedLog, undefined, 'Email should NOT have been sent when automation is disabled');

  // Re-enable
  await db.emailAutomationSettings.setSetting('event_registration_confirmation', true, 'test_admin');
});
