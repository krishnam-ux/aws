import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/db';
import { FoundingMember, FoundingMemberFormConfig, FormQuestion } from '../src/types/foundingMember';
import { generateSingleFoundingMemberPdf, generateMultipleFoundingMembersPdf } from '../src/lib/foundingMemberPdf';
import { GET as pdfGet, POST as pdfPost } from '../src/app/api/admin/founding-members/pdf/route';
import { GET as formConfigGet, POST as formConfigPost } from '../src/app/api/admin/founding-members/form-config/route';
import { GET as publicFormGet, POST as publicFormPost } from '../src/app/api/founding-members/form/route';

const ADMIN_TOKEN = 'awssbg-admin-session-token-secure-hash';
const ADMIN_AUTH_HEADER = { Authorization: `Bearer ${ADMIN_TOKEN}` };

test('Founding Members ID Generation - FMB-CUUP-XXX Format & Sequential Persistence', async () => {
  const nextId = await db.foundingMembers.getNextMemberId();
  assert.match(nextId, /^FMB-CUUP-\d{3,}$/, 'Next Member ID must match FMB-CUUP-XXX pattern');

  // Verify all existing members have a valid memberId
  const allMembers = await db.foundingMembers.getAll();
  for (const m of allMembers) {
    assert.ok(m.memberId, `Member ${m.id} must have a permanent memberId`);
    assert.match(m.memberId, /^FMB-CUUP-\d{3,}$/, `Member ID ${m.memberId} must follow FMB-CUUP-XXX`);
  }
});

test('Form Builder Configuration - Form Basic Information Editing & Persistence', async () => {
  const initialConfig = await db.foundingMemberFormConfig.getConfig();
  assert.ok(initialConfig, 'Form config should exist');

  const updateReq = new Request('http://localhost/api/admin/founding-members/form-config', {
    method: 'POST',
    headers: { ...ADMIN_AUTH_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'save_config',
      config: {
        ...initialConfig,
        title: 'AWS Student Builder Group – Member Registration & Profile Form',
        subtitle: 'Member Record • Role Verification • Community Profile',
        description: 'Official member profile and record form for members of AWS Student Builder Group at Chandigarh University – Uttar Pradesh.',
        purpose: 'To maintain a centralized and up-to-date record of AWS SBG members, their roles, skills, contributions, participation, and recognition.',
        organizationName: 'AWS Student Builder Group at Chandigarh University – Uttar Pradesh',
        headerText: 'AWS STUDENT BUILDER GROUP • CU-UP',
        submitButtonText: 'Submit Member Profile',
        successTitle: 'Member Profile Submitted Successfully!',
        successMessage: 'Thank you for submitting your member profile. Your information has been received for AWS Student Builder Group records. The team may contact you if any verification or clarification is required.',
        consentText: 'I confirm that the information provided is accurate and up to date. I consent to its use for AWS Student Builder Group membership records, member verification, team coordination, event participation, recognition, certificates, digital badges, and related community activities.'
      }
    })
  });

  const res = await formConfigPost(updateReq);
  const data = await res.json();
  assert.equal(res.status, 200, 'Config update should succeed');
  assert.equal(data.success, true);
  assert.equal(data.config.title, 'AWS Student Builder Group – Member Registration & Profile Form');
  assert.equal(data.config.subtitle, 'Member Record • Role Verification • Community Profile');
  assert.equal(data.config.submitButtonText, 'Submit Member Profile');
  assert.equal(data.config.successTitle, 'Member Profile Submitted Successfully!');

  // Verify persistence via GET endpoint
  const getReq = new Request('http://localhost/api/admin/founding-members/form-config', {
    headers: ADMIN_AUTH_HEADER
  });
  const getRes = await formConfigGet(getReq);
  const getData = await getRes.json();
  assert.equal(getRes.status, 200);
  assert.equal(getData.config.purpose, 'To maintain a centralized and up-to-date record of AWS SBG members, their roles, skills, contributions, participation, and recognition.');
});

