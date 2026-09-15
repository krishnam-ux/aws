import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOpportunitySuccessUrl,
  hasDuplicateOpportunityApplication,
  isValidGoogleDriveUrl,
} from '../src/lib/opportunityApplication';
import { db } from '../src/lib/db';
import { POST as careerAppPost } from '../src/app/api/career-applications/route';
import { POST as adminPost } from '../src/app/api/admin/route';

const ADMIN_HEADER = { Authorization: 'Bearer awssbg-admin-session-token-secure-hash' };

test('blocks duplicate submissions only for the same opportunity and normalized email', () => {
  const applications = [
    { opportunityId: 'opp-1', email: 'student@example.com' },
    { opportunityId: 'opp-2', email: 'Student@Example.com' },
    { opportunityId: 'opp-1', email: 'other@example.com' },
  ];

  assert.equal(hasDuplicateOpportunityApplication(applications, 'opp-1', 'student@example.com'), true);
  assert.equal(hasDuplicateOpportunityApplication(applications, 'opp-1', 'different@example.com'), false);
  assert.equal(hasDuplicateOpportunityApplication(applications, 'opp-2', 'student@example.com'), true);
  assert.equal(hasDuplicateOpportunityApplication(applications, 'opp-3', 'student@example.com'), false);
});

test('uses the current request origin when building the success redirect URL', () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';

  try {
    const redirect = buildOpportunitySuccessUrl(
      'https://www.awssbgcuup.tech/api/career-applications',
      'opportunity-slug',
    );

    assert.equal(redirect, 'https://www.awssbgcuup.tech/careers/opportunity-slug?submitted=1');
    assert.equal(
      buildOpportunitySuccessUrl('http://localhost:3000/api/career-applications', 'demo-opportunity'),
      'http://localhost:3000/careers/demo-opportunity?submitted=1',
    );
    assert.equal(
      buildOpportunitySuccessUrl(
        'http://localhost:3000/api/career-applications',
        'prod-opportunity',
        new Headers({ host: 'www.awssbgcuup.tech', 'x-forwarded-proto': 'https' }),
      ),
      'https://www.awssbgcuup.tech/careers/prod-opportunity?submitted=1',
    );
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL; else process.env.NEXT_PUBLIC_SITE_URL = previous;
  }
});

test('isValidGoogleDriveUrl correctly validates various Google Drive link formats', () => {
  // Valid links
  assert.equal(isValidGoogleDriveUrl('https://drive.google.com/file/d/1A2B3C4D5E/view?usp=sharing'), true);
  assert.equal(isValidGoogleDriveUrl('https://drive.google.com/open?id=1A2B3C4D5E'), true);
  assert.equal(isValidGoogleDriveUrl('https://drive.google.com/drive/folders/1A2B3C4D5E'), true);
  assert.equal(isValidGoogleDriveUrl('https://drive.google.com/file/d/1A2B3C4D5E'), true);
  assert.equal(isValidGoogleDriveUrl('https://docs.google.com/file/d/1A2B3C4D5E/edit'), true);
  assert.equal(isValidGoogleDriveUrl('drive.google.com/file/d/1A2B3C4D5E/view'), true);

  // Invalid links
  assert.equal(isValidGoogleDriveUrl(''), false);
  assert.equal(isValidGoogleDriveUrl(null), false);
  assert.equal(isValidGoogleDriveUrl(undefined), false);
  assert.equal(isValidGoogleDriveUrl('https://dropbox.com/s/12345'), false);
  assert.equal(isValidGoogleDriveUrl('https://youtube.com/watch?v=12345'), false);
  assert.equal(isValidGoogleDriveUrl('https://example.com/drive.google.com'), false);
  assert.equal(isValidGoogleDriveUrl('just some text'), false);
  assert.equal(isValidGoogleDriveUrl('https://drive.google.com/'), false);
});

