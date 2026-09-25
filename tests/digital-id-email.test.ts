import test, { describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// Isolate unit tests to local store to eliminate remote latency
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;

import { db } from '../src/lib/db';
import { sendDigitalIdEmail } from '../src/lib/digitalIdEmail';
import { generateDigitalIdPdfBuffer } from '../src/lib/digitalIdPdf';
import { getVerificationUrl, getCardUrl } from '../src/lib/digitalIdUtils';
import { POST as sendDigitalIdApiRoute } from '../src/app/api/admin/digital-ids/send/route';
import { POST as adminDigitalIdsRoute, GET as adminDigitalIdsGetRoute } from '../src/app/api/admin/digital-ids/route';
import { DigitalIdentity } from '../src/types/digitalIdentity';
import { OFFICIAL_SENDERS } from '../src/lib/email/senders';
import { DEFAULT_EMAIL_TEMPLATES, interpolateVariables } from '../src/lib/email/templates';

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';

// Sample 1x1 transparent PNG as base64 for test identities
const SAMPLE_VALID_PNG_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('Send Digital ID Email System Tests', () => {
  const testIdsToCleanup: string[] = [];

  afterEach(async () => {
    for (const id of testIdsToCleanup) {
      try {
        await db.digitalIdentities.deleteById(id);
      } catch {
        // ignore
      }
    }
    testIdsToCleanup.length = 0;
  });

  // -------------------------------------------------------------
  // Test 1: Admin Authorization Enforcement
  // -------------------------------------------------------------
  test('1. Admin authorization: Rejects unauthorized requests to /api/admin/digital-ids/send with 401', async () => {
    // Request with no Authorization header
    const reqNoAuth = new Request('http://localhost:3000/api/admin/digital-ids/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId: 'CT-CUUP-001' })
    });

    const resNoAuth = await sendDigitalIdApiRoute(reqNoAuth);
    assert.equal(resNoAuth.status, 401);
    const dataNoAuth = await resNoAuth.json();
    assert.ok(dataNoAuth.error?.includes('Unauthorized'));

    // Request with invalid bearer token
    const reqBadAuth = new Request('http://localhost:3000/api/admin/digital-ids/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-secret-token'
      },
      body: JSON.stringify({ publicId: 'CT-CUUP-001' })
    });

    const resBadAuth = await sendDigitalIdApiRoute(reqBadAuth);
    assert.equal(resBadAuth.status, 401);

    // Also check POST /api/admin/digital-ids with action=send-email
    const reqAdminRouteNoAuth = new Request('http://localhost:3000/api/admin/digital-ids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send-email', publicId: 'CT-CUUP-001' })
    });

    const resAdminNoAuth = await adminDigitalIdsRoute(reqAdminRouteNoAuth);
    assert.equal(resAdminNoAuth.status, 401);
  });

  // -------------------------------------------------------------
  // Test 2: Active Digital ID Email Sending & Resend Integration
  // -------------------------------------------------------------
  test('2. Active Digital ID: Successfully generates PDF, builds branded template, and delivers email', async () => {
    const nextId = await db.digitalIdentities.getNextPublicId('Core Team');
    const memberEmail = `test.coreteam.${Date.now()}@university.edu`;

    const identity: DigitalIdentity = {
      id: `test-send-did-${Date.now()}`,
      publicId: nextId,
      fullName: 'Aarav Patel',
      email: memberEmail,
      memberType: 'Core Team',
      role: 'Cloud Architect Lead',
      domain: 'Cloud Architecture & DevOps',
      university: 'Chandigarh University – Uttar Pradesh',
      status: 'ACTIVE',
      photoUrl: SAMPLE_VALID_PNG_BASE64,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString()
    };

    await db.digitalIdentities.insertOne(identity);
    testIdsToCleanup.push(identity.id);

    // Dispatch via helper
    const result = await sendDigitalIdEmail({
      identityOrPublicId: nextId,
      adminId: 'admin-lead'
    });

    assert.equal(result.success, true);
    assert.equal(result.recipient, memberEmail);
    assert.ok(result.pdfFilename?.includes(nextId));
    assert.ok(result.pdfFilename?.endsWith('.pdf'));
    assert.ok(result.sendResult?.status === 'SENT' || result.sendResult?.status === 'SIMULATED');

    // Verify DB log entry
    const allLogs = await db.emailLogs.getAll();
    const log = allLogs.find(
      l => l.recipient === memberEmail && l.type === 'digital_id_card_delivery'
    );

    assert.ok(log, 'Email log must be persisted in database');
    assert.equal(log?.recipient, memberEmail);
    assert.equal(log?.category, 'IDENTITY');
    assert.ok(log?.subject.includes(nextId));
    assert.equal(log?.metadata?.digitalId, nextId);
    assert.equal(log?.metadata?.hasPdfAttachment, true);
    assert.ok(log?.metadata?.verificationUrl?.includes(nextId));
    assert.ok(log?.metadata?.cardUrl?.includes(nextId));
  });

  // -------------------------------------------------------------
  // Test 3: Dedicated Send API Endpoint & Admin Digital IDs Route
  // -------------------------------------------------------------
  test('3. API Endpoints: Handles POST /api/admin/digital-ids/send and POST /api/admin/digital-ids (action: send-email)', async () => {
    const nextId = await db.digitalIdentities.getNextPublicId('Founding Member');
    const memberEmail = `founder.${Date.now()}@awssbgcuup.tech`;

    const identity: DigitalIdentity = {
      id: `test-fmb-send-${Date.now()}`,
      publicId: nextId,
      fullName: 'Vikram Singh',
      email: memberEmail,
      memberType: 'Founding Member',
      role: 'Founding President',
      domain: 'Executive Leadership',
      university: 'Chandigarh University – Uttar Pradesh',
      status: 'ACTIVE',
      photoUrl: SAMPLE_VALID_PNG_BASE64,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString()
    };

    await db.digitalIdentities.insertOne(identity);
    testIdsToCleanup.push(identity.id);

    // Call dedicated POST /api/admin/digital-ids/send
    const req1 = new Request('http://localhost:3000/api/admin/digital-ids/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECURE_TOKEN}`
      },
      body: JSON.stringify({ publicId: nextId })
    });

    const res1 = await sendDigitalIdApiRoute(req1);
    assert.equal(res1.status, 200);
    const data1 = await res1.json();
    assert.equal(data1.success, true);
    assert.equal(data1.recipient, memberEmail);
    assert.ok(data1.pdfFilename?.includes(nextId));

    // Call POST /api/admin/digital-ids with action: send-email
    const customEmail = `custom.receiver.${Date.now()}@university.edu`;
    const req2 = new Request('http://localhost:3000/api/admin/digital-ids', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECURE_TOKEN}`
      },
      body: JSON.stringify({
        action: 'send-email',
        publicId: nextId,
        recipientEmail: customEmail
      })
    });

    const res2 = await adminDigitalIdsRoute(req2);
    assert.equal(res2.status, 200);
    const data2 = await res2.json();
    assert.equal(data2.success, true);
    assert.equal(data2.recipient, customEmail);

    // Query GET /api/admin/digital-ids?publicId=... to check returned emailLogs
    const reqGet = new Request(`http://localhost:3000/api/admin/digital-ids?publicId=${nextId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${SECURE_TOKEN}` }
    });

    const resGet = await adminDigitalIdsGetRoute(reqGet);
    assert.equal(resGet.status, 200);
    const dataGet = await resGet.json();
    assert.ok(dataGet.item);
    assert.ok(Array.isArray(dataGet.emailLogs));
    assert.ok(dataGet.emailLogs.length >= 2, 'Should include both email logs sent to this ID');
  });

  // -------------------------------------------------------------
  // Test 4: Missing & Invalid Recipient Email Rejection
  // -------------------------------------------------------------
  test('4. Missing & Invalid Email: Rejects with 400 status and clear error message', async () => {
    const nextId = await db.digitalIdentities.getNextPublicId('Anchor & Speaker');

    // Identity with no email
    const identity: DigitalIdentity = {
      id: `test-no-email-${Date.now()}`,
      publicId: nextId,
      fullName: 'Pooja Verma',
      email: '',
      memberType: 'Anchor & Speaker',
      role: 'Keynote Speaker',
      domain: 'Cloud AI & Public Speaking',
      university: 'Chandigarh University – Uttar Pradesh',
      status: 'ACTIVE',
      photoUrl: SAMPLE_VALID_PNG_BASE64,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString()
    };

    await db.digitalIdentities.insertOne(identity);
    testIdsToCleanup.push(identity.id);

    // Missing email in DB & request
    const resNoEmail = await sendDigitalIdEmail({ identityOrPublicId: nextId });
    assert.equal(resNoEmail.success, false);
    assert.equal(resNoEmail.status, 400);
    assert.ok(resNoEmail.error?.includes('missing'));

    // Invalid email address format
    const resInvalidEmail = await sendDigitalIdEmail({
      identityOrPublicId: nextId,
      recipientEmail: 'not-a-valid-email-format'
    });
    assert.equal(resInvalidEmail.success, false);
    assert.equal(resInvalidEmail.status, 400);
    assert.ok(resInvalidEmail.error?.includes('Invalid'));

    // Via API endpoint
    const reqApi = new Request('http://localhost:3000/api/admin/digital-ids/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECURE_TOKEN}`
      },
      body: JSON.stringify({
        publicId: nextId,
        recipientEmail: 'bad-email@@domain'
      })
    });

    const resApi = await sendDigitalIdApiRoute(reqApi);
    assert.equal(resApi.status, 400);
    const dataApi = await resApi.json();
    assert.ok(dataApi.error?.includes('Invalid'));
  });

  // -------------------------------------------------------------
  // Test 5: Suspended & Revoked Identity Rejection
  // -------------------------------------------------------------
  test('5. Suspended & Revoked IDs: Rejects emailing non-active credentials with 400 status', async () => {
    // 1. Suspended Identity
    const id1 = await db.digitalIdentities.getNextPublicId('Core Team');
    const suspendedIdentity: DigitalIdentity = {
      id: `test-suspended-${Date.now()}`,
      publicId: id1,
      fullName: 'Rahul Sharma',
      email: 'rahul.sharma@cumail.in',
      memberType: 'Core Team',
      role: 'Backend Lead',
      domain: 'Cloud Architecture',
      university: 'Chandigarh University – Uttar Pradesh',
      status: 'SUSPENDED',
      photoUrl: SAMPLE_VALID_PNG_BASE64,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString()
    };

    await db.digitalIdentities.insertOne(suspendedIdentity);
    testIdsToCleanup.push(suspendedIdentity.id);

    const resSuspended = await sendDigitalIdEmail({ identityOrPublicId: id1 });
    assert.equal(resSuspended.success, false);
    assert.equal(resSuspended.status, 400);
    assert.ok(resSuspended.error?.includes('SUSPENDED'));

    // 2. Revoked Identity
    const id2 = await db.digitalIdentities.getNextPublicId('Founding Member');
    const revokedIdentity: DigitalIdentity = {
      id: `test-revoked-${Date.now()}`,
      publicId: id2,
      fullName: 'Ananya Roy',
      email: 'ananya.roy@cumail.in',
      memberType: 'Founding Member',
      role: 'Former Lead',
      domain: 'Cloud Security',
      university: 'Chandigarh University – Uttar Pradesh',
      status: 'REVOKED',
      revokedReason: 'Completed academic tenure',
      photoUrl: SAMPLE_VALID_PNG_BASE64,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString()
    };

    await db.digitalIdentities.insertOne(revokedIdentity);
    testIdsToCleanup.push(revokedIdentity.id);

    const resRevoked = await sendDigitalIdEmail({ identityOrPublicId: id2 });
    assert.equal(resRevoked.success, false);
    assert.equal(resRevoked.status, 400);
    assert.ok(resRevoked.error?.includes('REVOKED'));

    // 3. Non-existent Identity (404)
    const resNotFound = await sendDigitalIdEmail({ identityOrPublicId: 'DID-NOT-EXIST-999' });
    assert.equal(resNotFound.success, false);
    assert.equal(resNotFound.status, 404);
  });

  // -------------------------------------------------------------
  // Test 6: PDF Attachment & Verification URL Integration
  // -------------------------------------------------------------
  test('6. PDF Attachment & Canonical Verification URL: Matches official layout & formats', async () => {
    const nextId = await db.digitalIdentities.getNextPublicId('Core Team');
    const identity: DigitalIdentity = {
      id: `test-pdf-verify-${Date.now()}`,
      publicId: nextId,
      fullName: 'Neha Gupta',
      email: 'neha.gupta@cumail.in',
      memberType: 'Core Team',
      role: 'UI/UX & Frontend Lead',
      domain: 'Web & Mobile',
      university: 'Chandigarh University – Uttar Pradesh',
      status: 'ACTIVE',
      photoUrl: SAMPLE_VALID_PNG_BASE64,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString()
    };

    await db.digitalIdentities.insertOne(identity);
    testIdsToCleanup.push(identity.id);

    // Verify PDF Buffer generation
    const pdfBuf = await generateDigitalIdPdfBuffer(identity);
    assert.ok(Buffer.isBuffer(pdfBuf));
    assert.ok(pdfBuf.length > 1000, 'PDF buffer must contain binary card data');
    assert.equal(pdfBuf.slice(0, 4).toString(), '%PDF', 'Must start with PDF magic bytes');

    // Verify Canonical Verification & Card URLs
    const expectedVerifyUrl = getVerificationUrl(nextId);
    const expectedCardUrl = getCardUrl(nextId);

    assert.ok(expectedVerifyUrl.includes(`/verify/${nextId}`));
    assert.ok(expectedCardUrl.includes(`/id/${nextId}`));

    // Verify Email Template Rendering
    const tpl = DEFAULT_EMAIL_TEMPLATES.find(t => t.type === 'digital_id_card_delivery');
    assert.ok(tpl, 'digital_id_card_delivery template must exist');

    const renderedSubject = interpolateVariables(tpl.subject, { publicId: nextId });
    assert.ok(renderedSubject.includes(nextId));

    const renderedHtml = interpolateVariables(tpl.bodyHtml, {
      memberName: identity.fullName,
      publicId: nextId,
      memberRole: identity.role,
      memberType: identity.memberType,
      memberDomain: identity.domain,
      verificationUrl: expectedVerifyUrl,
      cardUrl: expectedCardUrl,
      issuedDate: 'September 2026'
    });

    assert.ok(renderedHtml.includes('Neha Gupta'));
    assert.ok(renderedHtml.includes(nextId));
    assert.ok(renderedHtml.includes('UI/UX & Frontend Lead'));
    assert.ok(renderedHtml.includes(expectedVerifyUrl));
    assert.ok(renderedHtml.includes(expectedCardUrl));
    assert.ok(renderedHtml.includes('Digital ID Card PDF Attached'));
  });

  // -------------------------------------------------------------
  // Test 7: Verified Sender & No Credential Exposure
  // -------------------------------------------------------------
  test('7. Security: Uses verified noreply sender and never exposes sensitive credentials', async () => {
    assert.equal(OFFICIAL_SENDERS.NOREPLY, 'noreply@awssbgcuup.tech');

    const nextId = await db.digitalIdentities.getNextPublicId('Core Team');
    const identity: DigitalIdentity = {
      id: `test-security-${Date.now()}`,
      publicId: nextId,
      fullName: 'Security Auditor',
      email: 'security.auditor@cumail.in',
      memberType: 'Core Team',
      role: 'Security Lead',
      domain: 'Cloud Security',
      university: 'Chandigarh University – Uttar Pradesh',
      status: 'ACTIVE',
      photoUrl: SAMPLE_VALID_PNG_BASE64,
      verificationToken: 'did_tok_sensitive_super_secret_hash_998877',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString()
    };

    await db.digitalIdentities.insertOne(identity);
    testIdsToCleanup.push(identity.id);

    const req = new Request('http://localhost:3000/api/admin/digital-ids/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECURE_TOKEN}`
      },
      body: JSON.stringify({ publicId: nextId })
    });

    const res = await sendDigitalIdApiRoute(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    const dataStr = JSON.stringify(data);

    // Verify NO sensitive tokens leaked
    assert.ok(!dataStr.includes('RESEND_API_KEY'));
    assert.ok(!dataStr.includes('did_tok_sensitive_super_secret_hash_998877'));
    assert.ok(!dataStr.includes(SECURE_TOKEN));

    // Verify DB log does NOT leak tokens
    const logs = await db.emailLogs.getAll();
    const myLog = logs.find(l => l.recipient === 'security.auditor@cumail.in');
    assert.ok(myLog);
    const logStr = JSON.stringify(myLog);
    assert.ok(!logStr.includes('did_tok_sensitive_super_secret_hash_998877'));
  });
});
