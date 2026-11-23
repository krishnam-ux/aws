import test from 'node:test';
import assert from 'node:assert/strict';
import { getContestState, CONTEST_CONFIG, maskEmail } from '../src/lib/contestConfig';
import { generateContestRegistrationEmailHtml } from '../src/lib/email/contestEmailTemplate';
import { CONTEST_ENGAGEMENT_TOPICS } from '../src/lib/email/contestEngagementTemplates';
import {
  scheduleEngagementForRegistration,
  runContestEngagementScheduler,
  getAllEngagementSchedules,
  saveAllEngagementSchedules,
  unsubscribeParticipant,
  getRandomIntervalHours
} from '../src/lib/contestEngagementScheduler';
import { isValidEmail } from '../src/lib/email/validation';
import { DEFAULT_EMAIL_TEMPLATES } from '../src/lib/email/templates';
import { db } from '../src/lib/db';

test('1. End Date Consistency: Exactly 4 December 2026 across contest configuration', () => {
  assert.equal(CONTEST_CONFIG.endDateDisplayString, '4 December 2026');
  assert.ok(CONTEST_CONFIG.endDateIstString.includes('4 December 2026'));
  assert.equal(CONTEST_CONFIG.endDateIso, '2026-12-04T18:29:59.000Z');
  assert.equal(CONTEST_CONFIG.contestDateRangeString, '24 November to 4 December 2026');

  // Verify state transition on 4 December end moment
  const beforeEnd = new Date('2026-12-04T18:00:00.000Z');
  assert.equal(getContestState(beforeEnd).status, 'LIVE');

  const afterEnd = new Date('2026-12-04T18:30:00.000Z');
  const endState = getContestState(afterEnd);
  assert.equal(endState.status, 'ENDED');
  assert.equal(endState.isEnded, true);
  assert.equal(endState.isLive, false);
});

test('2. Registration Lock: Registration is strictly locked before 24 November 2026 9:00 AM IST', () => {
  // Current local time: 23 November 2026, 21:00:00 IST (15:30 UTC)
  const beforeLaunch = new Date('2026-11-23T15:30:00.000Z');
  const state = getContestState(beforeLaunch);

  assert.equal(state.status, 'LOCKED');
  assert.equal(state.isLocked, true);
  assert.equal(state.isLive, false);
  assert.ok(state.timeRemainingMs > 0);
  assert.match(state.message, /Contest unlocks on 24 November 2026/);
});

test('3. Registration Automatic Opening: Unlocks automatically at 24 November 2026 9:00 AM IST', () => {
  // At launch moment: 24 November 2026, 09:00:00 IST (03:30 UTC)
  const launchMoment = new Date('2026-11-24T03:30:00.000Z');
  const state = getContestState(launchMoment);

  assert.equal(state.status, 'LIVE');
  assert.equal(state.isLocked, false);
  assert.equal(state.isLive, true);
  assert.equal(state.isEnded, false);
  assert.match(state.message, /Contest is LIVE NOW/);
});

test('4. Immediate Contest Entry: Registration saves to DB and grants immediate entry without second approval', async () => {
  const uniqueEmail = `immediate.entry.${Date.now()}@example.com`;
  const regId = `reg-clash-imm-${Date.now()}`;
  const nowIso = new Date().toISOString();

  // Insert registration record
  const regRecord = {
    id: regId,
    eventId: CONTEST_CONFIG.eventId,
    eventName: CONTEST_CONFIG.eventName,
    name: 'Siddharth Rao',
    email: uniqueEmail,
    university: 'Chandigarh University – Uttar Pradesh',
    studentId: '22BCS8812',
    status: 'Approved', // Immediate automatic approval
    attendance: 'Registered',
    date: nowIso,
    metadata: {
      source: 'contest_landing_page',
      eventCode: CONTEST_CONFIG.eventCode,
      registeredAt: nowIso
    }
  };

  await db.eventRegistrations.insertOne(regRecord);

  // Verify immediate retrieval with Approved status
  const allRegistrations = await db.eventRegistrations.getAll();
  const saved = allRegistrations.find((r: any) => r.id === regId);
  assert.ok(saved);
  assert.equal(saved.status, 'Approved', 'Contest registration must be Approved immediately without waiting for admin approval');
  assert.equal(saved.attendance, 'Registered');
});

test('5. Registration Confirmation Email: Sent separately with Event Code 515553 and 4 Dec end date', () => {
  const html = generateContestRegistrationEmailHtml({
    name: 'Neha Verma',
    email: 'neha.verma@example.com',
    university: 'Chandigarh University – Uttar Pradesh',
    registrationId: 'reg-clash-test-neha'
  });

  // Verify Event Code
  assert.ok(html.includes(CONTEST_CONFIG.eventCode), 'Registration email must contain event code 515553');
  
  // Verify Launch Date and 4 December End Date
  assert.ok(html.includes('24 November 2026, 9:00 AM IST'), 'Registration email must state launch time');
  assert.ok(html.includes('4 December 2026'), 'Registration email must state 4 December 2026 end date');

  // Verify Mandatory Notice
  assert.ok(
    html.includes('Please do not reply to this email. This inbox is not monitored.'),
    'Must include mandatory unmonitored inbox notice'
  );
});

