import test from 'node:test';
import assert from 'node:assert/strict';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  buildOpportunitySuccessUrl,
  hasDuplicateOpportunityApplication,
  isValidGoogleDriveUrl,
  isValidLinkedInUrl,
  getOpportunityFormType,
  resolveOpportunityApplicationType,
  normalizeOpportunityApplication,
  OPPORTUNITY_DOMAINS,
  CORE_TEAM_ROLES_BY_DOMAIN,
} from '../src/lib/opportunityApplication';
import AdminOpportunityApplicationDetailsModal from '../src/components/AdminOpportunityApplicationDetailsModal';
import { db } from '../src/lib/db';
import { POST as careerAppPost } from '../src/app/api/career-applications/route';
import { POST as adminPost } from '../src/app/api/admin/route';
import { GET as adminResumeGet } from '../src/app/api/admin/career-applications/[id]/resume/route';

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

    assert.equal(redirect, 'https://www.awssbgcuup.tech/opportunities/opportunity-slug?submitted=1');
    assert.equal(
      buildOpportunitySuccessUrl('http://localhost:3000/api/career-applications', 'demo-opportunity'),
      'http://localhost:3000/opportunities/demo-opportunity?submitted=1',
    );
    assert.equal(
      buildOpportunitySuccessUrl(
        'http://localhost:3000/api/career-applications',
        'prod-opportunity',
        new Headers({ host: 'www.awssbgcuup.tech', 'x-forwarded-proto': 'https' }),
      ),
      'https://www.awssbgcuup.tech/opportunities/prod-opportunity?submitted=1',
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

test('isValidLinkedInUrl correctly validates various LinkedIn profile link formats', () => {
  // Valid links
  assert.equal(isValidLinkedInUrl('https://www.linkedin.com/in/johndoe'), true);
  assert.equal(isValidLinkedInUrl('https://linkedin.com/in/johndoe-123'), true);
  assert.equal(isValidLinkedInUrl('http://www.linkedin.com/in/johndoe/'), true);
  assert.equal(isValidLinkedInUrl('linkedin.com/in/johndoe'), true);
  assert.equal(isValidLinkedInUrl('www.linkedin.com/in/johndoe'), true);
  assert.equal(isValidLinkedInUrl('https://in.linkedin.com/in/johndoe'), true);

  // Invalid links
  assert.equal(isValidLinkedInUrl(''), false);
  assert.equal(isValidLinkedInUrl(null), false);
  assert.equal(isValidLinkedInUrl(undefined), false);
  assert.equal(isValidLinkedInUrl('   '), false);
  assert.equal(isValidLinkedInUrl('https://google.com/in/johndoe'), false);
  assert.equal(isValidLinkedInUrl('https://github.com/johndoe'), false);
  assert.equal(isValidLinkedInUrl('https://not-linkedin.com/in/johndoe'), false);
  assert.equal(isValidLinkedInUrl('https://www.linkedin.com'), false);
  assert.equal(isValidLinkedInUrl('https://www.linkedin.com/'), false);
  assert.equal(isValidLinkedInUrl('not-a-url'), false);
});

test('getOpportunityFormType correctly distinguishes founding members, core team, and anchor & speaker', () => {
  assert.equal(getOpportunityFormType('founding-members', 'Founding Members'), 'founding-member');
  assert.equal(getOpportunityFormType('founding-member', 'Founding Member'), 'founding-member');
  assert.equal(getOpportunityFormType('founding-core-members-aws-student-builder-group', 'Founding Core Members'), 'founding-member');
  assert.equal(getOpportunityFormType('core-team', 'Core Team'), 'core-team');
  assert.equal(getOpportunityFormType('core-team-aws-student-builder-group', 'Core Team'), 'core-team');
  assert.equal(getOpportunityFormType('anchor-speaker', 'Anchor & Speaker'), 'anchor-speaker');
  assert.equal(getOpportunityFormType('anchor-and-speaker', 'Anchor & Speaker'), 'anchor-speaker');
  assert.equal(getOpportunityFormType('general-opportunity', 'General Opportunity'), 'anchor-speaker');
});

test('Anchor & Speaker opportunity application requires Google Drive video link', async () => {
  // Setup anchor-speaker opportunity
  const anchorOppId = 'opp-test-anchor-speaker';
  const existingCareers = await db.careers.getAll();
  const existing = existingCareers.find((c: any) => c.id === anchorOppId);
  if (!existing) {
    await db.careers.insertOne({
      id: anchorOppId,
      slug: 'anchor-speaker',
      title: 'Anchor & Speaker',
      organizationName: 'AWS Student Builder Group',
      opportunityType: 'Speaking & Anchoring',
      location: 'Chandigarh University – Uttar Pradesh',
      workMode: 'Onsite',
      description: 'Host events, introduce speakers, and represent the community on stage.',
      status: 'Open',
      published: true,
      internalApplications: true,
      applicationDeadline: '2026-12-31T23:59:59.000Z'
    });
  }

  // 1. Missing video link fails
  const formMissingVideo = new FormData();
  formMissingVideo.append('opportunityId', anchorOppId);
  formMissingVideo.append('opportunitySlug', 'anchor-speaker');
  formMissingVideo.append('name', 'Anchor Candidate');
  formMissingVideo.append('email', `anchor.${Date.now()}@cumail.in`);
  formMissingVideo.append('phone', '9876543210');
  formMissingVideo.append('university', 'Chandigarh University');
  formMissingVideo.append('program', 'B.Tech CSE');
  formMissingVideo.append('graduationYear', '2026');
  formMissingVideo.append('studentId', '22BCS1122');
  formMissingVideo.append('linkedin', 'https://linkedin.com/in/anchorcandidate');
  formMissingVideo.append('skills', 'Public Speaking, Anchoring');
  formMissingVideo.append('experience', 'Hosted college fest');
  formMissingVideo.append('motivation', 'Passionate about public speaking');
  formMissingVideo.append('consent', 'on');

  const req1 = new Request('http://localhost:3000/api/career-applications', { method: 'POST', body: formMissingVideo });
  const res1 = await careerAppPost(req1);
  assert.equal(res1.status, 400);
  const json1 = await res1.json();
  assert.ok(json1.fieldErrors?.introductionVideoUrl);

  // 2. Missing LinkedIn fails with exact error message
  const formMissingLinkedIn = new FormData();
  formMissingLinkedIn.append('opportunityId', anchorOppId);
  formMissingLinkedIn.append('opportunitySlug', 'anchor-speaker');
  formMissingLinkedIn.append('name', 'Anchor Candidate');
  formMissingLinkedIn.append('email', `anchor.${Date.now()}@cumail.in`);
  formMissingLinkedIn.append('phone', '9876543210');
  formMissingLinkedIn.append('university', 'Chandigarh University');
  formMissingLinkedIn.append('program', 'B.Tech CSE');
  formMissingLinkedIn.append('graduationYear', '2026');
  formMissingLinkedIn.append('studentId', '22BCS1122');
  formMissingLinkedIn.append('introductionVideoUrl', 'https://drive.google.com/file/d/1X2Y3Z-anchor-video/view?usp=sharing');
  formMissingLinkedIn.append('skills', 'Public Speaking, Anchoring');
  formMissingLinkedIn.append('experience', 'Hosted college fest');
  formMissingLinkedIn.append('motivation', 'Passionate about public speaking');
  formMissingLinkedIn.append('consent', 'on');

  const reqMissingLinkedIn = new Request('http://localhost:3000/api/career-applications', { method: 'POST', body: formMissingLinkedIn });
  const resMissingLinkedIn = await careerAppPost(reqMissingLinkedIn);
  assert.equal(resMissingLinkedIn.status, 400);
  const jsonMissingLinkedIn = await resMissingLinkedIn.json();
  assert.equal(jsonMissingLinkedIn.fieldErrors?.linkedin, 'LinkedIn Profile is required.');

  // 3. Invalid LinkedIn URL fails
  const formInvalidLinkedIn = new FormData();
  formInvalidLinkedIn.append('opportunityId', anchorOppId);
  formInvalidLinkedIn.append('opportunitySlug', 'anchor-speaker');
  formInvalidLinkedIn.append('name', 'Anchor Candidate');
  formInvalidLinkedIn.append('email', `anchor.${Date.now()}@cumail.in`);
  formInvalidLinkedIn.append('phone', '9876543210');
  formInvalidLinkedIn.append('university', 'Chandigarh University');
  formInvalidLinkedIn.append('program', 'B.Tech CSE');
  formInvalidLinkedIn.append('graduationYear', '2026');
  formInvalidLinkedIn.append('studentId', '22BCS1122');
  formInvalidLinkedIn.append('linkedin', 'https://not-linkedin.com/invalid-profile');
  formInvalidLinkedIn.append('introductionVideoUrl', 'https://drive.google.com/file/d/1X2Y3Z-anchor-video/view?usp=sharing');
  formInvalidLinkedIn.append('skills', 'Public Speaking, Anchoring');
  formInvalidLinkedIn.append('experience', 'Hosted college fest');
  formInvalidLinkedIn.append('motivation', 'Passionate about public speaking');
  formInvalidLinkedIn.append('consent', 'on');

  const reqInvalidLinkedIn = new Request('http://localhost:3000/api/career-applications', { method: 'POST', body: formInvalidLinkedIn });
  const resInvalidLinkedIn = await careerAppPost(reqInvalidLinkedIn);
  assert.equal(resInvalidLinkedIn.status, 400);
  const jsonInvalidLinkedIn = await resInvalidLinkedIn.json();
  assert.equal(jsonInvalidLinkedIn.fieldErrors?.linkedin, 'Please enter a valid LinkedIn profile URL.');

  // 4. Valid video link and valid LinkedIn succeeds
  const testEmail = `anchor.valid.${Date.now()}@cumail.in`;
  const validDriveLink = 'https://drive.google.com/file/d/1X2Y3Z-anchor-video/view?usp=sharing';
  const formValid = new FormData();
  formValid.append('opportunityId', anchorOppId);
  formValid.append('opportunitySlug', 'anchor-speaker');
  formValid.append('name', 'Anchor Candidate');
  formValid.append('email', testEmail);
  formValid.append('phone', '9876543210');
  formValid.append('university', 'Chandigarh University');
  formValid.append('program', 'B.Tech CSE');
  formValid.append('graduationYear', '2026');
  formValid.append('studentId', '22BCS1122');
  formValid.append('linkedin', 'https://linkedin.com/in/anchorcandidate');
  formValid.append('introductionVideoUrl', validDriveLink);
  formValid.append('skills', 'Public Speaking, Anchoring');
  formValid.append('experience', 'Hosted college tech fest');
  formValid.append('motivation', 'Passionate about public speaking and student hosting');
  formValid.append('consent', 'on');

  const req2 = new Request('http://localhost:3000/api/career-applications', { method: 'POST', body: formValid });
  const res2 = await careerAppPost(req2);
  assert.equal(res2.status, 303);

  const apps = await db.careerApplications.getByOpportunityId(anchorOppId);
  const saved = apps.find((a: any) => a.email.toLowerCase() === testEmail.toLowerCase());
  assert.ok(saved);
  assert.equal(saved.introductionVideoUrl, validDriveLink);
  assert.equal(saved.linkedin, 'https://linkedin.com/in/anchorcandidate');
  await db.careerApplications.deleteOne(saved.id);
});

test('Founding Member application validates 11 sections and saves ownership & commitment details', async () => {
  const fmOppId = 'opp-test-founding-members';
  const existingCareers = await db.careers.getAll();
  const existing = existingCareers.find((c: any) => c.id === fmOppId);
  if (!existing) {
    await db.careers.insertOne({
      id: fmOppId,
      slug: 'founding-members',
      title: 'Founding Members',
      organizationName: 'AWS Student Builder Group',
      opportunityType: 'Leadership',
      location: 'Chandigarh University – Uttar Pradesh',
      workMode: 'Hybrid',
      description: 'Join the founding team of AWS Student Builder Group.',
      status: 'Open',
      published: true,
      internalApplications: true,
      applicationDeadline: '2026-12-31T23:59:59.000Z'
    });
  }

  // 1. Missing required founding member fields fails
  const incompleteForm = new FormData();
  incompleteForm.append('opportunityId', fmOppId);
  incompleteForm.append('opportunitySlug', 'founding-members');
  incompleteForm.append('formType', 'founding-member');
  incompleteForm.append('name', 'Founder Candidate');
  incompleteForm.append('email', `founder.${Date.now()}@cumail.in`);
  incompleteForm.append('phone', '9876543210');
  incompleteForm.append('consent', 'on');

  const req1 = new Request('http://localhost:3000/api/career-applications', { method: 'POST', body: incompleteForm });
  const res1 = await careerAppPost(req1);
  assert.equal(res1.status, 400);
  const json1 = await res1.json();
  assert.ok(json1.fieldErrors?.preferredDomain);
  assert.ok(json1.fieldErrors?.whyFoundingMember);
  assert.ok(json1.fieldErrors?.scenarioDropParticipation);
  assert.equal(json1.fieldErrors?.linkedin, 'LinkedIn Profile is required.');

  // 1b. Founding Member with invalid LinkedIn URL fails
  const invalidLinkedInForm = new FormData();
  invalidLinkedInForm.append('opportunityId', fmOppId);
  invalidLinkedInForm.append('opportunitySlug', 'founding-members');
  invalidLinkedInForm.append('formType', 'founding-member');
  invalidLinkedInForm.append('name', 'Founder Candidate');
  invalidLinkedInForm.append('email', `founder.${Date.now()}@cumail.in`);
  invalidLinkedInForm.append('phone', '9876543210');
  invalidLinkedInForm.append('studentId', '23BCS10294');
  invalidLinkedInForm.append('program', 'B.Tech CSE');
  invalidLinkedInForm.append('department', 'Cloud Computing');
  invalidLinkedInForm.append('currentYear', '2nd Year');
  invalidLinkedInForm.append('graduationYear', '2027');
  invalidLinkedInForm.append('preferredDomain', 'Growth & Community');
  invalidLinkedInForm.append('skills', 'Community Building, Public Speaking, AWS Cloud');
  invalidLinkedInForm.append('experience', 'Organized University Hackathon');
  invalidLinkedInForm.append('roleAndImpact', 'Head of Logistics');
  invalidLinkedInForm.append('whyFoundingMember', 'I want to build a thriving community');
  invalidLinkedInForm.append('personalContribution', 'I will contribute time and skills');
  invalidLinkedInForm.append('communityGrowthIdeas', 'Introduce peer mentoring circles');
  invalidLinkedInForm.append('availabilityHours', '6–8 hours');
  invalidLinkedInForm.append('consistentContribution', 'Yes');
  invalidLinkedInForm.append('contributionDuration', 'Multiple semesters');
  invalidLinkedInForm.append('academicBalance', 'I block out evening slots');
  invalidLinkedInForm.append('scenarioDropParticipation', 'I would poll active and inactive members');
  invalidLinkedInForm.append('linkedin', 'https://twitter.com/founder');
  invalidLinkedInForm.append('consent', 'on');

  const reqInvalid = new Request('http://localhost:3000/api/career-applications', { method: 'POST', body: invalidLinkedInForm });
  const resInvalid = await careerAppPost(reqInvalid);
  assert.equal(resInvalid.status, 400);
  const jsonInvalid = await resInvalid.json();
  assert.equal(jsonInvalid.fieldErrors?.linkedin, 'Please enter a valid LinkedIn profile URL.');

  // 2. Complete submission succeeds WITHOUT requiring video link
  const founderEmail = `founder.success.${Date.now()}@cumail.in`;
  const completeForm = new FormData();
  completeForm.append('opportunityId', fmOppId);
  completeForm.append('opportunitySlug', 'founding-members');
  completeForm.append('formType', 'founding-member');
  completeForm.append('name', 'Aarav Sharma');
  completeForm.append('email', founderEmail);
  completeForm.append('personalEmail', 'aarav.sharma.personal@gmail.com');
  completeForm.append('phone', '9876543210');
  completeForm.append('studentId', '23BCS10294');
  completeForm.append('program', 'B.Tech CSE');
  completeForm.append('department', 'Cloud Computing');
  completeForm.append('currentYear', '2nd Year');
  completeForm.append('graduationYear', '2027');
  completeForm.append('preferredDomain', 'Growth & Community');
  completeForm.append('skills', 'Community Building, Public Speaking, AWS Cloud Practitioner, Event Planning');
  completeForm.append('experience', 'Organized University Hackathon with 300+ attendees and managed volunteer team.');
  completeForm.append('roleAndImpact', 'Head of Logistics; streamlined check-ins and ensured zero delays across 24 hours.');
  completeForm.append('whyFoundingMember', 'I want to build a thriving, sustainable cloud community culture that empowers students with real cloud skills.');
  completeForm.append('personalContribution', 'I will contribute time, event organization skills, and establish student outreach networks across departments.');
  completeForm.append('communityGrowthIdeas', 'Introduce peer mentoring circles, monthly hands-on AWS workshops, and guest sessions with AWS Community Builders.');
  completeForm.append('availabilityHours', '6–8 hours');
  completeForm.append('consistentContribution', 'Yes');
  completeForm.append('contributionDuration', 'Multiple semesters');
  completeForm.append('academicBalance', 'I block out evening slots for community initiatives and maintain strict weekend study schedules.');
  completeForm.append('scenarioDropParticipation', 'I would poll active and inactive members to identify pain points, revamp topics based on student demand, and introduce interactive challenges.');
  completeForm.append('linkedin', 'https://linkedin.com/in/aaravsharma');
  completeForm.append('github', 'https://github.com/aaravsharma');
  completeForm.append('resume', new File([Buffer.from('%PDF-1.4 sample pdf')], 'aarav-resume.pdf', { type: 'application/pdf' }));
  completeForm.append('consent', 'on');

  const req2 = new Request('http://localhost:3000/api/career-applications', { method: 'POST', body: completeForm });
  const res2 = await careerAppPost(req2);
  assert.equal(res2.status, 303);

  const apps = await db.careerApplications.getByOpportunityId(fmOppId);
  const saved = apps.find((a: any) => a.email.toLowerCase() === founderEmail.toLowerCase());
  assert.ok(saved, 'Founding member application must be saved');
  assert.equal(saved.preferredDomain, 'Growth & Community');
  assert.equal(saved.department, 'Cloud Computing');
  assert.equal(saved.currentYear, '2nd Year');
  assert.equal(saved.availabilityHours, '6–8 hours');
  assert.equal(saved.whyFoundingMember, 'I want to build a thriving, sustainable cloud community culture that empowers students with real cloud skills.');
  assert.ok(saved.scenarioAnswer.includes('poll active and inactive members'));

  await db.careerApplications.deleteOne(saved.id);
});

test('Core Team application validates domain-specific roles, skills self-rating, and execution scenarios', async () => {
  const ctOppId = 'opp-test-core-team';
  const existingCareers = await db.careers.getAll();
  const existing = existingCareers.find((c: any) => c.id === ctOppId);
  if (!existing) {
    await db.careers.insertOne({
      id: ctOppId,
      slug: 'core-team',
      title: 'Core Team',
      organizationName: 'AWS Student Builder Group',
      opportunityType: 'Operations & Execution',
      location: 'Chandigarh University – Uttar Pradesh',
      workMode: 'Hybrid',
      description: 'Core operational team for AWS Student Builder Group.',
      status: 'Open',
      published: true,
      internalApplications: true,
      applicationDeadline: '2026-12-31T23:59:59.000Z'
    });
  }

  // Verify domain-aware roles taxonomy
  assert.ok(CORE_TEAM_ROLES_BY_DOMAIN['Tech & Technical'].includes('Cloud / AWS'));
  assert.ok(CORE_TEAM_ROLES_BY_DOMAIN['Growth & Community'].includes('Community Management'));
  assert.ok(CORE_TEAM_ROLES_BY_DOMAIN['Media & Creative'].includes('Graphic Design'));

  // 1. Missing LinkedIn on Core Team fails
  const ctMissingLinkedInForm = new FormData();
  ctMissingLinkedInForm.append('opportunityId', ctOppId);
  ctMissingLinkedInForm.append('opportunitySlug', 'core-team');
  ctMissingLinkedInForm.append('formType', 'core-team');
  ctMissingLinkedInForm.append('name', 'Rohan Verma');
  ctMissingLinkedInForm.append('email', `coreteam.nolinkedin.${Date.now()}@cumail.in`);
  ctMissingLinkedInForm.append('phone', '9876543211');
  ctMissingLinkedInForm.append('studentId', '23BCS10888');
  ctMissingLinkedInForm.append('program', 'B.Tech CSE');
  ctMissingLinkedInForm.append('department', 'Software Development');
  ctMissingLinkedInForm.append('currentYear', '2nd Year');
  ctMissingLinkedInForm.append('graduationYear', '2027');
  ctMissingLinkedInForm.append('preferredDomain', 'Tech & Technical');
  ctMissingLinkedInForm.append('preferredRole', 'Web / Software Development');
  ctMissingLinkedInForm.append('skills', 'Next.js, TypeScript, Tailwind CSS, PostgreSQL, AWS Lambda');
  ctMissingLinkedInForm.append('primarySkillLevel', 'Intermediate');
  ctMissingLinkedInForm.append('experience', 'Built full-stack student portal and contributed to open source Next.js libraries.');
  ctMissingLinkedInForm.append('exactResponsibility', 'Architected the REST API endpoints and state management store for 500+ daily active users.');
  ctMissingLinkedInForm.append('teamworkSituation', 'Worked in a 4-person team during a 36-hour hackathon, coordinating frontend-backend contracts and resolving merge conflicts.');
  ctMissingLinkedInForm.append('leadershipExperience', 'No');
  ctMissingLinkedInForm.append('whyCoreTeam', 'I want to build and manage mission-critical web applications and tech infrastructure for AWS SBG.');
  ctMissingLinkedInForm.append('domainContribution', 'I will build and maintain the community portal, leaderboard, and automate event registration webhooks.');
  ctMissingLinkedInForm.append('scenarioUnavailableMembers', 'I would immediately reassess the critical path, delegate urgent tasks to available peers, step in to cover the critical role myself, and keep the team aligned.');
  ctMissingLinkedInForm.append('availabilityHours', '6–8 hours');
  ctMissingLinkedInForm.append('availableDays', 'Weekdays (Mon–Fri)');
  ctMissingLinkedInForm.append('activeParticipation', 'Yes');
  ctMissingLinkedInForm.append('involvementDuration', 'Multiple semesters');
  ctMissingLinkedInForm.append('consent', 'on');

  const reqMissing = new Request('http://localhost:3000/api/career-applications', { method: 'POST', body: ctMissingLinkedInForm });
  const resMissing = await careerAppPost(reqMissing);
  assert.equal(resMissing.status, 400);
  const jsonMissing = await resMissing.json();
  assert.equal(jsonMissing.fieldErrors?.linkedin, 'LinkedIn Profile is required.');

  // 2. Invalid LinkedIn on Core Team fails
  const ctInvalidLinkedInForm = new FormData();
  ctInvalidLinkedInForm.append('opportunityId', ctOppId);
  ctInvalidLinkedInForm.append('opportunitySlug', 'core-team');
  ctInvalidLinkedInForm.append('formType', 'core-team');
  ctInvalidLinkedInForm.append('name', 'Rohan Verma');
  ctInvalidLinkedInForm.append('email', `coreteam.invalid.${Date.now()}@cumail.in`);
  ctInvalidLinkedInForm.append('phone', '9876543211');
  ctInvalidLinkedInForm.append('studentId', '23BCS10888');
  ctInvalidLinkedInForm.append('program', 'B.Tech CSE');
  ctInvalidLinkedInForm.append('department', 'Software Development');
  ctInvalidLinkedInForm.append('currentYear', '2nd Year');
  ctInvalidLinkedInForm.append('graduationYear', '2027');
  ctInvalidLinkedInForm.append('preferredDomain', 'Tech & Technical');
  ctInvalidLinkedInForm.append('preferredRole', 'Web / Software Development');
  ctInvalidLinkedInForm.append('skills', 'Next.js, TypeScript, Tailwind CSS, PostgreSQL, AWS Lambda');
  ctInvalidLinkedInForm.append('primarySkillLevel', 'Intermediate');
  ctInvalidLinkedInForm.append('experience', 'Built full-stack student portal and contributed to open source Next.js libraries.');
  ctInvalidLinkedInForm.append('exactResponsibility', 'Architected the REST API endpoints and state management store for 500+ daily active users.');
  ctInvalidLinkedInForm.append('teamworkSituation', 'Worked in a 4-person team during a 36-hour hackathon, coordinating frontend-backend contracts and resolving merge conflicts.');
  ctInvalidLinkedInForm.append('leadershipExperience', 'No');
  ctInvalidLinkedInForm.append('whyCoreTeam', 'I want to build and manage mission-critical web applications and tech infrastructure for AWS SBG.');
  ctInvalidLinkedInForm.append('domainContribution', 'I will build and maintain the community portal, leaderboard, and automate event registration webhooks.');
  ctInvalidLinkedInForm.append('scenarioUnavailableMembers', 'I would immediately reassess the critical path, delegate urgent tasks to available peers, step in to cover the critical role myself, and keep the team aligned.');
  ctInvalidLinkedInForm.append('availabilityHours', '6–8 hours');
  ctInvalidLinkedInForm.append('availableDays', 'Weekdays (Mon–Fri)');
  ctInvalidLinkedInForm.append('activeParticipation', 'Yes');
  ctInvalidLinkedInForm.append('involvementDuration', 'Multiple semesters');
  ctInvalidLinkedInForm.append('linkedin', 'https://instagram.com/rohan');
  ctInvalidLinkedInForm.append('consent', 'on');

  const reqInvalidCt = new Request('http://localhost:3000/api/career-applications', { method: 'POST', body: ctInvalidLinkedInForm });
  const resInvalidCt = await careerAppPost(reqInvalidCt);
  assert.equal(resInvalidCt.status, 400);
  const jsonInvalidCt = await resInvalidCt.json();
  assert.equal(jsonInvalidCt.fieldErrors?.linkedin, 'Please enter a valid LinkedIn profile URL.');

  // 3. Valid submission succeeds
  const coreTeamEmail = `coreteam.${Date.now()}@cumail.in`;
  const coreTeamForm = new FormData();
  coreTeamForm.append('opportunityId', ctOppId);
  coreTeamForm.append('opportunitySlug', 'core-team');
  coreTeamForm.append('formType', 'core-team');
  coreTeamForm.append('name', 'Rohan Verma');
  coreTeamForm.append('email', coreTeamEmail);
  coreTeamForm.append('phone', '9876543211');
  coreTeamForm.append('studentId', '23BCS10888');
  coreTeamForm.append('program', 'B.Tech CSE');
  coreTeamForm.append('department', 'Software Development');
  coreTeamForm.append('currentYear', '2nd Year');
  coreTeamForm.append('graduationYear', '2027');
  coreTeamForm.append('preferredDomain', 'Tech & Technical');
  coreTeamForm.append('preferredRole', 'Web / Software Development');
  coreTeamForm.append('skills', 'Next.js, TypeScript, Tailwind CSS, PostgreSQL, AWS Lambda');
  coreTeamForm.append('primarySkillLevel', 'Intermediate');
  coreTeamForm.append('experience', 'Built full-stack student portal and contributed to open source Next.js libraries.');
  coreTeamForm.append('exactResponsibility', 'Architected the REST API endpoints and state management store for 500+ daily active users.');
  coreTeamForm.append('teamworkSituation', 'Worked in a 4-person team during a 36-hour hackathon, coordinating frontend-backend contracts and resolving merge conflicts.');
  coreTeamForm.append('leadershipExperience', 'Yes');
  coreTeamForm.append('leadershipDetails', 'Led a team of 5 students in college coding club to build internal problem-solving leaderboard.');
  coreTeamForm.append('whyCoreTeam', 'I want to build and manage mission-critical web applications and tech infrastructure for AWS SBG.');
  coreTeamForm.append('domainContribution', 'I will build and maintain the community portal, leaderboard, and automate event registration webhooks.');
  coreTeamForm.append('scenarioUnavailableMembers', 'I would immediately reassess the critical path, delegate urgent tasks to available peers, step in to cover the critical role myself, and keep the team aligned.');
  coreTeamForm.append('availabilityHours', '6–8 hours');
  coreTeamForm.append('availableDays', 'Weekdays (Mon–Fri)');
  coreTeamForm.append('activeParticipation', 'Yes');
  coreTeamForm.append('involvementDuration', 'Multiple semesters');
  completeFormAppend(coreTeamForm, 'linkedin', 'https://linkedin.com/in/rohanverma');
  completeFormAppend(coreTeamForm, 'github', 'https://github.com/rohanverma');
  coreTeamForm.append('resume', new File([Buffer.from('%PDF-1.4 mock core team resume')], 'rohan-resume.pdf', { type: 'application/pdf' }));
  coreTeamForm.append('consent', 'on');

  function completeFormAppend(form: FormData, key: string, val: string) {
    form.append(key, val);
  }

  const req = new Request('http://localhost:3000/api/career-applications', { method: 'POST', body: coreTeamForm });
  const res = await careerAppPost(req);
  assert.equal(res.status, 303);

  const apps = await db.careerApplications.getByOpportunityId(ctOppId);
  const saved = apps.find((a: any) => a.email.toLowerCase() === coreTeamEmail.toLowerCase());
  assert.ok(saved, 'Core team application must be saved');
  assert.equal(saved.preferredDomain, 'Tech & Technical');
  assert.equal(saved.preferredRole, 'Web / Software Development');
  assert.equal(saved.primarySkillLevel, 'Intermediate');
  assert.equal(saved.leadershipExperience, 'Yes');
  assert.ok(saved.leadershipDetails.includes('Led a team of 5 students'));
  assert.equal(saved.whyCoreTeam, 'I want to build and manage mission-critical web applications and tech infrastructure for AWS SBG.');
  assert.ok(saved.scenarioAnswer.includes('reassess the critical path'));

  await db.careerApplications.deleteOne(saved.id);
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

test('admin login authentication works for awsadmin@culko.in and rejects invalid passwords', async () => {
  // 1. Success with standard production credentials
  const req1 = new Request('http://localhost/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', username: 'awsadmin@culko.in', password: 'awssbgadmin123' })
  });
  const res1 = await adminPost(req1);
  assert.equal(res1.status, 200);
  const data1 = await res1.json();
  assert.equal(data1.success, true);
  assert.ok(data1.token);

  // 2. Success with username alias 'admin'
  const req2 = new Request('http://localhost/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', username: 'admin', password: 'admin123' })
  });
  const res2 = await adminPost(req2);
  assert.equal(res2.status, 200);

  // 3. Rejection on invalid password
  const req3 = new Request('http://localhost/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', username: 'awsadmin@culko.in', password: 'wrong-password-999' })
  });
  const res3 = await adminPost(req3);
  assert.equal(res3.status, 401);
  const data3 = await res3.json();
  assert.equal(data3.error, 'Invalid credentials.');
});

