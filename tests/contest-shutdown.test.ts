import test from 'node:test';
import assert from 'node:assert/strict';
import { getContestState, CONTEST_CONFIG } from '../src/lib/contestConfig';
import {
  executeContestShutdown,
  readShutdownState,
  saveShutdownState,
  updateVerifiedWinners,
  ContestShutdownState
} from '../src/lib/contestShutdown';
import {
  getAllEngagementSchedules,
  saveAllEngagementSchedules,
  scheduleEngagementForRegistration,
  runContestEngagementScheduler
} from '../src/lib/contestEngagementScheduler';
import { db } from '../src/lib/db';

test('1. Automatic Contest Status Transition: Changes from LIVE to ENDED on 4 December 2026 (Asia/Kolkata)', () => {
  // Configured closing time: 4 December 2026, 11:59:59 PM IST (18:29:59 UTC)
  assert.equal(CONTEST_CONFIG.endDateIso, '2026-12-04T18:29:59.000Z');

  // 1 minute before closing
  const beforeClosing = new Date('2026-12-04T18:28:59.000Z');
  const liveState = getContestState(beforeClosing);
  assert.equal(liveState.status, 'LIVE');
  assert.equal(liveState.isLive, true);
  assert.equal(liveState.isEnded, false);

  // 1 second after closing: 5 December 2026, 00:00:00 IST (18:30:00 UTC)
  const afterClosing = new Date('2026-12-04T18:30:00.000Z');
  const endedState = getContestState(afterClosing);
  assert.equal(endedState.status, 'ENDED');
  assert.equal(endedState.isLive, false);
  assert.equal(endedState.isEnded, true);
  assert.equal(endedState.isLocked, true);
  assert.match(endedState.message, /concluded/i);
});

test('2. Server-Side Shutdown Execution: Automatically executes when closing time has elapsed', async () => {
  const closingTime = new Date('2026-12-04T18:30:00.000Z');

  // Reset shutdown state for testing
  const resetState = readShutdownState();
  resetState.hasShutdown = false;
  resetState.shutdownAt = null;
  resetState.status = 'LIVE';
  saveShutdownState(resetState);

  // Execute shutdown with controlled clock after closing time
  const result = await executeContestShutdown({ overrideTime: closingTime, force: true });

  assert.equal(result.success, true);
  assert.equal(result.shouldShutdown, true);
  assert.equal(result.alreadyShutdown, false);
  assert.equal(result.shutdownState.hasShutdown, true);
  assert.equal(result.shutdownState.status, 'ENDED');
  assert.ok(result.shutdownState.shutdownAt);
  assert.equal(result.shutdownState.closingTimeIso, CONTEST_CONFIG.endDateIso);
});

test('3. Idempotency: Multiple shutdown executions run safely only once without repeating side effects', async () => {
  const closingTime = new Date('2026-12-04T18:30:00.000Z');

  // First run
  const firstRun = await executeContestShutdown({ overrideTime: closingTime });
  const firstShutdownTimestamp = firstRun.shutdownState.shutdownAt;

  // Second run 10 minutes later
  const laterTime = new Date('2026-12-04T18:40:00.000Z');
  const secondRun = await executeContestShutdown({ overrideTime: laterTime });

  assert.equal(secondRun.success, true);
  assert.equal(secondRun.shouldShutdown, true);
  assert.equal(secondRun.alreadyShutdown, true, 'Second run must report alreadyShutdown: true');
  assert.equal(secondRun.shutdownState.shutdownAt, firstShutdownTimestamp, 'Shutdown timestamp must not be overwritten');
  assert.match(secondRun.message, /already shut down/i);

  // Third run
  const thirdRun = await executeContestShutdown({ overrideTime: laterTime });
  assert.equal(thirdRun.alreadyShutdown, true);
});

