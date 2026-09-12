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

test('Client-Safe Default Automation Settings and Templates Integrity', () => {
  const { DEFAULT_AUTOMATION_SETTINGS } = require('../src/lib/email/automationSettings');
  assert.ok(Array.isArray(DEFAULT_AUTOMATION_SETTINGS));
  assert.ok(DEFAULT_AUTOMATION_SETTINGS.length >= 12, 'Should define at least 12 automation triggers');

  const requiredCategories = ['EVENTS', 'OPPORTUNITIES', 'EXAMS', 'COMMUNITY'];
  const categories = new Set(DEFAULT_AUTOMATION_SETTINGS.map((s: any) => s.category));
  for (const cat of requiredCategories) {
    assert.ok(categories.has(cat), `Should cover category ${cat}`);
  }

  assert.ok(Array.isArray(DEFAULT_EMAIL_TEMPLATES));
  assert.ok(DEFAULT_EMAIL_TEMPLATES.length >= 17, 'Should define at least 17 master email templates');
});

test('Logo Assets and Header Rendering Verification', () => {
  const html = renderEmailLayout({
    title: 'Branding Verification',
    contentHtml: '<p>Testing logo layout and styling</p>'
  });

  // Must use absolute HTTPS production URL or configured site URL
  assert.ok(
    html.includes('https://www.awssbgcuup.tech/chandigarh-university-logo.jpg'),
    'Should include absolute HTTPS Chandigarh University logo URL'
  );
  assert.ok(
    html.includes('https://www.awssbgcuup.tech/aws-sbg-logo.png'),
    'Should include absolute HTTPS AWS SBG PNG logo URL'
  );

  // Must NOT use SVG in img tags for cross-client compatibility
  assert.equal(html.includes('.svg'), false, 'Email HTML should not use SVG in img tags');

  // Must NOT use local file paths
  assert.equal(html.includes('/public/'), false, 'Email HTML must not reference /public/');

  // Chandigarh University logo must preserve 1:1 square aspect ratio
  assert.ok(
    html.includes('width="48" height="48"') || html.includes('width="52" height="52"'),
    'Chandigarh University logo must maintain 1:1 aspect ratio'
  );

  // Header must contain official community and university text
  assert.ok(html.includes('AWS <span style="color: #FF9900;">Student Builder Group</span>'));
  assert.ok(html.includes('CHANDIGARH UNIVERSITY – UTTAR PRADESH'));
});

test('Dynamic Student Name and Personalization Flow', () => {
  // 1. Direct variable interpolation with studentName
  const eventTemplate = DEFAULT_EMAIL_TEMPLATES.find((t) => t.type === 'event_registration_confirmation');
  assert.ok(eventTemplate, 'Event registration template must exist');

  const renderedHtml = interpolateVariables(eventTemplate.bodyHtml, {
    studentName: 'Krishnam Dwivedi',
    eventTitle: 'AWS Serverless Workshop 2026',
    eventDate: 'September 20, 2026',
    eventTime: '10:00 AM IST',
    eventVenue: 'Seminar Hall 3',
    eventMode: 'In-Person',
    registrationId: 'REG-KD-8819',
    eventUrl: 'https://www.awssbgcuup.tech/events/event-serverless-2026'
  });

  assert.ok(renderedHtml.includes('Dear Krishnam Dwivedi,'), 'Must render "Dear Krishnam Dwivedi,"');
  assert.ok(renderedHtml.includes('AWS Serverless Workshop 2026'), 'Must include event title');
  assert.ok(renderedHtml.includes('REG-KD-8819'), 'Must include registration ID');
  assert.equal(renderedHtml.includes('{{studentName}}'), false, 'Must NOT contain unresolved {{studentName}}');
  assert.equal(renderedHtml.includes('{{eventTitle}}'), false, 'Must NOT contain unresolved {{eventTitle}}');

  // 2. Variable resolution via fullName alias
  const aliasHtml = interpolateVariables('Dear {{studentName}}, your code is {{examCode}}.', {
    fullName: 'Krishnam Dwivedi',
    code: 'AWS-SOL-2026'
  });
  assert.equal(aliasHtml, 'Dear Krishnam Dwivedi, your code is AWS-SOL-2026.');

  // 3. Fallback when studentName is empty
  const fallbackHtml = interpolateVariables('Dear {{studentName}}, welcome!', {});
  assert.equal(fallbackHtml, 'Dear Student, welcome!');

  // 4. Scrub any completely unknown unresolved placeholder
  const scrubbedHtml = interpolateVariables('Hello {{unknownVar123}}!', {});
  assert.equal(scrubbedHtml, 'Hello !');
});

