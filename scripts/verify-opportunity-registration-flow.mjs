import crypto from 'node:crypto';

const baseUrl = process.argv[2] || 'http://localhost:3000';
const username = process.argv[3] || 'awsadmin@culko.in';
const password = process.argv[4] || 'awssbgadmin123';

function buildSlug(label) {
  return `test-opportunity-${label.toLowerCase()}-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
}

async function postAdmin(token, body) {
  const res = await fetch(`${baseUrl}/api/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  return { status: res.status, ok: res.ok, data, headers: res.headers, raw: text };
}

async function login() {
  const result = await postAdmin(null, { action: 'login', username, password });
  if (!result.ok || !result.data?.token) {
    throw new Error(`Admin login failed (${result.status}): ${JSON.stringify(result.data)}`);
  }
  return result.data.token;
}

async function submitApplication(opportunity) {
  const studentLabel = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `test.student.${studentLabel}@example.com`;
  const form = new FormData();
  form.set('opportunityId', opportunity.id);
  form.set('opportunitySlug', opportunity.slug);
  form.set('name', `Test Student ${studentLabel}`);
  form.set('email', email);
  form.set('phone', '9999999999');
  form.set('university', 'Test University');
  form.set('program', 'B.Tech CSE');
  form.set('graduationYear', '2028');
  form.set('studentId', `SID-${studentLabel}`);
  form.set('linkedin', 'https://linkedin.com/in/test-student');
  form.set('github', 'https://github.com/test-student');
  form.set('portfolio', 'https://example.com/portfolio');
  form.set('skills', 'React, Node.js, TypeScript');
  form.set('experience', 'Built multiple student projects.');
  form.set('motivation', 'I want to contribute to the community and grow.');
  form.set('additionalInformation', 'Available on weekdays after 4 PM.');
  form.set('consent', 'on');

  const res = await fetch(`${baseUrl}/api/career-applications`, {
    method: 'POST',
    body: form,
    redirect: 'manual'
  });

  if (![302, 303, 307].includes(res.status)) {
    const text = await res.text();
    throw new Error(`Application submit failed (${res.status}): ${text}`);
  }

  const location = res.headers.get('location');
  if (!location || !location.startsWith(`${baseUrl}/`)) {
    throw new Error(`Application redirect is not on the expected domain: ${location}`);
  }

  const confirmation = await fetch(location);
  const confirmationHtml = await confirmation.text();
  const confirmationCopy = [
    'Application Submitted Successfully',
    'Thank you for your interest in this opportunity.',
    'Your application has been successfully submitted and is now under review by our recruitment team. If your profile is shortlisted, our team will contact you with the next steps.',
    'Please keep an eye on your registered email for further updates.',
    'AWS Student Builder Group',
    'Chandigarh University – Uttar Pradesh'
  ];
  if (!confirmation.ok || confirmationCopy.some((text) => !confirmationHtml.includes(text))) {
    throw new Error(`Confirmation screen verification failed (${confirmation.status}) at ${location}`);
  }
  if (confirmationHtml.includes('localhost:3000')) {
    throw new Error(`Confirmation screen contains localhost URL at ${location}`);
  }
  console.log('CONFIRMATION_SCREEN_OK', location);

  return { email, location };
}

async function run() {
  const runLabel = baseUrl.includes('localhost') ? 'local' : 'live';
  const slug = buildSlug(runLabel);
  let createdOpportunityId = null;

  const token = await login();
  console.log('LOGIN_OK', !!token);

  const createPayload = {
    action: 'create-career',
    career: {
      title: `Verification Opportunity ${runLabel.toUpperCase()} ${Date.now()}`,
      slug,
      organizationName: 'AWS Student Builder Group',
      organizationLogo: '',
      opportunityType: 'Internship',
      location: 'Remote',
      workMode: 'Remote',
      shortDescription: 'Verification opportunity used by automation script.',
      description: 'This is a temporary opportunity used to verify end-to-end registration flow.',
      responsibilities: 'Test registration flow',
      requiredSkills: 'Attention to detail',
      preferredSkills: 'QA testing',
      eligibility: 'Open to all students',
      benefits: 'Hands-on practice',
      additionalInformation: 'Created by automated verification script',
      applicationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Open',
      published: true,
      internalApplications: true,
      applicationLink: '',
      maxApplications: 20
    }
  };

  const createResult = await postAdmin(token, createPayload);
  if (!createResult.ok || !createResult.data?.career?.id) {
    throw new Error(`create-career failed (${createResult.status}): ${JSON.stringify(createResult.data)}`);
  }

  const opportunity = createResult.data.career;
  createdOpportunityId = opportunity.id;
  console.log('CREATE_OPPORTUNITY_OK', opportunity.id, opportunity.slug);

  const { email } = await submitApplication(opportunity);
  console.log('SUBMIT_APPLICATION_OK', email);

  const list1 = await postAdmin(token, { action: 'get-career-applications', opportunityId: opportunity.id });
  if (!list1.ok || !Array.isArray(list1.data)) {
    throw new Error(`get-career-applications failed (${list1.status}): ${JSON.stringify(list1.data)}`);
  }

  const found1 = list1.data.find((app) => String(app.email || '').toLowerCase() === email.toLowerCase());
  if (!found1) {
    throw new Error('Submitted student not found in first admin fetch.');
  }
  console.log('ADMIN_VIEW_OK', found1.id, found1.status, found1.createdAt);

  const exportResult = await postAdmin(token, { action: 'export-career-applications-csv', opportunityId: opportunity.id });
  if (!exportResult.ok) {
    throw new Error(`CSV export failed (${exportResult.status}): ${JSON.stringify(exportResult.data)}`);
  }
  if (!String(exportResult.raw).includes(email)) {
    throw new Error('CSV export does not contain the submitted student email.');
  }
  console.log('CSV_EXPORT_OK', exportResult.raw.split('\n').length - 1);

  const token2 = await login();
  console.log('RELOGIN_OK', !!token2);

  const list2 = await postAdmin(token2, { action: 'get-career-applications', opportunityId: opportunity.id });
  if (!list2.ok || !Array.isArray(list2.data)) {
    throw new Error(`second get-career-applications failed (${list2.status}): ${JSON.stringify(list2.data)}`);
  }

  const found2 = list2.data.find((app) => String(app.email || '').toLowerCase() === email.toLowerCase());
  if (!found2) {
    throw new Error('Submitted student missing after re-login/fresh fetch.');
  }
  console.log('PERSISTENCE_OK', found2.id);

  const deleteResult = await postAdmin(token2, { action: 'delete-career', id: opportunity.id });
  if (!deleteResult.ok) {
    throw new Error(`delete-career cleanup failed (${deleteResult.status}): ${JSON.stringify(deleteResult.data)}`);
  }
  console.log('CLEANUP_OPPORTUNITY_OK', opportunity.id);

  console.log('FLOW_VERIFIED_OK', baseUrl);
}

run().catch(async (err) => {
  console.error('FLOW_VERIFIED_FAILED', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