test('Form Builder Configuration - CRUD, Reordering, Enable/Disable, Required/Optional & Delete', async () => {
  const initialConfig = await db.foundingMemberFormConfig.getConfig();
  const testQuestionId = `q_unit_test_${Date.now()}`;
  const testQuestion: FormQuestion = {
    id: testQuestionId,
    type: 'dropdown',
    label: 'What is your primary cloud domain?',
    placeholder: 'Pick a domain',
    helpText: 'Used for automated test verification',
    required: true,
    enabled: true,
    options: ['Cloud Architecture', 'DevOps & CI/CD', 'Machine Learning & Bedrock', 'Serverless'],
    step: 4,
    order: (initialConfig.questions?.length || 0) + 1
  };

  // 1. Add Question via API
  const addReq = new Request('http://localhost/api/admin/founding-members/form-config', {
    method: 'POST',
    headers: { ...ADMIN_AUTH_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'add_question',
      question: testQuestion
    })
  });
  const addRes = await formConfigPost(addReq);
  const addData = await addRes.json();
  assert.equal(addRes.status, 200);
  assert.equal(addData.success, true);
  const foundAdded = addData.config.questions.find((q: FormQuestion) => q.id === testQuestionId);
  assert.ok(foundAdded);
  assert.equal(foundAdded.label, 'What is your primary cloud domain?');
  assert.equal(foundAdded.required, true);
  assert.equal(foundAdded.enabled, true);

  // 2. Edit Question (Label, Required -> Optional, Options)
  const editReq = new Request('http://localhost/api/admin/founding-members/form-config', {
    method: 'POST',
    headers: { ...ADMIN_AUTH_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'edit_question',
      questionId: testQuestionId,
      question: {
        label: 'Which technical domain are you interested in?',
        required: false,
        enabled: false,
        options: ['Cloud Architecture', 'DevOps & CI/CD', 'AI/ML']
      }
    })
  });
  const editRes = await formConfigPost(editReq);
  const editData = await editRes.json();
  assert.equal(editRes.status, 200);
  const foundEdited = editData.config.questions.find((q: FormQuestion) => q.id === testQuestionId);
  assert.equal(foundEdited.label, 'Which technical domain are you interested in?');
  assert.equal(foundEdited.required, false);
  assert.equal(foundEdited.enabled, false);
  assert.equal(foundEdited.options.length, 3);

  // 3. Reorder Questions
  const allQIds = editData.config.questions.map((q: FormQuestion) => q.id);
  const reversedQIds = [testQuestionId, ...allQIds.filter((id: string) => id !== testQuestionId)];
  const reorderReq = new Request('http://localhost/api/admin/founding-members/form-config', {
    method: 'POST',
    headers: { ...ADMIN_AUTH_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'reorder',
      questionIds: reversedQIds
    })
  });
  const reorderRes = await formConfigPost(reorderReq);
  const reorderData = await reorderRes.json();
  assert.equal(reorderRes.status, 200);
  assert.equal(reorderData.config.questions[0].id, testQuestionId);
  assert.equal(reorderData.config.questions[0].order, 1);

  // 4. Delete Question via API (Verify active removal without data destruction)
  const deleteReq = new Request('http://localhost/api/admin/founding-members/form-config', {
    method: 'POST',
    headers: { ...ADMIN_AUTH_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'delete_question',
      questionId: testQuestionId
    })
  });
  const deleteRes = await formConfigPost(deleteReq);
  const deleteData = await deleteRes.json();
  assert.equal(deleteRes.status, 200);
  assert.equal(deleteData.success, true);
  const foundDeleted = deleteData.config.questions.find((q: FormQuestion) => q.id === testQuestionId);
  assert.equal(foundDeleted, undefined, 'Deleted question must be removed from active form config');

  // 5. Status Toggle (Draft / Published)
  const setDraftReq = new Request('http://localhost/api/admin/founding-members/form-config', {
    method: 'POST',
    headers: { ...ADMIN_AUTH_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'set_status',
      status: 'Draft'
    })
  });
  const draftRes = await formConfigPost(setDraftReq);
  const draftData = await draftRes.json();
  assert.equal(draftData.status, 'Draft');

  const setPubReq = new Request('http://localhost/api/admin/founding-members/form-config', {
    method: 'POST',
    headers: { ...ADMIN_AUTH_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'set_status',
      status: 'Published'
    })
  });
  const pubRes = await formConfigPost(setPubReq);
  const pubData = await pubRes.json();
  assert.equal(pubData.status, 'Published');
});