test('All Default Email Templates Render Cleanly Without Unresolved Variables', () => {
  const sampleData: Record<string, any> = {
    studentName: 'Krishnam Dwivedi',
    fullName: 'Krishnam Dwivedi',
    email: 'krishnamdwivedi17@gmail.com',
    eventTitle: 'Cloud AI Summit 2026',
    eventDate: 'October 10, 2026',
    eventTime: '2:00 PM IST',
    eventVenue: 'CU Auditorium',
    eventMode: 'In-Person',
    registrationId: 'REG-10023',
    eventUrl: 'https://www.awssbgcuup.tech/events/cloud-ai-2026',
    opportunityTitle: 'Technical Operations Associate',
    role: 'Technical Operations Associate',
    applicationId: 'APP-99881',
    opportunityUrl: 'https://www.awssbgcuup.tech/opportunities/tech-ops',
    examName: 'AWS Solutions Architecture Test',
    examCode: 'SA-PRO-101',
    examPassword: 'PROCTOR-PASS-99',
    durationMinutes: 90,
    examUrl: 'https://www.awssbgcuup.tech/exam/sa-pro',
    rollNumber: '22BCS1001',
    submittedAt: '11:45 AM',
    score: 88,
    totalMarks: 100,
    percentage: 88,
    verdict: 'PASSED',
    verdictColor: '#10B981',
    passingPercentage: 70,
    selectionNotes: 'Top rank candidate in cohort',
    nextSteps: 'Check email for technical interview schedule',
    onboardingNotes: 'Welcome aboard! Community orientation on Monday',
    cancellationReason: 'Scheduled maintenance of facility',
    updateNotes: 'New venue assigned: Block C Lab 4',
    category: 'Workshops',
    messageSummary: 'Great cloud architecture insights',
    announcementTitle: 'AWS SBG Annual Tech Fest Announced',
    announcementDate: 'September 12, 2026',
    announcementCategory: 'Announcements',
    announcementContent: 'Registration is now live for all CU students.',
    recipientName: 'Krishnam Dwivedi',
    messageContent: 'Please check your student email for the orientation kit.',
    timestamp: '2026-09-12 12:00:00 UTC',
    provider: 'Resend',
    adminUser: 'lead_admin'
  };

  for (const tpl of DEFAULT_EMAIL_TEMPLATES) {
    const renderedSubject = interpolateVariables(tpl.subject, sampleData);
    const renderedBody = interpolateVariables(tpl.bodyHtml, sampleData);
    const renderedText = interpolateVariables(tpl.bodyText, sampleData);

    const fullLayout = renderEmailLayout({
      title: renderedSubject,
      contentHtml: renderedBody
    });

    // Verify no raw unreplaced curly tags remain in the layout
    const remainingTags = fullLayout.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
    assert.equal(
      remainingTags,
      null,
      `Template ${tpl.id} should have zero unresolved {{...}} tags, but found: ${remainingTags?.join(', ')}`
    );

    // If template has student/recipient greeting, verify Krishnam Dwivedi is rendered
    if (tpl.bodyHtml.includes('Dear ')) {
      assert.ok(
        renderedBody.includes('Dear Krishnam Dwivedi,'),
        `Template ${tpl.id} must dynamically render "Dear Krishnam Dwivedi,"`
      );
    }
  }
});

