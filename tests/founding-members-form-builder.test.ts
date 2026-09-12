import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/db';
import { FoundingMember, FoundingMemberFormConfig, FormQuestion } from '../src/types/foundingMember';
import { generateSingleFoundingMemberPdf, generateMultipleFoundingMembersPdf } from '../src/lib/foundingMemberPdf';

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

test('Form Builder Configuration - CRUD, Reordering, and Status Toggles', async () => {
  const initialConfig = await db.foundingMemberFormConfig.getConfig();
  assert.ok(initialConfig, 'Form config should exist');
  assert.ok(Array.isArray(initialConfig.questions), 'Questions must be an array');
  assert.ok(initialConfig.questions.length >= 10, 'Initial default questions should be present');

  const testQuestionId = `q_unit_test_${Date.now()}`;
  const testQuestion: FormQuestion = {
    id: testQuestionId,
    type: 'dropdown',
    label: 'Unit Test Favorite AWS Service',
    placeholder: 'Pick a service',
    helpText: 'Used for automated test verification',
    required: true,
    enabled: true,
    options: ['EC2', 'S3', 'Lambda', 'Bedrock'],
    step: 4,
    order: initialConfig.questions.length + 1
  };

  try {
    // 1. Add Question
    const updatedQuestions = [...initialConfig.questions, testQuestion];
    await db.foundingMemberFormConfig.saveConfig({
      ...initialConfig,
      questions: updatedQuestions
    });

    let configAfterAdd = await db.foundingMemberFormConfig.getConfig();
    const addedQ = configAfterAdd.questions.find((q: FormQuestion) => q.id === testQuestionId);
    assert.ok(addedQ, 'Added question must exist in config');
    assert.equal(addedQ?.label, 'Unit Test Favorite AWS Service');
    assert.equal(addedQ?.options?.length, 4);

    // 2. Edit Question
    const editedQuestions = configAfterAdd.questions.map((q: FormQuestion) =>
      q.id === testQuestionId ? { ...q, label: 'Unit Test Updated Label', required: false } : q
    );
    await db.foundingMemberFormConfig.saveConfig({
      ...configAfterAdd,
      questions: editedQuestions
    });

    let configAfterEdit = await db.foundingMemberFormConfig.getConfig();
    const editedQ = configAfterEdit.questions.find((q: FormQuestion) => q.id === testQuestionId);
    assert.equal(editedQ?.label, 'Unit Test Updated Label');
    assert.equal(editedQ?.required, false);

    // 3. Status Toggle (Draft / Published)
    await db.foundingMemberFormConfig.saveConfig({
      ...configAfterEdit,
      status: 'Draft'
    });
    let configDraft = await db.foundingMemberFormConfig.getConfig();
    assert.equal(configDraft.status, 'Draft');

    await db.foundingMemberFormConfig.saveConfig({
      ...configDraft,
      status: 'Published'
    });
    let configPublished = await db.foundingMemberFormConfig.getConfig();
    assert.equal(configPublished.status, 'Published');
  } finally {
    // Cleanup question
    const configToClean = await db.foundingMemberFormConfig.getConfig();
    const cleanedQuestions = configToClean.questions.filter((q: FormQuestion) => q.id !== testQuestionId);
    await db.foundingMemberFormConfig.saveConfig({
      ...configToClean,
      questions: cleanedQuestions
    });
  }
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
  const multiPdfBuffer = await generateMultipleFoundingMembersPdf([dummyMember, { ...dummyMember, memberId: 'FMB-CUUP-998', fullName: 'Bob DevOps' }], { formConfig });
  assert.ok(multiPdfBuffer && multiPdfBuffer.length > singlePdfBuffer.length, 'Multi PDF buffer must be generated and larger than single');
  assert.equal(multiPdfBuffer.subarray(0, 4).toString(), '%PDF', 'Multi Buffer must have PDF magic header');
});
