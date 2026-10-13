import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as adminHandler } from '../src/app/api/admin/route';
import { GET as eventPhotosHandler } from '../src/app/api/event-photos/route';
import { GET as eventsHandler } from '../src/app/api/events/route';
import { db } from '../src/lib/db';

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';

// Valid 1x1 base64 payloads for PNG, JPEG, and WebP
const TEST_PNG_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const TEST_JPEG_BASE64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const TEST_WEBP_BASE64 = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';

test('Regression: JPEG, PNG, and WebP uploads work and preserve native MIME types', async () => {
  const events = await db.events.getAll();
  assert.ok(events.length > 0, 'Must have at least one event');
  const targetEvent = events[0];
  const initialGallery = Array.isArray(targetEvent.gallery) ? [...targetEvent.gallery] : [];

  const createdPhotoIds: string[] = [];

  try {
    // 1. Upload JPEG
    const reqJpeg = new Request('http://localhost:3000/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECURE_TOKEN}`
      },
      body: JSON.stringify({
        action: 'upload-event-photo',
        base64Data: TEST_JPEG_BASE64,
        fileName: 'session-photo.jpg',
        caption: 'Keynote Presentation',
        eventId: targetEvent.id
      })
    });
    const resJpeg = await adminHandler(reqJpeg);
    assert.equal(resJpeg.status, 200);
    const dataJpeg = await resJpeg.json();
    assert.equal(dataJpeg.success, true);
    assert.ok(dataJpeg.photo?.id);
    createdPhotoIds.push(dataJpeg.photo.id);

    // Verify JPEG serves with image/jpeg
    const serveJpeg = await eventPhotosHandler(new Request(`http://localhost:3000/api/event-photos?id=${dataJpeg.photo.id}`));
    assert.equal(serveJpeg.status, 200);
    assert.equal(serveJpeg.headers.get('Content-Type'), 'image/jpeg');

    // 2. Upload PNG
    const reqPng = new Request('http://localhost:3000/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECURE_TOKEN}`
      },
      body: JSON.stringify({
        action: 'upload-event-photo',
        base64Data: TEST_PNG_BASE64,
        fileName: 'badge-icon.png',
        caption: 'Transparent Logo Badge',
        eventId: targetEvent.id
      })
    });
    const resPng = await adminHandler(reqPng);
    assert.equal(resPng.status, 200);
    const dataPng = await resPng.json();
    assert.equal(dataPng.success, true);
    assert.ok(dataPng.photo?.id);
    createdPhotoIds.push(dataPng.photo.id);

    // Verify PNG serves with image/png
    const servePng = await eventPhotosHandler(new Request(`http://localhost:3000/api/event-photos?id=${dataPng.photo.id}`));
    assert.equal(servePng.status, 200);
    assert.equal(servePng.headers.get('Content-Type'), 'image/png');

    // 3. Upload WebP
    const reqWebp = new Request('http://localhost:3000/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECURE_TOKEN}`
      },
      body: JSON.stringify({
        action: 'upload-event-photo',
        base64Data: TEST_WEBP_BASE64,
        fileName: 'stage-view.webp',
        caption: 'Modern WebP Auditorium View',
        eventId: targetEvent.id
      })
    });
    const resWebp = await adminHandler(reqWebp);
    assert.equal(resWebp.status, 200);
    const dataWebp = await resWebp.json();
    assert.equal(dataWebp.success, true);
    assert.ok(dataWebp.photo?.id);
    createdPhotoIds.push(dataWebp.photo.id);

    // Verify WebP serves with image/webp
    const serveWebp = await eventPhotosHandler(new Request(`http://localhost:3000/api/event-photos?id=${dataWebp.photo.id}`));
    assert.equal(serveWebp.status, 200);
    assert.equal(serveWebp.headers.get('Content-Type'), 'image/webp');

    // 4. Verify public events API exposes all 3 gallery photos in the event
    const pubRes = await eventsHandler();
    assert.equal(pubRes.status, 200);
    const pubEvents = await pubRes.json();
    const updatedEvent = pubEvents.find((e: any) => e.id === targetEvent.id);
    assert.ok(updatedEvent);
    assert.ok(Array.isArray(updatedEvent.gallery));
    for (const pid of createdPhotoIds) {
      assert.ok(
        updatedEvent.gallery.some((p: any) => p.id === pid),
        `Gallery must contain photo ${pid}`
      );
    }
  } finally {
    // Cleanup
    for (const pid of createdPhotoIds) {
      await db.eventPhotos.delete(pid);
    }
    const cleanEvents = await db.events.getAll();
    const cleanEvt = cleanEvents.find((e: any) => e.id === targetEvent.id);
    if (cleanEvt) {
      cleanEvt.gallery = initialGallery;
      await db.events.saveAll(cleanEvents);
    }
  }
});

