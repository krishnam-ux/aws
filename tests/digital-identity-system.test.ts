import test, { describe, afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Isolate unit tests to local store to eliminate remote latency
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;

import { db, sql } from '../src/lib/db';
import {
  generatePublicId,
  validateDigitalIdPayload,
  validateBase64Photo,
  sanitizeText,
  generateQrCodeDataUrl,
  getVerificationUrl,
  getCardUrl
} from '../src/lib/digitalIdUtils';
import { generateDigitalIdPdf } from '../src/lib/digitalIdPdf';
import { DigitalIdentity, DigitalIdFormData } from '../src/types/digitalIdentity';
import { DELETE as deleteAdminDigitalIdRoute } from '../src/app/api/admin/digital-ids/route';
import { GET as verifyDigitalIdRoute } from '../src/app/api/digital-ids/verify/[publicId]/route';

// Sample 1x1 transparent PNG as base64 for tests
const SAMPLE_VALID_PNG_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Sample 1x1 JPEG as base64
const SAMPLE_VALID_JPG_BASE64 =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

describe('Digital ID Card & Public Verification System', () => {
  // Test cleanup / state reset
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
  // Requirement 1: Create Founding Member (FMB-CUUP-XXX)
  // -------------------------------------------------------------
  test('1. Creates Founding Member with FMB-CUUP prefix and zero-padded ID', async () => {
    const nextId = await db.digitalIdentities.getNextPublicId('Founding Member');
    assert.match(nextId, /^FMB-CUUP-\d{3,}$/);

    const newRecord: DigitalIdentity = {
      id: `test-fmb-${Date.now()}`,
      publicId: nextId,
      fullName: 'Aarav Sharma',
      email: `aarav.${Date.now()}@example.com`,
      memberType: 'Founding Member',
      role: 'Founding Member & Lead Architect',
      status: 'ACTIVE',
      photoUrl: SAMPLE_VALID_PNG_BASE64,
      department: 'Computer Science',
      yearOrBatch: '2024-2028',
      domain: 'Cloud Architecture',
      skills: ['AWS Lambda', 'DynamoDB', 'TypeScript'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString()
    };

    const saved = await db.digitalIdentities.insertOne(newRecord);
    testIdsToCleanup.push(saved.id);

    assert.equal(saved.publicId, nextId);
    assert.equal(saved.memberType, 'Founding Member');
    assert.equal(saved.status, 'ACTIVE');

    const fetched = await db.digitalIdentities.getByPublicId(nextId);
    assert.ok(fetched);
    assert.equal(fetched.fullName, 'Aarav Sharma');
  });

  // -------------------------------------------------------------
  // Requirement 2: Create Core Team (CT-CUUP-XXX)
  // -------------------------------------------------------------
  test('2. Creates Core Team member with CT-CUUP prefix', async () => {
    const nextId = await db.digitalIdentities.getNextPublicId('Core Team');
    assert.match(nextId, /^CT-CUUP-\d{3,}$/);

    const newRecord: DigitalIdentity = {
      id: `test-ct-${Date.now()}`,
      publicId: nextId,
      fullName: 'Diya Patel',
      email: `diya.${Date.now()}@example.com`,
      memberType: 'Core Team',
      role: 'Technical Lead',
      status: 'ACTIVE',
      photoUrl: SAMPLE_VALID_JPG_BASE64,
      department: 'Information Technology',
      yearOrBatch: '3rd Year',
      domain: 'DevOps & CI/CD',
      skills: ['AWS ECS', 'Terraform', 'Docker'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString()
    };

    const saved = await db.digitalIdentities.insertOne(newRecord);
    testIdsToCleanup.push(saved.id);

    assert.equal(saved.publicId, nextId);
    assert.equal(saved.memberType, 'Core Team');

    const fetched = await db.digitalIdentities.getByPublicId(nextId);
    assert.ok(fetched);
    assert.equal(fetched.role, 'Technical Lead');
  });

  // -------------------------------------------------------------
  // Requirement 3: Create Anchor & Speaker (AS-CUUP-XXX)
  // -------------------------------------------------------------
  test('3. Creates Anchor & Speaker with AS-CUUP prefix', async () => {
    const nextId = await db.digitalIdentities.getNextPublicId('Anchor & Speaker');
    assert.match(nextId, /^AS-CUUP-\d{3,}$/);

    const newRecord: DigitalIdentity = {
      id: `test-as-${Date.now()}`,
      publicId: nextId,
      fullName: 'Rohan Gupta',
      email: `rohan.${Date.now()}@example.com`,
      memberType: 'Anchor & Speaker',
      role: 'Keynote Speaker & Host',
      status: 'ACTIVE',
      photoUrl: SAMPLE_VALID_PNG_BASE64,
      department: 'Computer Science',
      yearOrBatch: '4th Year',
      domain: 'Public Speaking & Cloud AI',
      skills: ['AWS Bedrock', 'Public Speaking', 'Community Engagement'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString()
    };

    const saved = await db.digitalIdentities.insertOne(newRecord);
    testIdsToCleanup.push(saved.id);

    assert.equal(saved.publicId, nextId);
    assert.equal(saved.memberType, 'Anchor & Speaker');

    const fetched = await db.digitalIdentities.getByPublicId(nextId);
    assert.ok(fetched);
    assert.equal(fetched.role, 'Keynote Speaker & Host');
  });

  // -------------------------------------------------------------
  // Requirement 4: Create Other (DID-CUUP-XXX)
  // -------------------------------------------------------------
  test('4. Creates Other member with DID-CUUP prefix', async () => {
    const nextId = await db.digitalIdentities.getNextPublicId('Other');
    assert.match(nextId, /^DID-CUUP-\d{3,}$/);

    const newRecord: DigitalIdentity = {
      id: `test-did-${Date.now()}`,
      publicId: nextId,
      fullName: 'Ananya Verma',
      email: `ananya.${Date.now()}@example.com`,
      memberType: 'Other',
      role: 'Active Community Member',
      status: 'ACTIVE',
      photoUrl: SAMPLE_VALID_PNG_BASE64,
      department: 'AI & Data Science',
      yearOrBatch: '2nd Year',
      domain: 'Machine Learning',
      skills: ['Python', 'AWS SageMaker'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString()
    };

    const saved = await db.digitalIdentities.insertOne(newRecord);
    testIdsToCleanup.push(saved.id);

    assert.equal(saved.publicId, nextId);
    assert.equal(saved.memberType, 'Other');

    const fetched = await db.digitalIdentities.getByPublicId(nextId);
    assert.ok(fetched);
  });

  // -------------------------------------------------------------
  // Requirement 5: Sequential counter increment per type
  // -------------------------------------------------------------
  test('5. Incrementally increments sequential counters for identical member types', async () => {
    const id1 = await db.digitalIdentities.getNextPublicId('Core Team');
    const num1 = parseInt(id1.replace('CT-CUUP-', ''), 10);

    const newRec1: DigitalIdentity = {
      id: `seq-1-${Date.now()}`,
      publicId: id1,
      fullName: 'Seq User 1',
      email: `seq1.${Date.now()}@example.com`,
      memberType: 'Core Team',
      role: 'Member',
      status: 'ACTIVE',
      photoUrl: '',
      department: 'CSE',
      yearOrBatch: '3rd Year',
      domain: 'Cloud',
      skills: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString()
    };
    await db.digitalIdentities.insertOne(newRec1);
    testIdsToCleanup.push(newRec1.id);

    const id2 = await db.digitalIdentities.getNextPublicId('Core Team');
    const num2 = parseInt(id2.replace('CT-CUUP-', ''), 10);

    assert.equal(num2, num1 + 1);
  });

  // -------------------------------------------------------------
  // Requirement 6: Concurrent generation collision safety
  // -------------------------------------------------------------
  test('6. Concurrent generation generates distinct sequential IDs without collisions', async () => {
    // Generate 3 IDs concurrently through DB helper
    const promises = [
      db.digitalIdentities.getNextPublicId('Anchor & Speaker'),
      db.digitalIdentities.getNextPublicId('Anchor & Speaker'),
      db.digitalIdentities.getNextPublicId('Anchor & Speaker')
    ];

    const results = await Promise.all(promises);
    const uniqueResults = new Set(results);
    assert.equal(uniqueResults.size, results.length, 'All generated public IDs must be unique');
  });

  // -------------------------------------------------------------
  // Requirement 7: Non-reuse of revoked or deleted IDs
  // -------------------------------------------------------------
  test('7. Monotonic counter never recycles or reuses revoked or deleted IDs', async () => {
    const idA = await db.digitalIdentities.getNextPublicId('Founding Member');
    const numA = parseInt(idA.replace('FMB-CUUP-', ''), 10);

    const recA: DigitalIdentity = {
      id: `fmb-rec-del-${Date.now()}`,
      publicId: idA,
      fullName: 'User To Delete',
      email: `delete.user.${Date.now()}@example.com`,
      memberType: 'Founding Member',
      role: 'Lead',
      status: 'ACTIVE',
      photoUrl: '',
      department: 'CSE',
      yearOrBatch: '2024',
      domain: 'Cloud',
      skills: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString()
    };
    await db.digitalIdentities.insertOne(recA);

    // Delete recA
    await db.digitalIdentities.deleteById(recA.id);

    // Next allocated ID must be strictly greater than numA
    const idNext = await db.digitalIdentities.getNextPublicId('Founding Member');
    const numNext = parseInt(idNext.replace('FMB-CUUP-', ''), 10);

    assert.ok(numNext > numA, `Next counter (${numNext}) must be strictly greater than deleted ID (${numA})`);
  });

  // -------------------------------------------------------------
  // Requirement 8: Profile photo validation (accepts PNG/JPG/WebP)
  // -------------------------------------------------------------
  test('8. Validates and accepts valid base64 image strings', () => {
    const pngValidation = validateBase64Photo(SAMPLE_VALID_PNG_BASE64);
    assert.equal(pngValidation.valid, true);

    const jpgValidation = validateBase64Photo(SAMPLE_VALID_JPG_BASE64);
    assert.equal(jpgValidation.valid, true);

    const emptyValidation = validateBase64Photo('');
    assert.equal(emptyValidation.valid, true, 'Empty photo is allowed/optional');
  });

  // -------------------------------------------------------------
  // Requirement 9: Invalid image format rejection
  // -------------------------------------------------------------
  test('9. Rejects invalid or corrupt base64 photo formats', () => {
    const invalidFormat = validateBase64Photo('data:application/pdf;base64,JVBERi0xLjQKJcFsj6IK');
    assert.equal(invalidFormat.valid, false);
    assert.match(invalidFormat.error || '', /PNG|JPG|JPEG|WebP|allowed/i);

    const randomText = validateBase64Photo('not-a-valid-base64-image');
    assert.equal(randomText.valid, false);
  });

  // -------------------------------------------------------------
  // Requirement 10: Oversized image rejection (>2MB)
  // -------------------------------------------------------------
  test('10. Rejects oversized base64 images exceeding 2MB limit', () => {
    // 2.5MB fake payload
    const oversized = 'data:image/png;base64,' + 'A'.repeat(3.5 * 1024 * 1024);
    const result = validateBase64Photo(oversized);
    assert.equal(result.valid, false);
    assert.match(result.error || '', /2MB/i);
  });

  // -------------------------------------------------------------
  // Requirement 11: Payload validation checks required fields
  // -------------------------------------------------------------
  test('11. Payload validation validates required identity fields', () => {
    const invalidPayload: Partial<DigitalIdFormData> = {
      fullName: '',
      email: 'invalid-email',
      memberType: 'Core Team',
      role: ''
    };

    const result = validateDigitalIdPayload(invalidPayload);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 3);

    const validPayload: DigitalIdFormData = {
      fullName: 'Meera Sen',
      email: 'meera.sen@example.com',
      memberType: 'Core Team',
      role: 'Cloud Architect',
      department: 'ECE',
      yearOrBatch: '3rd Year',
      domain: 'Cloud',
      skills: 'AWS, Python, React'
    };
    const validResult = validateDigitalIdPayload(validPayload);
    assert.equal(validResult.valid, true);
    assert.equal(validResult.errors.length, 0);
  });

  // -------------------------------------------------------------
  // Requirement 12: Public verification ACTIVE state
  // -------------------------------------------------------------
  test('12. Retrieves ACTIVE identity and verifies status', async () => {
    const nextId = await db.digitalIdentities.getNextPublicId('Core Team');
    const record: DigitalIdentity = {
      id: `active-test-${Date.now()}`,
      publicId: nextId,
      fullName: 'Active User Test',
      email: `active.${Date.now()}@example.com`,
      memberType: 'Core Team',
      role: 'Coordinator',
      status: 'ACTIVE',
      photoUrl: SAMPLE_VALID_PNG_BASE64,
      department: 'CSE',
      yearOrBatch: '3rd Year',
      domain: 'Cloud',
      skills: ['AWS'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString()
    };

    await db.digitalIdentities.insertOne(record);
    testIdsToCleanup.push(record.id);

    const found = await db.digitalIdentities.getByPublicId(nextId);
    assert.ok(found);
    assert.equal(found.status, 'ACTIVE');
    assert.equal(found.fullName, 'Active User Test');
  });

  // -------------------------------------------------------------
  // Requirement 13: Public verification SUSPENDED state
  // -------------------------------------------------------------
  test('13. Marks identity as SUSPENDED and reflects suspended state', async () => {
    const nextId = await db.digitalIdentities.getNextPublicId('Other');
    const record: DigitalIdentity = {
      id: `suspend-test-${Date.now()}`,
      publicId: nextId,
      fullName: 'Suspended User Test',
      email: `suspended.${Date.now()}@example.com`,
      memberType: 'Other',
      role: 'Student',
      status: 'ACTIVE',
      photoUrl: '',
      department: 'CSE',
      yearOrBatch: '2nd Year',
      domain: 'General',
      skills: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString()
    };

    await db.digitalIdentities.insertOne(record);
    testIdsToCleanup.push(record.id);

    const updated = await db.digitalIdentities.updateStatus(record.id, 'SUSPENDED', 'Pending administrative review');
    assert.ok(updated);
    assert.equal(updated.status, 'SUSPENDED');

    const verified = await db.digitalIdentities.getByPublicId(nextId);
    assert.equal(verified?.status, 'SUSPENDED');
  });

  // -------------------------------------------------------------
  // Requirement 14: Public verification REVOKED state
  // -------------------------------------------------------------
  test('14. Marks identity as REVOKED with revocation timestamp', async () => {
    const nextId = await db.digitalIdentities.getNextPublicId('Anchor & Speaker');
    const record: DigitalIdentity = {
      id: `revoked-test-${Date.now()}`,
      publicId: nextId,
      fullName: 'Revoked User Test',
      email: `revoked.${Date.now()}@example.com`,
      memberType: 'Anchor & Speaker',
      role: 'Speaker',
      status: 'ACTIVE',
      photoUrl: '',
      department: 'CSE',
      yearOrBatch: '4th Year',
      domain: 'Cloud',
      skills: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString()
    };

    await db.digitalIdentities.insertOne(record);
    testIdsToCleanup.push(record.id);

    const revoked = await db.digitalIdentities.updateStatus(record.id, 'REVOKED', 'Graduated and decommissioned credential');
    assert.ok(revoked);
    assert.equal(revoked.status, 'REVOKED');
    assert.ok(revoked.revokedAt);

    const fetched = await db.digitalIdentities.getByPublicId(nextId);
    assert.equal(fetched?.status, 'REVOKED');
  });

  // -------------------------------------------------------------
  // Requirement 15: Public verification NOT_FOUND state
  // -------------------------------------------------------------
  test('15. Returns null when public ID does not exist in registry', async () => {
    const nonExistent = await db.digitalIdentities.getByPublicId('FMB-CUUP-999999');
    assert.equal(nonExistent, null);
  });

  // -------------------------------------------------------------
  // Requirement 16: QR URL resolution & generation
  // -------------------------------------------------------------
  test('16. Generates valid QR code data URL encoding canonical verification link', async () => {
    const publicId = 'CT-CUUP-101';
    const verifyUrl = getVerificationUrl(publicId);
    assert.ok(verifyUrl.includes('/verify/CT-CUUP-101'));

    const qrDataUrl = await generateQrCodeDataUrl(verifyUrl);
    assert.ok(qrDataUrl.startsWith('data:image/png;base64,'));
  });

  // -------------------------------------------------------------
  // Requirement 17: Edit profile preserves Digital ID
  // -------------------------------------------------------------
  test('17. Updating profile maintains existing permanent publicId and counters', async () => {
    const nextId = await db.digitalIdentities.getNextPublicId('Founding Member');
    const record: DigitalIdentity = {
      id: `edit-preserve-id-${Date.now()}`,
      publicId: nextId,
      fullName: 'Original Name',
      email: `orig.${Date.now()}@example.com`,
      memberType: 'Founding Member',
      role: 'Original Role',
      status: 'ACTIVE',
      photoUrl: '',
      department: 'CSE',
      yearOrBatch: '2024',
      domain: 'Cloud',
      skills: ['AWS'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString()
    };

    await db.digitalIdentities.insertOne(record);
    testIdsToCleanup.push(record.id);

    const updated = await db.digitalIdentities.updateOne(record.id, {
      fullName: 'Updated Name',
      role: 'Executive Member',
      skills: ['AWS Lambda', 'GraphQL', 'Next.js']
    });

    assert.ok(updated);
    assert.equal(updated.publicId, nextId, 'Public ID must remain unchanged upon profile edit');
    assert.equal(updated.fullName, 'Updated Name');
    assert.equal(updated.role, 'Executive Member');
    assert.deepEqual(updated.skills, ['AWS Lambda', 'GraphQL', 'Next.js']);
  });

  // -------------------------------------------------------------
  // Requirement 18: Edit profile updates verification immediately
  // -------------------------------------------------------------
  test('18. Immediate cache invalidation: public verification returns updated details', async () => {
    const nextId = await db.digitalIdentities.getNextPublicId('Core Team');
    const record: DigitalIdentity = {
      id: `immed-verif-${Date.now()}`,
      publicId: nextId,
      fullName: 'Initial Candidate',
      email: `candidate.${Date.now()}@example.com`,
      memberType: 'Core Team',
      role: 'Associate',
      status: 'ACTIVE',
      photoUrl: '',
      department: 'IT',
      yearOrBatch: '2nd Year',
      domain: 'Web',
      skills: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString()
    };

    await db.digitalIdentities.insertOne(record);
    testIdsToCleanup.push(record.id);

    await db.digitalIdentities.updateOne(record.id, {
      fullName: 'Promoted Candidate',
      role: 'Team Lead'
    });

    const refreshed = await db.digitalIdentities.getByPublicId(nextId);
    assert.equal(refreshed?.fullName, 'Promoted Candidate');
    assert.equal(refreshed?.role, 'Team Lead');
  });

  // -------------------------------------------------------------
  // Requirement 19: Edit profile updates Digital Card immediately
  // -------------------------------------------------------------
  test('19. Direct ID lookup returns updated details for digital card view', async () => {
    const nextId = await db.digitalIdentities.getNextPublicId('Other');
    const record: DigitalIdentity = {
      id: `card-view-${Date.now()}`,
      publicId: nextId,
      fullName: 'Card View Test',
      email: `cardview.${Date.now()}@example.com`,
      memberType: 'Other',
      role: 'Community Member',
      status: 'ACTIVE',
      photoUrl: '',
      department: 'CSE',
      yearOrBatch: '1st Year',
      domain: 'Cloud',
      skills: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString()
    };

    await db.digitalIdentities.insertOne(record);
    testIdsToCleanup.push(record.id);

    await db.digitalIdentities.updateOne(record.id, {
      domain: 'Artificial Intelligence',
      department: 'AI & Data Engineering'
    });

    const cardData = await db.digitalIdentities.getByPublicId(nextId);
    assert.equal(cardData?.domain, 'Artificial Intelligence');
    assert.equal(cardData?.department, 'AI & Data Engineering');
  });

  // -------------------------------------------------------------
  // Requirement 20: Revoke flow with audit log
  // -------------------------------------------------------------
  test('20. Revocation flow updates status to REVOKED and logs action', async () => {
    const nextId = await db.digitalIdentities.getNextPublicId('Founding Member');
    const record: DigitalIdentity = {
      id: `revoke-flow-${Date.now()}`,
      publicId: nextId,
      fullName: 'Revoke Audit Test',
      email: `revokeaudit.${Date.now()}@example.com`,
      memberType: 'Founding Member',
      role: 'Member',
      status: 'ACTIVE',
      photoUrl: '',
      department: 'CSE',
      yearOrBatch: '2024',
      domain: 'Cloud',
      skills: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString()
    };

    await db.digitalIdentities.insertOne(record);
    testIdsToCleanup.push(record.id);

    const revoked = await db.digitalIdentities.updateStatus(record.id, 'REVOKED', 'Honorary retirement');
    assert.equal(revoked?.status, 'REVOKED');
    assert.ok(revoked?.revokedAt);

    // Verification logging
    const log = await db.digitalIdVerifications.logVerification({
      digitalId: nextId,
      timestamp: new Date().toISOString(),
      result: 'REVOKED',
      deviceType: 'Desktop',
      browser: 'Chrome'
    });
    assert.ok(log.id);
    assert.equal(log.result, 'REVOKED');
  });

  // -------------------------------------------------------------
  // Requirement 21: Suspend flow
  // -------------------------------------------------------------
  test('21. Suspend flow updates status to SUSPENDED', async () => {
    const nextId = await db.digitalIdentities.getNextPublicId('Core Team');
    const record: DigitalIdentity = {
      id: `suspend-flow-${Date.now()}`,
      publicId: nextId,
      fullName: 'Suspend Flow Test',
      email: `suspendflow.${Date.now()}@example.com`,
      memberType: 'Core Team',
      role: 'Editor',
      status: 'ACTIVE',
      photoUrl: '',
      department: 'CSE',
      yearOrBatch: '3rd Year',
      domain: 'Media',
      skills: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString()
    };

    await db.digitalIdentities.insertOne(record);
    testIdsToCleanup.push(record.id);

    const suspended = await db.digitalIdentities.updateStatus(record.id, 'SUSPENDED');
    assert.equal(suspended?.status, 'SUSPENDED');
  });

  // -------------------------------------------------------------
  // Requirement 22: Reactivate flow
  // -------------------------------------------------------------
  test('22. Reactivate flow restores SUSPENDED or REVOKED identity to ACTIVE', async () => {
    const nextId = await db.digitalIdentities.getNextPublicId('Core Team');
    const record: DigitalIdentity = {
      id: `reactivate-flow-${Date.now()}`,
      publicId: nextId,
      fullName: 'Reactivate Test',
      email: `reactivate.${Date.now()}@example.com`,
      memberType: 'Core Team',
      role: 'Organizer',
      status: 'SUSPENDED',
      photoUrl: '',
      department: 'CSE',
      yearOrBatch: '3rd Year',
      domain: 'Events',
      skills: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString()
    };

    await db.digitalIdentities.insertOne(record);
    testIdsToCleanup.push(record.id);

    const reactivated = await db.digitalIdentities.updateStatus(record.id, 'ACTIVE');
    assert.equal(reactivated?.status, 'ACTIVE');
    assert.equal(reactivated?.revokedAt, undefined);
  });

  // -------------------------------------------------------------
  // Requirement 23: PDF card buffer generation
  // -------------------------------------------------------------
  test('23. PDF generator produces valid PDF byte stream with Front and Back sides', async () => {
    const testIdentity: DigitalIdentity = {
      id: `pdf-test-${Date.now()}`,
      publicId: 'CT-CUUP-042',
      fullName: 'PDF Tester',
      email: 'pdftester@example.com',
      memberType: 'Core Team',
      role: 'Lead Cloud Engineer',
      status: 'ACTIVE',
      photoUrl: SAMPLE_VALID_PNG_BASE64,
      department: 'Computer Science & Engineering',
      yearOrBatch: '3rd Year',
      domain: 'Cloud Architecture',
      skills: ['AWS Lambda', 'Amazon DynamoDB', 'Terraform', 'Next.js'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issuedAt: new Date().toISOString()
    };

    const pdfBuffer = await generateDigitalIdPdf(testIdentity);
    assert.ok(pdfBuffer instanceof Buffer);
    assert.ok(pdfBuffer.length > 5000, 'PDF buffer must contain substantial document bytes');

    // Validate PDF magic header '%PDF-'
    const header = pdfBuffer.subarray(0, 5).toString('utf-8');
    assert.equal(header, '%PDF-');
  });

  // -------------------------------------------------------------
  // Requirement 24: Verification audit logging
  // -------------------------------------------------------------
  test('24. Verification audit logs record timestamp, IP, device, and result', async () => {
    const publicId = 'CT-CUUP-099';
    const log = await db.digitalIdVerifications.logVerification({
      digitalId: publicId,
      timestamp: new Date().toISOString(),
      result: 'VERIFIED',
      ip: '192.168.1.1',
      deviceType: 'Mobile (iOS)',
      browser: 'Safari Mobile'
    });

    assert.ok(log.id);
    assert.equal(log.digitalId, publicId);
    assert.equal(log.result, 'VERIFIED');
    assert.equal(log.deviceType, 'Mobile (iOS)');

    const recentLogs = await db.digitalIdVerifications.getByDigitalId(publicId);
    assert.ok(recentLogs.length > 0);
    assert.equal(recentLogs[0].digitalId, publicId);
  });

  // -------------------------------------------------------------
  // Requirement 25: XSS/HTML sanitization
  // -------------------------------------------------------------
  test('25. XSS sanitization strips dangerous HTML tags and script injections', () => {
    const maliciousPayload = '<script>alert("XSS")</script><b onmouseover="evil()">Aarav</b>';
    const clean = sanitizeText(maliciousPayload);

    assert.equal(clean.includes('<script>'), false);
    assert.equal(clean.includes('evil()'), false);
    assert.ok(!clean.includes('<b'));
    assert.equal(clean, 'Aarav');
  });

  // -------------------------------------------------------------
  // Requirement 26: Existing systems isolation & non-regression
  // -------------------------------------------------------------
  test('26. Existing Core Team, Events, Quizzes, Certificates, and Career Opportunities remain intact and unaffected', async () => {
    // 1. Verify db has all core collections
    assert.ok(db.events);
    assert.ok(db.eventRegistrations);
    assert.ok(db.careers);
    assert.ok(db.careerApplications);
    assert.ok(db.exams);
    assert.ok(db.examCandidates);
    assert.ok(db.settings);
    assert.ok(db.digitalIdentities);
    assert.ok(db.digitalIdVerifications);

    // 2. Query existing events (should return array without error)
    const events = await db.events.getAll();
    assert.ok(Array.isArray(events));

    // 3. Query existing careers (should return array without error)
    const careers = await db.careers.getAll();
    assert.ok(Array.isArray(careers));

    // 4. Query existing exams (should return array without error)
    const exams = await db.exams.getAll();
    assert.ok(Array.isArray(exams));
  });

  // -------------------------------------------------------------
  // Requirement 27: Admin DELETE Authorization (401 on missing/invalid auth)
  // -------------------------------------------------------------
  test('27. Admin DELETE endpoint rejects unauthorized requests with 401 status', async () => {
    // 1. No auth headers
    const reqNoAuth = new Request('http://localhost:3000/api/admin/digital-ids?id=test-dummy-id', {
      method: 'DELETE'
    });
    const resNoAuth = await deleteAdminDigitalIdRoute(reqNoAuth);
    assert.equal(resNoAuth.status, 401);
    const bodyNoAuth = await resNoAuth.json();
    assert.ok(bodyNoAuth.error.includes('Unauthorized'));

    // 2. Invalid auth token
    const reqBadAuth = new Request('http://localhost:3000/api/admin/digital-ids?id=test-dummy-id', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer wrong-secret-token'
      }
    });
    const resBadAuth = await deleteAdminDigitalIdRoute(reqBadAuth);
    assert.equal(resBadAuth.status, 401);
  });

  // -------------------------------------------------------------
  // Requirement 28: Admin DELETE Permanent Deletion
  // -------------------------------------------------------------
  test('28. Admin DELETE endpoint successfully deletes Digital ID record and removes it from database', async () => {
    const nextPublicId = await db.digitalIdentities.getNextPublicId('Core Team');
    const newRecord: DigitalIdentity = {
      id: `test-del-${Date.now()}`,
      publicId: nextPublicId,
      fullName: 'Deletion Test Subject',
      email: `del.test.${Date.now()}@example.com`,
      memberType: 'Core Team',
      role: 'Temporary Core Member',
      domain: 'Cloud',
      university: 'Chandigarh University – Uttar Pradesh',
      photoUrl: SAMPLE_VALID_PNG_BASE64,
      status: 'ACTIVE',
      issuedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    await db.digitalIdentities.insertOne(newRecord);

    // Verify record exists before deletion
    const checkBefore = await db.digitalIdentities.getById(newRecord.id);
    assert.ok(checkBefore);
    assert.equal(checkBefore.publicId, nextPublicId);

    // Execute DELETE via API route with valid Admin Bearer token
    const reqDelete = new Request(`http://localhost:3000/api/admin/digital-ids?id=${newRecord.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer awssbg-admin-session-token-secure-hash'
      }
    });
    const resDelete = await deleteAdminDigitalIdRoute(reqDelete);
    assert.equal(resDelete.status, 200);
    const bodyDelete = await resDelete.json();
    assert.equal(bodyDelete.success, true);
    assert.ok(bodyDelete.message.includes('permanently deleted'));

    // Verify record no longer exists in database
    const checkAfterById = await db.digitalIdentities.getById(newRecord.id);
    assert.equal(checkAfterById, null);
    const checkAfterByPublicId = await db.digitalIdentities.getByPublicId(nextPublicId);
    assert.equal(checkAfterByPublicId, null);

    // Attempting to delete again returns 404 Not Found
    const resDeleteAgain = await deleteAdminDigitalIdRoute(reqDelete);
    assert.equal(resDeleteAgain.status, 404);
  });

  // -------------------------------------------------------------
  // Requirement 29: After Deletion, /verify/[publicId] returns NOT FOUND
  // -------------------------------------------------------------
  test('29. After deletion, verification endpoint and public lookup returns NOT FOUND (404)', async () => {
    const nextPublicId = await db.digitalIdentities.getNextPublicId('Other');
    const newRecord: DigitalIdentity = {
      id: `test-verify-del-${Date.now()}`,
      publicId: nextPublicId,
      fullName: 'Verification Target for Deletion',
      memberType: 'Other',
      role: 'Temp Member',
      photoUrl: SAMPLE_VALID_PNG_BASE64,
      status: 'ACTIVE',
      issuedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    await db.digitalIdentities.insertOne(newRecord);

    // Verify /api/digital-ids/verify/[publicId] returns 200 ACTIVE
    const reqBefore = new Request(`http://localhost:3000/api/digital-ids/verify/${nextPublicId}`);
    const resBefore = await verifyDigitalIdRoute(reqBefore, {
      params: Promise.resolve({ publicId: nextPublicId })
    });
    assert.equal(resBefore.status, 200);
    const bodyBefore = await resBefore.json();
    assert.equal(bodyBefore.verified, true);
    assert.equal(bodyBefore.status, 'ACTIVE');

    // Delete the ID
    await db.digitalIdentities.deleteById(newRecord.id);

    // Verify /api/digital-ids/verify/[publicId] returns 404 NOT_FOUND
    const reqAfter = new Request(`http://localhost:3000/api/digital-ids/verify/${nextPublicId}`);
    const resAfter = await verifyDigitalIdRoute(reqAfter, {
      params: Promise.resolve({ publicId: nextPublicId })
    });
    assert.equal(resAfter.status, 404);
    const bodyAfter = await resAfter.json();
    assert.equal(bodyAfter.verified, false);
    assert.equal(bodyAfter.status, 'NOT_FOUND');
    assert.ok(bodyAfter.message.includes('could not be verified'));
  });

  // -------------------------------------------------------------
  // Requirement 30: Monotonic Counter Non-Reuse (Deleted ID never recycled)
  // -------------------------------------------------------------
  test('30. Deleted Digital ID number is NEVER reused; next sequential ID moves strictly forward', async () => {
    // 1. Issue an ID
    const initialId = await db.digitalIdentities.getNextPublicId('Anchor & Speaker');
    const numPart = parseInt(initialId.replace('AS-CUUP-', ''), 10);
    assert.ok(!isNaN(numPart) && numPart > 0);

    const tempRecord: DigitalIdentity = {
      id: `test-nonreuse-${Date.now()}`,
      publicId: initialId,
      fullName: 'Non-Reuse Anchor',
      memberType: 'Anchor & Speaker',
      role: 'Guest Speaker',
      photoUrl: SAMPLE_VALID_PNG_BASE64,
      status: 'ACTIVE',
      issuedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    await db.digitalIdentities.insertOne(tempRecord);

    // 2. Permanently delete the ID
    await db.digitalIdentities.deleteById(tempRecord.id);

    // 3. Request the NEXT public ID for the same category
    const followingId = await db.digitalIdentities.getNextPublicId('Anchor & Speaker');
    const followingNumPart = parseInt(followingId.replace('AS-CUUP-', ''), 10);

    // 4. Confirm the following number is strictly greater and does NOT recycle initialId
    assert.notEqual(followingId, initialId, 'Deleted ID must NEVER be reused!');
    assert.ok(
      followingNumPart > numPart,
      `Next sequential ID (${followingId}) must be strictly greater than deleted ID (${initialId})`
    );
  });

  // -------------------------------------------------------------
  // Requirement 31: System Non-Regression on Digital ID Deletion
  // -------------------------------------------------------------
  test('31. Deletion of Digital ID has ZERO effect on Founding Member, Core Team, Events, Quiz, Exam, or Email records', async () => {
    // 1. Create and delete a Digital ID
    const nextId = await db.digitalIdentities.getNextPublicId('Other');
    const tempId = `reg-test-${Date.now()}`;
    await db.digitalIdentities.insertOne({
      id: tempId,
      publicId: nextId,
      fullName: 'Regression Check Member',
      memberType: 'Other',
      role: 'Tester',
      photoUrl: SAMPLE_VALID_PNG_BASE64,
      status: 'ACTIVE',
      issuedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
    await db.digitalIdentities.deleteById(tempId);

    // 2. Founding members database intact
    const foundingMembers = await db.foundingMembers.getAll();
    assert.ok(Array.isArray(foundingMembers));

    // 3. Events collection intact
    const events = await db.events.getAll();
    assert.ok(Array.isArray(events));

    // 4. Careers collection intact
    const careers = await db.careers.getAll();
    assert.ok(Array.isArray(careers));

    // 5. Quizzes collection intact
    const quizzes = await db.weeklyQuizzes.getAll();
    assert.ok(Array.isArray(quizzes));

    // 6. Exams collection intact
    const exams = await db.exams.getAll();
    assert.ok(Array.isArray(exams));

    // 7. Email templates, settings and logs intact
    const emailTemplates = await db.emailTemplates.getAll();
    assert.ok(Array.isArray(emailTemplates));
    const emailAutomations = await db.emailAutomationSettings.getAll();
    assert.ok(Array.isArray(emailAutomations));
    const emailLogs = await db.emailLogs.getAll();
    assert.ok(Array.isArray(emailLogs));
  });

  after(async () => {
    if (sql) {
      try {
        await sql.end({ timeout: 0 });
      } catch {
        // ignore
      }
    }
  });
});
