import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as adminHandler } from '../src/app/api/admin/route';
import { GET as eventPhotosHandler } from '../src/app/api/event-photos/route';
import { GET as eventsHandler } from '../src/app/api/events/route';
import { POST as registerHandler } from '../src/app/api/event-register/route';
import { db } from '../src/lib/db';

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';

test('End-to-End: Admin photo upload, public serving, event gallery isolation, delete, and registration', async () => {
  const events = await db.events.getAll();
  const event1 = events[0];
  const initialGallery = event1.gallery || [];

  // Tiny 1x1 valid PNG base64
  const testPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  // 1. Admin uploads photo 1 for event 1
  const uploadReq1 = new Request('http://localhost:3000/api/admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SECURE_TOKEN}`
    },
    body: JSON.stringify({
      action: 'upload-event-photo',
      base64Data: testPng,
      fileName: 'inauguration-1.png',
      caption: 'Inauguration Ceremony Stage',
      eventId: event1.id
    })
  });

  const uploadRes1 = await adminHandler(uploadReq1);
  assert.equal(uploadRes1.status, 200);
  const uploadData1 = await uploadRes1.json();
  assert.equal(uploadData1.success, true);
  assert.ok(uploadData1.photo);
  assert.ok(uploadData1.photo.id);
  assert.ok(uploadData1.photo.url.includes(uploadData1.photo.id));

  const photoId1 = uploadData1.photo.id;

  // 2. Admin uploads photo 2 for event 1
  const uploadReq2 = new Request('http://localhost:3000/api/admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SECURE_TOKEN}`
    },
    body: JSON.stringify({
      action: 'upload-event-photo',
      base64Data: testPng,
      fileName: 'inauguration-2.png',
      caption: 'Student Builders Workshop',
      eventId: event1.id
    })
  });

  const uploadRes2 = await adminHandler(uploadReq2);
  const uploadData2 = await uploadRes2.json();
  assert.equal(uploadData2.success, true);
  const photoId2 = uploadData2.photo.id;

  // 3. Test public photo serving via GET /api/event-photos?id=...
  const serveReq = new Request(`http://localhost:3000/api/event-photos?id=${photoId1}`);
  const serveRes = await eventPhotosHandler(serveReq);
  assert.equal(serveRes.status, 200);
  assert.equal(serveRes.headers.get('Content-Type'), 'image/png');
  assert.ok(serveRes.headers.get('Cache-Control')?.includes('immutable'));
  const photoBuffer = await serveRes.arrayBuffer();
  assert.ok(photoBuffer.byteLength > 0);

  // 4. Test public GET /api/events
  const eventsRes = await eventsHandler();
  assert.equal(eventsRes.status, 200);
  const publicEvents = await eventsRes.json();
  const pubEvt1 = publicEvents.find((e: any) => e.id === event1.id);
  const pubEvt2 = publicEvents.find((e: any) => e.id !== event1.id);

  assert.ok(pubEvt1, 'Public Event 1 must be present');
  assert.ok(Array.isArray(pubEvt1.gallery), 'Event 1 must have gallery array');
  assert.ok(pubEvt1.gallery.some((p: any) => p.id === photoId1), 'Gallery must contain photo 1');
  assert.ok(pubEvt1.gallery.some((p: any) => p.id === photoId2), 'Gallery must contain photo 2');

  if (pubEvt2) {
    const pubEvt2Gallery = pubEvt2.gallery || [];
    assert.equal(
      pubEvt2Gallery.some((p: any) => p.id === photoId1 || p.id === photoId2),
      false,
      'Event 2 gallery must not contain Event 1 photos (strict isolation)'
    );
  }

  // 5. Test Admin deleting an individual photo (photo 2)
  const deleteReq = new Request('http://localhost:3000/api/admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SECURE_TOKEN}`
    },
    body: JSON.stringify({
      action: 'delete-event-photo',
      id: photoId2,
      eventId: event1.id
    })
  });

  const deleteRes = await adminHandler(deleteReq);
  assert.equal(deleteRes.status, 200);
  const deleteData = await deleteRes.json();
  assert.equal(deleteData.success, true);

  // Verify photo 2 is removed from event gallery and photo 1 remains
  const afterDeleteEvents = await db.events.getAll();
  const refEvt1 = afterDeleteEvents.find((e: any) => e.id === event1.id);
  assert.ok(refEvt1.gallery.some((p: any) => p.id === photoId1), 'Photo 1 must remain in gallery');
  assert.equal(refEvt1.gallery.some((p: any) => p.id === photoId2), false, 'Photo 2 must be deleted from gallery');

  // Verify deleted photo 2 returns 404 from public endpoint
  const deletedPhotoReq = new Request(`http://localhost:3000/api/event-photos?id=${photoId2}`);
  const deletedPhotoRes = await eventPhotosHandler(deletedPhotoReq);
  assert.equal(deletedPhotoRes.status, 404);

  // 6. Test existing Event Registration still functions
  const regReq = new Request('http://localhost:3000/api/event-register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventId: event1.id,
      fullName: 'Test Student',
      email: 'test.student@example.com',
      phone: '+91 9876543210',
      university: 'Chandigarh University – Uttar Pradesh',
      program: 'B.Tech CSE',
      year: '2nd Year',
      studentId: '2024BCS9999',
      interests: ['AWS Cloud', 'DevOps'],
      experienceLevel: 'Beginner',
      linkedin: 'https://linkedin.com/in/teststudent',
      github: 'https://github.com/teststudent',
      motivation: 'Want to participate in cloud workshops.',
      consent: true
    })
  });

  const regRes = await registerHandler(regReq);
  assert.equal(regRes.status, 200);
  const regData = await regRes.json();
  assert.equal(regData.success, true);

  // 7. Cleanup test photo 1 and test registration
  await db.eventPhotos.delete(photoId1);
  const cleanEvents = await db.events.getAll();
  const cleanEvt1 = cleanEvents.find((e: any) => e.id === event1.id);
  cleanEvt1.gallery = initialGallery;
  await db.events.saveAll(cleanEvents);

  const cleanRegs = await db.eventRegistrations.getAll();
  const filteredRegs = cleanRegs.filter((r: any) => r.email !== 'test.student@example.com');
  await db.eventRegistrations.saveAll(filteredRegs);
});