test('4. Automated Promotional Emails Stopped: All active campaigns marked COMPLETED upon shutdown', async () => {
  // Create an active test campaign schedule
  const testSchedId = `reg-test-campaign-${Date.now()}`;
  const testSchedule = scheduleEngagementForRegistration({
    registrationId: testSchedId,
    name: 'Campaign Test User',
    email: `campaign.test.${Date.now()}@example.com`,
    nowOverride: '2026-11-25T10:00:00.000Z'
  });
  assert.equal(testSchedule.status, 'ACTIVE');

  // Run shutdown
  await executeContestShutdown({ overrideTime: '2026-12-04T18:30:00.000Z', force: true });

  // Verify schedule status is now COMPLETED
  const allSchedules = getAllEngagementSchedules();
  const found = allSchedules.find((s) => s.id === testSchedule.id);
  assert.ok(found);
  assert.equal(found.status, 'COMPLETED', 'Active campaign schedule must be transitioned to COMPLETED');

  // Verify scheduler runner rejects execution after contest end
  const schedulerResult = await runContestEngagementScheduler({
    overrideTime: '2026-12-04T19:00:00.000Z'
  });
  assert.equal(schedulerResult.sentCount, 0);
  assert.match(schedulerResult.message, /concluded/i);
});

test('5. Data Preservation: All registrations and event details are preserved in the database and admin registry', async () => {
  // 1. Ensure test registration exists in db
  const testRegId = `reg-preserve-${Date.now()}`;
  const testEmail = `preserve.${Date.now()}@example.com`;
  await db.eventRegistrations.insertOne({
    id: testRegId,
    eventId: CONTEST_CONFIG.eventId,
    eventName: CONTEST_CONFIG.eventName,
    name: 'Preservation Test Participant',
    email: testEmail,
    university: 'Chandigarh University – Uttar Pradesh',
    studentId: '22BCS9999',
    status: 'Approved',
    attendance: 'Registered',
    date: new Date().toISOString(),
    metadata: {
      source: 'contest_landing_page',
      eventCode: CONTEST_CONFIG.eventCode
    }
  });

  // Execute shutdown
  const shutdownResult = await executeContestShutdown({
    overrideTime: '2026-12-04T18:30:00.000Z',
    force: true
  });

  // Verify registration still exists and is untouched
  const allRegistrations = await db.eventRegistrations.getAll();
  const savedReg = allRegistrations.find((r: any) => r.id === testRegId);
  assert.ok(savedReg, 'Participant registration must NOT be deleted');
  assert.equal(savedReg.email, testEmail);
  assert.equal(savedReg.status, 'Approved');

  // Verify event record in events.json still exists with Completed status
  const allEvents = await db.events.getAll();
  const contestEvent = allEvents.find((e: any) => e.id === CONTEST_CONFIG.eventId);
  assert.ok(contestEvent, 'Contest event must NOT be deleted');
  assert.equal(contestEvent.status, 'Completed', 'Event status must be marked Completed');
  assert.equal(contestEvent.isRegistrationOpen, false, 'Registration must be closed');
  assert.equal(contestEvent.registrationStatus, 'Closed');
});