test('PDF Authorization & Download Security - 401 Rejections & Secure Admin Access', async () => {
  const members = await db.foundingMembers.getAll();
  assert.ok(members.length > 0, 'Founding members must exist');
  const targetMember = members[0];

  // 1. Unauthenticated request MUST be rejected with 401 Unauthorized
  const unauthReq = new Request(`http://localhost/api/admin/founding-members/pdf?id=${targetMember.id}`);
  const unauthRes = await pdfGet(unauthReq);
  assert.equal(unauthRes.status, 401, 'Unauthenticated request must return 401 Unauthorized');
  const unauthJson = await unauthRes.json();
  assert.ok(unauthJson.error?.includes('Unauthorized'));

  // 2. Cookie header authentication (admin_token)
  const cookieReq = new Request(`http://localhost/api/admin/founding-members/pdf?id=${targetMember.id}`, {
    headers: { cookie: `admin_token=${ADMIN_TOKEN}` }
  });
  const cookieRes = await pdfGet(cookieReq);
  assert.equal(cookieRes.status, 200, 'Cookie authenticated request must return 200');
  assert.equal(cookieRes.headers.get('Content-Type'), 'application/pdf');

  // 3. Short-lived signed download token generation via authenticated POST
  const tokenGenReq = new Request('http://localhost/api/admin/founding-members/pdf', {
    method: 'POST',
    headers: { ...ADMIN_AUTH_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get_download_token', id: targetMember.id })
  });
  const tokenGenRes = await pdfPost(tokenGenReq);
  const tokenGenData = await tokenGenRes.json();
  assert.equal(tokenGenRes.status, 200);
  assert.equal(tokenGenData.success, true);
  assert.ok(tokenGenData.downloadToken);
  assert.ok(tokenGenData.downloadUrl);

  // 4. Download PDF using the short-lived signed download token (no admin headers)
  const signedDownloadReq = new Request(`http://localhost${tokenGenData.downloadUrl}`);
  const signedDownloadRes = await pdfGet(signedDownloadReq);
  assert.equal(signedDownloadRes.status, 200, 'Signed download token request must return 200');
  assert.equal(signedDownloadRes.headers.get('Content-Type'), 'application/pdf');
  const pdfBytes = new Uint8Array(await signedDownloadRes.arrayBuffer());
  assert.ok(pdfBytes.length > 1000, 'PDF buffer must be substantial');
  assert.equal(String.fromCharCode(...pdfBytes.subarray(0, 4)), '%PDF', 'PDF buffer must begin with %PDF magic bytes');

  // 5. Tampered signed token MUST be rejected with 401 Unauthorized
  const tamperedTokenReq = new Request(
    `http://localhost/api/admin/founding-members/pdf?id=${targetMember.id}&downloadToken=${tokenGenData.downloadToken}tampered`
  );
  const tamperedTokenRes = await pdfGet(tamperedTokenReq);
  assert.equal(tamperedTokenRes.status, 401, 'Tampered signed token must be rejected with 401');

  // 6. Authenticated Bearer Header Request for Single Member
  const singleHeaderReq = new Request(`http://localhost/api/admin/founding-members/pdf?id=${targetMember.id}`, {
    headers: ADMIN_AUTH_HEADER
  });
  const singleRes = await pdfGet(singleHeaderReq);
  assert.equal(singleRes.status, 200);
  assert.equal(singleRes.headers.get('Content-Type'), 'application/pdf');

  // 7. Authenticated Selected Members PDF Download
  const selectedIds = members.slice(0, 2).map((m) => m.id).join(',');
  const selectedReq = new Request(`http://localhost/api/admin/founding-members/pdf?ids=${selectedIds}`, {
    headers: ADMIN_AUTH_HEADER
  });
  const selectedRes = await pdfGet(selectedReq);
  assert.equal(selectedRes.status, 200);
  assert.equal(selectedRes.headers.get('Content-Type'), 'application/pdf');

  // 8. Authenticated All Members PDF Download
  const allReq = new Request(`http://localhost/api/admin/founding-members/pdf?all=true`, {
    headers: ADMIN_AUTH_HEADER
  });
  const allRes = await pdfGet(allReq);
  assert.equal(allRes.status, 200);
  assert.equal(allRes.headers.get('Content-Type'), 'application/pdf');

  // 9. Authenticated Batch POST PDF Download
  const batchPostReq = new Request('http://localhost/api/admin/founding-members/pdf', {
    method: 'POST',
    headers: { ...ADMIN_AUTH_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberIds: members.slice(0, 2).map((m) => m.id) })
  });
  const batchPostRes = await pdfPost(batchPostReq);
  assert.equal(batchPostRes.status, 200);
  assert.equal(batchPostRes.headers.get('Content-Type'), 'application/pdf');
});