test('Admin API retrieves 100% complete submitted form data for Founding Member applications', async () => {
  const testOppId = `opp-fm-audit-${Date.now()}`;
  await db.careers.insertOne({
    id: testOppId,
    title: 'Founding Member Application Form',
    slug: `founding-member-audit-${Date.now()}`,
    department: 'Executive Leadership',
    location: 'Campus',
    type: 'Leadership',
    description: 'Founding member application audit.',
    requirements: 'Leadership',
    status: 'Open',
    published: true,
    internalApplications: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const form = new FormData();
  form.append('opportunityId', testOppId);
  form.append('opportunitySlug', 'founding-members');
  form.append('formType', 'founding-member');
  form.append('name', 'Aarav Sharma');
  form.append('email', `aarav.${Date.now()}@cumail.in`);
  form.append('personalEmail', 'aarav.sharma@personal.com');
  form.append('phone', '9876543210');
  form.append('studentId', '22BCS10199');
  form.append('rollNumber', '22BCS10199');
  form.append('university', 'Chandigarh University – Uttar Pradesh');
  form.append('program', 'B.Tech CSE');
  form.append('department', 'Computer Science and Engineering');
  form.append('branch', 'Computer Science and Engineering');
  form.append('currentYear', '3rd Year');
  form.append('graduationYear', '2026');
  form.append('preferredDomain', 'Tech & Technical');
  form.append('skills', 'AWS Cloud Architecture, Serverless Lambda, Next.js, Distributed Systems');
  form.append('previousExperience', 'Built university portal and served as Technical Lead for Cloud Club');
  form.append('roleAndImpact', 'Led architecture and reduced latency by 45% across 2,000 active students');
  form.append('whyFoundingMember', 'I want to build a world-class AWS student developer community from scratch at CUUP.');
  form.append('personalContribution', 'I will conduct hands-on AWS labs, architecture hackathons, and mentor 50+ students.');
  form.append('communityGrowthIdeas', 'Host bi-weekly AWS Immersion Days, launch cloud challenge tracks, and build a peer project incubator.');
  form.append('availabilityHours', '8-10 hours/week');
  form.append('consistentContribution', 'Yes, 100% committed throughout academic year');
  form.append('contributionDuration', 'Full Academic Year (1-2 years)');
  form.append('academicBalance', 'Structured time blocks: 2 hours daily in the evening and weekends dedicated to community initiatives.');
  form.append('scenarioDropParticipation', 'I would conduct a fast pulse survey to find root causes, pivot topics to hands-on project building, and organize an exciting interactive hack challenge with swag.');
  form.append('linkedin', 'https://www.linkedin.com/in/aarav-sharma-cloud');
  form.append('github', 'https://github.com/aaravsharma-aws');
  form.append('portfolio', 'https://aaravsharma.dev');
  form.append('resume', new File([Buffer.from('%PDF-1.4 aarav resume')], 'aarav-resume.pdf', { type: 'application/pdf' }));
  form.append('consent', 'on');

  const submitReq = new Request('http://localhost/api/career-applications', {
    method: 'POST',
    body: form
  });
  const submitRes = await careerAppPost(submitReq);
  assert.ok(submitRes.status === 200 || submitRes.status === 303, `Founding Member application submission must succeed, got ${submitRes.status}`);

  const adminReq = new Request('http://localhost/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...ADMIN_HEADER },
    body: JSON.stringify({ action: 'get-career-applications', opportunityId: testOppId })
  });
  const adminRes = await adminPost(adminReq);
  assert.equal(adminRes.status, 200);
  const applications = await adminRes.json();
  const saved = applications.find((a: any) => a.email === form.get('email'));
  assert.ok(saved, 'Application must be retrievable by Admin API');

  // Verify all 11 sections fields are preserved exactly
  assert.equal(saved.name, form.get('name'));
  assert.equal(saved.email, form.get('email'));
  assert.equal(saved.personalEmail, form.get('personalEmail'));
  assert.equal(saved.phone, form.get('phone'));
  assert.equal(saved.rollNumber, form.get('rollNumber'));
  assert.equal(saved.program, form.get('program'));
  assert.equal(saved.branch, form.get('branch'));
  assert.equal(saved.currentYear, form.get('currentYear'));
  assert.equal(saved.graduationYear, form.get('graduationYear'));
  assert.equal(saved.preferredDomain, form.get('preferredDomain'));
  assert.equal(saved.skills, form.get('skills'));
  assert.equal(saved.previousExperience, form.get('previousExperience'));
  assert.equal(saved.roleAndImpact, form.get('roleAndImpact'));
  assert.equal(saved.whyFoundingMember, form.get('whyFoundingMember'));
  assert.equal(saved.personalContribution, form.get('personalContribution'));
  assert.equal(saved.communityGrowthIdeas, form.get('communityGrowthIdeas'));
  assert.equal(saved.availabilityHours, form.get('availabilityHours'));
  assert.equal(saved.consistentContribution, form.get('consistentContribution'));
  assert.equal(saved.contributionDuration, form.get('contributionDuration'));
  assert.equal(saved.academicBalance, form.get('academicBalance'));
  assert.equal(saved.scenarioDropParticipation, form.get('scenarioDropParticipation'));
  assert.equal(saved.linkedin, form.get('linkedin'));
  assert.equal(saved.github, form.get('github'));
  assert.equal(saved.portfolio, form.get('portfolio'));
  assert.equal(saved.consent, true);

  // Clean up
  await db.careerApplications.deleteOne(saved.id);
  await db.careers.deleteOne(testOppId);
});

test('Admin API retrieves 100% complete submitted form data for Core Team applications', async () => {
  const testOppId = `opp-ct-audit-${Date.now()}`;
  await db.careers.insertOne({
    id: testOppId,
    title: 'Core Team Application Form',
    slug: `core-team-audit-${Date.now()}`,
    department: 'Community Operations',
    location: 'Campus',
    type: 'Core Team',
    description: 'Core team application audit.',
    requirements: 'Core Team',
    status: 'Open',
    published: true,
    internalApplications: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const ctForm = new FormData();
  ctForm.append('opportunityId', testOppId);
  ctForm.append('opportunitySlug', 'core-team');
  ctForm.append('formType', 'core-team');
  ctForm.append('name', 'Priya Verma');
  ctForm.append('email', `priya.${Date.now()}@cumail.in`);
  ctForm.append('personalEmail', 'priya.verma@personal.com');
  ctForm.append('phone', '9812345678');
  ctForm.append('studentId', '23BCS10888');
  ctForm.append('rollNumber', '23BCS10888');
  ctForm.append('university', 'Chandigarh University – Uttar Pradesh');
  ctForm.append('program', 'B.Tech AI & Data Science');
  ctForm.append('department', 'Computer Science');
  ctForm.append('branch', 'Computer Science');
  ctForm.append('currentYear', '2nd Year');
  ctForm.append('graduationYear', '2027');
  ctForm.append('preferredDomain', 'Media & Creative');
  ctForm.append('preferredRole', 'Video Editing & Reels Creation');
  ctForm.append('skills', 'Premiere Pro, After Effects, Canva, Motion Graphics, Storyboarding');
  ctForm.append('primarySkillLevel', 'Advanced');
  ctForm.append('experience', 'Created 25+ short form technical reels with 100k+ views across student handles');
  ctForm.append('exactResponsibility', 'Full lifecycle scripting, capturing raw footage, motion graphics animation, and audio mastering');
  ctForm.append('teamworkSituation', 'Coordinated with 4 event leads to produce 3 recap videos within 6 hours of event conclusion');
  ctForm.append('leadershipExperience', 'Yes');
  ctForm.append('leadershipDetails', 'Media sub-head for college tech-fest media committee');
  ctForm.append('whyCoreTeam', 'I want to craft high-impact visual storytelling that establishes AWS SBG as the premier club.');
  ctForm.append('domainContribution', 'I will design high-converting event teasers, speaker spotlights, and bite-sized AWS tip reels.');
  ctForm.append('scenarioUnavailableMembers', 'I will review key deliverables immediately, repurpose pre-made graphic templates, step in directly to edit priority footage, and keep the faculty advisor updated.');
  ctForm.append('availabilityHours', '6-8 hours/week');
  ctForm.append('availableDays', 'Weekday Evenings & Weekends');
  ctForm.append('activeParticipation', 'Yes, actively participating in weekly sprints');
  ctForm.append('involvementDuration', 'Entire Year');
  ctForm.append('linkedin', 'https://www.linkedin.com/in/priya-verma-creative');
  ctForm.append('github', 'https://github.com/priyaverma');
  ctForm.append('portfolio', 'https://behance.net/priyaverma');
  ctForm.append('resume', new File([Buffer.from('%PDF-1.4 priya resume')], 'priya-resume.pdf', { type: 'application/pdf' }));
  ctForm.append('consent', 'on');

  const submitReq = new Request('http://localhost/api/career-applications', {
    method: 'POST',
    body: ctForm
  });
  const submitRes = await careerAppPost(submitReq);
  assert.ok(submitRes.status === 200 || submitRes.status === 303, `Core Team submission must succeed, got ${submitRes.status}`);

  const adminReq = new Request('http://localhost/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...ADMIN_HEADER },
    body: JSON.stringify({ action: 'get-career-applications', opportunityId: testOppId })
  });
  const adminRes = await adminPost(adminReq);
  assert.equal(adminRes.status, 200);
  const applications = await adminRes.json();
  const saved = applications.find((a: any) => a.email === ctForm.get('email'));
  assert.ok(saved, 'Core Team record must be present in Admin API');

  // Verify all Core Team specific fields
  assert.equal(saved.preferredDomain, 'Media & Creative');
  assert.equal(saved.preferredRole, 'Video Editing & Reels Creation');
  assert.equal(saved.skills, ctForm.get('skills'));
  assert.equal(saved.primarySkillLevel, 'Advanced');
  assert.equal(saved.exactResponsibility, ctForm.get('exactResponsibility'));
  assert.equal(saved.teamworkSituation, ctForm.get('teamworkSituation'));
  assert.equal(saved.leadershipExperience, 'Yes');
  assert.equal(saved.leadershipDetails, ctForm.get('leadershipDetails'));
  assert.equal(saved.whyCoreTeam, ctForm.get('whyCoreTeam'));
  assert.equal(saved.domainContribution, ctForm.get('domainContribution'));
  assert.equal(saved.scenarioUnavailableMembers, ctForm.get('scenarioUnavailableMembers'));
  assert.equal(saved.availableDays, ctForm.get('availableDays'));
  assert.equal(saved.activeParticipation, ctForm.get('activeParticipation'));
  assert.equal(saved.involvementDuration, ctForm.get('involvementDuration'));
  assert.equal(saved.linkedin, ctForm.get('linkedin'));

  // Clean up
  await db.careerApplications.deleteOne(saved.id);
  await db.careers.deleteOne(testOppId);
});

test('Admin API export-career-applications-csv exports all standard and dynamic custom fields without dropping data', async () => {
  const testOppId = `opp-csv-audit-${Date.now()}`;
  await db.careers.insertOne({
    id: testOppId,
    title: 'Audit Opportunity for CSV Export',
    slug: `audit-csv-${Date.now()}`,
    department: 'Testing',
    location: 'Campus',
    type: 'Test',
    description: 'CSV export audit.',
    requirements: 'All',
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const customAppId = `custom-app-${Date.now()}`;
  await db.careerApplications.insertOne({
    id: customAppId,
    opportunityId: testOppId,
    formType: 'founding-member',
    name: 'Dynamic Field Candidate',
    email: `dynamic.${Date.now()}@cumail.in`,
    phone: '9900112233',
    university: 'Chandigarh University – Uttar Pradesh',
    program: 'B.Tech',
    department: 'CSE',
    currentYear: '3rd Year',
    graduationYear: '2026',
    preferredDomain: 'Tech & Technical',
    skills: 'Node.js, AWS Cloud, Docker',
    whyFoundingMember: 'Want to lead tech innovation',
    linkedin: 'https://www.linkedin.com/in/dynamic-candidate',
    customHackathonScore: 'Top 5 Finalist',
    customTshirtSize: 'Large',
    consent: true,
    status: 'New'
  });

  const exportReq = new Request('http://localhost/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...ADMIN_HEADER },
    body: JSON.stringify({ action: 'export-career-applications-csv', opportunityId: testOppId })
  });

  const exportRes = await adminPost(exportReq);
  assert.equal(exportRes.status, 200);
  assert.equal(exportRes.headers.get('content-type'), 'text/csv;charset=utf-8');

  const csvText = await exportRes.text();
  assert.ok(csvText.includes('Dynamic Field Candidate'), 'CSV must contain applicant name');
  assert.ok(csvText.includes('https://www.linkedin.com/in/dynamic-candidate'), 'CSV must contain LinkedIn');
  assert.ok(csvText.includes('Tech & Technical'), 'CSV must contain preferred domain');
  assert.ok(csvText.includes('Custom: customHackathonScore'), 'CSV must include dynamic custom column');
  assert.ok(csvText.includes('Top 5 Finalist'), 'CSV must include custom answer');
  assert.ok(csvText.includes('Custom: customTshirtSize'), 'CSV must include second dynamic custom column');
  assert.ok(csvText.includes('Large'), 'CSV must include second custom answer');

  // Clean up
  await db.careerApplications.deleteOne(customAppId);
  await db.careers.deleteOne(testOppId);
});

/* ==========================================================================
   REGRESSION SUITE: ADMIN OPPORTUNITY FORM TYPE & FIELD RENDERING (TESTS 1 - 12)
   ========================================================================== */

// TEST 1: Core Team application resolves to CORE_TEAM
test('TEST 1: Core Team application resolves to CORE_TEAM via stable identifiers and context', () => {
  // Via explicit formType
  assert.equal(resolveOpportunityApplicationType({ formType: 'core-team' }), 'CORE_TEAM');
  // Via opportunity title
  assert.equal(
    resolveOpportunityApplicationType(
      { opportunityTitle: 'AWS SBG Core Team Member' },
      { title: 'AWS SBG Core Team Member' }
    ),
    'CORE_TEAM'
  );
  // Via slug
  assert.equal(
    resolveOpportunityApplicationType(
      { opportunitySlug: 'core-team' },
      { slug: 'core-team' }
    ),
    'CORE_TEAM'
  );
  // Via questions without explicit formType
  assert.equal(
    resolveOpportunityApplicationType({
      whyCoreTeam: 'Passionate about student developer leadership',
      preferredRole: 'Web / Software Development'
    }),
    'CORE_TEAM'
  );
});

// TEST 2: Core Team Admin header says: CORE TEAM APPLICATION
test('TEST 2: Core Team Admin header says: CORE TEAM APPLICATION', () => {
  const ctApp = {
    id: 'career-app-ct-001',
    name: 'Krishnam Dwivedi',
    email: 'krishnam@culko.in',
    opportunityTitle: 'AWS SBG Core Team Member',
    opportunitySlug: 'core-team',
    formType: 'core-team',
    preferredDomain: 'Tech & Technical',
    preferredRole: 'Web / Software Development',
    linkedin: 'https://www.linkedin.com/in/krishnam-dwivedi',
    consent: true,
    status: 'New'
  };

  const html = renderToStaticMarkup(
    React.createElement(AdminOpportunityApplicationDetailsModal, {
      application: ctApp,
      opportunityTitle: 'AWS SBG Core Team Member',
      token: 'test-token',
      onClose: () => {}
    })
  );

  assert.ok(html.includes('Core Team Application'), 'Header badge must say Core Team Application');
  assert.ok(html.includes('AWS SBG Core Team Member'), 'Header must contain opportunity title');
});

// TEST 3: Core Team Admin view contains complete 12 sections / fields
test('TEST 3: Core Team Admin view contains all 12 expected Core Team question fields', () => {
  const fullCtApp = {
    id: 'career-app-ct-full',
    name: 'Aarav Test',
    email: 'aarav@culko.in',
    personalEmail: 'aarav.personal@gmail.com',
    phone: '+919876543210',
    studentId: '23BCS10888',
    university: 'Chandigarh University – Uttar Pradesh',
    program: 'B.Tech CSE',
    department: 'Cloud Computing',
    currentYear: '2nd Year',
    graduationYear: '2027',
    preferredDomain: 'Tech & Technical',
    preferredRole: 'Cloud / AWS',
    skills: 'AWS CDK, DynamoDB, Lambda, TypeScript',
    primarySkillLevel: 'Advanced',
    experience: 'Built serverless event ticketing system',
    exactResponsibility: 'Managed backend microservices and deployment pipelines',
    teamworkSituation: 'Collaborated with UI team across 3 sprints',
    leadershipExperience: 'Yes',
    leadershipDetails: 'Led campus cloud study jam with 60 students',
    whyCoreTeam: 'I want to mentor junior builders and scale SBG technical workshops.',
    domainContribution: 'I will organize 4 hands-on AWS labs and automate certification tracking.',
    scenarioUnavailableMembers: 'I will prioritize the critical workshop demos, delegate setup tasks, and step in as speaker.',
    availabilityHours: '8–10 hours',
    availableDays: 'Weekday Evenings & Weekends',
    activeParticipation: 'Yes, weekly standups',
    involvementDuration: 'Full Academic Year',
    linkedin: 'https://www.linkedin.com/in/aarav-cloud',
    github: 'https://github.com/aarav-cloud',
    portfolio: 'https://aarav.dev',
    consent: true,
    status: 'New'
  };

  const html = renderToStaticMarkup(
    React.createElement(AdminOpportunityApplicationDetailsModal, {
      application: fullCtApp,
      opportunityTitle: 'AWS SBG Core Team Member',
      token: 'test-token',
      onClose: () => {}
    })
  );

  // 01 Personal & Academic Details
  assert.ok(html.includes('Personal &amp; Academic Details') || html.includes('Personal & Academic Details'));
  assert.ok(html.includes('Aarav Test'));
  assert.ok(html.includes('aarav@culko.in'));
  assert.ok(html.includes('23BCS10888'));
  assert.ok(html.includes('B.Tech CSE'));
  assert.ok(html.includes('Cloud Computing'));
  assert.ok(html.includes('2027'));

  // 02 Preferred Domain
  assert.ok(html.includes('Preferred Domain'));
  assert.ok(html.includes('Tech &amp; Technical') || html.includes('Tech & Technical'));

  // 03 Preferred Role
  assert.ok(html.includes('Preferred Role / Responsibility'));
  assert.ok(html.includes('Cloud / AWS'));

  // 04 Skills & Proficiency
  assert.ok(html.includes('Relevant Skills &amp; Proficiency') || html.includes('Relevant Skills & Proficiency'));
  assert.ok(html.includes('AWS CDK, DynamoDB, Lambda, TypeScript'));
  assert.ok(html.includes('Advanced'));

  // 05 Experience & Execution
  assert.ok(html.includes('Previous Experience &amp; Projects') || html.includes('Previous Experience & Projects'));
  assert.ok(html.includes('Built serverless event ticketing system'));
  assert.ok(html.includes('Managed backend microservices and deployment pipelines'));

  // 06 Leadership & Teamwork
  assert.ok(html.includes('Leadership &amp; Teamwork') || html.includes('Leadership & Teamwork'));
  assert.ok(html.includes('Collaborated with UI team across 3 sprints'));
  assert.ok(html.includes('Led campus cloud study jam with 60 students'));

  // 07 Why Core Team?
  assert.ok(html.includes('Why Core Team?'));
  assert.ok(html.includes('I want to mentor junior builders and scale SBG technical workshops.'));

  // 08 Domain Contribution
  assert.ok(html.includes('Domain Contribution'));
  assert.ok(html.includes('I will organize 4 hands-on AWS labs and automate certification tracking.'));

  // 09 Problem Solving / Crisis Scenario
  assert.ok(html.includes('Problem-Solving / Crisis Scenario'));
  assert.ok(html.includes('prioritize the critical workshop demos'));

  // 10 Availability & Commitment
  assert.ok(html.includes('Availability &amp; Commitment') || html.includes('Availability & Commitment'));
  assert.ok(html.includes('8–10 hours') || html.includes('8-10 hours'));
  assert.ok(html.includes('Weekday Evenings &amp; Weekends') || html.includes('Weekday Evenings & Weekends'));

  // 11 Professional Links
  assert.ok(html.includes('Professional Links'));
  assert.ok(html.includes('https://www.linkedin.com/in/aarav-cloud'));
  assert.ok(html.includes('https://github.com/aarav-cloud'));
  assert.ok(html.includes('https://aarav.dev'));

  // 12 Declaration & Consent
  assert.ok(html.includes('Declaration / Consent'));
  assert.ok(html.includes('Confirmed &amp; Committed') || html.includes('Confirmed & Committed'));
});

// TEST 4: Core Team Admin view does NOT incorrectly show: ANCHOR & SPEAKER APPLICATION
test('TEST 4: Core Team Admin view does NOT incorrectly show: ANCHOR & SPEAKER APPLICATION', () => {
  const ctApp = {
    id: 'career-app-ct-002',
    name: 'Krishnam Dwivedi',
    email: 'krishnam@culko.in',
    opportunityTitle: 'AWS SBG Core Team Member',
    opportunitySlug: 'core-team',
    formType: 'core-team',
    whyCoreTeam: 'Passionate about builder group',
    linkedin: 'https://www.linkedin.com/in/krishnam-dwivedi',
    consent: true
  };

  const html = renderToStaticMarkup(
    React.createElement(AdminOpportunityApplicationDetailsModal, {
      application: ctApp,
      opportunityTitle: 'AWS SBG Core Team Member',
      token: 'test-token',
      onClose: () => {}
    })
  );

  assert.equal(html.includes('Anchor &amp; Speaker Application'), false);
  assert.equal(html.includes('Anchor & Speaker Application'), false);
  assert.equal(html.includes('ANCHOR &amp; SPEAKER'), false);
  assert.equal(html.includes('ANCHOR & SPEAKER'), false);
});

// TEST 5: Core Team Admin view does NOT incorrectly show: Short Introduction Video
test('TEST 5: Core Team Admin view does NOT incorrectly show: Short Introduction Video', () => {
  const ctApp = {
    id: 'career-app-ct-003',
    name: 'Candidate Without Video',
    email: 'test@culko.in',
    opportunityTitle: 'AWS SBG Core Team Member',
    opportunitySlug: 'core-team',
    formType: 'core-team',
    preferredDomain: 'Tech & Technical',
    whyCoreTeam: 'Tech motivation',
    linkedin: 'https://www.linkedin.com/in/test',
    consent: true
  };

  const html = renderToStaticMarkup(
    React.createElement(AdminOpportunityApplicationDetailsModal, {
      application: ctApp,
      opportunityTitle: 'AWS SBG Core Team Member',
      token: 'test-token',
      onClose: () => {}
    })
  );

  assert.equal(html.includes('Short Introduction Video'), false);
  assert.equal(html.includes('Introduction Video URL'), false);
  assert.equal(html.includes('Google Drive video link'), false);
});

// TEST 6: Anchor & Speaker still resolves to ANCHOR_SPEAKER
test('TEST 6: Anchor & Speaker still resolves to ANCHOR_SPEAKER', () => {
  assert.equal(resolveOpportunityApplicationType({ formType: 'anchor-speaker' }), 'ANCHOR_SPEAKER');
  assert.equal(
    resolveOpportunityApplicationType(
      { opportunityTitle: 'Anchor & Speaker' },
      { title: 'Anchor & Speaker' }
    ),
    'ANCHOR_SPEAKER'
  );
  assert.equal(
    resolveOpportunityApplicationType(
      { opportunitySlug: 'anchor-speaker' },
      { slug: 'anchor-speaker' }
    ),
    'ANCHOR_SPEAKER'
  );
});

// TEST 7: Anchor & Speaker still shows Google Drive Introduction Video
test('TEST 7: Anchor & Speaker still shows Google Drive Introduction Video', () => {
  const anchorApp = {
    id: 'career-app-anchor-001',
    name: 'Anchor Host',
    email: 'anchor@culko.in',
    opportunityTitle: 'Anchor & Speaker',
    opportunitySlug: 'anchor-speaker',
    formType: 'anchor-speaker',
    linkedin: 'https://www.linkedin.com/in/anchorhost',
    introductionVideoUrl: 'https://drive.google.com/file/d/12345sample/view',
    motivation: 'I love stage hosting',
    skills: 'Public Speaking',
    experience: 'Anchored 5 college events',
    consent: true
  };

  const html = renderToStaticMarkup(
    React.createElement(AdminOpportunityApplicationDetailsModal, {
      application: anchorApp,
      opportunityTitle: 'Anchor & Speaker',
      token: 'test-token',
      onClose: () => {}
    })
  );

  assert.ok(html.includes('Anchor &amp; Speaker Application') || html.includes('Anchor & Speaker Application'));
  assert.ok(html.includes('Short Introduction Video') || html.includes('Introduction Video URL'));
  assert.ok(html.includes('https://drive.google.com/file/d/12345sample/view'));
});

// TEST 8: Founding Member still resolves to FOUNDING_MEMBER
test('TEST 8: Founding Member still resolves to FOUNDING_MEMBER', () => {
  assert.equal(resolveOpportunityApplicationType({ formType: 'founding-member' }), 'FOUNDING_MEMBER');
  assert.equal(
    resolveOpportunityApplicationType(
      { opportunityTitle: 'Founding Core Members' },
      { title: 'Founding Core Members' }
    ),
    'FOUNDING_MEMBER'
  );
  assert.equal(
    resolveOpportunityApplicationType(
      { opportunitySlug: 'founding-members' },
      { slug: 'founding-members' }
    ),
    'FOUNDING_MEMBER'
  );
  assert.equal(
    resolveOpportunityApplicationType({
      whyFoundingMember: 'To establish cloud presence',
      communityGrowthIdeas: 'Workshops & Hackathons'
    }),
    'FOUNDING_MEMBER'
  );
});

// TEST 9: Founding Member still shows all its dedicated fields
test('TEST 9: Founding Member still shows all its dedicated fields', () => {
  const fmApp = {
    id: 'career-app-fm-001',
    name: 'Founder Candidate',
    email: 'founder@culko.in',
    personalEmail: 'founder.personal@gmail.com',
    phone: '9876543210',
    studentId: '23BCS10101',
    program: 'B.Tech CSE',
    department: 'Cloud Computing',
    currentYear: '3rd Year',
    graduationYear: '2026',
    preferredDomain: 'Tech & Technical',
    skills: 'AWS Cloud, Architecture, Kubernetes',
    previousExperience: 'Organized university cloud hackathon',
    roleAndImpact: 'Chief organizer and mentor',
    whyFoundingMember: 'Build the premier AWS student builder community',
    personalContribution: 'Mentor 100+ students in cloud skills',
    communityGrowthIdeas: 'Bi-weekly immersion days and builder showcase',
    availabilityHours: '10 hours/week',
    consistentContribution: 'Committed full term',
    contributionDuration: 'Entire Year',
    academicBalance: 'Evening and weekend schedule blocks',
    scenarioDropParticipation: 'Poll inactive members and pivot topics to hands-on build challenges',
    linkedin: 'https://www.linkedin.com/in/foundercandidate',
    github: 'https://github.com/foundercandidate',
    portfolio: 'https://founder.dev',
    consent: true
  };

  const html = renderToStaticMarkup(
    React.createElement(AdminOpportunityApplicationDetailsModal, {
      application: fmApp,
      opportunityTitle: 'Founding Core Members',
      token: 'test-token',
      onClose: () => {}
    })
  );

  assert.ok(html.includes('Founding Member Application'));
  assert.ok(html.includes('Why Founding Member?'));
  assert.ok(html.includes('Community Growth Ideas'));
  assert.ok(html.includes('Ownership &amp; Initiative Scenario') || html.includes('Ownership & Initiative Scenario'));
  assert.ok(html.includes('Poll inactive members and pivot topics'));
  assert.ok(html.includes('https://www.linkedin.com/in/foundercandidate'));
  assert.equal(html.includes('Short Introduction Video'), false);
});

// TEST 10: Opportunity line and badge can never disagree
test('TEST 10: Opportunity line and badge can never disagree', () => {
  const matrix = [
    {
      app: { id: 'app-matrix-1', email: 'user1@culko.in', opportunityTitle: 'AWS SBG Core Team Member', name: 'User 1' },
      oppTitle: 'AWS SBG Core Team Member',
      expectedBadge: 'Core Team Application',
      forbiddenBadge: 'Anchor & Speaker Application'
    },
    {
      app: { id: 'app-matrix-2', email: 'user2@culko.in', opportunityTitle: 'Founding Members of AWS SBG', name: 'User 2' },
      oppTitle: 'Founding Members of AWS SBG',
      expectedBadge: 'Founding Member Application',
      forbiddenBadge: 'Anchor & Speaker Application'
    },
    {
      app: { id: 'app-matrix-3', email: 'user3@culko.in', opportunityTitle: 'Anchor & Speaker for AWS Events', name: 'User 3' },
      oppTitle: 'Anchor & Speaker for AWS Events',
      expectedBadge: 'Anchor & Speaker Application',
      forbiddenBadge: 'Core Team Application'
    }
  ];

  for (const { app, oppTitle, expectedBadge, forbiddenBadge } of matrix) {
    const html = renderToStaticMarkup(
      React.createElement(AdminOpportunityApplicationDetailsModal, {
        application: app,
        opportunityTitle: oppTitle,
        token: 'test-token',
        onClose: () => {}
      })
    );

    const badgeMatches = (badge: string) =>
      html.includes(badge) || html.includes(badge.replace('&', '&amp;'));

    assert.ok(
      badgeMatches(expectedBadge),
      `Modal for ${oppTitle} must render badge "${expectedBadge}"`
    );
    assert.equal(
      badgeMatches(forbiddenBadge),
      false,
      `Modal for ${oppTitle} must NOT render badge "${forbiddenBadge}"`
    );
  }
});

// TEST 11: Historical application with old fields remains readable
test('TEST 11: Historical application with old fields remains readable without crashing', () => {
  const historicalApp = {
    id: 'career-app-hist-001',
    name: 'Historical Candidate',
    email: 'hist@culko.in',
    opportunityTitle: 'AWS SBG Core Team Member',
    opportunitySlug: 'core-team',
    // Stored with generic fields from first-generation form
    motivation: 'I want to build cloud apps for college',
    experience: 'Previous internship in React',
    skills: 'React, Node.js',
    resumeUrl: '/uploads/resumes/hist.pdf',
    linkedin: 'https://www.linkedin.com/in/historical-user',
    consent: true
  };

  const html = renderToStaticMarkup(
    React.createElement(AdminOpportunityApplicationDetailsModal, {
      application: historicalApp,
      opportunityTitle: 'AWS SBG Core Team Member',
      token: 'test-token',
      onClose: () => {}
    })
  );

  assert.ok(html.includes('Core Team Application'));
  assert.ok(html.includes('Historical Candidate'));
  assert.ok(html.includes('I want to build cloud apps for college'));
  assert.ok(html.includes('Previous internship in React'));
  assert.ok(html.includes('View Resume') || html.includes('Download Resume'));
  assert.ok(html.includes('Missing / Invalid submission data') || html.includes('Not provided'));
  assert.equal(html.includes('Short Introduction Video'), false);
});

// TEST 12: Unknown/custom fields remain visible
test('TEST 12: Unknown/custom fields remain visible in Additional / Historical Custom Fields', () => {
  const dynamicApp = {
    id: 'career-app-custom-001',
    name: 'Dynamic Custom Candidate',
    email: 'dynamic@culko.in',
    opportunityTitle: 'AWS SBG Core Team Member',
    formType: 'core-team',
    linkedin: 'https://www.linkedin.com/in/dynamic',
    customAwardTrack: 'National Cloud Champion',
    legacyDiscordHandle: 'awsbuilder#1234',
    consent: true
  };

  const html = renderToStaticMarkup(
    React.createElement(AdminOpportunityApplicationDetailsModal, {
      application: dynamicApp,
      opportunityTitle: 'AWS SBG Core Team Member',
      token: 'test-token',
      onClose: () => {}
    })
  );

  assert.ok(
    html.includes('Additional / Historical Custom Fields') ||
    html.includes('Additional / Historical')
  );
  assert.ok(html.includes('customAwardTrack'));
  assert.ok(html.includes('National Cloud Champion'));
  assert.ok(html.includes('legacyDiscordHandle'));
  assert.ok(html.includes('awsbuilder#1234'));
});

// TEST 13: Full Founding Member submission -> DB -> Admin modal renders all fields without "Missing"
test('TEST 13: Full Founding Member submission -> DB -> Admin modal renders all fields without "Missing"', async () => {
  const fmOppId = 'opp-e2e-founding-member';
  const existingCareers = await db.careers.getAll();
  const existing = existingCareers.find((c: any) => c.id === fmOppId);
  if (!existing) {
    await db.careers.insertOne({
      id: fmOppId,
      slug: 'founding-members',
      title: 'Founding Members',
      organizationName: 'AWS Student Builder Group',
      opportunityType: 'Leadership',
      location: 'Chandigarh University – Uttar Pradesh',
      workMode: 'Hybrid',
      description: 'Founding members core group',
      status: 'Open',
      published: true,
      internalApplications: true
    });
  }

  const testEmail = `fm.e2e.${Date.now()}@cumail.in`;
  const form = new FormData();
  form.append('opportunityId', fmOppId);
  form.append('opportunitySlug', 'founding-members');
  form.append('name', 'E2E Founding Candidate');
  form.append('email', testEmail);
  form.append('phone', '9876543210');
  form.append('university', 'Chandigarh University – Uttar Pradesh');
  form.append('program', 'B.Tech CSE');
  form.append('department', 'Computer Science and Engineering');
  form.append('currentYear', '3rd Year');
  form.append('graduationYear', '2026');
  form.append('studentId', '23BCS9999');
  form.append('preferredDomain', 'Tech & Technical');
  form.append('skills', 'Next.js, TypeScript, AWS CDK, Serverless');
  form.append('experience', 'Led development of campus cloud portal');
  form.append('roleAndImpact', 'Architected frontend and backend microservices');
  form.append('whyFoundingMember', 'To foster cloud computing culture and mentor junior builders');
  form.append('personalContribution', 'Conduct hands-on AWS workshops and build community tooling');
  form.append('communityGrowthIdeas', 'Organize cloud certifications study tracks and hackathons');
  form.append('availabilityHours', '10-15 hours/week');
  form.append('consistentContribution', 'Yes, fully committed to weekly deliverables');
  form.append('contributionDuration', '1+ Year (Full Academic Term)');
  form.append('academicBalance', 'Effective weekend sprint planning and structured daily time-blocking');
  form.append('scenarioDropParticipation', 'Conduct anonymous feedback survey, switch to interactive live coding labs, gamify badges');
  form.append('linkedin', 'https://linkedin.com/in/e2efoundingcandidate');
  form.append('github', 'https://github.com/e2efoundingcandidate');
  form.append('portfolio', 'https://e2efoundingcandidate.dev');
  form.append('resume', new File([Buffer.from('%PDF-1.4 mock founding resume')], 'founding-resume.pdf', { type: 'application/pdf' }));
  form.append('consent', 'on');

  const req = new Request('http://localhost:3000/api/career-applications', { method: 'POST', body: form });
  const res = await careerAppPost(req);
  assert.equal(res.status, 303);

  const apps = await db.careerApplications.getByOpportunityId(fmOppId);
  const saved = apps.find((a: any) => a.email.toLowerCase() === testEmail.toLowerCase());
  assert.ok(saved, 'Saved application must be retrieved from DB');

  // Render Admin Details Modal
  const html = renderToStaticMarkup(
    React.createElement(AdminOpportunityApplicationDetailsModal, {
      application: saved,
      opportunityTitle: 'Founding Members',
      token: 'test-token',
      onClose: () => {}
    })
  );

  // Assert Badge
  assert.ok(
    html.includes('Founding Member Application') || html.includes('FOUNDING MEMBER APPLICATION'),
    'Badge must be FOUNDING MEMBER APPLICATION'
  );
  assert.equal(html.includes('Anchor &amp; Speaker Application'), false);
  assert.equal(html.includes('Anchor & Speaker Application'), false);

  // Assert ALL fields are rendered with their exact submitted values
  assert.ok(html.includes('E2E Founding Candidate'), 'Name must render');
  assert.ok(html.includes('Computer Science and Engineering'), 'Branch/Department must render');
  assert.ok(html.includes('3rd Year'), 'Current Year must render');
  assert.ok(html.includes('23BCS9999'), 'Student ID must render');
  assert.ok(html.includes('Tech &amp; Technical') || html.includes('Tech & Technical'), 'Preferred Domain must render');
  assert.ok(html.includes('Next.js, TypeScript, AWS CDK, Serverless'), 'Skills must render');
  assert.ok(html.includes('Led development of campus cloud portal'), 'Experience must render');
  assert.ok(html.includes('Architected frontend and backend microservices'), 'Role & Impact must render');
  assert.ok(html.includes('To foster cloud computing culture and mentor junior builders'), 'Why Founding Member must render');
  assert.ok(html.includes('Conduct hands-on AWS workshops and build community tooling'), 'Personal Contribution must render');
  assert.ok(html.includes('Organize cloud certifications study tracks and hackathons'), 'Community Growth Ideas must render');
  assert.ok(html.includes('10-15 hours/week'), 'Weekly Availability must render');
  assert.ok(html.includes('Yes, fully committed to weekly deliverables'), 'Consistent Commitment must render');
  assert.ok(html.includes('1+ Year (Full Academic Term)'), 'Contribution Duration must render');
  assert.ok(html.includes('Effective weekend sprint planning and structured daily time-blocking'), 'Academic Balance must render');
  assert.ok(html.includes('Conduct anonymous feedback survey, switch to interactive live coding labs, gamify badges'), 'Scenario Drop Participation must render');
  assert.ok(html.includes('https://linkedin.com/in/e2efoundingcandidate'), 'LinkedIn must render');
  assert.ok(html.includes('https://github.com/e2efoundingcandidate'), 'GitHub must render');
  assert.ok(html.includes('https://e2efoundingcandidate.dev'), 'Portfolio must render');
  assert.ok(html.includes('View Resume') && html.includes('Download Resume'), 'Resume buttons must render');

  // CRITICAL CHECK: "Missing / Invalid submission data" must NOT be rendered anywhere in this fully filled application
  assert.equal(
    html.includes('Missing / Invalid submission data'),
    false,
    'No field should be rendered as Missing / Invalid submission data for a fully filled application'
  );

  await db.careerApplications.deleteOne(saved.id);
});

// TEST 14: Full Core Team submission -> DB -> Admin modal renders all fields without "Missing"
test('TEST 14: Full Core Team submission -> DB -> Admin modal renders all fields without "Missing"', async () => {
  const ctOppId = 'opp-e2e-core-team';
  const existingCareers = await db.careers.getAll();
  const existing = existingCareers.find((c: any) => c.id === ctOppId);
  if (!existing) {
    await db.careers.insertOne({
      id: ctOppId,
      slug: 'core-team',
      title: 'AWS SBG Core Team Member',
      organizationName: 'AWS Student Builder Group',
      opportunityType: 'Core Team',
      location: 'Chandigarh University – Uttar Pradesh',
      workMode: 'Hybrid',
      description: 'Core team operations',
      status: 'Open',
      published: true,
      internalApplications: true
    });
  }

  const testEmail = `ct.e2e.${Date.now()}@cumail.in`;
  const form = new FormData();
  form.append('opportunityId', ctOppId);
  form.append('opportunitySlug', 'core-team');
  form.append('name', 'E2E Core Team Candidate');
  form.append('email', testEmail);
  form.append('personalEmail', 'ct.personal@gmail.com');
  form.append('phone', '9876543211');
  form.append('university', 'Chandigarh University – Uttar Pradesh');
  form.append('program', 'B.Tech CSE');
  form.append('department', 'Information Technology');
  form.append('currentYear', '2nd Year');
  form.append('graduationYear', '2027');
  form.append('studentId', '24BCS8888');
  form.append('preferredDomain', 'Growth & Community');
  form.append('preferredRole', 'Event Coordination');
  form.append('skills', 'Event Management, Sponsorship Outreach, Stage Operations');
  form.append('primarySkillLevel', 'Intermediate (Hands-on experience)');
  form.append('experience', 'Managed national level university hackathon with 400 attendees');
  form.append('exactResponsibility', 'Head of Logistics and Guest Hospitality');
  form.append('teamworkSituation', 'Delegated timeline tasks to 12 volunteers and executed seamless scheduling');
  form.append('leadershipExperience', 'Yes');
  form.append('leadershipDetails', 'President of Student Technical Society');
  form.append('whyCoreTeam', 'Want to scale AWS community events across north campus');
  form.append('domainContribution', 'Plan bi-weekly hands-on workshops and invite cloud architects');
  form.append('availableDays', 'Monday, Wednesday, Friday, Saturday');
  form.append('availabilityHours', '8-10 hours/week');
  form.append('activeParticipation', 'Yes, fully active in discussions and events');
  form.append('involvementDuration', '1 Year minimum');
  form.append('scenarioUnavailableMembers', 'Proactively step in, reassign critical tasks among available peers, notify leadership');
  form.append('linkedin', 'https://linkedin.com/in/e2ecoreteam');
  form.append('github', 'https://github.com/e2ecoreteam');
  form.append('portfolio', 'https://e2ecoreteam.dev');
  form.append('resume', new File([Buffer.from('%PDF-1.4 mock core team resume')], 'coreteam-resume.pdf', { type: 'application/pdf' }));
  form.append('consent', 'on');

  const req = new Request('http://localhost:3000/api/career-applications', { method: 'POST', body: form });
  const res = await careerAppPost(req);
  assert.equal(res.status, 303);

  const apps = await db.careerApplications.getByOpportunityId(ctOppId);
  const saved = apps.find((a: any) => a.email.toLowerCase() === testEmail.toLowerCase());
  assert.ok(saved, 'Saved Core Team application must be retrieved from DB');

  // Render Admin Details Modal
  const html = renderToStaticMarkup(
    React.createElement(AdminOpportunityApplicationDetailsModal, {
      application: saved,
      opportunityTitle: 'AWS SBG Core Team Member',
      token: 'test-token',
      onClose: () => {}
    })
  );

  // Assert Badge
  assert.ok(
    html.includes('Core Team Application') || html.includes('CORE TEAM APPLICATION'),
    'Badge must be CORE TEAM APPLICATION'
  );
  assert.equal(html.includes('ANCHOR &amp; SPEAKER APPLICATION'), false);

  // Assert ALL fields are rendered with their exact submitted values
  assert.ok(html.includes('E2E Core Team Candidate'), 'Name must render');
  assert.ok(html.includes('ct.personal@gmail.com'), 'Personal Email must render');
  assert.ok(html.includes('Information Technology'), 'Department must render');
  assert.ok(html.includes('2nd Year'), 'Current Year must render');
  assert.ok(html.includes('Growth &amp; Community') || html.includes('Growth & Community'), 'Domain must render');
  assert.ok(html.includes('Event Coordination'), 'Role must render');
  assert.ok(html.includes('Event Management, Sponsorship Outreach, Stage Operations'), 'Skills must render');
  assert.ok(html.includes('Intermediate (Hands-on experience)'), 'Skill level must render');
  assert.ok(html.includes('Managed national level university hackathon with 400 attendees'), 'Experience must render');
  assert.ok(html.includes('Head of Logistics and Guest Hospitality'), 'Exact responsibility must render');
  assert.ok(html.includes('Delegated timeline tasks to 12 volunteers and executed seamless scheduling'), 'Teamwork must render');
  assert.ok(html.includes('President of Student Technical Society'), 'Leadership details must render');
  assert.ok(html.includes('Want to scale AWS community events across north campus'), 'Why Core Team must render');
  assert.ok(html.includes('Plan bi-weekly hands-on workshops and invite cloud architects'), 'Domain contribution must render');
  assert.ok(html.includes('Monday, Wednesday, Friday, Saturday'), 'Available days must render');
  assert.ok(html.includes('8-10 hours/week'), 'Availability hours must render');
  assert.ok(html.includes('Proactively step in, reassign critical tasks among available peers, notify leadership'), 'Scenario must render');
  assert.ok(html.includes('View Resume') && html.includes('Download Resume'), 'Resume buttons must render');

  // CRITICAL CHECK: "Missing / Invalid submission data" must NOT be rendered anywhere in this fully filled application
  assert.equal(
    html.includes('Missing / Invalid submission data'),
    false,
    'No field should be rendered as Missing / Invalid submission data for a fully filled application'
  );

  await db.careerApplications.deleteOne(saved.id);
});

// TEST 15: normalizeOpportunityApplication handles snake_case, camelCase, and fallback aliases seamlessly
test('TEST 15: normalizeOpportunityApplication handles snake_case, camelCase, and fallback aliases seamlessly', () => {
  const rawPostgresRow = {
    id: 'test-norm-1',
    opportunity_id: 'opp-1',
    opportunity_slug: 'founding-members',
    form_type: 'founding-member',
    name: 'Raw Postgres Candidate',
    email: 'norm@cumail.in',
    personal_email: 'norm.pers@gmail.com',
    phone: '9876543210',
    program: 'B.Tech AI & Data Science',
    branch: 'AIML',
    current_year: '1st Year',
    graduation_year: '2028',
    roll_number: '25BCS0001',
    preferred_domain: 'Media & Creative',
    skills: 'Photoshop, Premiere Pro, After Effects',
    primary_skill_level: 'Advanced / Proficient',
    previous_experience: 'Freelance video editor for YouTube channels',
    role_and_impact: 'Produced 50+ videos generating 1M+ views',
    why_founding_member: 'Help AWS SBG build a strong visual identity and brand',
    personal_contribution: 'Design all event banners, promotional teasers, and recap reels',
    community_growth_ideas: 'Launch YouTube shorts series teaching AWS concepts in 60 seconds',
    scenario_drop_participation: 'Launch high-energy interactive reel challenges with shoutouts',
    availability_hours: '12-15 hours/week',
    consistent_contribution: 'Yes, weekly 3 videos guaranteed',
    contribution_duration: '2 Years',
    academic_balance: 'Scheduled edit slots during free campus blocks',
    linkedin: 'https://linkedin.com/in/normcandidate',
    github: 'https://github.com/normcandidate',
    portfolio: 'https://normcandidate.design',
    resume_url: 'admin-resume:test-norm-1',
    consent: true
  };

  const normalized = normalizeOpportunityApplication(rawPostgresRow);

  assert.equal(normalized.department, 'AIML');
  assert.equal(normalized.branch, 'AIML');
  assert.equal(normalized.currentYear, '1st Year');
  assert.equal(normalized.studentId, '25BCS0001');
  assert.equal(normalized.rollNumber, '25BCS0001');
  assert.equal(normalized.preferredDomain, 'Media & Creative');
  assert.equal(normalized.roleAndImpact, 'Produced 50+ videos generating 1M+ views');
  assert.equal(normalized.exactResponsibility, 'Produced 50+ videos generating 1M+ views');
  assert.equal(normalized.whyFoundingMember, 'Help AWS SBG build a strong visual identity and brand');
  assert.equal(normalized.personalContribution, 'Design all event banners, promotional teasers, and recap reels');
  assert.equal(normalized.communityGrowthIdeas, 'Launch YouTube shorts series teaching AWS concepts in 60 seconds');
  assert.equal(normalized.scenarioDropParticipation, 'Launch high-energy interactive reel challenges with shoutouts');
  assert.equal(normalized.availabilityHours, '12-15 hours/week');
  assert.equal(normalized.consistentContribution, 'Yes, weekly 3 videos guaranteed');
  assert.equal(normalized.contributionDuration, '2 Years');
  assert.equal(normalized.academicBalance, 'Scheduled edit slots during free campus blocks');
  assert.equal(normalized.resumeUrl, 'admin-resume:test-norm-1');

  // Render in Admin Modal to verify complete rendering
  const html = renderToStaticMarkup(
    React.createElement(AdminOpportunityApplicationDetailsModal, {
      application: normalized,
      opportunityTitle: 'Founding Members',
      token: 'test-token',
      onClose: () => {}
    })
  );

  assert.ok(html.includes('Raw Postgres Candidate'));
  assert.ok(html.includes('AIML'));
  assert.ok(html.includes('1st Year'));
  assert.ok(html.includes('25BCS0001'));
  assert.ok(html.includes('Media &amp; Creative') || html.includes('Media & Creative'));
  assert.ok(html.includes('Produced 50+ videos generating 1M+ views'));
  assert.ok(html.includes('Help AWS SBG build a strong visual identity and brand'));
  assert.ok(html.includes('Design all event banners, promotional teasers, and recap reels'));
  assert.ok(html.includes('Launch YouTube shorts series teaching AWS concepts in 60 seconds'));
  assert.ok(html.includes('Launch high-energy interactive reel challenges with shoutouts'));
  assert.ok(html.includes('12-15 hours/week'));
  assert.ok(html.includes('Yes, weekly 3 videos guaranteed'));
  assert.ok(html.includes('2 Years'));
  assert.ok(html.includes('Scheduled edit slots during free campus blocks'));
  assert.ok(html.includes('View Resume') && html.includes('Download Resume'));
  assert.equal(html.includes('Missing / Invalid submission data'), false);
});

// TEST 16: Founding Member requires Resume / CV (missing resume rejected with 400)
test('TEST 16: Founding Member requires Resume / CV (missing resume rejected with 400)', async () => {
  const form = new FormData();
  form.append('opportunityId', 'opp-e2e-founding-member');
  form.append('opportunitySlug', 'founding-members');
  form.append('formType', 'founding-member');
  form.append('name', 'Missing Resume Founder');
  form.append('email', `fm.noresume.${Date.now()}@cumail.in`);
  form.append('phone', '9876543210');
  form.append('university', 'Chandigarh University – Uttar Pradesh');
  form.append('program', 'B.Tech CSE');
  form.append('department', 'Computer Science and Engineering');
  form.append('currentYear', '3rd Year');
  form.append('graduationYear', '2026');
  form.append('studentId', '23BCS9999');
  form.append('preferredDomain', 'Tech & Technical');
  form.append('skills', 'Next.js, TypeScript, AWS CDK, Serverless');
  form.append('experience', 'Led development of campus cloud portal');
  form.append('roleAndImpact', 'Architected frontend and backend microservices');
  form.append('whyFoundingMember', 'To foster cloud computing culture and mentor junior builders');
  form.append('personalContribution', 'Conduct hands-on AWS workshops and build community tooling');
  form.append('communityGrowthIdeas', 'Organize cloud certifications study tracks and hackathons');
  form.append('availabilityHours', '10-15 hours/week');
  form.append('consistentContribution', 'Yes, fully committed to weekly deliverables');
  form.append('contributionDuration', '1+ Year (Full Academic Term)');
  form.append('academicBalance', 'Effective weekend sprint planning');
  form.append('scenarioDropParticipation', 'Conduct anonymous feedback survey, switch to interactive live coding labs');
  form.append('linkedin', 'https://linkedin.com/in/noresume');
  form.append('consent', 'on');
  // NOTE: No resume attached!

  const req = new Request('http://localhost:3000/api/career-applications', { method: 'POST', body: form });
  const res = await careerAppPost(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.ok(data.fieldErrors?.resume, 'fieldErrors.resume must be present');
  assert.equal(data.fieldErrors.resume, 'Resume / CV is required.');
});

// TEST 17: Core Team requires Resume / CV (missing resume rejected with 400)
test('TEST 17: Core Team requires Resume / CV (missing resume rejected with 400)', async () => {
  const form = new FormData();
  form.append('opportunityId', 'opp-e2e-core-team');
  form.append('opportunitySlug', 'core-team');
  form.append('formType', 'core-team');
  form.append('name', 'Missing Resume Core Team');
  form.append('email', `ct.noresume.${Date.now()}@cumail.in`);
  form.append('phone', '9876543211');
  form.append('university', 'Chandigarh University – Uttar Pradesh');
  form.append('program', 'B.Tech CSE');
  form.append('department', 'Information Technology');
  form.append('currentYear', '2nd Year');
  form.append('graduationYear', '2027');
  form.append('studentId', '24BCS8888');
  form.append('preferredDomain', 'Growth & Community');
  form.append('preferredRole', 'Event Coordination');
  form.append('skills', 'Event Management, Sponsorship Outreach');
  form.append('primarySkillLevel', 'Intermediate (Hands-on experience)');
  form.append('experience', 'Managed national level university hackathon');
  form.append('exactResponsibility', 'Head of Logistics and Guest Hospitality');
  form.append('teamworkSituation', 'Delegated timeline tasks to 12 volunteers');
  form.append('leadershipExperience', 'No');
  form.append('whyCoreTeam', 'Want to scale AWS community events across north campus');
  form.append('domainContribution', 'Plan bi-weekly hands-on workshops and invite cloud architects');
  form.append('availableDays', 'Monday, Wednesday, Friday, Saturday');
  form.append('availabilityHours', '8-10 hours/week');
  form.append('activeParticipation', 'Yes, fully active in discussions and events');
  form.append('involvementDuration', '1 Year minimum');
  form.append('scenarioUnavailableMembers', 'Proactively step in, reassign critical tasks');
  form.append('linkedin', 'https://linkedin.com/in/ctnoresume');
  form.append('consent', 'on');
  // NOTE: No resume attached!

  const req = new Request('http://localhost:3000/api/career-applications', { method: 'POST', body: form });
  const res = await careerAppPost(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.ok(data.fieldErrors?.resume, 'fieldErrors.resume must be present');
  assert.equal(data.fieldErrors.resume, 'Resume / CV is required.');
});

// TEST 18: Non-PDF resume (e.g. DOCX or PNG) is rejected with 400
test('TEST 18: Non-PDF resume is rejected with 400 and fieldErrors.resume', async () => {
  const form = new FormData();
  form.append('opportunityId', 'opp-e2e-core-team');
  form.append('opportunitySlug', 'core-team');
  form.append('formType', 'core-team');
  form.append('name', 'Invalid File Candidate');
  form.append('email', `invalid.file.${Date.now()}@cumail.in`);
  form.append('phone', '9876543211');
  form.append('university', 'Chandigarh University – Uttar Pradesh');
  form.append('program', 'B.Tech CSE');
  form.append('department', 'Information Technology');
  form.append('currentYear', '2nd Year');
  form.append('graduationYear', '2027');
  form.append('studentId', '24BCS8888');
  form.append('preferredDomain', 'Growth & Community');
  form.append('preferredRole', 'Event Coordination');
  form.append('skills', 'Event Management, Sponsorship Outreach');
  form.append('primarySkillLevel', 'Intermediate (Hands-on experience)');
  form.append('experience', 'Managed national level university hackathon');
  form.append('exactResponsibility', 'Head of Logistics and Guest Hospitality');
  form.append('teamworkSituation', 'Delegated timeline tasks to 12 volunteers');
  form.append('leadershipExperience', 'No');
  form.append('whyCoreTeam', 'Want to scale AWS community events across north campus');
  form.append('domainContribution', 'Plan bi-weekly hands-on workshops and invite cloud architects');
  form.append('availableDays', 'Monday, Wednesday, Friday, Saturday');
  form.append('availabilityHours', '8-10 hours/week');
  form.append('activeParticipation', 'Yes, fully active in discussions and events');
  form.append('involvementDuration', '1 Year minimum');
  form.append('scenarioUnavailableMembers', 'Proactively step in, reassign critical tasks');
  form.append('linkedin', 'https://linkedin.com/in/invalidfile');
  form.append('consent', 'on');
  // Word docx instead of PDF
  form.append('resume', new File([Buffer.from('fake docx content')], 'resume.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));

  const req = new Request('http://localhost:3000/api/career-applications', { method: 'POST', body: form });
  const res = await careerAppPost(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.ok(data.fieldErrors?.resume);
  assert.equal(data.fieldErrors.resume, 'Resume must be a PDF file.');
});

// TEST 19: Oversized resume (> 5MB) is rejected with 400
test('TEST 19: Oversized resume (> 5MB) is rejected with 400 and fieldErrors.resume', async () => {
  const form = new FormData();
  form.append('opportunityId', 'opp-e2e-core-team');
  form.append('opportunitySlug', 'core-team');
  form.append('formType', 'core-team');
  form.append('name', 'Oversized Resume Candidate');
  form.append('email', `oversized.${Date.now()}@cumail.in`);
  form.append('phone', '9876543211');
  form.append('university', 'Chandigarh University – Uttar Pradesh');
  form.append('program', 'B.Tech CSE');
  form.append('department', 'Information Technology');
  form.append('currentYear', '2nd Year');
  form.append('graduationYear', '2027');
  form.append('studentId', '24BCS8888');
  form.append('preferredDomain', 'Growth & Community');
  form.append('preferredRole', 'Event Coordination');
  form.append('skills', 'Event Management, Sponsorship Outreach');
  form.append('primarySkillLevel', 'Intermediate (Hands-on experience)');
  form.append('experience', 'Managed national level university hackathon');
  form.append('exactResponsibility', 'Head of Logistics and Guest Hospitality');
  form.append('teamworkSituation', 'Delegated timeline tasks to 12 volunteers');
  form.append('leadershipExperience', 'No');
  form.append('whyCoreTeam', 'Want to scale AWS community events across north campus');
  form.append('domainContribution', 'Plan bi-weekly hands-on workshops and invite cloud architects');
  form.append('availableDays', 'Monday, Wednesday, Friday, Saturday');
  form.append('availabilityHours', '8-10 hours/week');
  form.append('activeParticipation', 'Yes, fully active in discussions and events');
  form.append('involvementDuration', '1 Year minimum');
  form.append('scenarioUnavailableMembers', 'Proactively step in, reassign critical tasks');
  form.append('linkedin', 'https://linkedin.com/in/oversized');
  form.append('consent', 'on');
  // 6 MB PDF
  const largeBuffer = Buffer.alloc(6 * 1024 * 1024);
  form.append('resume', new File([largeBuffer], 'large-resume.pdf', { type: 'application/pdf' }));

  const req = new Request('http://localhost:3000/api/career-applications', { method: 'POST', body: form });
  const res = await careerAppPost(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.ok(data.fieldErrors?.resume);
  assert.equal(data.fieldErrors.resume, 'Resume must be 5MB or smaller.');
});

// TEST 20: Anchor & Speaker does NOT require a resume and succeeds without it
test('TEST 20: Anchor & Speaker does NOT require a resume and succeeds without it', async () => {
  const anchorOppId = 'opp-test-anchor-speaker';
  const testEmail = `anchor.noresume.${Date.now()}@cumail.in`;
  const form = new FormData();
  form.append('opportunityId', anchorOppId);
  form.append('opportunitySlug', 'anchor-speaker');
  form.append('formType', 'anchor-speaker');
  form.append('name', 'Anchor No Resume Candidate');
  form.append('email', testEmail);
  form.append('phone', '9876543210');
  form.append('university', 'Chandigarh University – Uttar Pradesh');
  form.append('program', 'B.Tech CSE');
  form.append('graduationYear', '2026');
  form.append('studentId', '22BCS1122');
  form.append('linkedin', 'https://linkedin.com/in/anchornoresume');
  form.append('introductionVideoUrl', 'https://drive.google.com/file/d/1A2B3C4D5E/view?usp=sharing');
  form.append('skills', 'Stage Hosting, Public Speaking');
  form.append('experience', 'Anchored national summit');
  form.append('motivation', 'Passionate about hosting tech conferences');
  form.append('consent', 'on');
  // NO resume attached!

  const req = new Request('http://localhost:3000/api/career-applications', { method: 'POST', body: form });
  const res = await careerAppPost(req);
  assert.equal(res.status, 303, 'Anchor & Speaker submission must succeed without a resume');

  const apps = await db.careerApplications.getByOpportunityId(anchorOppId);
  const saved = apps.find((a: any) => a.email.toLowerCase() === testEmail.toLowerCase());
  assert.ok(saved);

  await db.careerApplications.deleteOne(saved.id);
});

// TEST 21: Admin Details Modal shows Missing / Invalid data when resume is missing on canonical FM or CT
test('TEST 21: Admin Details Modal shows Missing / Invalid data when resume is missing on canonical FM or CT', () => {
  const appWithoutResume = {
    id: 'app-no-resume-render',
    name: 'No Resume Applicant',
    email: 'noresume@cumail.in',
    opportunityTitle: 'Founding Members',
    formType: 'founding-member',
    linkedin: 'https://linkedin.com/in/noresume',
    resumeUrl: '', // Missing
    consent: true
  };

  const html = renderToStaticMarkup(
    React.createElement(AdminOpportunityApplicationDetailsModal, {
      application: appWithoutResume,
      opportunityTitle: 'Founding Members',
      token: 'test-token',
      onClose: () => {}
    })
  );

  assert.ok(html.includes('Resume / CV'));
  assert.ok(html.includes('Missing / Invalid submission data'));
});

// TEST 22: Admin resume API serves inline preview and attachment download
test('TEST 22: Admin resume API serves inline preview and attachment download', async () => {
  const appId = `career-app-resume-test-${Date.now()}`;
  const mockPdfData = Buffer.from('%PDF-1.4 Mock PDF Content For Admin Testing').toString('base64');
  
  await db.careerApplications.insertOne({
    id: appId,
    opportunityId: 'opp-1',
    opportunitySlug: 'founding-members',
    formType: 'founding-member',
    name: 'Admin Resume Tester',
    email: `admintest.${Date.now()}@cumail.in`,
    resumeUrl: `admin-resume:${appId}`,
    linkedin: 'https://linkedin.com/in/admintester',
    consent: true,
    status: 'New'
  });

  await db.resumeFiles.saveFile(appId, {
    data: mockPdfData,
    mimeType: 'application/pdf',
    fileName: 'resume-document.pdf',
    size: Buffer.from(mockPdfData, 'base64').length
  });

  // 1. Unauthorized request
  const unauthReq = new Request(`http://localhost:3000/api/admin/career-applications/${appId}/resume`);
  const unauthRes = await adminResumeGet(unauthReq, { params: Promise.resolve({ id: appId }) });
  assert.equal(unauthRes.status, 401);

  // 2. Authorized Inline Preview (View Resume)
  const viewReq = new Request(`http://localhost:3000/api/admin/career-applications/${appId}/resume`, {
    headers: { Authorization: 'Bearer awssbg-admin-session-token-secure-hash' }
  });
  const viewRes = await adminResumeGet(viewReq, { params: Promise.resolve({ id: appId }) });
  assert.equal(viewRes.status, 200);
  assert.equal(viewRes.headers.get('Content-Type'), 'application/pdf');
  assert.ok(viewRes.headers.get('Content-Disposition')?.includes('inline'));

  // 3. Authorized Attachment Download (Download Resume)
  const downloadReq = new Request(`http://localhost:3000/api/admin/career-applications/${appId}/resume?download=1`, {
    headers: { Authorization: 'Bearer awssbg-admin-session-token-secure-hash' }
  });
  const downloadRes = await adminResumeGet(downloadReq, { params: Promise.resolve({ id: appId }) });
  assert.equal(downloadRes.status, 200);
  assert.equal(downloadRes.headers.get('Content-Type'), 'application/pdf');
  assert.ok(downloadRes.headers.get('Content-Disposition')?.includes('attachment'));
  assert.ok(downloadRes.headers.get('Content-Disposition')?.includes('resume-document.pdf'));

  // Clean up
  await db.careerApplications.deleteOne(appId);
});

// TEST 23: Historical applications without resume or with custom URLs remain intact
test('TEST 23: Historical applications without resume or with custom URLs remain intact and readable', () => {
  const legacyApp = {
    id: 'legacy-app-001',
    name: 'Legacy Applicant',
    email: 'legacy@culko.in',
    opportunityTitle: 'Anchor & Speaker for AWS Events',
    formType: 'anchor-speaker',
    linkedin: 'https://linkedin.com/in/legacy',
    resumeUrl: 'https://example.com/resumes/legacy.pdf',
    introductionVideoUrl: 'https://drive.google.com/file/d/123/view',
    consent: true
  };

  const html = renderToStaticMarkup(
    React.createElement(AdminOpportunityApplicationDetailsModal, {
      application: legacyApp,
      opportunityTitle: 'Anchor & Speaker for AWS Events',
      token: 'test-token',
      onClose: () => {}
    })
  );

  assert.ok(html.includes('Legacy Applicant'));
  assert.ok(html.includes('Attached Resume (Historical / File Submission)'));
  assert.ok(html.includes('View Resume') && html.includes('Download Resume'));
  assert.ok(html.includes('https://example.com/resumes/legacy.pdf'));
});