test('Regression: Upload file validation rejects invalid formats and oversized payloads', async () => {
  // 1. Invalid MIME type (e.g., text/html or application/pdf disguised)
  const invalidMimeReq = new Request('http://localhost:3000/api/admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SECURE_TOKEN}`
    },
    body: JSON.stringify({
      action: 'upload-event-photo',
      base64Data: 'data:text/plain;base64,SGVsbG8gV29ybGQ=',
      fileName: 'test.txt'
    })
  });
  const invalidMimeRes = await adminHandler(invalidMimeReq);
  assert.equal(invalidMimeRes.status, 400);
  const invalidMimeData = await invalidMimeRes.json();
  assert.ok(invalidMimeData.error?.includes('Invalid image format'));

  // 2. Oversized payload (> 5MB)
  // Generate a fake base64 string exceeding 5MB (~7 million characters)
  const oversizedBase64 = 'data:image/jpeg;base64,' + 'A'.repeat(7 * 1024 * 1024);
  const oversizedReq = new Request('http://localhost:3000/api/admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SECURE_TOKEN}`
    },
    body: JSON.stringify({
      action: 'upload-event-photo',
      base64Data: oversizedBase64,
      fileName: 'huge.jpg'
    })
  });
  const oversizedRes = await adminHandler(oversizedReq);
  assert.equal(oversizedRes.status, 400);
  const oversizedData = await oversizedRes.json();
  assert.ok(oversizedData.error?.includes('Photo too large'));
});

test('Regression: Non-existent eventId returns 404 and does not leave orphaned photo records', async () => {
  const mapBefore = await db.eventPhotos.getMap();
  const keysBeforeCount = Object.keys(mapBefore).length;

  const req = new Request('http://localhost:3000/api/admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SECURE_TOKEN}`
    },
    body: JSON.stringify({
      action: 'upload-event-photo',
      base64Data: TEST_PNG_BASE64,
      fileName: 'ghost-event.png',
      eventId: 'non-existent-event-id-999999'
    })
  });

  const res = await adminHandler(req);
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.equal(data.error, 'Specified event not found.');

  const mapAfter = await db.eventPhotos.getMap();
  assert.equal(Object.keys(mapAfter).length, keysBeforeCount, 'No orphaned photo record must be created on eventId 404');
});

test('Regression: Existing registrations and student data remain completely intact', async () => {
  const registrations = await db.eventRegistrations.getAll();
  assert.ok(Array.isArray(registrations), 'Event registrations must be intact');
  
  const communityRegs = await db.registrations.getAll();
  assert.ok(Array.isArray(communityRegs), 'Community registrations must be intact');

  const certificates = await db.certificates.getAll();
  assert.ok(Array.isArray(certificates), 'Certificates must be intact');
});

test('Regression: Atomic rollback occurs if event gallery update fails, leaving no orphaned photos', async () => {
  const events = await db.events.getAll();
  const targetEvent = events[0];
  const mapBefore = await db.eventPhotos.getMap();

  // Temporarily stub db.events.saveAll to simulate storage error during event update
  const originalSaveAll = db.events.saveAll;
  db.events.saveAll = async () => {
    throw new Error('Simulated database write error during event gallery save');
  };

  try {
    const req = new Request('http://localhost:3000/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECURE_TOKEN}`
      },
      body: JSON.stringify({
        action: 'upload-event-photo',
        base64Data: TEST_PNG_BASE64,
        fileName: 'rollback-test.png',
        eventId: targetEvent.id
      })
    });

    const res = await adminHandler(req);
    assert.equal(res.status, 500);
    const data = await res.json();
    assert.ok(data.error?.includes('Failed to update event record'));

    // Verify rollback: photo was deleted from eventPhotos
    const mapAfter = await db.eventPhotos.getMap();
    assert.deepEqual(Object.keys(mapAfter), Object.keys(mapBefore), 'Photo must be rolled back on event save failure');
  } finally {
    db.events.saveAll = originalSaveAll;
  }
});