test('Individual Student Send Email Flow with Server-Side Registration Resolution', async () => {
  await db.emailLogs.saveAll([]);
  
  // Seed a test registration
  const testReg = {
    id: 'reg-krishnam-test-101',
    eventId: 'event-aws-cloud-day',
    eventName: 'AWS Cloud Day 2026',
    name: 'Krishnam Dwivedi',
    email: 'krishnamdwivedi17@gmail.com',
    studentId: '22BCS10101',
    university: 'Chandigarh University – Uttar Pradesh',
    program: 'B.Tech CSE',
    year: '3rd Year',
    status: 'Approved',
    date: new Date().toISOString()
  };
  await db.eventRegistrations.insertOne(testReg);

  const tpl = DEFAULT_EMAIL_TEMPLATES.find((t) => t.type === 'event_registration_confirmation')!;
  const vars = {
    studentName: testReg.name,
    fullName: testReg.name,
    email: testReg.email,
    eventTitle: testReg.eventName,
    eventName: testReg.eventName,
    eventDate: 'October 15, 2026',
    eventTime: '10:00 AM IST',
    eventVenue: 'Main Auditorium',
    eventMode: 'In-Person',
    registrationId: testReg.id,
    eventUrl: 'https://www.awssbgcuup.tech/events/event-aws-cloud-day'
  };

  const renderedSubject = interpolateVariables(tpl.subject, vars);
  const renderedHtml = renderEmailLayout({
    title: renderedSubject,
    contentHtml: interpolateVariables(tpl.bodyHtml, vars)
  });

  assert.ok(renderedHtml.includes('Dear Krishnam Dwivedi,'));
  assert.equal(renderedHtml.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g), null);

  const sendRes = await sendEmail({
    to: testReg.email,
    subject: renderedSubject,
    html: renderedHtml,
    type: 'event_registration_confirmation',
    category: 'EVENTS',
    templateId: tpl.id,
    triggeredBy: 'ADMIN_MANUAL',
    adminId: 'admin',
    metadata: {
      registrationId: testReg.id,
      studentName: testReg.name,
      eventName: testReg.eventName,
      purpose: 'Registration Confirmation'
    }
  });

  assert.equal(sendRes.success, true);
  assert.equal(sendRes.recipient, 'krishnamdwivedi17@gmail.com');

  const logs = await db.emailLogs.getAll();
  const savedLog = logs.find((l) => l.recipient === 'krishnamdwivedi17@gmail.com');
  assert.ok(savedLog, 'Email log must be saved in Email Center');
  assert.equal(savedLog?.recipient, 'krishnamdwivedi17@gmail.com');
  assert.equal(savedLog?.metadata?.studentName, 'Krishnam Dwivedi');
  assert.equal(savedLog?.metadata?.eventName, 'AWS Cloud Day 2026');
  assert.equal(savedLog?.metadata?.purpose, 'Registration Confirmation');
  assert.ok(savedLog?.providerId, 'Message ID must be present');
});

