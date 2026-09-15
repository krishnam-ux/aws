import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/db';
import {
  isValidCalendarDate,
  isValidTimeString,
  parseTimeToMinutes,
  isEndTimeAfterStartTime,
  getEventMonthName,
  formatDisplayDate,
  parseEventDateTimeToMs,
  normalizeLegacyEventDate,
  validateEventPayload,
  ALLOWED_EVENT_STATUSES,
  ALLOWED_REGISTRATION_STATUSES
} from '../src/lib/eventDateUtils';
import { POST } from '../src/app/api/admin/route';

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';

function createAdminRequest(body: any): Request {
  return new Request('http://localhost:3000/api/admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SECURE_TOKEN}`
    },
    body: JSON.stringify(body)
  });
}

test('1. Calendar Date Validation - Strict YYYY-MM-DD and Calendar Integrity', () => {
  // Valid dates
  assert.equal(isValidCalendarDate('2026-09-20'), true, '2026-09-20 is valid');
  assert.equal(isValidCalendarDate('2026-08-22'), true, '2026-08-22 is valid');
  assert.equal(isValidCalendarDate('2028-02-29'), true, '2028-02-29 is a valid leap year date');
  assert.equal(isValidCalendarDate('2024-02-29'), true, '2024-02-29 is a valid leap year date');
  assert.equal(isValidCalendarDate('2000-02-29'), true, '2000-02-29 is a valid leap year date');

  // Invalid dates
  assert.equal(isValidCalendarDate('2026-02-29'), false, '2026-02-29 is non-leap year (rejected)');
  assert.equal(isValidCalendarDate('2026-02-30'), false, '2026-02-30 does not exist');
  assert.equal(isValidCalendarDate('2026-04-31'), false, 'April has only 30 days');
  assert.equal(isValidCalendarDate('2026-13-01'), false, 'Month 13 is invalid');
  assert.equal(isValidCalendarDate('2026-00-10'), false, 'Month 00 is invalid');
  assert.equal(isValidCalendarDate('2026-09-00'), false, 'Day 00 is invalid');
  assert.equal(isValidCalendarDate('2026-09-32'), false, 'Day 32 is invalid');
  assert.equal(isValidCalendarDate(''), false, 'Empty string is invalid');
  assert.equal(isValidCalendarDate(null), false, 'Null is invalid');
  assert.equal(isValidCalendarDate(undefined), false, 'Undefined is invalid');
  assert.equal(isValidCalendarDate('20/09/2026'), false, 'DD/MM/YYYY is not canonical YYYY-MM-DD');
  assert.equal(isValidCalendarDate('September 2026'), false, 'Month name is not canonical YYYY-MM-DD');
  assert.equal(isValidCalendarDate('Invalid Date'), false, 'Malformed string is invalid');
});

test('2. Time Validation & Ordering - 12-hour and 24-hour formats', () => {
  // Valid times
  assert.equal(isValidTimeString('10:00 AM'), true);
  assert.equal(isValidTimeString('8:30 PM'), true);
  assert.equal(isValidTimeString('12:00 PM'), true);
  assert.equal(isValidTimeString('12:00 AM'), true);
  assert.equal(isValidTimeString('14:30'), true);
  assert.equal(isValidTimeString('09:00'), true);
  assert.equal(isValidTimeString('TBA'), true);

  // Invalid times
  assert.equal(isValidTimeString('25:00'), false);
  assert.equal(isValidTimeString('13:00 PM'), false);
  assert.equal(isValidTimeString('10:65 AM'), false);
  assert.equal(isValidTimeString('invalid-time'), false);

  // Minutes parsing
  assert.equal(parseTimeToMinutes('10:00 AM'), 600);
  assert.equal(parseTimeToMinutes('12:00 PM'), 720);
  assert.equal(parseTimeToMinutes('1:30 PM'), 810);
  assert.equal(parseTimeToMinutes('12:00 AM'), 0);
  assert.equal(parseTimeToMinutes('14:30'), 870);

  // Time ordering: endTime > startTime
  assert.equal(isEndTimeAfterStartTime('10:00 AM', '12:00 PM'), true);
  assert.equal(isEndTimeAfterStartTime('8:30 PM', '10:30 PM'), true);
  assert.equal(isEndTimeAfterStartTime('10:00 AM', '10:00 AM'), false, 'Same start and end time is rejected');
  assert.equal(isEndTimeAfterStartTime('12:00 PM', '10:00 AM'), false, 'End before start is rejected');
  assert.equal(isEndTimeAfterStartTime('14:00', '13:00'), false, 'End before start is rejected');
});