test('Shared Form Submission Flow - Identification by Email & Core Team Isolation', async () => {
  const testEmail = `builder.founding.${Date.now()}@culko.in`;
  const nextExpectedId = await db.foundingMembers.getNextMemberId();

  const testMemberData: FoundingMember = {
    id: `fm-test-${Date.now()}`,
    memberId: nextExpectedId,
    fullName: 'Automated Test Builder',
    name: 'Automated Test Builder',
    email: testEmail,
    phone: '+91 9123456780',
    university: 'Chandigarh University',
    courseBranch: 'B.Tech CSE Cloud Computing',
    yearSemester: '3rd Year / 5th Sem',
    studentId: '23BCS8888',
    domain: 'Cloud & Infrastructure',
    role: 'Founding Member',
    skills: 'AWS S3, EC2, IAM, CDK, Next.js',
    experience: 'Created student automated deployment pipelines.',
    bio: 'Foundational AWS cloud enthusiast.',
    customAnswers: {
      q_cert_prep: 'AWS Certified Cloud Practitioner (CLF-C02)',
      q_custom_fav_tool: 'AWS CloudFormation'
    },
    formSubmitted: true,
    formSubmittedAt: new Date().toISOString(),
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    // 1. Insert through db.foundingMembers
    await db.foundingMembers.insertOne(testMemberData);

    const inserted = await db.foundingMembers.getByEmail(testEmail);
    assert.ok(inserted, 'Inserted member must be found by email');
    assert.equal(inserted?.memberId, nextExpectedId);
    assert.equal(inserted?.customAnswers?.['q_cert_prep'], 'AWS Certified Cloud Practitioner (CLF-C02)');

    // 2. Simulate update via shared form submission with custom answers
    await db.foundingMembers.updateOne(inserted.id, {
      skills: 'AWS S3, EC2, IAM, CDK, Next.js, Bedrock GenAI',
      customAnswers: {
        ...inserted.customAnswers,
        q_new_survey: 'Attending Next Hands-on Session'
      }
    });

    const updated = await db.foundingMembers.getByEmail(testEmail);
    assert.ok(updated?.skills?.includes('Bedrock GenAI'));
    assert.equal(updated?.customAnswers?.['q_new_survey'], 'Attending Next Hands-on Session');
    assert.equal(updated?.customAnswers?.['q_cert_prep'], 'AWS Certified Cloud Practitioner (CLF-C02)');

    // 3. Strict Verification: Core team records must NOT be modified or contain this member
    const coreTeam = await db.coreTeam.getAll();
    assert.equal(
      coreTeam.some((c: any) => c.email === testEmail),
      false,
      'Core Team must be completely unaffected by Founding Members operations'
    );
  } finally {
    // Cleanup
    const toDelete = await db.foundingMembers.getByEmail(testEmail);
    if (toDelete) {
      await db.foundingMembers.deleteById(toDelete.id);
    }
  }
});

