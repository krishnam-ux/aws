import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOpportunitySuccessUrl,
  hasDuplicateOpportunityApplication,
  isValidGoogleDriveUrl,
  isValidLinkedInUrl,
  getOpportunityFormType,
  OPPORTUNITY_DOMAINS,
  CORE_TEAM_ROLES_BY_DOMAIN,
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
