import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const filePath = path.join(process.cwd(), 'src', 'data', 'db', 'event_registrations.json');
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalKvUrl = process.env.KV_REST_API_URL;
const originalKvToken = process.env.KV_REST_API_TOKEN;

test('detects configured postgres candidate names even when DATABASE_URL is absent', async () => {
  const fakePostgresUrl = 'postgres://user:pass@localhost:5432/testdb';
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalPostgresUrl = process.env.POSTGRES_URL;

  try {
    delete process.env.DATABASE_URL;
    process.env.POSTGRES_URL = fakePostgresUrl;

    const dbModule = await import(`../src/lib/db.ts?test=${Date.now()}`);
    const { hasConfiguredDatabase, getPostgresCandidates } = dbModule;

    assert.equal(hasConfiguredDatabase(), true);
    assert.deepEqual(getPostgresCandidates(), [fakePostgresUrl]);
  } finally {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalPostgresUrl === undefined) delete process.env.POSTGRES_URL; else process.env.POSTGRES_URL = originalPostgresUrl;
  }
});

test('persists attendance and status together when updating a registration', async () => {
  const originalBackup = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;

  try {
    delete process.env.DATABASE_URL;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;

    const dbModule = await import(`../src/lib/db.ts?test=${Date.now()}`);
    const { db } = dbModule;

    const reg = {
      id: 'reg-status-attendance-test',
      eventId: 'event-01',
      eventName: 'Test Event',
      name: 'Attendance Status Test',
      email: 'attendance-status@example.com',
      phone: '+91 98765 43210',
      university: 'Chandigarh University – Uttar Pradesh',
      program: 'B.Tech CSE',
      year: '2nd Year',
      studentId: 'ATT-001',
      interests: ['Cloud'],
      experienceLevel: 'Beginner',
      linkedin: '',
      github: '',
      motivation: 'Testing attendance persistence',
      consent: true,
      date: new Date().toISOString(),
      status: 'New',
      attendance: 'Registered',
      certificateId: null,
      notes: ''
    };

    await db.eventRegistrations.insertOne(reg);
    await db.eventRegistrations.updateOne(reg.id, { attendance: 'Attended', status: 'Attended' });

    const records = await db.eventRegistrations.getAll();
    const entry = records.find((item: any) => item.id === reg.id);
    assert.equal(entry?.attendance, 'Attended');
    assert.equal(entry?.status, 'Attended');

    const otherReg = { ...reg, id: 'reg-status-attendance-keep', email: 'other@example.com' };
    await db.eventRegistrations.insertOne(otherReg);
    await db.eventRegistrations.deleteOne(reg.id);

    const afterDelete = await db.eventRegistrations.getAll();
    assert.equal(afterDelete.some((item: any) => item.id === reg.id), false);
    assert.equal(afterDelete.some((item: any) => item.id === otherReg.id), true);
  } finally {
    if (originalBackup === null) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } else {
      fs.writeFileSync(filePath, originalBackup, 'utf-8');
    }
  }
});

test('invalidates cached registrations after delete so fresh reads reflect the latest state', async () => {
  const originalBackup = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;

  try {
    delete process.env.DATABASE_URL;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;

    const dbModule = await import(`../src/lib/db.ts?test=${Date.now()}`);
    const { db } = dbModule;

    const reg = {
      id: 'reg-cache-invalidation-test',
      eventId: 'event-01',
      eventName: 'Cache Invalidation Event',
      name: 'Cache Invalidation Test',
      email: 'cache-invalidation@example.com',
      phone: '+91 98765 43210',
      university: 'Chandigarh University – Uttar Pradesh',
      program: 'B.Tech CSE',
      year: '2nd Year',
      studentId: 'CACHE-001',
      interests: ['Cloud'],
      experienceLevel: 'Beginner',
      linkedin: '',
      github: '',
      motivation: 'Testing cache invalidation',
      consent: true,
      date: new Date().toISOString(),
      status: 'New',
      attendance: 'Registered',
      certificateId: null,
      notes: ''
    };

    await db.eventRegistrations.insertOne(reg);
    const beforeDelete = await db.eventRegistrations.getAll();
    assert.equal(beforeDelete.some((item: any) => item.id === reg.id), true);

    await db.eventRegistrations.deleteOne(reg.id);

    const freshAfterDelete = await db.eventRegistrations.getAll();
    assert.equal(freshAfterDelete.some((item: any) => item.id === reg.id), false);
  } finally {
    if (originalBackup === null) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } else {
      fs.writeFileSync(filePath, originalBackup, 'utf-8');
    }
  }
});

test('falls back to local JSON when DATABASE_URL is present but postgres is unavailable', async () => {
  const originalBackup = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;

  try {
    process.env.DATABASE_URL = 'not-a-valid-url';
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;

    const dbModule = await import(`../src/lib/db.ts?test=${Date.now()}`);
    const { db } = dbModule;

    const reg = {
      id: 'reg-db-fallback-test',
      eventId: 'event-01',
      eventName: 'AWS Student Builder Group — Production Sync Test',
      name: 'Fallback Test Student',
      email: 'fallback-test@example.com',
      phone: '+91 98765 43210',
      university: 'Chandigarh University – Uttar Pradesh',
      program: 'B.Tech CSE',
      year: '2nd Year',
      studentId: 'FALL-001',
      interests: ['Cloud', 'AI'],
      experienceLevel: 'Beginner',
      linkedin: '',
      github: '',
      motivation: 'Testing the JSON fallback path.',
      consent: true,
      date: new Date().toISOString(),
      status: 'New',
      attendance: 'Registered',
      certificateId: null,
      notes: ''
    };

    await db.eventRegistrations.insertOne(reg);
    const records = await db.eventRegistrations.getAll();

    assert.equal(records.some((entry: any) => entry.id === reg.id), true);

    const saved = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    assert.equal(saved.some((entry: any) => entry.id === reg.id), true);
  } finally {
    if (originalBackup === null) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } else {
      fs.writeFileSync(filePath, originalBackup, 'utf-8');
    }

    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalKvUrl === undefined) delete process.env.KV_REST_API_URL; else process.env.KV_REST_API_URL = originalKvUrl;
    if (originalKvToken === undefined) delete process.env.KV_REST_API_TOKEN; else process.env.KV_REST_API_TOKEN = originalKvToken;
  }
});
