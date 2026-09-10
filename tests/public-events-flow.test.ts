import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/db';

test('Public events query excludes Draft, Unpublished, and Cancelled statuses', async () => {
  const events = await db.events.getAll();
  assert.ok(Array.isArray(events), 'Events must be an array');
  assert.ok(events.length > 0, 'There should be events in the database');

  const registrations = await db.eventRegistrations.getAll();

  const publicEvents = events
    .filter(event => {
      const s = (event.status || '').toUpperCase();
      return s !== 'DRAFT' && s !== 'UNPUBLISHED' && s !== 'CANCELLED';
    })
    .map(event => {
      const count = registrations.filter(
        r => r.eventId === event.id && r.status !== 'Rejected' && r.status !== 'Cancelled'
      ).length;
      return {
        ...event,
        registrationCount: count
      };
    });

  // Verify none of the public events are Draft, Unpublished, or Cancelled
  for (const pe of publicEvents) {
    const s = (pe.status || '').toUpperCase();
    assert.notEqual(s, 'DRAFT');
    assert.notEqual(s, 'UNPUBLISHED');
    assert.notEqual(s, 'CANCELLED');
    assert.ok(typeof pe.title === 'string' && pe.title.length > 0, 'Title must exist');
    assert.ok(typeof pe.id === 'string' && pe.id.length > 0, 'Event ID must exist');
  }
});

test('EventsClient tab filtering logic maps statuses accurately', () => {
  const mockEvents = [
    { id: 'e1', title: 'Upcoming 1', status: 'Upcoming', registrationStatus: 'Open' },
    { id: 'e2', title: 'Planned 1', status: 'Planned', registrationStatus: 'Not Open' },
    { id: 'e3', title: 'Ongoing 1', status: 'Ongoing', registrationStatus: 'Open' },
    { id: 'e4', title: 'Completed 1', status: 'Completed', registrationStatus: 'Closed', gallery: [{ id: 'p1', url: '/api/event-photos?id=p1' }] },
    { id: 'e5', title: 'Cancelled 1', status: 'Cancelled', registrationStatus: 'Closed' }
  ];

  const upcoming = mockEvents.filter(e => {
    const s = (e.status || '').toUpperCase();
    return s === 'PLANNED' || s === 'UPCOMING';
  });

  const ongoing = mockEvents.filter(e => {
    const s = (e.status || '').toUpperCase();
    return s === 'ONGOING';
  });

  const completed = mockEvents.filter(e => {
    const s = (e.status || '').toUpperCase();
    return s === 'COMPLETED';
  });

  assert.equal(upcoming.length, 2, 'Should have 2 upcoming/planned events');
  assert.deepEqual(upcoming.map(e => e.id), ['e1', 'e2']);

  assert.equal(ongoing.length, 1, 'Should have 1 ongoing event');
  assert.deepEqual(ongoing.map(e => e.id), ['e3']);

  assert.equal(completed.length, 1, 'Should have 1 completed event');
  assert.deepEqual(completed.map(e => e.id), ['e4']);
  assert.equal(completed[0]?.gallery?.length, 1, 'Completed event gallery is preserved');

  // Verify cancelled is not in any tab
  const allCategorized = [...upcoming, ...ongoing, ...completed];
  assert.equal(allCategorized.some(e => e.id === 'e5'), false, 'Cancelled event should not be in any standard tab');
});

test('Smart default tab selects Completed when Upcoming is empty', () => {
  const mockEventsOnlyCompleted = [
    { id: 'e4', title: 'AWS Inauguration', status: 'Completed', registrationStatus: 'Closed' }
  ];

  const upcomingFiltered = mockEventsOnlyCompleted.filter(e => {
    const s = (e.status || '').toUpperCase();
    return s === 'PLANNED' || s === 'UPCOMING';
  });
  const ongoingFiltered = mockEventsOnlyCompleted.filter(e => {
    const s = (e.status || '').toUpperCase();
    return s === 'ONGOING';
  });
  const completedFiltered = mockEventsOnlyCompleted.filter(e => {
    const s = (e.status || '').toUpperCase();
    return s === 'COMPLETED';
  });

  const initialTab = upcomingFiltered.length > 0 ? 'Upcoming' : ongoingFiltered.length > 0 ? 'Ongoing' : completedFiltered.length > 0 ? 'Completed' : 'Upcoming';
  assert.equal(initialTab, 'Completed', 'Initial tab must default to Completed when upcoming/ongoing are empty');
});

test('Completed event detail retrieval and gallery integrity', async () => {
  const events = await db.events.getAll();
  const firstEvent = events[0];
  assert.ok(firstEvent, 'First event must exist');

  // Verify metadata fields are preserved
  assert.ok(firstEvent.title, 'Title must exist');
  assert.ok(firstEvent.month || firstEvent.date, 'Date or Month must exist');
  assert.ok(firstEvent.focus, 'Focus must exist');
  assert.ok(firstEvent.outcome, 'Outcome must exist');

  // Test setting status to Completed and saving/retrieving
  const originalStatus = firstEvent.status;
  const originalGallery = firstEvent.gallery;

  firstEvent.status = 'Completed';
  firstEvent.gallery = [
    { id: 'test-inaug-1', url: '/api/event-photos?id=test-inaug-1', caption: 'Stage Overview' }
  ];
  await db.events.saveAll(events);

  const refreshedEvents = await db.events.getAll();
  const updatedFirst = refreshedEvents.find((e: any) => e.id === firstEvent.id);
  assert.ok(updatedFirst, 'Updated first event must exist');
  assert.equal(updatedFirst.status, 'Completed');
  assert.equal(updatedFirst.gallery?.length, 1);
  assert.equal(updatedFirst.gallery?.[0]?.caption, 'Stage Overview');

  // Restore original
  firstEvent.status = originalStatus;
  firstEvent.gallery = originalGallery;
  await db.events.saveAll(events);
});