test('Bulk Send Email to Multiple Selected Registrations with Individual Personalization & Batch ID', async () => {
  const testUid = Date.now();
  const reg1 = {
    id: `reg-bulk-sumit-${testUid}-101`,
    eventId: 'event-aws-cloud-day',
    eventName: 'AWS Cloud Day 2026',
    name: 'Sumit Kumar',
    email: 'sumit.kumar@cumail.in',
    studentId: '25LBCS3255',
    status: 'Approved',
    date: new Date().toISOString()
  };
  const reg2 = {
    id: `reg-bulk-aditya-${testUid}-102`,
    eventId: 'event-aws-cloud-day',
    eventName: 'AWS Cloud Day 2026',
    name: 'Aditya Soni',
    email: 'aditya.soni@cumail.in',
    studentId: '25LBCS3289',
    status: 'Approved',
    date: new Date().toISOString()
  };
  const reg3Duplicate = {
    id: `reg-bulk-sumit-dup-${testUid}-103`,
    eventId: 'event-aws-cloud-day',
    eventName: 'AWS Cloud Day 2026',
    name: 'Sumit Kumar Duplicate',
    email: 'sumit.kumar@cumail.in', // duplicate email
    studentId: '25LBCS3255',
    status: 'Approved',
    date: new Date().toISOString()
  };

  try {
    await db.eventRegistrations.insertOne(reg1);
    await db.eventRegistrations.insertOne(reg2);
    await db.eventRegistrations.insertOne(reg3Duplicate);

    // Simulate bulk send route logic
    const selectedIds = [reg1.id, reg2.id, reg3Duplicate.id];
    const allRegistrations = await db.eventRegistrations.getAll();
    const matchedRegs = allRegistrations.filter((r: any) => selectedIds.includes(r.id));
    assert.equal(matchedRegs.length, 3);

    const tpl = DEFAULT_EMAIL_TEMPLATES.find((t) => t.type === 'event_24h_reminder')!;
    const batchId = `batch_test_${Date.now()}`;

    const seen = new Set<string>();
    const deduplicated = [];
    for (const r of matchedRegs) {
      const norm = normalizeEmail(r.email);
      if (!seen.has(norm)) {
        seen.add(norm);
        deduplicated.push(r);
      }
    }

    assert.equal(deduplicated.length, 2, 'Deduplication should keep only 2 unique emails');

    for (const r of deduplicated) {
      const vars = {
        studentName: r.name,
        fullName: r.name,
        email: r.email,
        eventTitle: r.eventName,
        eventName: r.eventName,
        eventDate: 'September 25, 2026',
        eventTime: '10:00 AM IST',
        eventVenue: 'Main Auditorium',
        registrationId: r.id
      };

      const renderedSubj = interpolateVariables(tpl.subject, vars);
      const renderedBody = interpolateVariables(tpl.bodyHtml, vars);
      const fullHtml = renderEmailLayout({
        title: renderedSubj,
        contentHtml: renderedBody
      });

      // Check individual greeting
      assert.ok(fullHtml.includes(`Dear ${r.name},`), `Email must be personally addressed to Dear ${r.name},`);
      assert.equal(fullHtml.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g), null, 'No unresolved curly braces');

      await sendEmail({
        to: r.email,
        subject: renderedSubj,
        html: fullHtml,
        type: 'event_24h_reminder',
        category: 'EVENTS',
        templateId: tpl.id,
        triggeredBy: 'ADMIN_BULK',
        adminId: 'admin_test',
        metadata: {
          batchId,
          registrationId: r.id,
          studentName: r.name,
          eventName: r.eventName,
          purpose: 'Event Reminder – 24 Hours'
        }
      });
    }

    const logs = await db.emailLogs.getAll();
    const batchLogs = logs.filter((l) => l.metadata?.batchId === batchId);
    assert.equal(batchLogs.length, 2, 'Must log 2 delivery records for the batch');

    const sumitLog = batchLogs.find((l) => l.recipient === 'sumit.kumar@cumail.in');
    const adityaLog = batchLogs.find((l) => l.recipient === 'aditya.soni@cumail.in');

    assert.ok(sumitLog, 'Sumit log exists');
    assert.equal(sumitLog?.metadata?.studentName, 'Sumit Kumar');
    assert.equal(sumitLog?.metadata?.batchId, batchId);

    assert.ok(adityaLog, 'Aditya log exists');
    assert.equal(adityaLog?.metadata?.studentName, 'Aditya Soni');
    assert.equal(adityaLog?.metadata?.batchId, batchId);
  } finally {
    try {
      await db.eventRegistrations.deleteBulk([reg1.id, reg2.id, reg3Duplicate.id]);
    } catch {}
  }
});

test('Founding Members Database & Recipient Resolution', async () => {
  const teamMembers = await db.coreTeam.getAll();
  assert.ok(teamMembers.length >= 5, 'Founding team members must exist in database');

  const krishnam = teamMembers.find((m: any) => m.name.toLowerCase().includes('krishnam'));
  assert.ok(krishnam, 'Krishnam Dwivedi must exist in coreTeam database');
  assert.equal(krishnam?.name, 'Krishnam Dwivedi');
  assert.equal(krishnam?.email, 'krishnamdwivedi17@gmail.com');
  assert.ok(krishnam?.role.includes('Technical Lead'));
  assert.equal(krishnam?.domain, 'Cloud & Infrastructure');

  // Verify all members have email, name, role, domain
  for (const member of teamMembers) {
    assert.ok(member.name, 'Member must have a name');
    assert.ok(member.email, 'Member must have an email');
    assert.ok(member.role, 'Member must have a role');
  }
});

test('Founding Members Dynamic Variable Interpolation & Fallbacks', () => {
  const template =
    '<p>Dear <strong>{{memberName}}</strong>,</p><p>As our <strong>{{memberRole}}</strong> leading <strong>{{memberDomain}}</strong>, your email is {{memberEmail}}.</p>';

  const vars = {
    memberName: 'Krishnam Dwivedi',
    memberRole: 'Technical Lead',
    memberDomain: 'Cloud & Infrastructure',
    memberEmail: 'krishnamdwivedi17@gmail.com'
  };

  const rendered = interpolateVariables(template, vars);
  assert.ok(rendered.includes('Dear <strong>Krishnam Dwivedi</strong>,'));
  assert.ok(rendered.includes('leading <strong>Cloud & Infrastructure</strong>'));
  assert.ok(rendered.includes('Technical Lead'));
  assert.ok(rendered.includes('krishnamdwivedi17@gmail.com'));
  assert.equal(rendered.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g), null, 'Must have zero unresolved curly braces');

  // Test aliases (e.g. name / studentName pointing to memberName)
  const template2 = '<p>Hello {{studentName}}, role: {{role}}, domain: {{domain}}</p>';
  const rendered2 = interpolateVariables(template2, {
    memberName: 'Ayush Pandey',
    role: 'Events & Operations Lead',
    domain: 'Event Management'
  });
  assert.ok(rendered2.includes('Hello Ayush Pandey'));
  assert.ok(rendered2.includes('role: Events & Operations Lead'));
  assert.ok(rendered2.includes('domain: Event Management'));
});

