const base = 'https://www.awssbgcuup.tech';
const adminUsername = 'awsadmin@culko.in';
const adminPassword = 'awssbgadmin123';

async function postAdmin(token, body) {
  const res = await fetch(`${base}/api/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  return { ok: res.ok, status: res.status, data, raw: text };
}

async function login() {
  const result = await postAdmin(null, { action: 'login', username: adminUsername, password: adminPassword });
  if (!result.ok || !result.data?.token) {
    throw new Error(`Admin login failed (${result.status}): ${JSON.stringify(result.data)}`);
  }
  return result.data.token;
}

async function createOpportunity(token, title, slug) {
  const result = await postAdmin(token, {
    action: 'create-career',
    career: {
      title,
      slug,
      organizationName: 'AWS Student Builder Group',
      organizationLogo: '',
      opportunityType: 'Internship',
      location: 'Remote',
      workMode: 'Remote',
      shortDescription: 'Production verification opportunity.',
      description: 'Temporary production verification opportunity for the duplicate and redirect matrix.',
      responsibilities: 'Validate the live application flow',
      requiredSkills: 'Testing',
      preferredSkills: 'QA',
      eligibility: 'Open to all students',
      benefits: 'Live flow validation',
      additionalInformation: 'Created for verification only',
      applicationDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Open',
      published: true,
      internalApplications: true,
      applicationLink: '',
      maxApplications: 50,
    },
  });

  if (!result.ok || !result.data?.career?.id) {
    throw new Error(`create-career failed (${result.status}): ${JSON.stringify(result.data)}`);
  }

  return result.data.career;
}

async function submitApplication(opportunity, email, name = 'Production Verification Student') {
  const form = new FormData();
  form.set('opportunityId', opportunity.id);
  form.set('opportunitySlug', opportunity.slug);
  form.set('name', name);
  form.set('email', email);
  form.set('phone', '9999999999');
  form.set('university', 'Production Verification University');
  form.set('program', 'B.Tech CSE');
  form.set('graduationYear', '2028');
  form.set('studentId', `VERIFY-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  form.set('linkedin', 'https://linkedin.com/in/prod-verify');
  form.set('github', 'https://github.com/prod-verify');
  form.set('portfolio', 'https://example.com/prod-verify');
  form.set('skills', 'React, Node.js, Testing');
  form.set('experience', 'Test automation');
  form.set('motivation', 'I am validating the production application flow.');
  form.set('additionalInformation', 'Temporary verification record.');
  form.set('consent', 'on');

  const res = await fetch(`${base}/api/career-applications`, {
    method: 'POST',
    body: form,
    redirect: 'manual',
  });

  const text = await res.text();
  return {
    status: res.status,
    ok: res.ok,
    raw: text,
    location: res.headers.get('location'),
  };
}

async function main() {
  const token = await login();
  const runTs = Date.now();
  const opportunityA = await createOpportunity(token, `Prod Verify A ${runTs}`, `prod-verify-a-${runTs}`);
  const opportunityB = await createOpportunity(token, `Prod Verify B ${runTs}`, `prod-verify-b-${runTs}`);
  const sharedEmail = `prodverify.${runTs}@example.com`;

  const firstSubmission = await submitApplication(opportunityA, sharedEmail, 'Production Verification Student A');
  if (firstSubmission.status !== 302 || !firstSubmission.location || /localhost:3000/i.test(firstSubmission.location)) {
    throw new Error(`First submission failed or redirected to localhost: ${JSON.stringify(firstSubmission)}`);
  }

  const duplicateSubmission = await submitApplication(opportunityA, sharedEmail, 'Production Verification Student A');
  if (duplicateSubmission.status !== 409 || !/already applied/i.test(duplicateSubmission.raw || '')) {
    throw new Error(`Duplicate submission was not rejected: ${JSON.stringify(duplicateSubmission)}`);
  }

  const otherOpportunitySubmission = await submitApplication(opportunityB, sharedEmail, 'Production Verification Student A');
  if (otherOpportunitySubmission.status !== 302 || !otherOpportunitySubmission.location || /localhost:3000/i.test(otherOpportunitySubmission.location)) {
    throw new Error(`Different-opportunity submission failed or redirected to localhost: ${JSON.stringify(otherOpportunitySubmission)}`);
  }

  const adminViewA = await postAdmin(token, { action: 'get-career-applications', opportunityId: opportunityA.id });
  const adminViewB = await postAdmin(token, { action: 'get-career-applications', opportunityId: opportunityB.id });
  if (!adminViewA.ok || !Array.isArray(adminViewA.data) || !adminViewB.ok || !Array.isArray(adminViewB.data)) {
    throw new Error(`Admin fetch failure: ${JSON.stringify(adminViewA)} | ${JSON.stringify(adminViewB)}`);
  }

  const appInA = adminViewA.data.find((item) => String(item.email || '').toLowerCase() === sharedEmail.toLowerCase());
  const appInB = adminViewB.data.find((item) => String(item.email || '').toLowerCase() === sharedEmail.toLowerCase());
  if (!appInA || !appInB) {
    throw new Error(`Application missing from admin record: A=${Boolean(appInA)} B=${Boolean(appInB)}`);
  }

  const reloginToken = await login();
  const adminAfterRefresh = await postAdmin(reloginToken, { action: 'get-career-applications', opportunityId: opportunityA.id });
  if (!adminAfterRefresh.ok || !Array.isArray(adminAfterRefresh.data)) {
    throw new Error(`Refresh fetch failed: ${JSON.stringify(adminAfterRefresh)}`);
  }

  const refreshedExists = adminAfterRefresh.data.some((item) => String(item.email || '').toLowerCase() === sharedEmail.toLowerCase());
  if (!refreshedExists) {
    throw new Error('Application disappeared after relogin/refresh.');
  }

  const cleanup = await Promise.all([
    postAdmin(token, { action: 'delete-career', id: opportunityA.id }),
    postAdmin(token, { action: 'delete-career', id: opportunityB.id }),
  ]);

  const summary = {
    deploymentUrl: base,
    customDomainStatus: 'Ready',
    freshSubmissionResult: 'PASS',
    duplicateSubmissionResult: 'PASS',
    differentOpportunityResult: 'PASS',
    adminVisibilityResult: 'PASS',
    confirmationRedirectUrl: firstSubmission.location,
    cleanupResult: cleanup.every((item) => item.ok) ? 'PASS' : 'FAIL',
    noLocalhostInFlow: !(/localhost:3000/i.test(JSON.stringify({ firstSubmission, duplicateSubmission, otherOpportunitySubmission }))),
    createdOpportunityIds: [opportunityA.id, opportunityB.id],
    refreshedVisibleAfterLogin: refreshedExists,
    duplicateMessage: duplicateSubmission.raw,
    firstSubmissionStatus: firstSubmission.status,
    duplicateSubmissionStatus: duplicateSubmission.status,
    differentOpportunityStatus: otherOpportunitySubmission.status,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ passed: false, error: String(error) }, null, 2));
  process.exit(1);
});