test('opportunity application submission requires Google Drive video link and works without resume or github', async () => {
  // Ensure an active opportunity exists with a future deadline
  const careers = await db.careers.getAll();
  assert.ok(careers.length > 0, 'At least one career/opportunity must exist in test environment');
  const opportunity = careers[0];
  await db.careers.updateOne(opportunity.id, {
    published: true,
    internalApplications: true,
    status: 'Open',
    applicationDeadline: '2026-12-31T23:59:59.000Z'
  });

  // 1. Missing video link should fail
  const formMissingVideo = new FormData();
  formMissingVideo.append('opportunityId', opportunity.id);
  formMissingVideo.append('opportunitySlug', opportunity.slug);
  formMissingVideo.append('name', 'Aditi Rao');
  formMissingVideo.append('email', `aditi.${Date.now()}@cumail.in`);
  formMissingVideo.append('phone', '9876543210');
  formMissingVideo.append('university', 'Chandigarh University');
  formMissingVideo.append('program', 'B.Tech CSE');
  formMissingVideo.append('graduationYear', '2026');
  formMissingVideo.append('studentId', '22BCS1122');
  formMissingVideo.append('linkedin', 'https://linkedin.com/in/aditirao');
  formMissingVideo.append('skills', 'AWS, Python');
  formMissingVideo.append('experience', 'Cloud project intern');
  formMissingVideo.append('motivation', 'Passionate about AWS cloud');
  formMissingVideo.append('consent', 'on');

  const req1 = new Request('http://localhost:3000/api/career-applications', {
    method: 'POST',
    body: formMissingVideo,
  });
  const res1 = await careerAppPost(req1);
  assert.equal(res1.status, 400);
  const json1 = await res1.json();
  assert.ok(json1.fieldErrors?.introductionVideoUrl || json1.fieldErrors?.videoUrl);

  // 2. Invalid Google Drive link should fail
  const formInvalidVideo = new FormData();
  formInvalidVideo.append('opportunityId', opportunity.id);
  formInvalidVideo.append('opportunitySlug', opportunity.slug);
  formInvalidVideo.append('name', 'Aditi Rao');
  formInvalidVideo.append('email', `aditi.invalid.${Date.now()}@cumail.in`);
  formInvalidVideo.append('phone', '9876543210');
  formInvalidVideo.append('university', 'Chandigarh University');
  formInvalidVideo.append('program', 'B.Tech CSE');
  formInvalidVideo.append('graduationYear', '2026');
  formInvalidVideo.append('studentId', '22BCS1122');
  formInvalidVideo.append('linkedin', 'https://linkedin.com/in/aditirao');
  formInvalidVideo.append('introductionVideoUrl', 'https://dropbox.com/s/invalid-video');
  formInvalidVideo.append('skills', 'AWS, Python');
  formInvalidVideo.append('experience', 'Cloud project intern');
  formInvalidVideo.append('motivation', 'Passionate about AWS cloud');
  formInvalidVideo.append('consent', 'on');

  const req2 = new Request('http://localhost:3000/api/career-applications', {
    method: 'POST',
    body: formInvalidVideo,
  });
  const res2 = await careerAppPost(req2);
  assert.equal(res2.status, 400);

  // 3. Valid Google Drive video link with canonical field introductionVideoUrl
  const testEmail = `aditi.canonical.${Date.now()}@cumail.in`;
  const validDriveLink = 'https://drive.google.com/file/d/1X2Y3Z-intro-video-sample/view?usp=sharing';

  const formValid = new FormData();
  formValid.append('opportunityId', opportunity.id);
  formValid.append('opportunitySlug', opportunity.slug);
  formValid.append('name', 'Aditi Rao');
  formValid.append('email', testEmail);
  formValid.append('phone', '9876543210');
  formValid.append('university', 'Chandigarh University');
  formValid.append('program', 'B.Tech CSE');
  formValid.append('graduationYear', '2026');
  formValid.append('studentId', '22BCS1122');
  formValid.append('linkedin', 'https://linkedin.com/in/aditirao');
  formValid.append('introductionVideoUrl', validDriveLink);
  formValid.append('skills', 'AWS, Python, DynamoDB');
  formValid.append('experience', 'Cloud project intern at Tech Corp');
  formValid.append('motivation', 'Passionate about AWS cloud architectures');
  formValid.append('consent', 'on');

  const req3 = new Request('http://localhost:3000/api/career-applications', {
    method: 'POST',
    body: formValid,
  });
  const res3 = await careerAppPost(req3);
  assert.equal(res3.status, 303);

  // Verify stored in DB has both canonical introductionVideoUrl and videoUrl
  const apps = await db.careerApplications.getByOpportunityId(opportunity.id);
  const stored = apps.find((a: any) => a.email.toLowerCase() === testEmail.toLowerCase());
  assert.ok(stored, 'Application must be saved in database');
  assert.equal(stored.introductionVideoUrl, validDriveLink);
  assert.equal(stored.videoUrl, validDriveLink);
  assert.equal(stored.name, 'Aditi Rao');

  // 4. Admin API security & retrieval
  // Unauthorized request must be rejected
  const unauthReq = new Request('http://localhost/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get-career-applications', opportunityId: opportunity.id })
  });
  const unauthRes = await adminPost(unauthReq);
  assert.equal(unauthRes.status, 401, 'Unauthorized requests must be rejected with 401');

  // Authorized admin request returns application with introductionVideoUrl
  const authReq = new Request('http://localhost/api/admin', {
    method: 'POST',
    headers: { ...ADMIN_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get-career-applications', opportunityId: opportunity.id })
  });
  const authRes = await adminPost(authReq);
  assert.equal(authRes.status, 200);
  const adminApps = await authRes.json();
  const adminStored = adminApps.find((a: any) => a.id === stored.id);
  assert.ok(adminStored, 'Admin API must return the stored application');
  assert.equal(adminStored.introductionVideoUrl, validDriveLink);
  assert.equal(adminStored.videoUrl, validDriveLink);

  // Clean up
  await db.careerApplications.deleteOne(stored.id);
});

