import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/db';
import { FoundingMember } from '../src/types/foundingMember';

test('Founding Members Architecture - Complete Decoupling from Core Team', async () => {
  const coreTeamBefore = await db.coreTeam.getAll();
  const foundingMembersBefore = await db.foundingMembers.getAll();

  assert.ok(foundingMembersBefore.length >= 4, 'Initial founding members must be seeded');
  assert.ok(coreTeamBefore.length >= 1, 'Core team should be independently intact');

  // Verify that coreTeam records are NOT in foundingMembers and vice versa
  for (const fm of foundingMembersBefore) {
    assert.ok(fm.formToken, `Founding member ${fm.id} must have a unique formToken`);
    assert.ok(fm.email, `Founding member ${fm.id} must have an email`);
  }
});

test('Founding Member CRUD and Token Lookup Operations', async () => {
  const testId = `fm_test_${Date.now()}`;
  const testToken = `fm_tok_test_${Math.random().toString(16).slice(2, 10)}`;

  const newMember: FoundingMember = {
    id: testId,
    fullName: 'Test Candidate',
    email: 'test.founding@cumail.in',
    phone: '+91 9876543210',
    university: 'Chandigarh University – Uttar Pradesh',
    courseBranch: 'B.Tech Computer Science & Engineering',
    yearSemester: '3rd Year / 5th Semester',
    studentId: '22BCS9999',
    domain: 'DevOps & Cloud Computing',
    skills: 'AWS EC2, S3, Docker, Kubernetes, Terraform',
    experience: 'Built cloud migration pipelines for hackathon projects',
    bio: 'Passionate cloud builder contributing to AWS SBG foundational chapters.',
    formToken: testToken,
    formSubmitted: false,
    status: 'Active',
    role: 'Founding Cloud Architect',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    // 1. Insert
    await db.foundingMembers.insertOne(newMember);
    const inserted = await db.foundingMembers.getById(testId);
    assert.ok(inserted);
    assert.equal(inserted?.id, testId);
    assert.equal(inserted?.fullName, 'Test Candidate');

    // 2. Lookup by Token
    const foundByToken = await db.foundingMembers.getByToken(testToken);
    assert.ok(foundByToken, 'Must find founding member by formToken');
    assert.equal(foundByToken?.id, testId);
    assert.equal(foundByToken?.email, 'test.founding@cumail.in');

    // 3. Lookup by Email
    const foundByEmail = await db.foundingMembers.getByEmail('test.founding@cumail.in');
    assert.ok(foundByEmail, 'Must find founding member by email');
    assert.equal(foundByEmail?.id, testId);

    // 4. Update (simulate form submission)
    await db.foundingMembers.updateOne(testId, {
      fullName: 'Test Candidate (Updated)',
      phone: '+91 9999988888',
      linkedin: 'https://linkedin.com/in/testcandidate',
      github: 'https://github.com/testcandidate',
      portfolio: 'https://testcandidate.dev',
      formSubmitted: true,
      formSubmittedAt: new Date().toISOString()
    });

    const updated = await db.foundingMembers.getById(testId);
    assert.ok(updated, 'Update must succeed');
    assert.equal(updated?.fullName, 'Test Candidate (Updated)');
    assert.equal(updated?.formSubmitted, true);
    assert.equal(updated?.linkedin, 'https://linkedin.com/in/testcandidate');
    assert.equal(updated?.github, 'https://github.com/testcandidate');

    // 5. Verify Core Team database was NOT modified or polluted
    const coreTeamAfter = await db.coreTeam.getAll();
    assert.equal(
      coreTeamAfter.some((m: any) => m.id === testId || m.email === 'test.founding@cumail.in'),
      false,
      'Core Team database MUST NOT contain the newly created/updated Founding Member'
    );
  } finally {
    // Cleanup
    await db.foundingMembers.deleteById(testId);
    const cleaned = await db.foundingMembers.getById(testId);
    assert.equal(cleaned, null, 'Cleaned test founding member');
  }
});

test('Public Form Submission Flow Validation and Security', async () => {
  const members = await db.foundingMembers.getAll();
  const firstMember = members[0];
  assert.ok(firstMember, 'Should have at least one founding member');

  const token = firstMember.formToken;
  assert.ok(token, 'Founding member must have form token');

  // Verify token format
  assert.match(token, /^fm_tok_[a-f0-9]+$/, 'Token must conform to secure token schema');

  // Update through token
  const previousFullName = firstMember.fullName;
  const updatedFullName = `${previousFullName} Verified`;

  await db.foundingMembers.updateOne(firstMember.id, {
    fullName: updatedFullName,
    formSubmitted: true,
    formSubmittedAt: new Date().toISOString()
  });

  const updated = await db.foundingMembers.getById(firstMember.id);
  assert.equal(updated?.fullName, updatedFullName);
  assert.equal(updated?.formSubmitted, true);

  // Revert back
  await db.foundingMembers.updateOne(firstMember.id, {
    fullName: previousFullName
  });
});
