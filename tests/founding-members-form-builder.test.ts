import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/db';
import { FoundingMember, FoundingMemberFormConfig, FormQuestion } from '../src/types/foundingMember';
import { generateSingleFoundingMemberPdf, generateMultipleFoundingMembersPdf } from '../src/lib/foundingMemberPdf';
import { GET as pdfGet, POST as pdfPost } from '../src/app/api/admin/founding-members/pdf/route';
import { GET as formConfigGet, POST as formConfigPost } from '../src/app/api/admin/founding-members/form-config/route';

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
        title: 'AWS Founding Members Registration 2026',
        subtitle: 'Official Onboarding Portal',
        description: 'Updated comprehensive description for founding members.',
        purpose: 'This form records verified technical specializations and cloud portfolio assets.',
        instructions: 'Please provide exact GitHub handles and active LinkedIn profile URLs.',
        organizationName: 'AWS Student Builder Group - CU Uttar Pradesh',
        headerText: 'FOUNDING BUILDERS REGISTRATION',
        footerText: 'AWS Cloud Community Portal © 2026',
        submitButtonText: 'Submit My Official Dossier',
        successTitle: 'Dossier Successfully Submitted!',
        successMessage: 'Your Founding Member profile has been updated in the cloud registry.'
      }
    })
  });

  const res = await formConfigPost(updateReq);
  const data = await res.json();
  assert.equal(res.status, 200, 'Config update should succeed');
  assert.equal(data.success, true);
  assert.equal(data.config.title, 'AWS Founding Members Registration 2026');
  assert.equal(data.config.subtitle, 'Official Onboarding Portal');
  assert.equal(data.config.description, 'Updated comprehensive description for founding members.');
  assert.equal(data.config.purpose, 'This form records verified technical specializations and cloud portfolio assets.');
  assert.equal(data.config.instructions, 'Please provide exact GitHub handles and active LinkedIn profile URLs.');
  assert.equal(data.config.submitButtonText, 'Submit My Official Dossier');
  assert.equal(data.config.successTitle, 'Dossier Successfully Submitted!');

  // Verify persistence via GET endpoint
  const getReq = new Request('http://localhost/api/admin/founding-members/form-config', {
    headers: ADMIN_AUTH_HEADER
  });
  const getRes = await formConfigGet(getReq);
  const getData = await getRes.json();
  assert.equal(getRes.status, 200);
  assert.equal(getData.config.purpose, 'This form records verified technical specializations and cloud portfolio assets.');
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