test('3. Deterministic Timezone Handling - IST (Asia/Kolkata / UTC+05:30)', () => {
  const ts = parseEventDateTimeToMs('2026-09-20', '10:00 AM');
  assert.ok(ts !== null, 'Timestamp should be generated');

  // 2026-09-20 10:00:00 IST is 2026-09-20 04:30:00 UTC
  const d = new Date(ts!);
  assert.equal(d.toISOString(), '2026-09-20T04:30:00.000Z');

  // Month and display formatting
  assert.equal(getEventMonthName('2026-09-20'), 'September');
  assert.equal(getEventMonthName('2026-08-22'), 'August');
  assert.equal(getEventMonthName('2027-01-15'), 'January');
  assert.equal(getEventMonthName('September 2026'), 'September');

  assert.equal(formatDisplayDate('2026-09-20'), 'September 20, 2026');
  assert.equal(formatDisplayDate('September 2026'), 'September 2026');
});

test('4. Safe Legacy Normalization - Preserves existing records without data loss', () => {
  const normIso = normalizeLegacyEventDate('2026-08-22');
  assert.equal(normIso.canonicalDate, '2026-08-22');
  assert.equal(normIso.month, 'August');
  assert.equal(normIso.isLegacyMonthOnly, false);

  const normLegacy = normalizeLegacyEventDate('September 2026');
  assert.equal(normLegacy.month, 'September');
  assert.equal(normLegacy.isLegacyMonthOnly, true);
});

test('5. Event Payload Validator', () => {
  // Valid payload for create
  const validNew = {
    title: 'Cloud Security Deep Dive',
    date: '2026-09-25',
    time: '10:00 AM',
    endTime: '1:00 PM',
    venue: 'Auditorium Block A',
    format: 'Technical Workshop',
    status: 'Draft',
    registrationStatus: 'Not Open'
  };
  const v1 = validateEventPayload(validNew, { isNew: true });
  assert.equal(v1.valid, true);

  // Missing title
  const noTitle = { ...validNew, title: '' };
  const v2 = validateEventPayload(noTitle, { isNew: true });
  assert.equal(v2.valid, false);
  assert.equal(v2.field, 'title');

  // Invalid date for new event
  const badDate = { ...validNew, date: '2026-02-30' };
  const v3 = validateEventPayload(badDate, { isNew: true });
  assert.equal(v3.valid, false);
  assert.equal(v3.field, 'date');

  // End time before start time
  const badTime = { ...validNew, time: '2:00 PM', endTime: '1:00 PM' };
  const v4 = validateEventPayload(badTime, { isNew: true });
  assert.equal(v4.valid, false);
  assert.equal(v4.field, 'endTime');

  // Invalid status
  const badStatus = { ...validNew, status: 'UnknownStatus' };
  const v5 = validateEventPayload(badStatus, { isNew: true });
  assert.equal(v5.valid, false);
  assert.equal(v5.field, 'status');
});