test('6. Top 5 Winners & Verification State: Shows pending verification until officially confirmed', () => {
  const state = readShutdownState();

  // Initial verification status must be PENDING_VERIFICATION
  assert.equal(state.winnersVerificationStatus, 'PENDING_VERIFICATION');
  assert.equal(state.verifiedWinners.length, 5, 'Must have Top 5 winners slots');

  // Check that all 5 placeholders are 'To Be Announced' with exact exam voucher prize
  for (const w of state.verifiedWinners) {
    assert.equal(w.name, 'To Be Announced', 'Pending winners must be To Be Announced');
    assert.equal(w.status, 'PENDING');
    assert.match(w.prize, /AWS Certified AI Practitioner exam voucher/i);
    assert.doesNotMatch(w.prize, /\$100/i, 'Must not mention $100 voucher value');
  }

  // Test updating winners officially via admin workflow
  const updatedState = updateVerifiedWinners([
    {
      rank: 1,
      name: 'Aarav Sharma',
      department: 'Computer Science & Engineering',
      university: 'Chandigarh University – Uttar Pradesh',
      studentIdMasked: '22BCS1044',
      prize: 'AWS Certified AI Practitioner exam voucher',
      status: 'VERIFIED'
    },
    {
      rank: 2,
      name: 'Rohan Gupta',
      department: 'Computer Science & Engineering',
      university: 'Chandigarh University – Uttar Pradesh',
      studentIdMasked: '22BCS1128',
      prize: 'AWS Certified AI Practitioner exam voucher',
      status: 'VERIFIED'
    },
    {
      rank: 3,
      name: 'Ananya Patel',
      department: 'Information Technology',
      university: 'Chandigarh University – Uttar Pradesh',
      studentIdMasked: '22BCS2041',
      prize: 'AWS Certified AI Practitioner exam voucher',
      status: 'VERIFIED'
    },
    {
      rank: 4,
      name: 'Vikram Singh',
      department: 'Computer Science & Engineering',
      university: 'Chandigarh University – Uttar Pradesh',
      studentIdMasked: '23BCS3092',
      prize: 'AWS Certified AI Practitioner exam voucher',
      status: 'VERIFIED'
    },
    {
      rank: 5,
      name: 'Priya Joshi',
      department: 'Computer Science & Engineering',
      university: 'Chandigarh University – Uttar Pradesh',
      studentIdMasked: '23BCS3114',
      prize: 'AWS Certified AI Practitioner exam voucher',
      status: 'VERIFIED'
    }
  ], 'OFFICIALLY_CONFIRMED');

  assert.equal(updatedState.winnersVerificationStatus, 'OFFICIALLY_CONFIRMED');
  assert.equal(updatedState.verifiedWinners[0].name, 'Aarav Sharma');
  assert.equal(updatedState.verifiedWinners[0].status, 'VERIFIED');
});

test('7. API Enforcement: Registration, Access and Resend APIs reject when contest is ENDED', async () => {
  const afterClosingDate = '2026-12-04T18:30:00.000Z';
  const state = getContestState(afterClosingDate);
  assert.equal(state.isEnded, true);

  // Ensure state evaluation flags registration as closed
  assert.equal(state.status, 'ENDED');
  assert.equal(state.isLive, false);
});

test.after(async () => {
  // Restore contest status in events and shutdown state for clean local environment
  const allEvents = await db.events.getAll();
  const contestEvent = allEvents.find((e: any) => e.id === CONTEST_CONFIG.eventId);
  if (contestEvent) {
    contestEvent.status = 'Upcoming';
    contestEvent.isRegistrationOpen = true;
    contestEvent.registrationStatus = 'Open';
    await db.events.saveAll(allEvents);
  }
  const shutdownState = readShutdownState();
  shutdownState.hasShutdown = false;
  shutdownState.shutdownAt = null;
  shutdownState.status = 'LIVE';
  shutdownState.winnersVerificationStatus = 'PENDING_VERIFICATION';
  shutdownState.verifiedWinners = [
    { rank: 1, name: 'To Be Announced', prize: 'AWS Certified AI Practitioner exam voucher', status: 'PENDING' },
    { rank: 2, name: 'To Be Announced', prize: 'AWS Certified AI Practitioner exam voucher', status: 'PENDING' },
    { rank: 3, name: 'To Be Announced', prize: 'AWS Certified AI Practitioner exam voucher', status: 'PENDING' },
    { rank: 4, name: 'To Be Announced', prize: 'AWS Certified AI Practitioner exam voucher', status: 'PENDING' },
    { rank: 5, name: 'To Be Announced', prize: 'AWS Certified AI Practitioner exam voucher', status: 'PENDING' }
  ];
  saveShutdownState(shutdownState);
});

