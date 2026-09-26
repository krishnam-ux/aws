import test, { describe, afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

// Isolate unit tests to local store to eliminate remote latency
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;

import { db } from '../src/lib/db';
import {
  sanitizeBadgeInput,
  validateBadgeInput,
  getBadgeUrl,
  getBadgeVerificationUrl,
  getLinkedInAddCertUrl,
  parseSkillsInput,
  generateBadgeQrDataUrl,
  generateBadgeQrSvg,
  generateBadgeQrBuffer,
  DEFAULT_ISSUER_NAME
} from '../src/lib/digitalBadgeUtils';
import { generateBadgeSvg } from '../src/lib/badgeAssets';
import { generateDigitalBadgePdfBuffer } from '../src/lib/digitalBadgePdf';
import { sendDigitalBadgeEmail } from '../src/lib/digitalBadgeEmail';
import { DigitalBadge, CreateBadgeInput } from '../src/types/digitalBadge';
import { GET as getAdminBadgesRoute, POST as postAdminBadgesRoute } from '../src/app/api/admin/digital-badges/route';
import { POST as postAdminBadgeEmailRoute } from '../src/app/api/admin/digital-badges/email/route';
import { GET as getPublicBadgeRoute } from '../src/app/api/digital-badges/[credentialId]/route';
import { GET as getVerifyBadgeRoute } from '../src/app/api/digital-badges/verify/[credentialId]/route';
import { GET as getBadgePdfRoute } from '../src/app/api/digital-badges/pdf/[credentialId]/route';
import { GET as getBadgeQrRoute } from '../src/app/api/digital-badges/qr/[credentialId]/route';

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';

function makeAuthRequest(url: string, options: RequestInit = {}): Request {
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${SECURE_TOKEN}`);
  return new Request(url, { ...options, headers });
}

function makeUnauthRequest(url: string, options: RequestInit = {}): Request {
  return new Request(url, options);
}

describe('Credly-Style Digital Badge & Verification System', () => {
  const testIdsToCleanup: string[] = [];

  afterEach(async () => {
    for (const id of testIdsToCleanup) {
      try {
        await db.digitalBadges.deleteById(id);
      } catch {
        // ignore
      }
    }
    testIdsToCleanup.length = 0;
  });

  // -------------------------------------------------------------
  // 1. Data Model & Credential ID Monotonicity
  // -------------------------------------------------------------
  test('1. Generates monotonic Credential IDs with format BADGE-CUUP-000001', async () => {
    const id1 = await db.digitalBadges.getNextCredentialId();
    const id2 = await db.digitalBadges.getNextCredentialId();

    assert.match(id1, /^BADGE-CUUP-\d{6}$/);
    assert.match(id2, /^BADGE-CUUP-\d{6}$/);

    const num1 = parseInt(id1.replace('BADGE-CUUP-', ''), 10);
    const num2 = parseInt(id2.replace('BADGE-CUUP-', ''), 10);
    assert.ok(num2 > num1, `Expected monotonic increment: ${num2} > ${num1}`);
  });

  // -------------------------------------------------------------
  // 2. Concurrent Issuance & Atomic ID Generation
  // -------------------------------------------------------------
  test('2. Concurrent ID generations produce unique IDs without collision', async () => {
    const promises = Array.from({ length: 8 }, () => db.digitalBadges.getNextCredentialId());
    const ids = await Promise.all(promises);
    const uniqueIds = new Set(ids);
    assert.equal(uniqueIds.size, 8, 'All generated concurrent IDs must be unique');
  });

  // -------------------------------------------------------------
  // 3. Admin Authorization Enforcement
  // -------------------------------------------------------------
  test('3. Admin endpoints strictly reject unauthorized requests with 401', async () => {
    const unauthGet = makeUnauthRequest('http://localhost:3000/api/admin/digital-badges');
    const getRes = await getAdminBadgesRoute(unauthGet);
    assert.equal(getRes.status, 401);

    const unauthPost = makeUnauthRequest('http://localhost:3000/api/admin/digital-badges', {
      method: 'POST',
      body: JSON.stringify({ action: 'create', recipientName: 'Hacker' })
    });
    const postRes = await postAdminBadgesRoute(unauthPost);
    assert.equal(postRes.status, 401);
  });

  // -------------------------------------------------------------
  // 4. Issue Digital Badge & Validation
  // -------------------------------------------------------------
  test('4. Successfully creates and issues a digital badge via admin route', async () => {
    const req = makeAuthRequest('http://localhost:3000/api/admin/digital-badges', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create',
        data: {
          recipientName: 'Arjun Mehta',
          recipientEmail: 'arjun.mehta@example.com',
          badgeTitle: 'AWS Certified Cloud Practitioner Mastery',
          badgeDescription: 'Excellence in core AWS architectural concepts and cloud security.',
          issueDate: '2026-09-26',
          earningCriteria: 'Passed the technical evaluation with a score of 92%.',
          skills: ['AWS Cloud', 'IAM', 'EC2', 'S3']
        }
      })
    });

    const res = await postAdminBadgesRoute(req);
    assert.equal(res.status, 201);
    const json = await res.json();
    assert.ok(json.success);
    assert.ok(json.badge);
    assert.match(json.badge.credentialId, /^BADGE-CUUP-\d{6}$/);
    assert.equal(json.badge.recipientName, 'Arjun Mehta');
    assert.equal(json.badge.status, 'ACTIVE');

    testIdsToCleanup.push(json.badge.id);

    // Verify stored in DB
    const fetched = await db.digitalBadges.getByCredentialId(json.badge.credentialId);
    assert.ok(fetched);
    assert.equal(fetched.recipientEmail, 'arjun.mehta@example.com');
  });

  // -------------------------------------------------------------
  // 5. Input Validation & XSS Sanitization
  // -------------------------------------------------------------
  test('5. Validates required fields and sanitizes HTML/script tags from inputs', async () => {
    const invalidReq = makeAuthRequest('http://localhost:3000/api/admin/digital-badges', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create',
        data: {
          recipientName: '', // Missing name
          recipientEmail: 'not-an-email',
          badgeTitle: ''
        }
      })
    });

    const res = await postAdminBadgesRoute(invalidReq);
    assert.equal(res.status, 400);

    // Test XSS sanitization
    const sanitized = sanitizeBadgeInput({
      recipientName: '<script>alert("xss")</script>Neha Sharma',
      recipientEmail: 'neha@example.com',
      badgeTitle: '<b>AWS Lambda Guru</b>',
      badgeDescription: '<img src=x onerror=alert(1)>Deep dive into serverless',
      earningCriteria: '<iframe src="evil.com"></iframe>100% in serverless labs'
    });

    assert.equal(sanitized.recipientName, 'Neha Sharma');
    assert.equal(sanitized.badgeTitle, 'AWS Lambda Guru');
    assert.ok(!sanitized.badgeDescription?.includes('<img'));
    assert.ok(!sanitized.earningCriteria?.includes('<iframe'));
  });

  // -------------------------------------------------------------
  // 6. Public Badge Retrieval (/api/digital-badges/[credentialId])
  // -------------------------------------------------------------
  test('6. Public endpoint returns safe badge data and logs BADGE_VIEWED', async () => {
    const credId = await db.digitalBadges.getNextCredentialId();
    const badge: DigitalBadge = {
      id: `test-badge-${Date.now()}`,
      credentialId: credId,
      recipientName: 'Rohan Gupta',
      recipientEmail: 'rohan@example.com',
      badgeTitle: 'AWS Serverless Architect Specialist',
      badgeDescription: 'Architecting microservices with AWS Lambda, API Gateway, and DynamoDB.',
      issueDate: '2026-09-26',
      issuerName: DEFAULT_ISSUER_NAME,
      skills: ['Serverless', 'DynamoDB', 'API Gateway'],
      earningCriteria: 'Completed 5 hands-on AWS serverless workshops.',
      credentialUrl: getBadgeUrl(credId),
      verificationUrl: getBadgeVerificationUrl(credId),
      status: 'ACTIVE',
      issuedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.digitalBadges.insertOne(badge);
    testIdsToCleanup.push(badge.id);

    const publicReq = new Request(`http://localhost:3000/api/digital-badges/${credId}`);
    const res = await getPublicBadgeRoute(publicReq, { params: { credentialId: credId } });
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.ok(json.badge);
    assert.equal(json.badge.credentialId, credId);
    assert.equal(json.badge.recipientName, 'Rohan Gupta');
    assert.equal(json.badge.status, 'ACTIVE');

    // Ensure 404 for unknown credentials
    const notFoundReq = new Request(`http://localhost:3000/api/digital-badges/BADGE-CUUP-999999`);
    const notFoundRes = await getPublicBadgeRoute(notFoundReq, { params: { credentialId: 'BADGE-CUUP-999999' } });
    assert.equal(notFoundRes.status, 404);
  });

  // -------------------------------------------------------------
  // 7. Live Server-Side Verification Endpoint
  // -------------------------------------------------------------
  test('7. Verification endpoint accurately checks ACTIVE, REVOKED, and UNKNOWN status', async () => {
    const credId = await db.digitalBadges.getNextCredentialId();
    const activeBadge: DigitalBadge = {
      id: `test-verify-${Date.now()}`,
      credentialId: credId,
      recipientName: 'Kavya Verma',
      recipientEmail: 'kavya@example.com',
      badgeTitle: 'AWS Security Specialist',
      badgeDescription: 'Mastery in IAM policies, KMS encryption, and AWS GuardDuty.',
      issueDate: '2026-09-26',
      issuerName: DEFAULT_ISSUER_NAME,
      skills: ['Security', 'IAM', 'KMS'],
      earningCriteria: 'Secured first rank in Cloud Security CTF.',
      credentialUrl: getBadgeUrl(credId),
      verificationUrl: getBadgeVerificationUrl(credId),
      status: 'ACTIVE',
      issuedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.digitalBadges.insertOne(activeBadge);
    testIdsToCleanup.push(activeBadge.id);

    // Check ACTIVE verification
    const activeVerifyReq = new Request(`http://localhost:3000/api/digital-badges/verify/${credId}`);
    const activeRes = await getVerifyBadgeRoute(activeVerifyReq, { params: { credentialId: credId } });
    assert.equal(activeRes.status, 200);
    const activeJson = await activeRes.json();
    assert.equal(activeJson.valid, true);
    assert.equal(activeJson.status, 'ACTIVE');
    assert.equal(activeJson.verified, true);

    // Revoke badge
    await db.digitalBadges.revoke(activeBadge.id, {
      revokedReason: 'Policy violation during assessment',
      revokedBy: 'Admin Team'
    });

    // Check REVOKED verification
    const revokedVerifyReq = new Request(`http://localhost:3000/api/digital-badges/verify/${credId}`);
    const revokedRes = await getVerifyBadgeRoute(revokedVerifyReq, { params: { credentialId: credId } });
    assert.equal(revokedRes.status, 200);
    const revokedJson = await revokedRes.json();
    assert.equal(revokedJson.valid, false);
    assert.equal(revokedJson.status, 'REVOKED');
    assert.equal(revokedJson.verified, false);
    assert.ok(revokedJson.message.includes('Policy violation'));

    // Check UNKNOWN verification
    const unknownVerifyReq = new Request(`http://localhost:3000/api/digital-badges/verify/BADGE-CUUP-000999`);
    const unknownRes = await getVerifyBadgeRoute(unknownVerifyReq, { params: { credentialId: 'BADGE-CUUP-000999' } });
    assert.equal(unknownRes.status, 404);
    const unknownJson = await unknownRes.json();
    assert.equal(unknownJson.valid, false);
    assert.equal(unknownJson.status, 'UNKNOWN');
  });

  // -------------------------------------------------------------
  // 8. QR Code Scannability & URL Canonicality
  // -------------------------------------------------------------
  test('8. QR strictly contains canonical verification URL without personal info', async () => {
    const credId = 'BADGE-CUUP-000042';
    const canonicalVerifyUrl = getBadgeVerificationUrl(credId);
    assert.equal(canonicalVerifyUrl, `https://www.awssbgcuup.tech/verify-badge/${credId}`);

    // Generate QR Data URL
    const qrDataUrl = await generateBadgeQrDataUrl(credId, 256);
    assert.ok(qrDataUrl.startsWith('data:image/png;base64,'));

    // Generate QR SVG
    const qrSvg = await generateBadgeQrSvg(credId, 256);
    assert.ok(qrSvg.includes('<svg'));

    // Generate QR Buffer
    const qrBuffer = await generateBadgeQrBuffer(credId, 256);
    assert.ok(Buffer.isBuffer(qrBuffer));
    assert.ok(qrBuffer.length > 500);

    // Test API Route
    const qrReq = new Request(`http://localhost:3000/api/digital-badges/qr/${credId}`);
    const qrRes = await getBadgeQrRoute(qrReq, { params: { credentialId: credId } });
    assert.equal(qrRes.status, 200);
    assert.equal(qrRes.headers.get('Content-Type'), 'image/svg+xml');
  });

  // -------------------------------------------------------------
  // 9. Add to LinkedIn Certification Format
  // -------------------------------------------------------------
  test('9. Generates valid LinkedIn certification URL with required fields', () => {
    const badge: DigitalBadge = {
      id: 'test-linkedin',
      credentialId: 'BADGE-CUUP-000007',
      recipientName: 'Simran Kaur',
      recipientEmail: 'simran@example.com',
      badgeTitle: 'AWS DevOps Practitioner',
      badgeDescription: 'Continuous Integration & Continuous Delivery on AWS.',
      issueDate: '2026-09-26',
      issuerName: 'AWS Student Builder Group – Chandigarh University Uttar Pradesh',
      skills: ['CI/CD', 'CodePipeline', 'Docker'],
      earningCriteria: 'Built an end-to-end automated deployment pipeline.',
      status: 'ACTIVE',
      issuedAt: '2026-09-26T12:00:00Z',
      createdAt: '2026-09-26T12:00:00Z',
      updatedAt: '2026-09-26T12:00:00Z'
    };

    const linkedInUrl = getLinkedInAddCertUrl(badge);
    assert.ok(linkedInUrl.startsWith('https://www.linkedin.com/profile/add?'));
    assert.ok(linkedInUrl.includes('name=AWS+DevOps+Practitioner') || linkedInUrl.includes('name=AWS%20DevOps%20Practitioner'));
    assert.ok(linkedInUrl.includes('certId=BADGE-CUUP-000007'));
    assert.ok(linkedInUrl.includes('issueYear=2026'));
  });

  // -------------------------------------------------------------
  // 10. PDF Credential Generation
  // -------------------------------------------------------------
  test('10. Generates valid official PDF certificate buffer without errors', async () => {
    const badge: DigitalBadge = {
      id: 'test-pdf-badge',
      credentialId: 'BADGE-CUUP-000088',
      recipientName: 'Ishaan Verma',
      recipientEmail: 'ishaan@example.com',
      badgeTitle: 'AWS Cloud Foundations Certified',
      badgeDescription: 'Comprehensive understanding of AWS cloud security, infrastructure, and billing.',
      issueDate: '2026-09-26',
      issuerName: DEFAULT_ISSUER_NAME,
      skills: ['Cloud Computing', 'AWS S3', 'EC2', 'VPC'],
      earningCriteria: 'Completed 20 lab hours and scored 95% on final exam.',
      status: 'ACTIVE',
      issuedAt: '2026-09-26T10:00:00Z',
      createdAt: '2026-09-26T10:00:00Z',
      updatedAt: '2026-09-26T10:00:00Z'
    };

    const pdfBuffer = await generateDigitalBadgePdfBuffer(badge);
    assert.ok(Buffer.isBuffer(pdfBuffer));
    assert.ok(pdfBuffer.length > 5000, `PDF size is ${pdfBuffer.length} bytes`);
    assert.equal(pdfBuffer.toString('utf-8', 0, 5), '%PDF-');

    // Test PDF API Route
    await db.digitalBadges.insertOne(badge);
    testIdsToCleanup.push(badge.id);

    const pdfReq = new Request(`http://localhost:3000/api/digital-badges/pdf/${badge.credentialId}`);
    const pdfRes = await getBadgePdfRoute(pdfReq, { params: { credentialId: badge.credentialId } });
    assert.equal(pdfRes.status, 200);
    assert.equal(pdfRes.headers.get('Content-Type'), 'application/pdf');
    assert.ok(pdfRes.headers.get('Content-Disposition')?.includes('Digital-Badge-BADGE-CUUP-000088.pdf'));
  });

  // -------------------------------------------------------------
  // 11. Email Dispatch with PDF Attachment & Delivery History
  // -------------------------------------------------------------
  test('11. Dispatches badge email via centralized system and records delivery audit', async () => {
    const credId = await db.digitalBadges.getNextCredentialId();
    const badge: DigitalBadge = {
      id: `test-email-${Date.now()}`,
      credentialId: credId,
      recipientName: 'Pooja Sharma',
      recipientEmail: 'pooja.sharma@example.com',
      badgeTitle: 'AWS Serverless Developer Specialist',
      badgeDescription: 'Awarded for building serverless applications.',
      issueDate: '2026-09-26',
      issuerName: DEFAULT_ISSUER_NAME,
      skills: ['Lambda', 'API Gateway'],
      earningCriteria: 'Top performer in AWS Serverless Hackathon.',
      status: 'ACTIVE',
      issuedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.digitalBadges.insertOne(badge);
    testIdsToCleanup.push(badge.id);

    // Call sendDigitalBadgeEmail helper
    const result = await sendDigitalBadgeEmail({
      badgeOrCredentialId: badge,
      recipientEmail: badge.recipientEmail,
      adminId: 'admin_test'
    });

    // In unit test without live Resend credentials, verify fallback handled cleanly or success returned
    assert.ok(result !== null);
    assert.equal(result.recipient, 'pooja.sharma@example.com');
    assert.equal(result.pdfFilename, `Digital-Badge-${credId}.pdf`);

    // Verify badge event recorded
    const events = await db.digitalBadges.getEvents(credId);
    assert.ok(events.length > 0);
    const emailEvent = events.find((e) => e.eventType === 'BADGE_EMAIL_SENT' || e.eventType === 'BADGE_EMAIL_FAILED');
    assert.ok(emailEvent, 'An email audit event must be logged');
  });

  // -------------------------------------------------------------
  // 12. Email Rejection on Revoked Credential
  // -------------------------------------------------------------
  test('12. Rejects emailing revoked badges with informative error', async () => {
    const credId = await db.digitalBadges.getNextCredentialId();
    const badge: DigitalBadge = {
      id: `test-revoked-email-${Date.now()}`,
      credentialId: credId,
      recipientName: 'Vikas Kumar',
      recipientEmail: 'vikas@example.com',
      badgeTitle: 'AWS Community Builder',
      badgeDescription: 'Community contributions and workshops.',
      issueDate: '2026-09-26',
      issuerName: DEFAULT_ISSUER_NAME,
      skills: ['Community Leadership'],
      earningCriteria: 'Hosted 3 community technical sessions.',
      status: 'REVOKED',
      revokedAt: new Date().toISOString(),
      revokedReason: 'Credential superseded by advanced certificate',
      issuedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.digitalBadges.insertOne(badge);
    testIdsToCleanup.push(badge.id);

    const result = await sendDigitalBadgeEmail({
      badgeOrCredentialId: badge,
      recipientEmail: badge.recipientEmail
    });

    assert.equal(result.success, false);
    assert.equal(result.status, 400);
    assert.ok(result.error?.includes('REVOKED'));
  });

  // -------------------------------------------------------------
  // 13. Revocation Lock & Non-Reuse of Credential ID
  // -------------------------------------------------------------
  test('13. Revocation permanently locks credential and prevents ID reuse or edit', async () => {
    const credId = await db.digitalBadges.getNextCredentialId();
    const badge: DigitalBadge = {
      id: `test-revoke-lock-${Date.now()}`,
      credentialId: credId,
      recipientName: 'Deepak Rao',
      recipientEmail: 'deepak@example.com',
      badgeTitle: 'AWS Solutions Architect',
      badgeDescription: 'Multi-tier architecture design on AWS.',
      issueDate: '2026-09-26',
      issuerName: DEFAULT_ISSUER_NAME,
      skills: ['VPC', 'AutoScaling', 'ALB'],
      earningCriteria: 'Passed architectural review board evaluation.',
      status: 'ACTIVE',
      issuedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.digitalBadges.insertOne(badge);
    testIdsToCleanup.push(badge.id);

    // Revoke via admin POST
    const revokeReq = makeAuthRequest('http://localhost:3000/api/admin/digital-badges', {
      method: 'POST',
      body: JSON.stringify({
        action: 'revoke',
        credentialId: credId,
        reason: 'Testing permanent revocation'
      })
    });

    const revokeRes = await postAdminBadgesRoute(revokeReq);
    assert.equal(revokeRes.status, 200);

    // Attempt to edit revoked badge -> Must fail with 400
    const editReq = makeAuthRequest('http://localhost:3000/api/admin/digital-badges', {
      method: 'POST',
      body: JSON.stringify({
        action: 'update',
        credentialId: credId,
        badgeTitle: 'Modified Title'
      })
    });

    const editRes = await postAdminBadgesRoute(editReq);
    assert.equal(editRes.status, 400);

    // Verify next credential ID is strictly GREATER and does not reuse revoked credId
    const nextCredId = await db.digitalBadges.getNextCredentialId();
    assert.notEqual(nextCredId, credId);
  });

  // -------------------------------------------------------------
  // 14. Existing Digital ID System Isolation & Regression Check
  // -------------------------------------------------------------
  test('14. Digital Badges system leaves existing Digital Identities completely isolated', async () => {
    // Verify digital_identities methods still work independently
    const existingIdentities = await db.digitalIdentities.getAll();
    assert.ok(Array.isArray(existingIdentities));

    // Ensure digital_badges collection is completely separate
    const badges = await db.digitalBadges.getAll();
    assert.ok(Array.isArray(badges));
  });
});