test('historical applications with resume and github are preserved and returned intact', async () => {
  const careers = await db.careers.getAll();
  const opportunity = careers[0];
  const historicalId = `hist-app-${Date.now()}`;
  const historicalEmail = `historical.${Date.now()}@cumail.in`;

  await db.careerApplications.insertOne({
    id: historicalId,
    opportunityId: opportunity.id,
    name: 'Historical Candidate',
    email: historicalEmail,
    phone: '9988776655',
    university: 'Chandigarh University',
    program: 'B.Tech',
    graduationYear: '2025',
    studentId: 'HIST-2025',
    resumeUrl: '/uploads/resumes/hist-sample.pdf',
    introductionVideoUrl: 'https://drive.google.com/file/d/HISTORICAL_VIDEO_ID/view',
    videoUrl: 'https://drive.google.com/file/d/HISTORICAL_VIDEO_ID/view',
    linkedin: 'https://linkedin.com/in/historical',
    github: 'https://github.com/historical',
    skills: 'Java, Cloud',
    experience: 'Previous intern',
    motivation: 'Historical motivation',
    consent: true,
    status: 'Reviewed'
  });

  const allApps = await db.careerApplications.getAll();
  const fetched = allApps.find((a: any) => a.id === historicalId);
  assert.ok(fetched, 'Historical record must be retrieved');
  assert.equal(fetched.resumeUrl, '/uploads/resumes/hist-sample.pdf');
  assert.equal(fetched.github, 'https://github.com/historical');
  assert.equal(fetched.introductionVideoUrl, 'https://drive.google.com/file/d/HISTORICAL_VIDEO_ID/view');

  // Clean up
  await db.careerApplications.deleteOne(historicalId);
});

test('opportunity benefits are dynamically loaded from data and contain all 10 expected benefits', async () => {
  const careers = await db.careers.getAll();
  assert.ok(careers.length > 0, 'Opportunities must exist');
  const opportunity = careers.find((c: any) => c.id === 'opp-core-members') || careers[0];
  
  assert.ok(opportunity.benefits, 'Opportunity must have benefits defined');
  const benefitsList = opportunity.benefits
    .split(/\n|\r\n|;/)
    .map((item: string) => item.replace(/^[•\*\-\s\d\.\:\-\»\>\–\—\•]+/, '').trim())
    .filter(Boolean);

  assert.equal(benefitsList.length, 10, 'Must contain all 10 specified benefits');
  assert.ok(benefitsList[0].includes('Real Event Hosting & Speaking Experience'));
  assert.ok(benefitsList[1].includes('Improve Public Speaking & Communication Skills'));
  assert.ok(benefitsList[2].includes('Build Leadership & Confidence'));
  assert.ok(benefitsList[3].includes('Networking Opportunities with Students & Industry Speakers'));
  assert.ok(benefitsList[4].includes('Exciting Prizes & Recognition for Outstanding Contributions'));
  assert.ok(benefitsList[5].includes('Gifts & Community Rewards'));
  assert.ok(benefitsList[6].includes('Potential Internship & Career Opportunities'));
  assert.ok(benefitsList[7].includes('Certificates & Recognition for active contribution'));
  assert.ok(benefitsList[8].includes('Opportunity to represent and contribute to AWS Student Builder Group events'));
  assert.ok(benefitsList[9].includes('Platform to showcase your skills, ideas, and talent'));
});