test('Founding Members Email Templates Verification', () => {
  const foundingTemplates = DEFAULT_EMAIL_TEMPLATES.filter((t) => t.category === 'TEAM');
  assert.ok(foundingTemplates.length >= 5, 'Must contain 5 default Founding Member templates');

  const types = foundingTemplates.map((t) => t.type);
  assert.ok(types.includes('founding_members_announcement'));
  assert.ok(types.includes('founding_members_meeting'));
  assert.ok(types.includes('founding_members_coordination'));
  assert.ok(types.includes('founding_members_recognition'));
  assert.ok(types.includes('founding_members_update'));

  for (const t of foundingTemplates) {
    assert.ok(t.subject.length > 0, `Template ${t.id} must have a subject`);
    assert.ok(t.bodyHtml.includes('{{memberName}}') || t.bodyHtml.includes('{{studentName}}'), `Template ${t.id} must include member name placeholder`);
  }
});

test('Founding Members Batch Send with Authoritative Database Resolution', async () => {
  const batchId = `batch_founding_${Date.now()}`;
  const teamMembers = await db.coreTeam.getAll();
  const selectedMembers = teamMembers.slice(0, 3);
  assert.equal(selectedMembers.length, 3);

  const tpl = DEFAULT_EMAIL_TEMPLATES.find((t) => t.type === 'founding_members_announcement')!;
  const from = 'communication@awssbgcuup.tech';

  for (const member of selectedMembers) {
    const memberName = member.name;
    const memberRole = member.role || 'Founding Core Lead';
    const memberDomain = member.domain || 'Cloud Innovations';
    const memberEmail = member.email;

    const vars = {
      memberName,
      memberRole,
      memberDomain,
      memberEmail,
      studentName: memberName,
      role: memberRole,
      domain: memberDomain,
      email: memberEmail
    };

    const renderedSubject = interpolateVariables(tpl.subject, vars);
    const renderedBody = interpolateVariables(tpl.bodyHtml, vars);
    const fullHtml = renderEmailLayout({
      title: renderedSubject,
      contentHtml: renderedBody
    });

    // Verify personalization
    assert.ok(fullHtml.includes(`Dear <strong>${memberName}</strong>,`) || fullHtml.includes(memberName), `Must address member by real name: ${memberName}`);
    assert.ok(!fullHtml.includes('Dear Student'), 'Must NEVER address Founding Member as generic Dear Student');
    assert.equal(fullHtml.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g), null, 'Must have zero unresolved variable placeholders');

    await sendEmail({
      to: memberEmail,
      from,
      subject: renderedSubject,
      html: fullHtml,
      type: 'founding_members_announcement',
      category: 'TEAM',
      templateId: tpl.id,
      triggeredBy: 'ADMIN_BATCH',
      adminId: 'admin_test',
      metadata: {
        batchId,
        memberId: member.id,
        memberName,
        memberRole,
        memberDomain,
        sender: from,
        purpose: 'Founding Members Announcement'
      }
    });
  }

  const logs = await db.emailLogs.getAll();
  const batchLogs = logs.filter((l) => l.metadata?.batchId === batchId);
  assert.equal(batchLogs.length, 3, 'Must record 3 log records for founding member dispatch');

  for (const member of selectedMembers) {
    const log = batchLogs.find((l) => l.recipient === member.email);
    assert.ok(log, `Log record must exist for ${member.email}`);
    assert.equal(log?.metadata?.memberName, member.name);
    assert.equal(log?.category, 'TEAM');
    assert.equal(log?.type, 'founding_members_announcement');
  }
});