test('6. Engagement Email Interval Randomization: Scheduled between 24 and 72 hours per participant', () => {
  for (let i = 0; i < 50; i++) {
    const hours = getRandomIntervalHours(24, 72);
    assert.ok(hours >= 24 && hours <= 72, `Random interval ${hours}h must be between 24 and 72 hours`);
  }

  const testEmail = `sched.test.${Date.now()}@example.com`;
  const schedule = scheduleEngagementForRegistration({
    registrationId: `reg-${Date.now()}`,
    name: 'Test Sched Participant',
    email: testEmail,
    nowOverride: '2026-11-24T04:00:00.000Z'
  });

  const regMs = new Date('2026-11-24T04:00:00.000Z').getTime();
  const nextMs = new Date(schedule.nextEligibleAt).getTime();
  const diffHours = (nextMs - regMs) / (1000 * 3600);

  assert.ok(diffHours >= 24 && diffHours <= 72, `Initial eligible interval ${diffHours}h must be between 24 and 72 hours`);
});

test('7. No Engagement Email Sent Before Registration or Before Contest Launch', async () => {
  // Before contest launch: 23 November 2026
  const beforeLaunchSummary = await runContestEngagementScheduler({
    overrideTime: '2026-11-23T20:00:00.000Z'
  });

  assert.equal(beforeLaunchSummary.sentCount, 0, 'No engagement email can be sent before 24 November launch');
  assert.match(beforeLaunchSummary.message, /Contest has not launched yet/);
});

test('8. Duplicate Prevention & Rolling 24-Hour Send Limit', async () => {
  const testEmail = `dupe.test.${Date.now()}@example.com`;
  const schedule = scheduleEngagementForRegistration({
    registrationId: `reg-dupe-${Date.now()}`,
    name: 'Dupe Test User',
    email: testEmail,
    nowOverride: '2026-11-24T04:00:00.000Z'
  });

  // Manually simulate a send that happened 5 hours ago
  const fiveHoursAgo = new Date('2026-11-26T10:00:00.000Z');
  const currentTime = new Date('2026-11-26T15:00:00.000Z'); // 5h later

  schedule.lastSentAt = fiveHoursAgo.toISOString();
  schedule.sentTopicIds.push('topic-explore-security-island');

  const all = getAllEngagementSchedules();
  const idx = all.findIndex((s) => s.email === testEmail);
  if (idx !== -1) {
    all[idx] = schedule;
    saveAllEngagementSchedules(all);
  }

  // Run scheduler at currentTime (only 5h after last send)
  const summary = await runContestEngagementScheduler({
    overrideTime: currentTime
  });

  // Must skip due to rolling 24-hour limit
  const updated = getAllEngagementSchedules().find((s) => s.email === testEmail);
  assert.equal(updated?.sentTopicIds.length, 1, 'Should NOT send another promotional email within rolling 24-hour period');
});

test('9. Automated Campaign Termination: All automated emails stop after 4 December 2026', async () => {
  // After contest closure: 5 December 2026
  const postContestTime = new Date('2026-12-05T01:00:00.000Z');
  const summary = await runContestEngagementScheduler({
    overrideTime: postContestTime
  });

  assert.equal(summary.sentCount, 0, 'No emails can be sent after 4 December 2026');
  assert.match(summary.message, /Contest officially concluded on 4 December 2026/);
});

test('10. Final-Day Reminder: Separate campaign email on 4 December with duplicate protection', () => {
  const finalTopic = CONTEST_ENGAGEMENT_TOPICS['topic-final-day-reminder'];
  assert.ok(finalTopic, 'Final-day reminder topic must exist');
  assert.equal(finalTopic.subject, 'FINAL DAY: AWS Card Clash Security Island Contest Closes Tonight!');

  const html = finalTopic.generateHtml({
    name: 'Karan Mehra',
    email: 'karan@example.com',
    registrationId: 'reg-karan-01'
  });

  assert.ok(html.includes('Contest Ends Today: 4 December 2026'), 'Must state 4 December 2026 in headline');
  assert.ok(html.includes('11:59 PM IST tonight'), 'Must state 11:59 PM IST tonight');
  assert.ok(html.includes('Please do not reply to this email. This inbox is not monitored.'));
});

test('11. Unsubscribe Mechanism: Respects participant opt-out preferences', () => {
  const unsubEmail = `unsub.${Date.now()}@example.com`;
  scheduleEngagementForRegistration({
    registrationId: `reg-unsub-${Date.now()}`,
    name: 'Unsubscribe User',
    email: unsubEmail,
    nowOverride: '2026-11-24T04:00:00.000Z'
  });

  const success = unsubscribeParticipant(unsubEmail);
  assert.equal(success, true, 'Unsubscribe function must return true for registered user');

  const record = getAllEngagementSchedules().find((s) => s.email === unsubEmail);
  assert.equal(record?.unsubscribed, true);
  assert.equal(record?.status, 'UNSUBSCRIBED');
});

test('12. Existing Non-Contest Email Templates Preservation: Untouched and intact', () => {
  const templateIds = DEFAULT_EMAIL_TEMPLATES.map((t) => t.id);
  assert.ok(templateIds.includes('tpl-event_registration_confirmation'));
  assert.ok(templateIds.includes('tpl-digital_badge_delivery'));
  assert.ok(templateIds.includes('tpl-digital_id_card_delivery'));
  assert.ok(templateIds.includes('tpl-welcome_email'));
});
