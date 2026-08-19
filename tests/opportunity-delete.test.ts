import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const appsFilePath = path.join(process.cwd(), 'src', 'data', 'db', 'career_applications.json');
const resumesFilePath = path.join(process.cwd(), 'src', 'data', 'db', 'career_resume_files.json');

// Ensure database fallback envs are unset so fallback JSON files are used
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalKvUrl = process.env.KV_REST_API_URL;
const originalKvToken = process.env.KV_REST_API_TOKEN;

delete process.env.DATABASE_URL;
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;

// Backups
let originalAppsBackup: string | null = null;
let originalResumesBackup: string | null = null;

function setup() {
  originalAppsBackup = fs.existsSync(appsFilePath) ? fs.readFileSync(appsFilePath, 'utf-8') : null;
  originalResumesBackup = fs.existsSync(resumesFilePath) ? fs.readFileSync(resumesFilePath, 'utf-8') : null;
}

function restore() {
  if (originalAppsBackup === null) {
    if (fs.existsSync(appsFilePath)) fs.unlinkSync(appsFilePath);
  } else {
    fs.writeFileSync(appsFilePath, originalAppsBackup, 'utf-8');
  }

  if (originalResumesBackup === null) {
    if (fs.existsSync(resumesFilePath)) fs.unlinkSync(resumesFilePath);
  } else {
    fs.writeFileSync(resumesFilePath, originalResumesBackup, 'utf-8');
  }

  // Restore process.env
  if (originalDatabaseUrl !== undefined) process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalKvUrl !== undefined) process.env.KV_REST_API_URL = originalKvUrl;
  if (originalKvToken !== undefined) process.env.KV_REST_API_TOKEN = originalKvToken;
}

// Clear require cache for db and route modules to ensure clean fallback initialization
function clearCache() {
  try {
    delete require.cache[require.resolve('../src/lib/db.ts')];
    delete require.cache[require.resolve('../src/app/api/admin/route.ts')];
  } catch (e) {}
}

test('Opportunity deletion regression test suite', async (t) => {
  setup();
  clearCache();

  const { db } = await import('../src/lib/db');
  const { POST } = await import('../src/app/api/admin/route');

  const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';

  await t.test('a) successful deletion of an opportunity application', async () => {
    // Insert mock application
    const app = {
      id: 'test-app-id-1',
      opportunityId: 'opp-id-1',
      name: 'John Doe',
      email: 'john@example.com',
      consent: true,
      status: 'New'
    };
    await db.careerApplications.insertOne(app);

    // Verify it exists in db
    let apps = await db.careerApplications.getAll();
    assert.equal(apps.some(a => a.id === 'test-app-id-1'), true);

    // Call API to delete
    const req = new Request('http://localhost:3000/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECURE_TOKEN}`
      },
      body: JSON.stringify({
        action: 'delete-career-application',
        id: 'test-app-id-1'
      })
    });

    const res = await POST(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);

    // Verify deleted from db
    apps = await db.careerApplications.getAll();
    assert.equal(apps.some(a => a.id === 'test-app-id-1'), false);
  });

  await t.test('b) deleting a non-existent application does not throw and returns success', async () => {
    // Call API to delete a non-existent application
    const req = new Request('http://localhost:3000/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECURE_TOKEN}`
      },
      body: JSON.stringify({
        action: 'delete-career-application',
        id: 'non-existent-id'
      })
    });

    const res = await POST(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
  });

  await t.test('c) ensuring another Opportunity\'s application is not affected', async () => {
    // Insert applications for different opportunities
    const app1 = {
      id: 'test-app-id-2a',
      opportunityId: 'opp-id-a',
      name: 'Alice',
      email: 'alice@example.com',
      consent: true
    };
    const app2 = {
      id: 'test-app-id-2b',
      opportunityId: 'opp-id-b',
      name: 'Bob',
      email: 'bob@example.com',
      consent: true
    };
    await db.careerApplications.insertOne(app1);
    await db.careerApplications.insertOne(app2);

    // Delete app1
    const req = new Request('http://localhost:3000/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECURE_TOKEN}`
      },
      body: JSON.stringify({
        action: 'delete-career-application',
        id: 'test-app-id-2a'
      })
    });

    const res = await POST(req);
    assert.equal(res.status, 200);

    // Verify app1 is deleted, but app2 still exists
    const apps = await db.careerApplications.getAll();
    assert.equal(apps.some(a => a.id === 'test-app-id-2a'), false);
    assert.equal(apps.some(a => a.id === 'test-app-id-2b'), true);
  });

  await t.test('d) associated resume cleanup', async () => {
    // Insert app and corresponding resume
    const app = {
      id: 'test-app-id-3',
      opportunityId: 'opp-id-1',
      name: 'Charlie',
      email: 'charlie@example.com',
      consent: true,
      resumeUrl: 'admin-resume:test-app-id-3'
    };
    await db.careerApplications.insertOne(app);

    const resumeFiles = await db.resumeFiles.getMap();
    resumeFiles['test-app-id-3'] = {
      data: 'base64dummydata',
      mimeType: 'application/pdf',
      fileName: 'charlie-resume.pdf',
      size: 15
    };
    await db.resumeFiles.saveMap(resumeFiles);

    // Verify resume exists
    let resumes = await db.resumeFiles.getMap();
    assert.ok(resumes['test-app-id-3']);

    // Delete app via API
    const req = new Request('http://localhost:3000/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECURE_TOKEN}`
      },
      body: JSON.stringify({
        action: 'delete-career-application',
        id: 'test-app-id-3'
      })
    });

    const res = await POST(req);
    assert.equal(res.status, 200);

    // Verify resume file is deleted
    resumes = await db.resumeFiles.getMap();
    assert.equal(resumes['test-app-id-3'], undefined);
  });

  await t.test('e) unauthorized users cannot delete applications', async () => {
    // Insert mock application
    const app = {
      id: 'test-app-id-4',
      opportunityId: 'opp-id-1',
      name: 'Unauthorized Test',
      email: 'unauth@example.com',
      consent: true
    };
    await db.careerApplications.insertOne(app);

    // Try deleting with no token
    let req = new Request('http://localhost:3000/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-career-application', id: 'test-app-id-4' })
    });
    let res = await POST(req);
    assert.equal(res.status, 401);

    // Try deleting with invalid token
    req = new Request('http://localhost:3000/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token'
      },
      body: JSON.stringify({ action: 'delete-career-application', id: 'test-app-id-4' })
    });
    res = await POST(req);
    assert.equal(res.status, 401);

    // Verify application was NOT deleted
    const apps = await db.careerApplications.getAll();
    assert.equal(apps.some(a => a.id === 'test-app-id-4'), true);
  });

  restore();
});