test('Dynamic PDF Generation - Single & Multi-Member Profiles with Photo and Dynamic Questions', async () => {
  const formConfig = await db.foundingMemberFormConfig.getConfig();

  const dummyMember: FoundingMember = {
    id: 'fm-pdf-test-01',
    memberId: 'FMB-CUUP-999',
    fullName: 'Jane Cloud Architect',
    name: 'Jane Cloud Architect',
    email: 'jane.architect@culko.in',
    phone: '+91 9988776655',
    university: 'Chandigarh University – Uttar Pradesh',
    courseBranch: 'B.Tech CSE (Cloud Architecture)',
    yearSemester: '4th Year / 7th Semester',
    studentId: '21BCS9999',
    photoUrl: '',
    linkedin: 'https://linkedin.com/in/janearchitect',
    github: 'https://github.com/janearchitect',
    portfolio: 'https://janearchitect.dev',
    domain: 'Cloud & Infrastructure',
    role: 'Founding Member',
    skills: 'AWS IAM, VPC, EC2, ECS, Terraform, Kubernetes',
    experience: 'Conducted hands-on cloud labs and student workshops.',
    bio: 'Building the foundational cloud community for university students.',
    customAnswers: {
      q_cert_prep: 'AWS Certified Solutions Architect - Associate (SAA-C03)'
    },
    formSubmitted: true,
    formSubmittedAt: new Date().toISOString(),
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 1. Single Member PDF Buffer
  const singlePdfBuffer = await generateSingleFoundingMemberPdf(dummyMember, { formConfig });
  assert.ok(singlePdfBuffer && singlePdfBuffer.length > 1000, 'Single PDF buffer must be generated and non-empty');
  assert.equal(singlePdfBuffer.subarray(0, 4).toString(), '%PDF', 'Buffer must have PDF magic header');

  // 2. Multiple Members PDF Buffer
  const multiPdfBuffer = await generateMultipleFoundingMembersPdf(
    [dummyMember, { ...dummyMember, memberId: 'FMB-CUUP-998', fullName: 'Bob DevOps' }],
    { formConfig }
  );
  assert.ok(multiPdfBuffer && multiPdfBuffer.length > singlePdfBuffer.length, 'Multi PDF buffer must be generated and larger than single');
  assert.equal(multiPdfBuffer.subarray(0, 4).toString(), '%PDF', 'Multi Buffer must have PDF magic header');
});

test('Public Founding Members Form - Profile Photograph Mandatory Requirement Enforcement', async () => {
  // 1. Verify GET config returns photoUrl as required: true
  const getReq = new Request('http://localhost/api/founding-members/form');
  const getRes = await publicFormGet(getReq);
  const getData = await getRes.json();
  assert.equal(getRes.status, 200);
  const photoQuestion = getData.config.questions.find((q: FormQuestion) => q.id === 'photoUrl');
  assert.ok(photoQuestion, 'photoUrl question should exist in config');
  assert.equal(photoQuestion.required, true, 'photoUrl must be configured as required: true');

  // 2. Attempt submission without photo - MUST be rejected with 400 Bad Request
  const badEmail = `no.photo.${Date.now()}@culko.in`;
  const invalidReq = new Request('http://localhost/api/founding-members/form', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'No Photo Candidate',
      email: badEmail,
      phone: '+91 9999988888',
      university: 'Chandigarh University',
      courseBranch: 'B.Tech CSE',
      yearSemester: '3rd Year / 6th Sem',
      studentId: '23BCS9999',
      domain: 'Cloud & Infrastructure',
      skills: 'AWS S3, EC2',
      experience: 'Cloud enthusiast',
      photoUrl: '' // Empty photo
    })
  });
  const invalidRes = await publicFormPost(invalidReq);
  const invalidData = await invalidRes.json();
  assert.equal(invalidRes.status, 400, 'Submission without photo must be rejected with status 400');
  assert.ok(invalidData.error?.toLowerCase().includes('profile photo'));

  // 3. Valid submission with photo - MUST succeed
  const validEmail = `with.photo.${Date.now()}@culko.in`;
  const validPhotoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const validReq = new Request('http://localhost/api/founding-members/form', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Valid Photo Builder',
      email: validEmail,
      phone: '+91 9999977777',
      university: 'Chandigarh University',
      courseBranch: 'B.Tech CSE',
      yearSemester: '3rd Year / 6th Sem',
      studentId: '23BCS9998',
      domain: 'Cloud & Infrastructure',
      skills: 'AWS S3, EC2, Lambda, DynamoDB',
      experience: 'Created cloud automation systems',
      photoUrl: validPhotoBase64,
      consent: true,
      consentGiven: true
    })
  });
  const validRes = await publicFormPost(validReq);
  const validData = await validRes.json();
  assert.equal(validRes.status, 200, 'Valid submission with photo must succeed with 200');
  assert.equal(validData.success, true);

  // Clean up created member
  const created = await db.foundingMembers.getByEmail(validEmail);
  if (created) {
    await db.foundingMembers.deleteById(created.id);
  }
});

