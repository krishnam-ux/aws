import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCertificatePdfBuffer } from '../src/lib/certificates';

test('Certificate Layout and Coordinate Scaling Regression Tests', async (t) => {
  const commonPayload = {
    certificateId: 'AWS-SBG-CUUP-2026-987654',
    verificationUrl: 'https://www.awssbgcuup.tech/verify-certificate/AWS-SBG-CUUP-2026-987654',
    eventDate: '2026-08-20',
    venue: 'Chandigarh University – Uttar Pradesh'
  };

  await t.test('A. Short student name generates valid PDF without throwing', async () => {
    const payload = {
      ...commonPayload,
      studentName: 'Abhay Kumar',
      eventName: 'AWS Cloud Day',
      description: 'For outstanding achievement in a local AWS Student Builder Group'
    };

    const buffer = await generateCertificatePdfBuffer(payload);
    assert.ok(buffer instanceof Buffer, 'Should return a Buffer');
    assert.ok(buffer.length > 100, 'Should not be empty');
    assert.equal(buffer.toString('utf-8', 0, 5), '%PDF-', 'Should start with PDF signature');
  });

  await t.test('B. Long student name generates valid PDF without throwing', async () => {
    const payload = {
      ...commonPayload,
      studentName: 'Sri Srimad Bhaktivedanta Narayana Gosvami Maharaja',
      eventName: 'AWS Cloud Day',
      description: 'For outstanding achievement in a local AWS Student Builder Group'
    };

    const buffer = await generateCertificatePdfBuffer(payload);
    assert.ok(buffer instanceof Buffer);
    assert.ok(buffer.length > 100);
    assert.equal(buffer.toString('utf-8', 0, 5), '%PDF-');
  });

  await t.test('C. Long achievement title generates valid PDF without throwing', async () => {
    const payload = {
      ...commonPayload,
      studentName: 'Abhay Kumar',
      eventName: 'AWS Certified Student Builder Group Founding Core Member Leader Specialist',
      description: 'For outstanding achievement in a local AWS Student Builder Group'
    };

    const buffer = await generateCertificatePdfBuffer(payload);
    assert.ok(buffer instanceof Buffer);
    assert.ok(buffer.length > 100);
    assert.equal(buffer.toString('utf-8', 0, 5), '%PDF-');
  });

  await t.test('D. Long description generates valid PDF without throwing', async () => {
    const payload = {
      ...commonPayload,
      studentName: 'Abhay Kumar',
      eventName: 'AWS Cloud Day',
      description: 'For outstanding performance and extraordinary dedication in coordinating AWS cloud computing events, workshops, student community outreach programs, and university association administration.'
    };

    const buffer = await generateCertificatePdfBuffer(payload);
    assert.ok(buffer instanceof Buffer);
    assert.ok(buffer.length > 100);
    assert.equal(buffer.toString('utf-8', 0, 5), '%PDF-');
  });
});
