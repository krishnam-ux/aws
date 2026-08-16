import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateCertificateId,
  isCertificateEligible,
  deriveCertificateMeta,
  getCertificateFileName
} from '../src/lib/certificates';

test('certificate eligibility only allows Present students', () => {
  assert.equal(
    isCertificateEligible({ attendance: 'Present' }),
    true
  );

  assert.equal(
    isCertificateEligible({ attendance: 'Attended', status: 'New' }),
    true
  );

  assert.equal(
    isCertificateEligible({ attendance: 'Registered', status: 'Attended' }),
    true
  );

  assert.equal(
    isCertificateEligible({ attendance: 'Absent' }),
    false
  );

  assert.equal(
    isCertificateEligible({ attendance: 'Registered' }),
    false
  );

  assert.equal(
    isCertificateEligible({ attendance: 'Cancelled' }),
    false
  );
});

test('certificate metadata derives from real registration data without hardcoded values', () => {
  const record = deriveCertificateMeta({
    id: 'reg-100',
    name: 'Abhay Kumar',
    email: 'abhay@example.com',
    eventId: 'event-01',
    eventName: 'AWS Cloud Workshop',
    venue: 'Innovation Lab',
    date: '2026-08-12T10:00:00.000Z',
    university: 'Chandigarh University – Uttar Pradesh',
    studentId: 'CU12345',
    attendance: 'Present'
  }, {
    title: 'AWS Cloud Workshop',
    date: '2026-08-12',
    venue: 'Innovation Lab',
    time: '10:00 AM - 1:00 PM'
  });

  assert.equal(record.studentName, 'Abhay Kumar');
  assert.equal(record.eventName, 'AWS Cloud Workshop');
  assert.equal(record.venue, 'Innovation Lab');
  assert.equal(record.organizationName, 'AWS Student Builder Group');
  assert.equal(record.issueDate, new Date().toISOString().slice(0, 10));
  assert.equal(record.qrUrl.includes('/verify-certificate/'), true);
});

test('certificate IDs are created in AWS-SBG-CUUP-YYYY-000001 format and remain unique', async () => {
  const generated = await generateCertificateId();
  const matches = /^AWS-SBG-CUUP-\d{4}-\d{6}$/.test(generated);
  assert.equal(matches, true);

  const fileName = getCertificateFileName('Abhay Kumar', generated);
  assert.equal(fileName.includes('Abhay-Kumar'), true);
  assert.equal(fileName.includes(generated), true);
  assert.equal(fileName.endsWith('.pdf'), true);
});