test('6. Admin API: Create Event with Valid Date, Time and Status Transitions', async () => {
  const newEventPayload = {
    title: 'Builder & Console Login Workshop',
    date: '2026-09-20',
    time: '10:00 AM',
    endTime: '12:00 PM',
    venue: 'Chandigarh University – Uttar Pradesh',
    city: 'Lucknow',
    format: 'Hands-on Technical Workshop',
    description: 'Hands-on workshop on AWS console navigation and authentication.',
    focus: 'AWS IAM, Console Login, MFA, Cloud Fundamentals',
    outcome: 'Students securely configure IAM accounts and login to AWS console.',
    status: 'Draft',
    registrationStatus: 'Not Open',
    maxRegistrations: 100
  };

  const createReq = createAdminRequest({ action: 'create-event', event: newEventPayload });
  const createRes = await POST(createReq);
  assert.equal(createRes.status, 200);

  const createData = await createRes.json();
  assert.equal(createData.success, true);
  assert.ok(createData.event && createData.event.id);
  assert.equal(createData.event.title, 'Builder & Console Login Workshop');
  assert.equal(createData.event.date, '2026-09-20');
  assert.equal(createData.event.month, 'September');
  assert.equal(createData.event.status, 'Draft');

  const createdId = createData.event.id;

  // Test status transitions across all allowed statuses
  const statusCycle = ['Planned', 'Upcoming', 'Ongoing', 'Completed', 'Cancelled', 'Unpublished', 'Draft'];
  for (const nextStatus of statusCycle) {
    const updateReq = createAdminRequest({
      action: 'update-event',
      event: { id: createdId, status: nextStatus }
    });
    const updateRes = await POST(updateReq);
    assert.equal(updateRes.status, 200, `Status update to ${nextStatus} should succeed`);
    const updateData = await updateRes.json();
    assert.equal(updateData.success, true);
    assert.equal(updateData.event.status, nextStatus);
    assert.equal(updateData.event.date, '2026-09-20');
  }

  // Test editing event date & time
  const editReq = createAdminRequest({
    action: 'update-event',
    event: {
      id: createdId,
      date: '2026-09-22',
      time: '11:00 AM',
      endTime: '1:00 PM',
      status: 'Upcoming'
    }
  });
  const editRes = await POST(editReq);
  assert.equal(editRes.status, 200);
  const editData = await editRes.json();
  assert.equal(editData.success, true);
  assert.equal(editData.event.date, '2026-09-22');
  assert.equal(editData.event.time, '11:00 AM');
  assert.equal(editData.event.endTime, '1:00 PM');
  assert.equal(editData.event.month, 'September');

  // Clean up created event
  const deleteReq = createAdminRequest({ action: 'delete-event', id: createdId });
  const deleteRes = await POST(deleteReq);
  assert.equal(deleteRes.status, 200);
});

test('7. Admin API: Update Legacy Event without Date Errors', async () => {
  const events = await db.events.getAll();
  const legacyEvent = events.find((e: any) => e.date === 'September 2026' || e.month === 'September' || e.id === 'event-02');
  assert.ok(legacyEvent, 'Legacy event (event-02) must exist in DB');

  // Updating status on legacy event should NOT fail with "Date must be valid."
  const originalStatus = legacyEvent.status;
  const updateReq = createAdminRequest({
    action: 'update-event',
    event: { id: legacyEvent.id, status: 'Upcoming', registrationStatus: 'Open' }
  });
  const updateRes = await POST(updateReq);
  assert.equal(updateRes.status, 200);
  const updateData = await updateRes.json();
  assert.equal(updateData.success, true);
  assert.equal(updateData.event.status, 'Upcoming');
  assert.equal(updateData.event.registrationStatus, 'Open');

  // Restore status
  const restoreReq = createAdminRequest({
    action: 'update-event',
    event: { id: legacyEvent.id, status: originalStatus, registrationStatus: 'Not Open' }
  });
  await POST(restoreReq);
});

test('8. Existing Inauguration Event (event-01) Data & Gallery Integrity', async () => {
  const events = await db.events.getAll();
  const inaugEvent = events.find((e: any) => e.id === 'event-01');
  assert.ok(inaugEvent, 'event-01 must exist');
  assert.equal(inaugEvent.title, 'AWS Student Builder Group Inauguration & Cloud Kickstart');
  assert.equal(inaugEvent.date, '2026-08-22');
  assert.equal(inaugEvent.speaker, 'Vishnu Rachapudi');
  assert.equal(inaugEvent.month, 'August');
  assert.equal(inaugEvent.time, '8:30 PM');
  assert.equal(inaugEvent.endTime, '10:30 PM');

  // Verify associated registrations and feedback collections are intact
  const registrations = await db.eventRegistrations.getAll();
  assert.ok(Array.isArray(registrations), 'Registrations collection must be an array');

  const feedbacks = await db.feedback.getAll();
  assert.ok(Array.isArray(feedbacks), 'Feedbacks list must be array');
});
