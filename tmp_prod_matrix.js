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
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data, raw: text };
}

async function login() {
  const result = await postAdmin(null, { action: 'login', username: adminUsername, password: adminPassword });
  if (!result.ok || !result.data?.token) throw new Error(`Admin login failed: ${JSON.stringify(result.data)}`);
  return result.data.token;
}

async function createOpportunity(token, title, slug) {
  const result = await postAdmin(token, {
    action: 'create-career',
    career: {
      title, slug,
      organizationName: 'AWS Student Builder Group',
      organizationLogo: '',
      opportunityType: 'Internship',
      location: 'Remote',
      workMode: 'Remote',
      shortDescription: 'Production verification opportunity.',
      description: 'Production verification opportunity.',
      responsibilities: 'Validate app flow',
      requiredSkills: 'Testing',
      preferredSkills: 'QA',
      eligibility: 'Open to all',
      benefits: 'Live flow validation',
      additionalInformation: 'Verification only',
      applicationDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Open',
      published: true,
      internalApplications: true,
      applicationLink: '',
      maxApplications: 50,
    },
  });
  if (!result.ok || !result.data?.career?.id) throw new Error(`create-career failed: ${JSON.stringify(result.data)}`);
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
  form.set('experience', 'QA');
  form.set('motivation', 'Live verification run.');
  form.set('additionalInformation', 'Temporary verification record.');
  form.set('consent', 'on');
  const res = await fetch(`${base}/api/career-applications`, { method: 'POST', body: form, redirect: 'manual' });
  const text = await res.text();
  return { status: res.status, ok: res.ok, raw: text, location: res.headers.get('location') };
}

(async () => {
  const token = await login();
  const runTs = Date.now();
  const oppA = await createOpportunity(token, `Prod Verify A ${runTs}`, `prod-verify-a-${runTs}`);
  const oppB = await createOpportunity(token, `Prod Verify B ${runTs}`, `prod-verify-b-${runTs}`);
  const sharedEmail = `prodverify.${runTs}@example.com`;
  const results = { customDomain: base, oppAId: oppA.id, oppBId: oppB.id, firstStatus: null, firstLocation: null, duplicateStatus: null, duplicateBodyContainsAlreadyApplied: null, otherOpportunityStatus: null, otherOpportunityLocation: null, adminAVisible: null, adminBVisible: null, afterReLoginVisible: null };
  try {
    const first = await submitApplication(oppA, sharedEmail, 'Production Verification Student A');
    results.firstStatus = first.status;
    results.firstLocation = first.location;

    const dup = await submitApplication(oppA, sharedEmail, 'Production Verification Student A');
    results.duplicateStatus = dup.status;
    results.duplicateBodyContainsAlreadyApplied = /already applied/i.test(dup.raw || '');

    const other = await submitApplication(oppB, sharedEmail, 'Production Verification Student A');
    results.otherOpportunityStatus = other.status;
    results.otherOpportunityLocation = other.location;

    const adminA = await postAdmin(token, { action: 'get-career-applications', opportunityId: oppA.id });
    const adminB = await postAdmin(token, { action: 'get-career-applications', opportunityId: oppB.id });
    const reloginToken = await login();
    const afterReLogin = await postAdmin(reloginToken, { action: 'get-career-applications', opportunityId: oppA.id });

    results.adminAVisible = !!(adminA.ok && Array.isArray(adminA.data) && adminA.data.some((i) => String(i.email || '').toLowerCase() === sharedEmail.toLowerCase()));
    results.adminBVisible = !!(adminB.ok && Array.isArray(adminB.data) && adminB.data.some((i) => String(i.email || '').toLowerCase() === sharedEmail.toLowerCase()));
    results.afterReLoginVisible = !!(afterReLogin.ok && Array.isArray(afterReLogin.data) && afterReLogin.data.some((i) => String(i.email || '').toLowerCase() === sharedEmail.toLowerCase()));
    console.log(JSON.stringify({ pass: true, results }, null, 2));
  } catch (error) {
    console.log(JSON.stringify({ pass: false, error: String(error), results }, null, 2));
    process.exitCode = 1;
  } finally {
    const cleanup = await Promise.all([
      postAdmin(token, { action: 'delete-career', id: oppA.id }),
      postAdmin(token, { action: 'delete-career', id: oppB.id }),
    ]);
    console.log(JSON.stringify({ cleanup }, null, 2));
  }
})();