test('Centralized AWS SBG Member Registration & Profile Form - Complete Multi-Section Verification & Consent Enforcement', async () => {
  // 1. Verify Default Form Config Metadata
  const config = await db.foundingMemberFormConfig.getConfig();
  assert.equal(config.title, 'AWS Student Builder Group – Member Registration & Profile Form');
  assert.equal(config.subtitle, 'Member Record • Role Verification • Community Profile');
  assert.equal(config.description, 'Official member profile and record form for members of AWS Student Builder Group at Chandigarh University – Uttar Pradesh.');
  assert.equal(config.purpose, 'To maintain a centralized and up-to-date record of AWS SBG members, their roles, skills, contributions, participation, and recognition.');
  assert.equal(config.organizationName, 'AWS Student Builder Group at Chandigarh University – Uttar Pradesh');
  assert.equal(config.headerText, 'AWS STUDENT BUILDER GROUP • CU-UP');
  assert.equal(config.submitButtonText, 'Submit Member Profile');
  assert.equal(config.successTitle, 'Member Profile Submitted Successfully!');
  assert.ok(config.successMessage?.includes('Thank you for submitting your member profile. Your information has been received for AWS Student Builder Group records.'));

  // 2. Rejection when Consent is false or missing
  const noConsentEmail = `no.consent.${Date.now()}@culko.in`;
  const noConsentReq = new Request('http://localhost/api/founding-members/form', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Consent Test User',
      email: noConsentEmail,
      phone: '+91 9876543210',
      university: 'Chandigarh University',
      courseBranch: 'B.Tech CSE',
      yearSemester: '3rd Year',
      studentId: '23BCS1234',
      domain: 'Cloud & Infrastructure',
      skills: 'AWS S3',
      photoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      consent: false,
      consentGiven: false
    })
  });
  const noConsentRes = await publicFormPost(noConsentReq);
  const noConsentData = await noConsentRes.json();
  assert.equal(noConsentRes.status, 400, 'Submission without consent must be rejected with 400');
  assert.ok(noConsentData.error?.toLowerCase().includes('consent'));

  // 3. Full Centralized Profile Submission with All 8 Sections & Fields
  const fullTestEmail = `full.profile.${Date.now()}@culko.in`;
  const fullProfileReq = new Request('http://localhost/api/founding-members/form', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // Section 1: Personal Information
      fullName: 'Alex Rivero',
      photoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      email: fullTestEmail,
      phone: '+91 98765 01234',

      // Section 2: Academic Information
      university: 'Chandigarh University – Uttar Pradesh',
      course: 'B.Tech Computer Science & Engineering (Cloud Computing)',
      yearSemester: '3rd Year (6th Semester)',
      studentId: '23BCS9911',

      // Section 3: AWS SBG Membership
      memberRole: 'Event Speaker',
      role: 'Event Speaker',
      domain: 'Cloud & Infrastructure',
      designation: 'Cloud Solutions Evangelist',
      dateOfJoining: '2024-08-15',
      membershipStatus: 'Active',

      // Section 4: Skills & Professional Profile
      skills: 'AWS Architecture, DynamoDB, Lambda, Terraform, Kubernetes',
      interests: 'Serverless Systems, Distributed Architecture, Cloud Cost Optimization',
      linkedin: 'https://linkedin.com/in/alexrivero-cloud',
      github: 'https://github.com/alexrivero-cloud',
      portfolio: 'https://alexrivero.dev',

      // Section 5: Anchor / Speaker Details (Conditional)
      speakerRoleType: 'Both (Anchor & Speaker)',
      speakingExperience: 'Delivered keynote and tech talks at 5+ university cloud sessions.',
      demoVideoUrl: 'https://youtube.com/watch?v=demo-speaker-video',
      speakingTopics: 'Getting Started with AWS CDK, Real-World Serverless Architecture',
      languages: 'English & Hindi (Fluent)',
      eventAvailability: 'Available on Weekends & Offline Tech Bootcamps',

      // Section 6: Experience & Contribution
      previousExperience: 'Organized HackCloud 2024 and led 4 AWS hands-on workshops.',
      contributionAreas: 'Hands-on Labs, Technical Content, Speaker Sessions',
      assignedResponsibilities: 'Mentoring 50+ students in Cloud Foundations series.',
      majorAchievements: 'AWS Community Builder & 1st place in AWS Student Hackathon.',

      // Section 7: Recognition & Records
      certifications: 'AWS Certified Solutions Architect - Associate (SAA-C03), AWS Cloud Practitioner',
      digitalBadges: 'Cloud Foundations Completion, Event Speaker Honor Badge',
      eventsParticipated: 'CloudXplore Series 1-4, AWS Builders Day 2025',
      additionalNotes: 'Ready to lead upcoming AWS Bedrock workshops.',

      // Section 8: Consent
      consentGiven: true
    })
  });

  const fullProfileRes = await publicFormPost(fullProfileReq);
  const fullProfileData = await fullProfileRes.json();
  assert.equal(fullProfileRes.status, 200, 'Full profile submission must succeed with status 200');
  assert.equal(fullProfileData.success, true);
  assert.ok(fullProfileData.member);
  assert.ok(fullProfileData.member.memberId, 'Permanent Member ID must be generated');

  // Verify stored data in db
  const stored = await db.foundingMembers.getByEmail(fullTestEmail);
  assert.ok(stored, 'Member record must be retrievable from database');
  assert.equal(stored.fullName, 'Alex Rivero');
  assert.equal(stored.memberRole, 'Event Speaker');
  assert.equal(stored.designation, 'Cloud Solutions Evangelist');
  assert.equal(stored.speakerRoleType, 'Both (Anchor & Speaker)');
  assert.equal(stored.speakingExperience, 'Delivered keynote and tech talks at 5+ university cloud sessions.');
  assert.equal(stored.demoVideoUrl, 'https://youtube.com/watch?v=demo-speaker-video');
  assert.equal(stored.languages, 'English & Hindi (Fluent)');
  assert.equal(stored.certifications, 'AWS Certified Solutions Architect - Associate (SAA-C03), AWS Cloud Practitioner');
  assert.equal(stored.consentGiven, true);

  // Clean up
  await db.foundingMembers.deleteById(stored.id);
});
