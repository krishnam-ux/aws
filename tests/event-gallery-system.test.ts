import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/db';

test('db.eventPhotos can save, retrieve, and delete photos', async () => {
  const photoId = `test-photo-${Date.now()}`;
  const mockBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  
  const photoRecord = {
    id: photoId,
    data: mockBase64,
    mimeType: 'image/png',
    fileName: 'test.png',
    caption: 'Inauguration Keynote Session',
    uploadedAt: new Date().toISOString(),
    size: 100
  };

  // 1. Save photo
  await db.eventPhotos.save(photoId, photoRecord);

  // 2. Retrieve photo
  const retrieved = await db.eventPhotos.get(photoId);
  assert.ok(retrieved, 'Retrieved photo should exist');
  assert.equal(retrieved.id, photoId);
  assert.equal(retrieved.caption, 'Inauguration Keynote Session');
  assert.equal(retrieved.mimeType, 'image/png');

  // 3. Verify in map
  const map = await db.eventPhotos.getMap();
  assert.ok(map[photoId], 'Photo should exist in map');

  // 4. Delete photo
  await db.eventPhotos.delete(photoId);
  const afterDelete = await db.eventPhotos.get(photoId);
  assert.equal(afterDelete, null, 'Deleted photo should not exist');
});

test('Event Gallery isolation: 1st event gallery photos do not affect other events', async () => {
  const events = await db.events.getAll();
  assert.ok(events.length >= 2, 'Should have at least 2 events');

  const event1 = events[0];
  const event2 = events[1];

  const testPhoto1 = {
    id: `photo-evt1-1`,
    url: `/api/event-photos?id=photo-evt1-1`,
    caption: 'Cloud Kickstart Stage',
    uploadedAt: new Date().toISOString()
  };

  const testPhoto2 = {
    id: `photo-evt1-2`,
    url: `/api/event-photos?id=photo-evt1-2`,
    caption: 'Student Builders Gathering',
    uploadedAt: new Date().toISOString()
  };

  // Add photos to event 1
  const originalEvent1Gallery = event1.gallery || [];
  const originalEvent2Gallery = event2.gallery || [];

  event1.gallery = [testPhoto1, testPhoto2];
  event2.gallery = [];

  await db.events.saveAll(events);

  // Re-fetch events
  const refreshedEvents = await db.events.getAll();
  const refEvent1 = refreshedEvents.find((e: any) => e.id === event1.id);
  const refEvent2 = refreshedEvents.find((e: any) => e.id === event2.id);

  assert.ok(refEvent1, 'Event 1 must exist');
  assert.ok(refEvent2, 'Event 2 must exist');
  assert.equal(refEvent1.gallery.length, 2, 'Event 1 should have exactly 2 gallery photos');
  assert.equal(refEvent1.gallery[0].id, 'photo-evt1-1');
  assert.equal(refEvent1.gallery[1].id, 'photo-evt1-2');
  assert.equal(refEvent2.gallery?.length || 0, 0, 'Event 2 should have 0 gallery photos (isolated)');

  // Clean up test photos
  event1.gallery = originalEvent1Gallery;
  event2.gallery = originalEvent2Gallery;
  await db.events.saveAll(events);
});

test('Event individual photo deletion removes photo from event gallery', async () => {
  const events = await db.events.getAll();
  const event1 = events[0];
  const originalGallery = event1.gallery || [];

  const photoA = { id: 'photo-a', url: '/api/event-photos?id=photo-a', caption: 'A' };
  const photoB = { id: 'photo-b', url: '/api/event-photos?id=photo-b', caption: 'B' };
  const photoC = { id: 'photo-c', url: '/api/event-photos?id=photo-c', caption: 'C' };

  event1.gallery = [photoA, photoB, photoC];
  await db.events.saveAll(events);

  // Remove photoB
  const updatedEvents = await db.events.getAll();
  const targetEvent = updatedEvents.find((e: any) => e.id === event1.id);
  targetEvent.gallery = targetEvent.gallery.filter((p: any) => p.id !== 'photo-b');
  await db.events.saveAll(updatedEvents);

  // Verify result
  const finalEvents = await db.events.getAll();
  const finalEvent1 = finalEvents.find((e: any) => e.id === event1.id);
  assert.equal(finalEvent1.gallery.length, 2);
  assert.deepEqual(finalEvent1.gallery.map((p: any) => p.id), ['photo-a', 'photo-c']);

  // Restore original gallery
  finalEvent1.gallery = originalGallery;
  await db.events.saveAll(finalEvents);
});
